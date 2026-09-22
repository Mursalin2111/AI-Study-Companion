import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAIService } from '../services/ai/aiService.js';
import { Quiz, QuizQuestion, QuizAttempt } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/quizzes
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = req.query.subjectId as string | undefined;

    let sql = `
      SELECT 
        q.*,
        s.name AS subject_name,
        s.color AS subject_color,
        (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = ?) AS attempt_count,
        (SELECT MAX(accuracy) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = ?) AS best_accuracy
      FROM quizzes q
      LEFT JOIN subjects s ON q.subject_id = s.id
      WHERE q.user_id = ?
    `;
    const params: any[] = [userId, userId, userId];

    if (subjectId) {
      sql += ' AND q.subject_id = ?';
      params.push(subjectId);
    }

    sql += ' ORDER BY q.created_at DESC';

    const quizzes = query(sql, params);
    res.json({ quizzes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quizzes.' });
  }
});

// GET /api/quizzes/attempts/recent
router.get('/attempts/recent', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempts = query(
      `SELECT a.*, q.title AS quiz_title, q.is_mock_exam, s.name AS subject_name, s.color AS subject_color
       FROM quiz_attempts a
       JOIN quizzes q ON a.quiz_id = q.id
       LEFT JOIN subjects s ON q.subject_id = s.id
       WHERE a.user_id = ?
       ORDER BY a.completed_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ attempts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch recent attempts.' });
  }
});

// GET /api/quizzes/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const quiz = queryOne<Quiz>(
      `SELECT q.*, s.name AS subject_name FROM quizzes q LEFT JOIN subjects s ON q.subject_id = s.id WHERE q.id = ? AND q.user_id = ?`,
      [id, userId]
    );

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }

    const rawQuestions = query<QuizQuestion>('SELECT * FROM quiz_questions WHERE quiz_id = ?', [id]);
    const questions = rawQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json),
    }));

    res.json({ quiz, questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quiz.' });
  }
});

// POST /api/quizzes/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      materialId,
      subjectId,
      title,
      questionCount = 10,
      difficulty = 'medium',
      isMockExam = false,
      durationMinutes,
      language = 'en',
    } = req.body;

    let content = '';
    let effectiveSubjectId = subjectId;

    if (materialId) {
      const material = queryOne<any>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [materialId, userId]);
      if (!material) {
        res.status(404).json({ error: 'Material not found.' });
        return;
      }
      effectiveSubjectId = material.subject_id;
      const chunks = query<any>('SELECT content FROM document_chunks WHERE material_id = ? ORDER BY chunk_index ASC LIMIT 20', [materialId]);
      content = chunks.map(c => c.content).join('\n\n') || material.extracted_text || '';
    } else if (subjectId) {
      const chunks = query<any>(
        `SELECT c.content FROM document_chunks c
         JOIN materials m ON c.material_id = m.id
         WHERE m.subject_id = ? AND m.user_id = ?
         ORDER BY RANDOM() LIMIT 20`,
        [subjectId, userId]
      );
      content = chunks.map(c => c.content).join('\n\n');
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'No content available to generate quiz from. Please upload study materials first.' });
      return;
    }

    const aiService = getAIService();
    const generated = await aiService.generateMCQs({
      content,
      count: Number(questionCount) || 10,
      difficulty,
      language,
    });

    if (generated.length === 0) {
      res.status(500).json({ error: 'Could not generate questions from the selected material.' });
      return;
    }

    const quizId = uuidv4();
    const timeLimit = durationMinutes || (isMockExam ? Math.max(20, generated.length * 2) : Math.max(10, generated.length * 1.5));
    const quizTitle = title || (isMockExam ? `Mock Exam (${generated.length} Questions)` : `Practice Quiz: ${difficulty.toUpperCase()}`);

    withTransaction(() => {
      execute(
        `INSERT INTO quizzes (
          id, subject_id, material_id, user_id, title, description, time_limit_mins, total_questions, difficulty, is_mock_exam
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quizId,
          effectiveSubjectId || null,
          materialId || null,
          userId,
          quizTitle,
          `AI-generated ${isMockExam ? 'comprehensive mock examination' : 'practice quiz'} testing core competencies.`,
          timeLimit,
          generated.length,
          difficulty,
          isMockExam ? 1 : 0,
        ]
      );

      for (const q of generated) {
        execute(
          `INSERT INTO quiz_questions (
            id, quiz_id, question_text, question_type, options_json, correct_answer, explanation, topic, points
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            quizId,
            q.question,
            'mcq',
            JSON.stringify(q.options),
            q.correctAnswer,
            q.explanation || 'Based on source document notes.',
            q.topic || 'Core Subject',
            1,
          ]
        );
      }
    });

    const createdQuiz = queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    const questions = query<QuizQuestion>('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quizId]).map(q => ({
      ...q,
      options: JSON.parse(q.options_json),
    }));

    res.status(201).json({ quiz: createdQuiz, questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate quiz.' });
  }
});

// POST /api/quizzes/:id/submit
router.post('/:id/submit', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { answers, timeSpentSecs = 0 } = req.body;

    const quiz = queryOne<Quiz>('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }

    const questions = query<QuizQuestion>('SELECT * FROM quiz_questions WHERE quiz_id = ?', [id]);
    let score = 0;
    let totalPoints = 0;

    const answersRecord: any[] = [];
    const topicStats: Record<string, { correct: number; total: number }> = {};

    for (const q of questions) {
      totalPoints += q.points;
      const studentAnswer = answers ? answers[q.id] : null;
      const isCorrect = studentAnswer && studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

      if (isCorrect) {
        score += q.points;
      }

      const topic = q.topic || 'General Topic';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total += 1;
      if (isCorrect) topicStats[topic].correct += 1;

      answersRecord.push({
        questionId: q.id,
        questionText: q.question_text,
        studentAnswer,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
        topic,
      });
    }

    const accuracy = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    const weakTopics: Array<{ topic: string; scorePercent: number }> = [];
    const strongTopics: Array<{ topic: string; scorePercent: number }> = [];

    for (const [topic, stat] of Object.entries(topicStats)) {
      const pct = Math.round((stat.correct / stat.total) * 100);
      if (pct < 70) {
        weakTopics.push({ topic, scorePercent: pct });
      } else {
        strongTopics.push({ topic, scorePercent: pct });
      }
    }

    const aiFeedback = accuracy >= 80
      ? 'Outstanding performance! You have a solid grasp of this material.'
      : accuracy >= 60
      ? 'Good job! A bit more practice on your weaker topics will get you into the top grade bracket.'
      : 'Review the explanations for the incorrect questions and practice your weak areas.';

    const attemptId = uuidv4();
    execute(
      `INSERT INTO quiz_attempts (
        id, quiz_id, user_id, score, total_points, accuracy, time_spent_secs,
        answers_json, weak_topics_json, strong_topics_json, ai_feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        id,
        userId,
        score,
        totalPoints,
        accuracy,
        timeSpentSecs,
        JSON.stringify(answersRecord),
        JSON.stringify(weakTopics),
        JSON.stringify(strongTopics),
        aiFeedback,
      ]
    );

    // Calculate XP: 50 XP base + bonus for accuracy
    const xpGained = 40 + Math.round(accuracy * 0.6);
    execute('UPDATE profiles SET xp = xp + ?, streak_count = MAX(streak_count, 1) WHERE user_id = ?', [xpGained, userId]);

    // Record activity log
    execute(
      `INSERT INTO study_activity_logs (id, user_id, subject_id, activity_type, duration_minutes, xp_earned)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        quiz.subject_id,
        quiz.is_mock_exam ? 'mock_exam' : 'quiz',
        Math.ceil(timeSpentSecs / 60) || 5,
        xpGained,
      ]
    );

    res.json({
      attemptId,
      score,
      totalPoints,
      accuracy,
      timeSpentSecs,
      answers: answersRecord,
      weakTopics,
      strongTopics,
      aiFeedback,
      xpGained,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit quiz.' });
  }
});

export default router;
