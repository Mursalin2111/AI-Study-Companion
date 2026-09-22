import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateSM2, FlashcardRating } from '../services/spacedRepetition.js';
import { getAIService } from '../services/ai/aiService.js';
import { Flashcard, FlashcardDeck } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/flashcards/decks
router.get('/decks', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = req.query.subjectId as string | undefined;
    const today = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT 
        d.*,
        s.name AS subject_name,
        s.color AS subject_color,
        (SELECT COUNT(*) FROM flashcards WHERE deck_id = d.id) AS total_cards,
        (SELECT COUNT(*) FROM flashcards WHERE deck_id = d.id AND due_date <= ?) AS due_cards
      FROM flashcard_decks d
      LEFT JOIN subjects s ON d.subject_id = s.id
      WHERE d.user_id = ?
    `;
    const params: any[] = [today, userId];

    if (subjectId) {
      sql += ' AND d.subject_id = ?';
      params.push(subjectId);
    }

    sql += ' ORDER BY d.created_at DESC';

    const decks = query(sql, params);
    res.json({ decks });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch decks.' });
  }
});

// POST /api/flashcards/decks
router.post('/decks', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, subjectId, materialId } = req.body;

    if (!title || title.trim().length === 0) {
      res.status(400).json({ error: 'Deck title is required.' });
      return;
    }

    const id = uuidv4();
    execute(
      `INSERT INTO flashcard_decks (id, subject_id, material_id, user_id, title, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, subjectId || null, materialId || null, userId, title.trim(), description || '']
    );

    const deck = queryOne('SELECT * FROM flashcard_decks WHERE id = ?', [id]);
    res.status(201).json({ deck });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create deck.' });
  }
});

// GET /api/flashcards/decks/:id
router.get('/decks/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const dueOnly = req.query.dueOnly === 'true';
    const today = new Date().toISOString().split('T')[0];

    const deck = queryOne<FlashcardDeck>(
      `SELECT d.*, s.name AS subject_name FROM flashcard_decks d LEFT JOIN subjects s ON d.subject_id = s.id WHERE d.id = ? AND d.user_id = ?`,
      [id, userId]
    );

    if (!deck) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    let cardsSql = 'SELECT * FROM flashcards WHERE deck_id = ? AND user_id = ?';
    const params: any[] = [id, userId];

    if (dueOnly) {
      cardsSql += ' AND due_date <= ?';
      params.push(today);
    }

    cardsSql += ' ORDER BY due_date ASC, id ASC';

    const cards = query<Flashcard>(cardsSql, params);
    res.json({ deck, cards });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch flashcards.' });
  }
});

// POST /api/flashcards/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { materialId, deckTitle, count = 8, language = 'en' } = req.body;

    if (!materialId) {
      res.status(400).json({ error: 'materialId is required.' });
      return;
    }

    const material = queryOne<any>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [materialId, userId]);
    if (!material) {
      res.status(404).json({ error: 'Material not found.' });
      return;
    }

    const chunks = query<any>('SELECT content FROM document_chunks WHERE material_id = ? ORDER BY chunk_index ASC LIMIT 20', [materialId]);
    const content = chunks.map(c => c.content).join('\n\n') || material.extracted_text || '';

    const aiService = getAIService();
    const generated = await aiService.generateFlashcards({
      content,
      count: Number(count) || 8,
      language,
    });

    const deckId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    withTransaction(() => {
      execute(
        `INSERT INTO flashcard_decks (id, subject_id, material_id, user_id, title, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          deckId,
          material.subject_id,
          materialId,
          userId,
          deckTitle || `Flashcards: ${material.title}`,
          `Generated from ${material.title} (${generated.length} cards)`,
        ]
      );

      for (const card of generated) {
        execute(
          `INSERT INTO flashcards (
            id, deck_id, user_id, front, back, topic, hint, due_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            deckId,
            userId,
            card.front,
            card.back,
            card.topic || 'General',
            card.hint || null,
            today,
          ]
        );
      }
    });

    const createdDeck = queryOne('SELECT * FROM flashcard_decks WHERE id = ?', [deckId]);
    const cards = query('SELECT * FROM flashcards WHERE deck_id = ?', [deckId]);

    execute('UPDATE profiles SET xp = xp + 25 WHERE user_id = ?', [userId]);

    res.status(201).json({ deck: createdDeck, cards });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate flashcards.' });
  }
});

// POST /api/flashcards
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { deckId, front, back, topic, hint } = req.body;

    if (!deckId || !front || !back) {
      res.status(400).json({ error: 'deckId, front, and back are required.' });
      return;
    }

    const deck = queryOne('SELECT id FROM flashcard_decks WHERE id = ? AND user_id = ?', [deckId, userId]);
    if (!deck) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    const cardId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    execute(
      `INSERT INTO flashcards (id, deck_id, user_id, front, back, topic, hint, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cardId, deckId, userId, front.trim(), back.trim(), topic || 'General', hint || null, today]
    );

    const card = queryOne('SELECT * FROM flashcards WHERE id = ?', [cardId]);
    res.status(201).json({ card });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add flashcard.' });
  }
});

// POST /api/flashcards/:id/review (SM-2 review rating)
router.post('/:id/review', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { rating } = req.body; // 'again' | 'hard' | 'good' | 'easy'

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      res.status(400).json({ error: 'Invalid rating. Choose again, hard, good, or easy.' });
      return;
    }

    const card = queryOne<Flashcard>('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [id, userId]);
    if (!card) {
      res.status(404).json({ error: 'Flashcard not found.' });
      return;
    }

    const sm2Result = calculateSM2(
      {
        interval: card.interval,
        repetition: card.repetition,
        easeFactor: card.ease_factor,
      },
      rating as FlashcardRating
    );

    const now = new Date().toISOString();
    execute(
      `UPDATE flashcards SET
        interval = ?,
        repetition = ?,
        ease_factor = ?,
        due_date = ?,
        last_reviewed_at = ?
      WHERE id = ?`,
      [sm2Result.interval, sm2Result.repetition, sm2Result.easeFactor, sm2Result.dueDate, now, id]
    );

    // Save review log
    execute(
      'INSERT INTO flashcard_reviews (id, flashcard_id, user_id, rating) VALUES (?, ?, ?, ?)',
      [uuidv4(), id, userId, rating]
    );

    // Award XP
    execute('UPDATE profiles SET xp = xp + 10 WHERE user_id = ?', [userId]);

    const updatedCard = queryOne('SELECT * FROM flashcards WHERE id = ?', [id]);
    res.json({ success: true, card: updatedCard, sm2: sm2Result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review flashcard.' });
  }
});

// PUT /api/flashcards/:id/bookmark
router.put('/:id/bookmark', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const card = queryOne<Flashcard>('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [id, userId]);
    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    const newStatus = card.is_bookmarked === 1 ? 0 : 1;
    execute('UPDATE flashcards SET is_bookmarked = ? WHERE id = ?', [newStatus, id]);

    res.json({ success: true, isBookmarked: newStatus === 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle bookmark.' });
  }
});

// DELETE /api/flashcards/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    execute('DELETE FROM flashcards WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Flashcard deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete flashcard.' });
  }
});

export default router;
