import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAIService } from '../services/ai/aiService.js';
import { StudyPlan, StudyTask } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/study-plans
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const plans = query(
      `SELECT 
        p.*,
        s.name AS subject_name,
        s.color AS subject_color,
        (SELECT COUNT(*) FROM study_tasks WHERE plan_id = p.id) AS total_tasks,
        (SELECT COUNT(*) FROM study_tasks WHERE plan_id = p.id AND is_completed = 1) AS completed_tasks
      FROM study_plans p
      JOIN subjects s ON p.subject_id = s.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json({ plans });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch study plans.' });
  }
});

// GET /api/study-plans/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const plan = queryOne<any>(
      `SELECT p.*, s.name AS subject_name, s.color AS subject_color
       FROM study_plans p
       JOIN subjects s ON p.subject_id = s.id
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    );

    if (!plan) {
      res.status(404).json({ error: 'Study plan not found.' });
      return;
    }

    const tasks = query<StudyTask>(
      'SELECT * FROM study_tasks WHERE plan_id = ? ORDER BY day_number ASC, id ASC',
      [id]
    );

    res.json({ plan, tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch study plan details.' });
  }
});

// POST /api/study-plans/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subjectId, examDate, dailyHours = 2, currentLevel = 'intermediate', targetGrade = 'A' } = req.body;

    if (!subjectId || !examDate) {
      res.status(400).json({ error: 'subjectId and examDate are required.' });
      return;
    }

    const subject = queryOne<any>('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    // Extract topics from subject materials
    const chunks = query<any>(
      `SELECT DISTINCT section_heading FROM document_chunks c
       JOIN materials m ON c.material_id = m.id
       WHERE m.subject_id = ? AND m.user_id = ? LIMIT 10`,
      [subjectId, userId]
    );
    const topics = chunks.map(c => c.section_heading).filter(Boolean);

    const aiService = getAIService();
    const tasks = await aiService.generateStudyPlan({
      subjectName: subject.name,
      examDate,
      dailyHours: Number(dailyHours),
      currentLevel,
      topics,
    });

    const planId = uuidv4();

    withTransaction(() => {
      execute(
        `INSERT INTO study_plans (id, subject_id, user_id, exam_date, daily_hours, current_level, target_grade)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [planId, subjectId, userId, examDate, Number(dailyHours), currentLevel, targetGrade]
      );

      // Also update exam_date on subject
      execute('UPDATE subjects SET exam_date = ? WHERE id = ?', [examDate, subjectId]);

      for (const t of tasks) {
        execute(
          `INSERT INTO study_tasks (
            id, plan_id, day_number, date_str, title, description, estimated_minutes, topic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            planId,
            t.day,
            t.dateStr,
            t.title,
            t.description,
            t.minutes,
            t.topic,
          ]
        );
      }
    });

    execute('UPDATE profiles SET xp = xp + 30 WHERE user_id = ?', [userId]);

    const createdPlan = queryOne('SELECT * FROM study_plans WHERE id = ?', [planId]);
    const planTasks = query('SELECT * FROM study_tasks WHERE plan_id = ? ORDER BY day_number ASC', [planId]);

    res.status(201).json({ plan: createdPlan, tasks: planTasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate study plan.' });
  }
});

// PUT /api/study-plans/tasks/:id/toggle
router.put('/tasks/:id/toggle', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const task = queryOne<any>(
      `SELECT t.* FROM study_tasks t
       JOIN study_plans p ON t.plan_id = p.id
       WHERE t.id = ? AND p.user_id = ?`,
      [id, userId]
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const newCompleted = task.is_completed === 1 ? 0 : 1;
    const now = newCompleted ? new Date().toISOString() : null;

    execute('UPDATE study_tasks SET is_completed = ?, completed_at = ? WHERE id = ?', [newCompleted, now, id]);

    if (newCompleted) {
      execute('UPDATE profiles SET xp = xp + 15 WHERE user_id = ?', [userId]);
    }

    const updated = queryOne('SELECT * FROM study_tasks WHERE id = ?', [id]);
    res.json({ task: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle task.' });
  }
});

// DELETE /api/study-plans/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    execute('DELETE FROM study_plans WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Study plan deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete study plan.' });
  }
});

export default router;
