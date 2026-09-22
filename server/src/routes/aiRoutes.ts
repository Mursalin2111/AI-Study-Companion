import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { searchSimilarChunks } from '../services/vectorStore.js';
import { getAIService } from '../services/ai/aiService.js';
import { SummaryType } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// POST /api/ai/chat (Ask AI with RAG & SSE streaming support)
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      question,
      materialId,
      subjectId,
      conversationId: clientConvId,
      language = 'en',
      quickAction,
      stream = false,
    } = req.body;

    if (!question || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    // Ensure or create conversation
    let conversationId = clientConvId;
    if (!conversationId) {
      conversationId = uuidv4();
      const title = question.slice(0, 45) + (question.length > 45 ? '...' : '');
      execute(
        `INSERT INTO ai_conversations (id, user_id, subject_id, material_id, title)
         VALUES (?, ?, ?, ?, ?)`,
        [conversationId, userId, subjectId || null, materialId || null, title]
      );
    }

    // Save user message
    const userMsgId = uuidv4();
    execute(
      `INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`,
      [userMsgId, conversationId, question.trim()]
    );

    // Retrieve conversation history
    const historyRows = query<any>(
      `SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10`,
      [conversationId]
    );
    const history = historyRows.map(r => ({ role: r.role, content: r.content }));

    // RAG: Retrieve top-k semantic chunks from materials
    const relevantChunks = searchSimilarChunks(question, null, {
      userId,
      materialId: materialId || undefined,
      subjectId: subjectId || undefined,
      topK: 4,
      minSimilarity: 0.1,
    });

    const aiService = getAIService();

    if (stream || req.headers.accept === 'text/event-stream') {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send sources info first
      const sourcesPayload = relevantChunks.map(c => ({
        materialId: c.material_id,
        materialTitle: c.material_title,
        filename: c.material_filename,
        pageNumber: c.page_number,
        sectionHeading: c.section_heading,
        similarity: Math.round(c.similarity * 100),
      }));

      res.write(`data: ${JSON.stringify({ type: 'sources', sources: sourcesPayload })}\n\n`);

      let fullAnswer = '';
      const result = await aiService.askQuestion(
        {
          question,
          contextChunks: relevantChunks,
          history,
          language,
          quickAction,
        },
        (chunkText) => {
          fullAnswer += chunkText;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        }
      );

      // Save assistant message with sources
      const asstMsgId = uuidv4();
      execute(
        `INSERT INTO ai_messages (id, conversation_id, role, content, sources_json) VALUES (?, ?, 'assistant', ?, ?)`,
        [asstMsgId, conversationId, result.answer, JSON.stringify(sourcesPayload)]
      );

      // Award XP for asking AI study questions
      execute('UPDATE profiles SET xp = xp + 5 WHERE user_id = ?', [userId]);

      res.write(`data: ${JSON.stringify({
        type: 'done',
        conversationId,
        suggestedQuestions: result.suggestedQuestions,
      })}\n\n`);
      res.end();
    } else {
      // Non-streaming response
      const result = await aiService.askQuestion({
        question,
        contextChunks: relevantChunks,
        history,
        language,
        quickAction,
      });

      const sourcesPayload = relevantChunks.map(c => ({
        materialId: c.material_id,
        materialTitle: c.material_title,
        filename: c.material_filename,
        pageNumber: c.page_number,
        sectionHeading: c.section_heading,
        similarity: Math.round(c.similarity * 100),
      }));

      // Save assistant message
      const asstMsgId = uuidv4();
      execute(
        `INSERT INTO ai_messages (id, conversation_id, role, content, sources_json) VALUES (?, ?, 'assistant', ?, ?)`,
        [asstMsgId, conversationId, result.answer, JSON.stringify(sourcesPayload)]
      );

      execute('UPDATE profiles SET xp = xp + 5 WHERE user_id = ?', [userId]);

      res.json({
        conversationId,
        answer: result.answer,
        sources: sourcesPayload,
        suggestedQuestions: result.suggestedQuestions,
      });
    }
  } catch (error: any) {
    console.error('[AI Chat Route Error]:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'AI request failed.' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// GET /api/ai/conversations
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const materialId = req.query.materialId as string | undefined;
    const subjectId = req.query.subjectId as string | undefined;

    let sql = `
      SELECT c.*, 
        (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.id) AS message_count
      FROM ai_conversations c
      WHERE c.user_id = ?
    `;
    const params: any[] = [userId];

    if (materialId) {
      sql += ' AND c.material_id = ?';
      params.push(materialId);
    } else if (subjectId) {
      sql += ' AND c.subject_id = ?';
      params.push(subjectId);
    }

    sql += ' ORDER BY c.updated_at DESC';

    const conversations = query(sql, params);
    res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch conversations.' });
  }
});

// GET /api/ai/conversations/:id/messages
router.get('/conversations/:id/messages', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conv = queryOne('SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?', [id, userId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const messages = query('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC', [id]);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch messages.' });
  }
});

// DELETE /api/ai/conversations/:id
router.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    execute('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete conversation.' });
  }
});

// POST /api/ai/summarize
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { materialId, type = 'short', language = 'en' } = req.body;

    if (!materialId) {
      res.status(400).json({ error: 'materialId is required.' });
      return;
    }

    const material = queryOne<any>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [materialId, userId]);
    if (!material) {
      res.status(404).json({ error: 'Material not found.' });
      return;
    }

    // Check if summary already exists
    const existing = queryOne<any>(
      'SELECT * FROM summaries WHERE material_id = ? AND type = ? AND language = ?',
      [materialId, type, language]
    );

    if (existing) {
      res.json({ summary: existing });
      return;
    }

    const chunks = query<any>('SELECT content FROM document_chunks WHERE material_id = ? ORDER BY chunk_index ASC LIMIT 20', [materialId]);
    const fullContent = chunks.map(c => c.content).join('\n\n') || material.extracted_text || '';

    const aiService = getAIService();
    const result = await aiService.generateSummary({
      content: fullContent,
      type: type as SummaryType,
      language: language as 'en' | 'bn',
    });

    const summaryId = uuidv4();
    execute(
      `INSERT INTO summaries (id, material_id, user_id, type, language, content, key_concepts_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [summaryId, materialId, userId, type, language, result.summary, JSON.stringify(result.keyConcepts)]
    );

    const saved = queryOne('SELECT * FROM summaries WHERE id = ?', [summaryId]);
    execute('UPDATE profiles SET xp = xp + 15 WHERE user_id = ?', [userId]);

    res.json({ summary: saved });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate summary.' });
  }
});

// GET /api/ai/materials/:id/summaries
router.get('/materials/:id/summaries', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const summaries = query('SELECT * FROM summaries WHERE material_id = ? AND user_id = ? ORDER BY created_at DESC', [id, userId]);
    res.json({ summaries });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch summaries.' });
  }
});

// POST /api/ai/generate-questions
router.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { materialId, language = 'en' } = req.body;

    if (!materialId) {
      res.status(400).json({ error: 'materialId is required.' });
      return;
    }

    const material = queryOne<any>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [materialId, userId]);
    if (!material) {
      res.status(404).json({ error: 'Material not found.' });
      return;
    }

    const chunks = query<any>('SELECT content FROM document_chunks WHERE material_id = ? ORDER BY chunk_index ASC LIMIT 15', [materialId]);
    const fullContent = chunks.map(c => c.content).join('\n\n') || material.extracted_text || '';

    const aiService = getAIService();
    const generated = await aiService.generateImportantQuestions({
      content: fullContent,
      language: language as 'en' | 'bn',
    });

    const createdQuestions = [];
    for (const q of generated) {
      const qId = uuidv4();
      execute(
        `INSERT INTO questions (
          id, material_id, user_id, category, type, question, answer, explanation, source_reference, difficulty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          qId,
          materialId,
          userId,
          q.category,
          q.type,
          q.question,
          q.answer,
          q.explanation,
          `Section: ${material.title}`,
          q.difficulty,
        ]
      );
      createdQuestions.push(queryOne('SELECT * FROM questions WHERE id = ?', [qId]));
    }

    execute('UPDATE profiles SET xp = xp + 20 WHERE user_id = ?', [userId]);
    res.json({ success: true, questions: createdQuestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate questions.' });
  }
});

// GET /api/ai/materials/:id/questions
router.get('/materials/:id/questions', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const questions = query('SELECT * FROM questions WHERE material_id = ? AND user_id = ? ORDER BY category ASC, created_at DESC', [id, userId]);
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch questions.' });
  }
});

export default router;
