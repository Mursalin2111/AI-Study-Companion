import { GoogleGenAI } from '@google/genai';
import {
  AIServiceProvider,
  SummaryParams,
  SummaryResult,
  AskQuestionParams,
  AskQuestionResult,
  MCQQuestionGen,
  ImportantQuestionGen,
  FlashcardGen,
  StudyPlanTaskGen,
  PerformanceAnalysisResult,
} from './aiInterface.js';
import { config } from '../../config.js';
import { OfflineFallbackProvider } from './offlineFallbackProvider.js';

export class GeminiProvider implements AIServiceProvider {
  name = 'Google Gemini 3.8 Flash';
  private client: GoogleGenAI;
  private fallback: OfflineFallbackProvider;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.fallback = new OfflineFallbackProvider();
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      for (const text of texts) {
        // Embed content via Gemini
        const response: any = await (this.client as any).models.embedContent({
          model: config.geminiEmbeddingModel || 'gemini-embedding-001',
          contents: text.slice(0, 2048),
        });
        if (response?.embedding?.values) {
          embeddings.push(response.embedding.values);
        } else {
          embeddings.push(await this.fallback.generateEmbeddings([text]).then(r => r[0]));
        }
      }
      return embeddings;
    } catch (error) {
      console.warn('[GeminiProvider] Embedding error, falling back to local vectorizer:', error);
      return this.fallback.generateEmbeddings(texts);
    }
  }

  async generateSummary(params: SummaryParams): Promise<SummaryResult> {
    const { content, type, language } = params;
    const isBangla = language === 'bn';

    const systemPrompt = `You are a high-level academic study assistant for university students. 
Generate a clear, high-yield academic summary in ${isBangla ? 'Bangla (বাংলা)' : 'English'}.
Summary Level: ${type.toUpperCase()}.
- short: 5-8 bullet points highlighting the core concepts.
- medium: Structured overview covering each key section.
- detailed: Comprehensive, academic section-by-section breakdown.
- exam: High-priority exam topics, definitions, potential questions, key formulas, and pitfalls.

Return clean Markdown followed by a JSON array of 5-8 key concepts at the very end in the format:
\`\`\`json
["Concept 1", "Concept 2"]
\`\`\``;

    try {
      const prompt = `${systemPrompt}\n\nMaterial Content:\n${content.slice(0, 15000)}`;
      const response: any = await (this.client as any).models.generateContent({
        model: config.geminiModel,
        contents: prompt,
      });

      const text = response?.text || (response?.candidates?.[0]?.content?.parts?.[0]?.text) || '';
      if (!text) throw new Error('Empty Gemini response');

      // Parse key concepts
      let keyConcepts: string[] = [];
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          keyConcepts = JSON.parse(jsonMatch[1]);
        } catch {
          // ignore
        }
      }

      const cleanSummary = text.replace(/```json[\s\S]*?```/, '').trim();
      return {
        summary: cleanSummary,
        keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['Core Concept', 'Fundamental Theory', 'Application'],
      };
    } catch (error) {
      console.warn('[GeminiProvider] generateSummary error, falling back:', error);
      return this.fallback.generateSummary(params);
    }
  }

  async askQuestion(
    params: AskQuestionParams,
    onChunk?: (text: string) => void
  ): Promise<AskQuestionResult> {
    const { question, contextChunks, history, language, quickAction } = params;
    const isBangla = language === 'bn' || quickAction === 'explain_in_bangla';

    if (!contextChunks || contextChunks.length === 0) {
      const notFound = isBangla
        ? 'আমি আপনার আপলোড করা স্টাডি ম্যাটেরিয়ালে এই বিষয়ে কোনো তথ্য খুঁজে পাইনি। অনুগ্রহ করে সম্পর্কিত নোট বা বই আপলোড করুন অথবা প্রশ্নটি পরিবর্তন করে দেখুন।'
        : 'I could not find this information in your uploaded study materials. Please verify your query or upload the relevant course notes.';
      if (onChunk) onChunk(notFound);
      return {
        answer: notFound,
        suggestedQuestions: isBangla
          ? ['এই ম্যাটেরিয়ালে কী কী প্রধান টপিক আছে?', 'সংক্ষিপ্ত সারসংক্ষেপ দিন।']
          : ['What are the main topics covered here?', 'Can you summarize this document?'],
      };
    }

    const contextText = contextChunks
      .map((c, i) => `[Source ${i + 1}: ${c.material_title || c.material_filename || 'Doc'} | Page ${c.page_number} | Section: ${c.section_heading}]\n${c.content}`)
      .join('\n\n');

    let actionInstruction = '';
    if (quickAction === 'explain_simply') {
      actionInstruction = 'Explain this in the simplest, most intuitive possible way, with an analogy if suitable.';
    } else if (quickAction === 'give_example') {
      actionInstruction = 'Focus on providing a concrete, real-world academic example and step-by-step trace.';
    } else if (quickAction === 'exam_questions') {
      actionInstruction = 'Provide probable semester exam questions based on this exact content.';
    } else if (quickAction === 'step_by_step') {
      actionInstruction = 'Explain the mechanism or algorithm step-by-step with clear numbered stages.';
    }

    const systemPrompt = `You are an expert academic tutor for university students.
CRITICAL GROUNDING RULES:
1. Prioritize and base your answer strictly on the provided Study Material Context.
2. DO NOT hallucinate facts, citations, or formulas not supported by the context.
3. If the answer cannot be determined from the materials, state clearly: "I could not find this information in your uploaded materials."
4. Format your response cleanly in Markdown.
5. Structure answers with:
   - Simple Explanation / Core Answer
   - Technical Breakdown / Mechanism
   - Example (if relevant)
   - Exam Tip
6. Answer in ${isBangla ? 'Bangla (বাংলা)' : 'English'}.
${actionInstruction}`;

    try {
      // Stream with generateContentStream if available
      let fullText = '';
      const prompt = `${systemPrompt}\n\nSTUDY MATERIAL CONTEXT:\n${contextText}\n\nSTUDENT QUESTION:\n${question}`;

      if (typeof (this.client as any).models?.generateContentStream === 'function') {
        const stream = await (this.client as any).models.generateContentStream({
          model: config.geminiModel,
          contents: prompt,
        });

        for await (const chunk of stream) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            fullText += chunkText;
            if (onChunk) onChunk(chunkText);
          }
        }
      } else {
        const response: any = await (this.client as any).models.generateContent({
          model: config.geminiModel,
          contents: prompt,
        });
        fullText = response?.text || '';
        if (onChunk) onChunk(fullText);
      }

      const suggestedQuestions = isBangla
        ? ['এই টপিকের একটি বাস্তব উদাহরণ দিন', 'পরীক্ষায় কীভাবে লিখলে ভালো মার্কস পাওয়া যাবে?', 'সম্পর্কিত অন্যান্য গুরুত্বপূর্ণ বিষয় কী?']
        : ['Could you provide another detailed example?', 'What are the main exam pitfalls for this topic?', 'How does this compare to alternative approaches?'];

      return {
        answer: fullText,
        suggestedQuestions,
      };
    } catch (error) {
      console.warn('[GeminiProvider] askQuestion error, falling back:', error);
      return this.fallback.askQuestion(params, onChunk);
    }
  }

  async generateMCQs(params: {
    content: string;
    count: number;
    difficulty: string;
    language: 'en' | 'bn';
  }): Promise<MCQQuestionGen[]> {
    const { content, count, difficulty, language } = params;
    const isBangla = language === 'bn';

    const prompt = `Generate ${count} high-quality Multiple Choice Questions (MCQs) for university exam preparation from the following material.
Difficulty: ${difficulty}.
Language: ${isBangla ? 'Bangla (বাংলা)' : 'English'}.
Each question MUST have exactly 4 options (A, B, C, D), 1 correct answer (matching one of the options exactly), a detailed explanation, and a specific topic name.

Output ONLY a JSON array with this exact structure:
[
  {
    "question": "Which parsing method is bottom-up?",
    "options": ["LL(1)", "Recursive Descent", "LR", "Predictive Parsing"],
    "correctAnswer": "LR",
    "explanation": "LR parsing is bottom-up because it constructs the parse tree from leaves to root.",
    "topic": "Parsing"
  }
]

Material:
${content.slice(0, 12000)}`;

    try {
      const response: any = await (this.client as any).models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = response?.text || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      throw new Error('Invalid MCQ JSON structure');
    } catch (error) {
      console.warn('[GeminiProvider] generateMCQs error, falling back:', error);
      return this.fallback.generateMCQs(params);
    }
  }

  async generateImportantQuestions(params: {
    content: string;
    language: 'en' | 'bn';
  }): Promise<ImportantQuestionGen[]> {
    const { content, language } = params;
    const isBangla = language === 'bn';

    const prompt = `Analyze this university study material and generate 9 high-yield exam study questions.
Divide questions across 3 categories: 'very_important', 'important', and 'practice'.
Question types should vary: 'definition', 'conceptual', 'descriptive', 'short', 'problem_solving', 'viva'.
Language: ${isBangla ? 'Bangla (বাংলা)' : 'English'}.

Output ONLY a JSON array with this structure:
[
  {
    "category": "very_important",
    "type": "conceptual",
    "question": "What is the difference between Top-Down and Bottom-Up parsing?",
    "answer": "Comprehensive answer text...",
    "explanation": "Why this question is recommended for exam preparation.",
    "difficulty": "medium"
  }
]

Material:
${content.slice(0, 12000)}`;

    try {
      const response: any = await (this.client as any).models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = response?.text || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      throw new Error('Invalid Important Questions JSON structure');
    } catch (error) {
      console.warn('[GeminiProvider] generateImportantQuestions error, falling back:', error);
      return this.fallback.generateImportantQuestions(params);
    }
  }

  async generateFlashcards(params: {
    content: string;
    count: number;
    language: 'en' | 'bn';
  }): Promise<FlashcardGen[]> {
    const { content, count, language } = params;
    const isBangla = language === 'bn';

    const prompt = `Generate ${count} spaced-repetition flashcards from the study material.
Front: concise question, definition prompt, or concept.
Back: clear, memorable, accurate answer.
Language: ${isBangla ? 'Bangla (বাংলা)' : 'English'}.

Output ONLY a JSON array:
[
  {
    "front": "What is LL(1) Parsing?",
    "back": "A top-down parsing method using 1 lookahead token without backtracking.",
    "topic": "Syntax Analysis",
    "hint": "Think of Left-to-right scanning with Leftmost derivation."
  }
]

Material:
${content.slice(0, 12000)}`;

    try {
      const response: any = await (this.client as any).models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = response?.text || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      throw new Error('Invalid Flashcards JSON structure');
    } catch (error) {
      console.warn('[GeminiProvider] generateFlashcards error, falling back:', error);
      return this.fallback.generateFlashcards(params);
    }
  }

  async generateStudyPlan(params: {
    subjectName: string;
    examDate: string;
    dailyHours: number;
    currentLevel: string;
    topics: string[];
  }): Promise<StudyPlanTaskGen[]> {
    try {
      const prompt = `Create a realistic daily university exam preparation study plan.
Subject: ${params.subjectName}
Exam Date: ${params.examDate}
Daily Hours Available: ${params.dailyHours} hours/day
Student Level: ${params.currentLevel}
Key Topics: ${params.topics.join(', ')}

Output ONLY a JSON array of daily tasks:
[
  {
    "day": 1,
    "dateStr": "YYYY-MM-DD",
    "title": "Task title",
    "description": "Detailed actionable steps",
    "minutes": 45,
    "topic": "Topic name"
  }
]`;

      const response: any = await (this.client as any).models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = response?.text || '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      throw new Error('Invalid Study Plan JSON');
    } catch (error) {
      console.warn('[GeminiProvider] generateStudyPlan error, falling back:', error);
      return this.fallback.generateStudyPlan(params);
    }
  }

  async analyzePerformance(params: {
    attempts: any[];
    subjectName: string;
  }): Promise<PerformanceAnalysisResult> {
    return this.fallback.analyzePerformance(params);
  }
}
