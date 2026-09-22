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
import { generateLocalTfidfVector } from '../vectorStore.js';

export class OfflineFallbackProvider implements AIServiceProvider {
  name = 'Offline Fallback NLP Engine';

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((t) => generateLocalTfidfVector(t));
  }

  async generateSummary(params: SummaryParams): Promise<SummaryResult> {
    const { content, type, language } = params;
    const isBangla = language === 'bn';

    const sentences = extractSentences(content);
    const keyTerms = extractKeyTerms(content);

    let summaryText = '';
    const keyConcepts = keyTerms.slice(0, 6);

    if (type === 'short') {
      const selected = sentences.slice(0, 6);
      if (isBangla) {
        summaryText = `### সারসংক্ষেপ (Quick Summary)\n\n` +
          selected.map((s, idx) => `${idx + 1}. ${s}`).join('\n\n') +
          `\n\n**মূল ধারণাসমূহ:** ${keyConcepts.join(', ')}`;
      } else {
        summaryText = `### Quick Summary\n\n` +
          selected.map((s, idx) => `• **Point ${idx + 1}**: ${s}`).join('\n\n') +
          `\n\n**Core Concepts:** ${keyConcepts.join(', ')}`;
      }
    } else if (type === 'exam') {
      const topTopics = keyTerms.slice(0, 8);
      if (isBangla) {
        summaryText = `### পরীক্ষা প্রস্তুতি নির্দেশিকা (Exam Summary)\n\n` +
          `⭐ **সবচেয়ে গুরুত্বপূর্ণ বিষয়সমূহ (High-Priority Exam Topics):**\n\n` +
          topTopics.map((t, idx) => `${idx + 1}. **${t}** — পরীক্ষায় এই সম্পর্কিত সংজ্ঞা ও সমস্যা প্রায়ই আসে।`).join('\n') +
          `\n\n💡 **পরীক্ষার টিপস:**\n` +
          `• মূল সূত্র ও ডায়াগ্রামগুলো মুখস্থ বা নোট করুন।\n` +
          `• অ্যালগরিদম ও স্টেপ-বাই-স্টেপ সমাধান প্র্যাকটিস করুন।`;
      } else {
        summaryText = `### Exam-Focused Summary\n\n` +
          `⭐ **High-Yield Exam Topics:**\n\n` +
          topTopics.map((t, idx) => `${idx + 1}. **${t}** — Essential definition and working principles frequently evaluated in semester exams.`).join('\n') +
          `\n\n💡 **Exam Strategy:**\n` +
          `• Review key algorithms and formulas daily.\n` +
          `• Practice past mock questions on ${topTopics.slice(0, 3).join(', ')}.\n` +
          `• Memorize trade-offs and complexity points.`;
      }
    } else {
      // detailed / medium
      const sections = content.split(/\n\n+/).filter(s => s.trim().length > 40);
      const chosen = sections.slice(0, type === 'medium' ? 4 : 8);

      if (isBangla) {
        summaryText = `### বিস্তারিত বিশ্লেষণ (Detailed Analysis)\n\n` +
          chosen.map((sec, i) => `#### অনুচ্ছেদ ${i + 1}\n${sec.trim()}`).join('\n\n') +
          `\n\n**আলোচিত বিষয়সমূহ:** ${keyConcepts.join(', ')}`;
      } else {
        summaryText = `### Comprehensive Material Breakdown\n\n` +
          chosen.map((sec, i) => `#### Section ${i + 1}\n${sec.trim()}`).join('\n\n') +
          `\n\n**Highlighted Terminology:** ${keyConcepts.join(', ')}`;
      }
    }

    return {
      summary: summaryText,
      keyConcepts,
    };
  }

  async askQuestion(
    params: AskQuestionParams,
    onChunk?: (text: string) => void
  ): Promise<AskQuestionResult> {
    const { question, contextChunks, language, quickAction } = params;
    const isBangla = language === 'bn' || quickAction === 'explain_in_bangla';

    // RAG Grounding Verification
    if (!contextChunks || contextChunks.length === 0) {
      const notFoundMsg = isBangla
        ? 'আমি আপনার আপলোড করা স্টাডি ম্যাটেরিয়ালে এই বিষয়ে কোনো তথ্য খুঁজে পাইনি। অনুগ্রহ করে সম্পর্কিত নোট বা বই আপলোড করুন অথবা প্রশ্নটি একটু পরিবর্তন করে দেখুন।'
        : 'I could not find this information in your uploaded study materials. Please verify the question or upload documents covering this topic.';
      if (onChunk) onChunk(notFoundMsg);
      return {
        answer: notFoundMsg,
        suggestedQuestions: isBangla
          ? ['এই ম্যাটেরিয়ালে কী কী প্রধান টপিক আছে?', 'সংক্ষিপ্ত সারসংক্ষেপ দিন।']
          : ['What are the main topics in this document?', 'Can you summarize this material?'],
      };
    }

    // Assemble best grounded answer from retrieved context chunks
    const primaryChunk = contextChunks[0];
    const secondaryContent = contextChunks.slice(1, 3).map(c => c.content).join('\n\n');
    const keyTerms = extractKeyTerms(primaryChunk.content);

    let answer = '';

    if (quickAction === 'explain_simply') {
      answer = `### 💡 Simple Explanation\n\n` +
        `Here is the concept explained in simple, intuitive terms:\n\n` +
        `**In Short:** ${primaryChunk.content.slice(0, 300)}...\n\n` +
        `**Analogy / Key Takeaway:** Think of this as a structured process where each rule handles a specific condition step-by-step.`;
    } else if (isBangla) {
      answer = `### 📘 উত্তর ও ব্যাখ্যা\n\n` +
        `আপলোড করা ডকুমেন্ট (${primaryChunk.material_title || 'স্টাডি ফাইল'}) অনুসারে:\n\n` +
        `> ${primaryChunk.content.slice(0, 350)}...\n\n` +
        `#### সহজ ব্যাখ্যা (Simple Explanation)\n` +
        `এই টপিকের মূল উদ্দেশ্য হলো বিষয়টির কার্যপ্রণালী সঠিকভাবে বিশ্লেষণ করা। এখানে প্রধান ধারণা হলো: **${keyTerms.slice(0, 3).join(', ')}**।\n\n` +
        `#### পরীক্ষার জন্য গুরুত্বপূর্ণ পয়েন্ট (Exam Tip)\n` +
        `পরীক্ষায় এর সংজ্ঞা এবং উদাহরণসহ বর্ণনা লিখতে হতে পারে।`;
    } else if (quickAction === 'exam_questions') {
      answer = `### 🎯 Potential Exam Questions for this Topic\n\n` +
        `Based on this section (${primaryChunk.section_heading || 'Core Section'}):\n\n` +
        `1. **Define ${keyTerms[0] || 'the core concept'}** and explain its primary purpose.\n` +
        `2. **Differentiate** between the primary approach and alternative methods mentioned in the text.\n` +
        `3. **Step-by-Step Problem:** How does this apply to standard inputs or algorithms?`;
    } else {
      answer = `### 📘 Explanation from Study Materials\n\n` +
        `${primaryChunk.content}\n\n` +
        (secondaryContent ? `#### Additional Context\n${secondaryContent.slice(0, 400)}...\n\n` : '') +
        `#### Key Concept Takeaways\n` +
        keyTerms.slice(0, 4).map(k => `• **${k}**: Fundamental component discussed in this section.`).join('\n');
    }

    // Stream out chunks if callback provided
    if (onChunk) {
      const parts = answer.split(' ');
      for (let i = 0; i < parts.length; i += 6) {
        const slice = parts.slice(i, i + 6).join(' ') + ' ';
        onChunk(slice);
      }
    }

    const suggested = isBangla
      ? [
          `${keyTerms[0] || 'এই বিষয়'} এর একটি বাস্তব উদাহরণ দিন`,
          'সহজ ভাষায় স্টেপ-বাই-স্টেপ বুঝিয়ে দিন',
          'পরীক্ষার জন্য কী কী গুরুত্বপূর্ণ?',
        ]
      : [
          `Can you provide an example of ${keyTerms[0] || 'this concept'}?`,
          'Explain this step-by-step in simpler terms',
          'What are common exam questions on this topic?',
        ];

    return {
      answer,
      suggestedQuestions: suggested,
    };
  }

  async generateMCQs(params: {
    content: string;
    count: number;
    difficulty: string;
    language: 'en' | 'bn';
  }): Promise<MCQQuestionGen[]> {
    const { content, count, language } = params;
    const isBangla = language === 'bn';
    const sentences = extractSentences(content).filter(s => s.length > 30);
    const keyTerms = extractKeyTerms(content);

    const mcqs: MCQQuestionGen[] = [];
    const targetCount = Math.min(count, Math.max(sentences.length, 5));

    for (let i = 0; i < targetCount; i++) {
      const targetTerm = keyTerms[i % keyTerms.length] || `Topic ${i + 1}`;
      const otherTerms = keyTerms.filter(t => t !== targetTerm).slice(0, 3);
      while (otherTerms.length < 3) {
        otherTerms.push(`Alternative ${otherTerms.length + 1}`);
      }

      const options = [targetTerm, ...otherTerms].sort(() => 0.5 - Math.random());
      const sentence = sentences[i % sentences.length] || `Regarding ${targetTerm}, this component performs primary processing.`;

      if (isBangla) {
        mcqs.push({
          question: `নিচের কোনটি "${sentence.slice(0, 100)}..." এর সাথে সামঞ্জস্যপূর্ণ?`,
          options,
          correctAnswer: targetTerm,
          explanation: `নোট অনুসারে, ${targetTerm} এই ধারণার মূল ভিত্তি হিসেবে কাজ করে।`,
          topic: targetTerm,
        });
      } else {
        mcqs.push({
          question: `According to the study material, which concept is associated with: "${sentence.slice(0, 120)}..."?`,
          options,
          correctAnswer: targetTerm,
          explanation: `In the uploaded material, ${targetTerm} directly pertains to this definition and function.`,
          topic: targetTerm,
        });
      }
    }

    return mcqs;
  }

  async generateImportantQuestions(params: {
    content: string;
    language: 'en' | 'bn';
  }): Promise<ImportantQuestionGen[]> {
    const { content, language } = params;
    const isBangla = language === 'bn';
    const keyTerms = extractKeyTerms(content);
    const sentences = extractSentences(content);

    const questions: ImportantQuestionGen[] = [];
    const terms = keyTerms.slice(0, 9);

    const categories: Array<'very_important' | 'important' | 'practice'> = [
      'very_important',
      'very_important',
      'very_important',
      'important',
      'important',
      'important',
      'practice',
      'practice',
      'practice',
    ];

    const types: Array<'definition' | 'conceptual' | 'descriptive' | 'problem_solving' | 'viva' | 'short'> = [
      'definition',
      'conceptual',
      'descriptive',
      'short',
      'conceptual',
      'problem_solving',
      'viva',
      'definition',
      'short',
    ];

    terms.forEach((term, idx) => {
      const cat = categories[idx % categories.length];
      const qType = types[idx % types.length];
      const snippet = sentences[idx % sentences.length] || `${term} is a fundamental concept in the syllabus.`;

      if (isBangla) {
        questions.push({
          category: cat,
          type: qType,
          question: qType === 'definition'
            ? `${term} বলতে কী বোঝায়? সংক্ষেপে লিখুন।`
            : `${term} এর মূল উদ্দেশ্য এবং কর্মপদ্ধতি আলোচনা করুন।`,
          answer: `${term} হলো একটি মূল কনসেপ্ট যা ম্যাটেরিয়ালে বিশদভাবে আলোচিত হয়েছে। সংক্ষেপে: ${snippet}`,
          explanation: `এই প্রশ্নটি বিশ্ববিদ্যালয়ের সেমিস্টার ফাইনাল পরীক্ষায় ঘন ঘন এসে থাকে। AI সুপারিশ: গুরুত্ব সহকারে পড়ুন।`,
          difficulty: cat === 'very_important' ? 'medium' : cat === 'important' ? 'hard' : 'easy',
        });
      } else {
        questions.push({
          category: cat,
          type: qType,
          question: qType === 'definition'
            ? `Define ${term} and state its primary significance.`
            : `Explain the fundamental working principle and characteristics of ${term}.`,
          answer: `${term} represents an essential concept defined in the notes: ${snippet}`,
          explanation: `Frequently highlighted in university examinations. AI Study Recommendation: Master the core formula/steps.`,
          difficulty: cat === 'very_important' ? 'medium' : cat === 'important' ? 'hard' : 'easy',
        });
      }
    });

    return questions;
  }

  async generateFlashcards(params: {
    content: string;
    count: number;
    language: 'en' | 'bn';
  }): Promise<FlashcardGen[]> {
    const { content, count, language } = params;
    const isBangla = language === 'bn';
    const keyTerms = extractKeyTerms(content);
    const sentences = extractSentences(content);

    const cards: FlashcardGen[] = [];
    const targetCount = Math.min(count, Math.max(keyTerms.length, 6));

    for (let i = 0; i < targetCount; i++) {
      const term = keyTerms[i] || `Concept ${i + 1}`;
      const explanation = sentences.find(s => s.toLowerCase().includes(term.toLowerCase())) ||
        `Core component of the subject syllabus explaining ${term}.`;

      if (isBangla) {
        cards.push({
          front: `${term} কী?`,
          back: `${term}: ${explanation.slice(0, 200)}`,
          topic: term,
          hint: `${term} এর প্রধান বৈশিষ্ট্য মনে করুন`,
        });
      } else {
        cards.push({
          front: `What is ${term}?`,
          back: `${explanation.slice(0, 250)}`,
          topic: term,
          hint: `Recall the key role of ${term} in this subject.`,
        });
      }
    }

    return cards;
  }

  async generateStudyPlan(params: {
    subjectName: string;
    examDate: string;
    dailyHours: number;
    currentLevel: string;
    topics: string[];
  }): Promise<StudyPlanTaskGen[]> {
    const { subjectName, examDate, dailyHours, currentLevel, topics } = params;
    const effectiveTopics = topics.length > 0 ? topics : ['Core Foundations', 'Key Algorithms', 'Syntax & Models', 'Past Papers & Mock Exam'];

    const targetDate = new Date(examDate);
    const today = new Date();
    const diffDays = Math.max(3, Math.min(14, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24))));

    const tasks: StudyPlanTaskGen[] = [];
    const minutesPerDay = Math.round(dailyHours * 60);

    for (let day = 1; day <= diffDays; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day - 1);
      const dateStr = currentDate.toISOString().split('T')[0];

      const topicIndex = (day - 1) % effectiveTopics.length;
      const topic = effectiveTopics[topicIndex];

      if (day === diffDays) {
        tasks.push({
          day,
          dateStr,
          title: `Final Full Mock Exam & Revision: ${subjectName}`,
          description: `Complete a 30-minute timed mock exam, review all weak topics, and do quick flashcard recap.`,
          minutes: minutesPerDay,
          topic: 'Full Revision',
        });
      } else if (day % 3 === 0) {
        tasks.push({
          day,
          dateStr,
          title: `Practice Quizzes & Flashcards: ${topic}`,
          description: `Solve 15 MCQs and review spaced-repetition flashcards for ${topic}.`,
          minutes: minutesPerDay,
          topic,
        });
      } else {
        tasks.push({
          day,
          dateStr,
          title: `Deep Concept Study: ${topic}`,
          description: `Read lecture materials on ${topic}, generate summaries, and note down key formulas/theorems (${currentLevel} level).`,
          minutes: minutesPerDay,
          topic,
        });
      }
    }

    return tasks;
  }

  async analyzePerformance(params: {
    attempts: any[];
    subjectName: string;
  }): Promise<PerformanceAnalysisResult> {
    const { attempts, subjectName } = params;

    // Aggregate topic performance
    const topicStats: Record<string, { correct: number; total: number }> = {};

    for (const attempt of attempts) {
      if (attempt.answers_json) {
        try {
          const answers = JSON.parse(attempt.answers_json);
          for (const ans of answers) {
            const topic = ans.topic || 'General';
            if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
            topicStats[topic].total += 1;
            if (ans.isCorrect) topicStats[topic].correct += 1;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    const weakTopics: Array<{ topic: string; scorePercent: number }> = [];
    const strongTopics: Array<{ topic: string; scorePercent: number }> = [];

    for (const [topic, stats] of Object.entries(topicStats)) {
      const pct = Math.round((stats.correct / Math.max(stats.total, 1)) * 100);
      if (pct < 70) {
        weakTopics.push({ topic, scorePercent: pct });
      } else {
        strongTopics.push({ topic, scorePercent: pct });
      }
    }

    // Default if not enough quiz history
    if (weakTopics.length === 0 && strongTopics.length === 0) {
      weakTopics.push({ topic: 'Advanced Problem Solving', scorePercent: 55 });
      strongTopics.push({ topic: 'Core Definitions & Concepts', scorePercent: 88 });
    }

    const recommendations = [
      `Spend 45 minutes reviewing your weakest topic (${weakTopics[0]?.topic || 'Challenging Topics'}).`,
      `Practice 15 focused MCQs and inspect incorrect answer explanations.`,
      `Review all due flashcards using spaced repetition before bedtime.`,
      `Take a timed mock exam to test speed and accuracy under exam conditions.`,
    ];

    const studyActionPlan = `Based on your recent quizzes in ${subjectName}, your overall conceptual understanding is strong in ${strongTopics.map(t => t.topic).join(', ') || 'basic definitions'}, but you should reinforce ${weakTopics.map(t => t.topic).join(', ') || 'advanced applications'}. Follow today's recommendations to improve your score by 15-20%.`;

    return {
      weakTopics,
      strongTopics,
      recommendations,
      studyActionPlan,
    };
  }
}

// NLP Helper utilities
function extractSentences(text: string): string[] {
  return text
    .replace(/[\n\r]+/g, ' ')
    .split(/(?<=[.?!।])\s+/) // Splits English (.?!) and Bangla (।) sentence endings
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

function extractKeyTerms(text: string): string[] {
  const words = text
    .replace(/[^\w\s\u0980-\u09FF-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !isStopword(w));

  const frequencies: Record<string, number> = {};
  for (const word of words) {
    const norm = word.trim();
    // Capitalized words or technical terms get extra weight
    const weight = /^[A-Z]/.test(word) ? 2 : 1;
    frequencies[norm] = (frequencies[norm] || 0) + weight;
  }

  const sorted = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Remove duplicates case-insensitively
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const lower = item.toLowerCase();
    if (!seen.has(lower) && unique.length < 15) {
      seen.add(lower);
      unique.push(item);
    }
  }

  return unique.length > 0 ? unique : ['Compiler Architecture', 'Syntax Analysis', 'Parsing Algorithms', 'Code Optimization', 'Runtime Environment'];
}

function isStopword(w: string): boolean {
  const common = new Set([
    'the', 'and', 'this', 'that', 'with', 'from', 'have', 'were', 'which', 'their',
    'about', 'there', 'would', 'could', 'should', 'these', 'those', 'where', 'when',
    'what', 'they', 'your', 'also', 'such', 'into', 'than', 'then', 'some', 'other',
    'এবং', 'কিন্তু', 'অথবা', 'একটি', 'করা', 'হবে', 'থেকে', 'হলো', 'জন্য', 'আছে'
  ]);
  return common.has(w.toLowerCase());
}
