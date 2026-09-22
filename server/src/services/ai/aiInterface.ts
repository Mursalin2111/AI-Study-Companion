import { RetrievedChunk } from '../vectorStore.js';

export interface SummaryParams {
  content: string;
  type: 'short' | 'medium' | 'detailed' | 'exam';
  language: 'en' | 'bn';
}

export interface SummaryResult {
  summary: string;
  keyConcepts: string[];
}

export interface AskQuestionParams {
  question: string;
  contextChunks: RetrievedChunk[];
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  language: 'en' | 'bn';
  quickAction?: 'explain_simply' | 'explain_in_bangla' | 'give_example' | 'summarize' | 'exam_questions' | 'step_by_step';
}

export interface AskQuestionResult {
  answer: string;
  suggestedQuestions: string[];
}

export interface MCQQuestionGen {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
}

export interface ImportantQuestionGen {
  category: 'very_important' | 'important' | 'practice';
  type: 'short' | 'descriptive' | 'conceptual' | 'definition' | 'problem_solving' | 'viva';
  question: string;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FlashcardGen {
  front: string;
  back: string;
  topic: string;
  hint: string;
}

export interface StudyPlanTaskGen {
  day: number;
  dateStr: string;
  title: string;
  description: string;
  minutes: number;
  topic: string;
}

export interface PerformanceAnalysisResult {
  weakTopics: Array<{ topic: string; scorePercent: number }>;
  strongTopics: Array<{ topic: string; scorePercent: number }>;
  recommendations: string[];
  studyActionPlan: string;
}

export interface AIServiceProvider {
  name: string;
  generateSummary(params: SummaryParams): Promise<SummaryResult>;
  askQuestion(
    params: AskQuestionParams,
    onChunk?: (text: string) => void
  ): Promise<AskQuestionResult>;
  generateMCQs(params: {
    content: string;
    count: number;
    difficulty: string;
    language: 'en' | 'bn';
  }): Promise<MCQQuestionGen[]>;
  generateImportantQuestions(params: {
    content: string;
    language: 'en' | 'bn';
  }): Promise<ImportantQuestionGen[]>;
  generateFlashcards(params: {
    content: string;
    count: number;
    language: 'en' | 'bn';
  }): Promise<FlashcardGen[]>;
  generateStudyPlan(params: {
    subjectName: string;
    examDate: string;
    dailyHours: number;
    currentLevel: string;
    topics: string[];
  }): Promise<StudyPlanTaskGen[]>;
  analyzePerformance(params: {
    attempts: any[];
    subjectName: string;
  }): Promise<PerformanceAnalysisResult>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
