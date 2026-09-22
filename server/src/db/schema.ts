import { executeRaw } from './connection.js';

export function initializeDatabase(): void {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      university TEXT DEFAULT '',
      department TEXT DEFAULT '',
      semester TEXT DEFAULT '',
      preferred_language TEXT DEFAULT 'en',
      study_goals TEXT DEFAULT '',
      streak_count INTEGER DEFAULT 0,
      last_study_date TEXT DEFAULT NULL,
      xp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Subjects table
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      description TEXT DEFAULT '',
      instructor TEXT DEFAULT '',
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'BookOpen',
      exam_date TEXT DEFAULT NULL,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Materials table
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploading',
      error_message TEXT DEFAULT NULL,
      extracted_text TEXT DEFAULT NULL,
      chunk_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Document Chunks for RAG and Vector Search
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      section_heading TEXT DEFAULT '',
      page_number INTEGER DEFAULT 1,
      embedding_json TEXT DEFAULT NULL,
      token_count INTEGER DEFAULT 0,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    -- AI Conversations
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT DEFAULT NULL,
      material_id TEXT DEFAULT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
    );

    -- AI Messages
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources_json TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );

    -- Summaries
    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- short, medium, detailed, exam
      language TEXT NOT NULL DEFAULT 'en',
      content TEXT NOT NULL,
      key_concepts_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Questions
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL, -- very_important, important, practice
      type TEXT NOT NULL, -- short, descriptive, conceptual, definition, problem_solving, viva
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      source_reference TEXT DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Quizzes & Mock Exams
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      subject_id TEXT DEFAULT NULL,
      material_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      time_limit_mins INTEGER DEFAULT 15,
      total_questions INTEGER NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      is_mock_exam INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Quiz Questions
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'mcq',
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      topic TEXT DEFAULT '',
      points INTEGER DEFAULT 1,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    -- Quiz Attempts
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score REAL NOT NULL,
      total_points INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      time_spent_secs INTEGER NOT NULL,
      answers_json TEXT NOT NULL,
      weak_topics_json TEXT DEFAULT '[]',
      strong_topics_json TEXT DEFAULT '[]',
      ai_feedback TEXT DEFAULT '',
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Flashcard Decks
    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id TEXT PRIMARY KEY,
      subject_id TEXT DEFAULT NULL,
      material_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Flashcards with SM-2 Spaced Repetition Fields
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      topic TEXT DEFAULT '',
      hint TEXT DEFAULT NULL,
      is_bookmarked INTEGER DEFAULT 0,
      interval INTEGER DEFAULT 0,
      repetition INTEGER DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,
      due_date TEXT NOT NULL,
      last_reviewed_at TEXT DEFAULT NULL,
      FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Flashcard Reviews
    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id TEXT PRIMARY KEY,
      flashcard_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating TEXT NOT NULL, -- again, hard, good, easy
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Plans
    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      daily_hours REAL DEFAULT 2.0,
      current_level TEXT DEFAULT 'intermediate',
      target_grade TEXT DEFAULT 'A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Tasks
    CREATE TABLE IF NOT EXISTS study_tasks (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      date_str TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      estimated_minutes INTEGER DEFAULT 45,
      topic TEXT DEFAULT '',
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME DEFAULT NULL,
      FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
    );

    -- Personal Notes
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      subject_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      tags_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Activity Logs
    CREATE TABLE IF NOT EXISTS study_activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT DEFAULT NULL,
      activity_type TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      link TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Achievements
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, badge_code)
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
    CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject_id);
    CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_material ON document_chunks(material_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ai_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_questions_material ON questions(material_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(due_date);
    CREATE INDEX IF NOT EXISTS idx_study_tasks_plan ON study_tasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON study_activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `;

  executeRaw(schema);
}
