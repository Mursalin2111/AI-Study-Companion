export interface UserProfile {
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
}

export interface User {
  id: string;
  email: string;
  role: 'student' | 'admin';
  profile: UserProfile;
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
  is_archived: number;
  material_count?: number;
  quiz_count?: number;
  deck_count?: number;
  note_count?: number;
  created_at: string;
}

export interface Material {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_color?: string;
  title: string;
  filename: string;
  file_size: number;
  file_type: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

export interface Summary {
  id: string;
  material_id: string;
  type: 'short' | 'medium' | 'detailed' | 'exam';
  language: 'en' | 'bn';
  content: string;
  key_concepts_json: string;
  created_at: string;
}

export interface Question {
  id: string;
  material_id: string;
  category: 'very_important' | 'important' | 'practice';
  type: string;
  question: string;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface Quiz {
  id: string;
  subject_id: string | null;
  subject_name?: string;
  subject_color?: string;
  title: string;
  description: string;
  time_limit_mins: number;
  total_questions: number;
  difficulty: string;
  is_mock_exam: number;
  attempt_count?: number;
  best_accuracy?: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
  topic: string;
  points: number;
}

export interface FlashcardDeck {
  id: string;
  subject_id: string | null;
  subject_name?: string;
  title: string;
  description: string;
  total_cards?: number;
  due_cards?: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  topic: string;
  hint: string | null;
  is_bookmarked: number;
  interval: number;
  repetition: number;
  ease_factor: number;
  due_date: string;
}

export interface StudyPlan {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_color?: string;
  exam_date: string;
  daily_hours: number;
  current_level: string;
  target_grade: string;
  total_tasks?: number;
  completed_tasks?: number;
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
}

export interface Note {
  id: string;
  subject_id: string | null;
  subject_name?: string;
  title: string;
  content_markdown: string;
  tags: string[];
  updated_at: string;
}

export interface AnalyticsData {
  overview: {
    subjectCount: number;
    materialCount: number;
    flashcardCount: number;
    notesCount: number;
    studyTimeMinutes: number;
    questionsAnswered: number;
    quizAccuracy: number;
    currentStreak: number;
    xp: number;
    level: number;
  };
  weeklyActivity: Array<{
    date: string;
    dayName: string;
    minutes: number;
    xp: number;
  }>;
  weakTopics: Array<{ topic: string; scorePercent: number }>;
  strongTopics: Array<{ topic: string; scorePercent: number }>;
  upcomingExams: Array<{ id: string; name: string; code: string; color: string; exam_date: string }>;
  recommendations: Array<{ type: string; title: string; description: string; actionUrl: string }>;
  badges: Array<{ code: string; title: string; description: string; icon: string; isUnlocked: boolean }>;
}
