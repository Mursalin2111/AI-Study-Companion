export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  name: string;
  avatar_url: string;
  university: string;
  department: string;
  semester: string;
  preferred_language: 'en' | 'bn';
  study_goals: string;
  streak_count: number;
  last_study_date: string | null;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string;
  description: string;
  instructor: string;
  color: string;
  icon: string;
  exam_date: string | null;
  is_archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export type MaterialStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Material {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: MaterialStatus;
  error_message: string | null;
  extracted_text: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  material_id: string;
  chunk_index: number;
  content: string;
  section_heading: string;
  page_number: number;
  embedding_json: string | null;
  token_count: number;
}

export interface AIConversation {
  id: string;
  user_id: string;
  subject_id: string | null;
  material_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources_json: string | null;
  created_at: string;
}

export type SummaryType = 'short' | 'medium' | 'detailed' | 'exam';

export interface Summary {
  id: string;
  material_id: string;
  user_id: string;
  type: SummaryType;
  language: 'en' | 'bn';
  content: string;
  key_concepts_json: string;
  created_at: string;
}

export type QuestionCategory = 'very_important' | 'important' | 'practice';
export type QuestionType = 'short' | 'descriptive' | 'conceptual' | 'definition' | 'problem_solving' | 'viva';

export interface Question {
  id: string;
  material_id: string;
  user_id: string;
  category: QuestionCategory;
  type: QuestionType;
  question: string;
  answer: string;
  explanation: string;
  source_reference: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface Quiz {
  id: string;
  subject_id: string | null;
  material_id: string | null;
  user_id: string;
  title: string;
  description: string;
  time_limit_mins: number;
  total_questions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  is_mock_exam: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'mcq' | 'short_answer' | 'problem_solving';
  options_json: string; // JSON string array of options
  correct_answer: string;
  explanation: string;
  topic: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_points: number;
  accuracy: number;
  time_spent_secs: number;
  answers_json: string;
  weak_topics_json: string;
  strong_topics_json: string;
  ai_feedback: string;
  completed_at: string;
}

export interface FlashcardDeck {
  id: string;
  subject_id: string | null;
  material_id: string | null;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  topic: string;
  hint: string | null;
  is_bookmarked: number;
  interval: number;
  repetition: number;
  ease_factor: number;
  due_date: string;
  last_reviewed_at: string | null;
}

export interface StudyPlan {
  id: string;
  subject_id: string;
  user_id: string;
  exam_date: string;
  daily_hours: number;
  current_level: 'beginner' | 'intermediate' | 'advanced';
  target_grade: string;
  created_at: string;
  updated_at: string;
}

export interface StudyTask {
  id: string;
  plan_id: string;
  day_number: number;
  date_str: string;
  title: string;
  description: string;
  estimated_minutes: number;
  topic: string;
  is_completed: number;
  completed_at: string | null;
}

export interface Note {
  id: string;
  subject_id: string | null;
  user_id: string;
  title: string;
  content_markdown: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
}

export interface StudyActivityLog {
  id: string;
  user_id: string;
  subject_id: string | null;
  activity_type: 'reading' | 'quiz' | 'flashcards' | 'ask_ai' | 'mock_exam';
  duration_minutes: number;
  xp_earned: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'study_reminder' | 'exam_reminder' | 'streak' | 'achievement' | 'quiz_result';
  is_read: number;
  link: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}
