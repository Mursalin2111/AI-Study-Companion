import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { Subject } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/subjects
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const includeArchived = req.query.includeArchived === 'true';

    let sql = `
      SELECT 
        s.*,
        COUNT(DISTINCT m.id) AS material_count,
        COUNT(DISTINCT q.id) AS quiz_count,
        COUNT(DISTINCT fd.id) AS deck_count,
        COUNT(DISTINCT n.id) AS note_count
      FROM subjects s
      LEFT JOIN materials m ON s.id = m.subject_id
      LEFT JOIN quizzes q ON s.id = q.subject_id
      LEFT JOIN flashcard_decks fd ON s.id = fd.subject_id
      LEFT JOIN notes n ON s.id = n.subject_id
      WHERE s.user_id = ?
    `;

    if (!includeArchived) {
      sql += ' AND s.is_archived = 0';
    }

    sql += ' GROUP BY s.id ORDER BY s.created_at DESC';

    const subjects = query<any>(sql, [userId]);
    res.json({ subjects });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subjects.' });
  }
});

// POST /api/subjects
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, code, description, instructor, color, icon, examDate } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Subject name is required.' });
      return;
    }

    const id = uuidv4();
    execute(
      `INSERT INTO subjects (
        id, user_id, name, code, description, instructor, color, icon, exam_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        name.trim(),
        code ? code.trim() : '',
        description ? description.trim() : '',
        instructor ? instructor.trim() : '',
        color || '#3B82F6',
        icon || 'BookOpen',
        examDate || null,
      ]
    );

    const subject = queryOne<Subject>('SELECT * FROM subjects WHERE id = ?', [id]);
    res.status(201).json({ subject });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create subject.' });
  }
});

// GET /api/subjects/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const subject = queryOne<Subject>('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const materials = query('SELECT * FROM materials WHERE subject_id = ? ORDER BY created_at DESC', [id]);
    const quizzes = query('SELECT * FROM quizzes WHERE subject_id = ? ORDER BY created_at DESC', [id]);
    const decks = query('SELECT * FROM flashcard_decks WHERE subject_id = ? ORDER BY created_at DESC', [id]);
    const notes = query('SELECT * FROM notes WHERE subject_id = ? ORDER BY created_at DESC', [id]);
    const studyPlan = queryOne('SELECT * FROM study_plans WHERE subject_id = ? ORDER BY created_at DESC LIMIT 1', [id]);

    res.json({
      subject,
      materials,
      quizzes,
      flashcardDecks: decks,
      notes,
      studyPlan,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subject details.' });
  }
});

// PUT /api/subjects/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, code, description, instructor, color, icon, examDate } = req.body;

    const existing = queryOne('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    execute(
      `UPDATE subjects SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        instructor = COALESCE(?, instructor),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        exam_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [name, code, description, instructor, color, icon, examDate !== undefined ? examDate : null, id, userId]
    );

    const subject = queryOne<Subject>('SELECT * FROM subjects WHERE id = ?', [id]);
    res.json({ subject });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update subject.' });
  }
});

// PUT /api/subjects/:id/archive
router.put('/:id/archive', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const subject = queryOne<Subject>('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const newStatus = subject.is_archived === 1 ? 0 : 1;
    execute('UPDATE subjects SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, id]);

    res.json({ success: true, isArchived: newStatus === 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle archive.' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = queryOne('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    execute('DELETE FROM subjects WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete subject.' });
  }
});

export default router;
