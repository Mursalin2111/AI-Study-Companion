import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { searchSimilarChunks } from '../services/vectorStore.js';

const router = Router();
router.use(authenticateToken);

// GET /api/search?q=...
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const q = ((req.query.q as string) || '').trim();

    if (!q || q.length < 2) {
      res.json({
        subjects: [],
        materials: [],
        chunks: [],
        notes: [],
        flashcards: [],
        questions: [],
      });
      return;
    }

    const pattern = `%${q}%`;

    // 1. Search subjects
    const subjects = query(
      `SELECT id, name, code, description, color, icon FROM subjects 
       WHERE user_id = ? AND (name LIKE ? OR code LIKE ? OR description LIKE ?) LIMIT 5`,
      [userId, pattern, pattern, pattern]
    );

    // 2. Search materials
    const materials = query(
      `SELECT m.id, m.title, m.filename, m.file_type, m.status, s.name AS subject_name, s.color AS subject_color
       FROM materials m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.user_id = ? AND (m.title LIKE ? OR m.filename LIKE ?) LIMIT 5`,
      [userId, pattern, pattern]
    );

    // 3. Search notes
    const notes = query(
      `SELECT n.id, n.title, SUBSTR(n.content_markdown, 1, 150) AS snippet, s.name AS subject_name
       FROM notes n
       LEFT JOIN subjects s ON n.subject_id = s.id
       WHERE n.user_id = ? AND (n.title LIKE ? OR n.content_markdown LIKE ?) LIMIT 5`,
      [userId, pattern, pattern]
    );

    // 4. Search flashcards
    const flashcards = query(
      `SELECT f.id, f.front, f.back, f.topic, d.title AS deck_title
       FROM flashcards f
       JOIN flashcard_decks d ON f.deck_id = d.id
       WHERE f.user_id = ? AND (f.front LIKE ? OR f.back LIKE ? OR f.topic LIKE ?) LIMIT 5`,
      [userId, pattern, pattern, pattern]
    );

    // 5. Search questions
    const questions = query(
      `SELECT q.id, q.category, q.type, q.question, q.answer, q.difficulty, m.title AS material_title
       FROM questions q
       JOIN materials m ON q.material_id = m.id
       WHERE q.user_id = ? AND (q.question LIKE ? OR q.answer LIKE ?) LIMIT 5`,
      [userId, pattern, pattern]
    );

    // 6. Semantic document chunks search
    const chunks = searchSimilarChunks(q, null, {
      userId,
      topK: 5,
      minSimilarity: 0.15,
    }).map(c => ({
      id: c.id,
      materialId: c.material_id,
      materialTitle: c.material_title,
      pageNumber: c.page_number,
      sectionHeading: c.section_heading,
      snippet: c.content.slice(0, 200) + '...',
      similarity: Math.round(c.similarity * 100),
    }));

    res.json({
      query: q,
      subjects,
      materials,
      chunks,
      notes,
      flashcards,
      questions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search failed.' });
  }
});

export default router;
