import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAIService } from '../services/ai/aiService.js';
import { Note } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/notes
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = req.query.subjectId as string | undefined;

    let sql = `
      SELECT 
        n.*,
        s.name AS subject_name,
        s.color AS subject_color
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.user_id = ?
    `;
    const params: any[] = [userId];

    if (subjectId) {
      sql += ' AND n.subject_id = ?';
      params.push(subjectId);
    }

    sql += ' ORDER BY n.updated_at DESC';

    const notes = query(sql, params).map((n: any) => ({
      ...n,
      tags: JSON.parse(n.tags_json || '[]'),
    }));

    res.json({ notes });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notes.' });
  }
});

// GET /api/notes/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const note = queryOne<any>(
      `SELECT n.*, s.name AS subject_name, s.color AS subject_color
       FROM notes n
       LEFT JOIN subjects s ON n.subject_id = s.id
       WHERE n.id = ? AND n.user_id = ?`,
      [id, userId]
    );

    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    res.json({
      note: {
        ...note,
        tags: JSON.parse(note.tags_json || '[]'),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch note.' });
  }
});

// POST /api/notes
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subjectId, title, contentMarkdown, tags } = req.body;

    if (!title || title.trim().length === 0) {
      res.status(400).json({ error: 'Note title is required.' });
      return;
    }

    const id = uuidv4();
    execute(
      `INSERT INTO notes (id, subject_id, user_id, title, content_markdown, tags_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        subjectId || null,
        userId,
        title.trim(),
        contentMarkdown || '',
        JSON.stringify(tags || []),
      ]
    );

    const note = queryOne('SELECT * FROM notes WHERE id = ?', [id]);
    res.status(201).json({ note });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create note.' });
  }
});

// PUT /api/notes/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { subjectId, title, contentMarkdown, tags } = req.body;

    const existing = queryOne('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    execute(
      `UPDATE notes SET
        subject_id = COALESCE(?, subject_id),
        title = COALESCE(?, title),
        content_markdown = COALESCE(?, content_markdown),
        tags_json = COALESCE(?, tags_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [subjectId, title, contentMarkdown, tags ? JSON.stringify(tags) : null, id, userId]
    );

    const updated = queryOne('SELECT * FROM notes WHERE id = ?', [id]);
    res.json({ note: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update note.' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Note deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete note.' });
  }
});

// POST /api/notes/:id/ai-action
router.post('/:id/ai-action', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { action, language = 'en' } = req.body; // 'summarize' | 'improve' | 'convert_flashcards' | 'convert_quiz'

    const note = queryOne<Note>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    if (!note.content_markdown || note.content_markdown.trim().length === 0) {
      res.status(400).json({ error: 'Note is empty. Please add text to run AI actions.' });
      return;
    }

    const aiService = getAIService();

    if (action === 'summarize') {
      const summaryResult = await aiService.generateSummary({
        content: note.content_markdown,
        type: 'short',
        language,
      });
      res.json({ result: summaryResult.summary });
      return;
    }

    if (action === 'improve') {
      const promptResult = await aiService.askQuestion({
        question: 'Refine, polish, and structure these academic notes into high-clarity revision notes with bullet points and key definitions.',
        contextChunks: [{
          id: note.id,
          material_id: note.id,
          chunk_index: 0,
          content: note.content_markdown,
          section_heading: note.title,
          page_number: 1,
          similarity: 1.0,
        }],
        history: [],
        language,
      });
      res.json({ result: promptResult.answer });
      return;
    }

    if (action === 'convert_flashcards') {
      const cards = await aiService.generateFlashcards({
        content: note.content_markdown,
        count: 6,
        language,
      });

      const deckId = uuidv4();
      const today = new Date().toISOString().split('T')[0];

      withTransaction(() => {
        execute(
          `INSERT INTO flashcard_decks (id, subject_id, user_id, title, description)
           VALUES (?, ?, ?, ?, ?)`,
          [deckId, note.subject_id, userId, `Cards: ${note.title}`, `Generated from personal note: ${note.title}`]
        );

        for (const c of cards) {
          execute(
            `INSERT INTO flashcards (id, deck_id, user_id, front, back, topic, hint, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), deckId, userId, c.front, c.back, c.topic, c.hint, today]
          );
        }
      });

      res.json({ success: true, deckId, count: cards.length });
      return;
    }

    if (action === 'convert_quiz') {
      const mcqs = await aiService.generateMCQs({
        content: note.content_markdown,
        count: 5,
        difficulty: 'medium',
        language,
      });

      const quizId = uuidv4();
      withTransaction(() => {
        execute(
          `INSERT INTO quizzes (id, subject_id, user_id, title, description, time_limit_mins, total_questions, difficulty)
           VALUES (?, ?, ?, ?, ?, 10, ?, 'medium')`,
          [quizId, note.subject_id, userId, `Quiz: ${note.title}`, `Practice quiz generated from note: ${note.title}`, mcqs.length]
        );

        for (const m of mcqs) {
          execute(
            `INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options_json, correct_answer, explanation, topic)
             VALUES (?, ?, ?, 'mcq', ?, ?, ?, ?)`,
            [uuidv4(), quizId, m.question, JSON.stringify(m.options), m.correctAnswer, m.explanation, m.topic]
          );
        }
      });

      res.json({ success: true, quizId, count: mcqs.length });
      return;
    }

    res.status(400).json({ error: 'Invalid AI action.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI action failed.' });
  }
});

export default router;
