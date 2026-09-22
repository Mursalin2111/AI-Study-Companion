import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, withTransaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { extractTextFromFile } from '../services/textExtractor.js';
import { chunkDocument } from '../services/chunker.js';
import { getAIService } from '../services/ai/aiService.js';
import { Material } from '../types/index.js';

const router = Router();
router.use(authenticateToken);

// GET /api/materials
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const subjectId = req.query.subjectId as string | undefined;

    let sql = `
      SELECT 
        m.*,
        s.name AS subject_name,
        s.color AS subject_color
      FROM materials m
      JOIN subjects s ON m.subject_id = s.id
      WHERE m.user_id = ?
    `;
    const params: any[] = [userId];

    if (subjectId) {
      sql += ' AND m.subject_id = ?';
      params.push(subjectId);
    }

    sql += ' ORDER BY m.created_at DESC';

    const materials = query(sql, params);
    res.json({ materials });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch materials.' });
  }
});

// GET /api/materials/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const material = queryOne<any>(
      `SELECT m.*, s.name AS subject_name, s.color AS subject_color
       FROM materials m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.id = ? AND m.user_id = ?`,
      [id, userId]
    );

    if (!material) {
      res.status(404).json({ error: 'Study material not found.' });
      return;
    }

    const summaries = query('SELECT * FROM summaries WHERE material_id = ? ORDER BY created_at DESC', [id]);
    const questionsCount = queryOne<any>('SELECT COUNT(*) as cnt FROM questions WHERE material_id = ?', [id])?.cnt || 0;

    res.json({
      material,
      summaries,
      questionsCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch material.' });
  }
});

// POST /api/materials/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  const userId = req.user!.id;
  const { subjectId, title } = req.body;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  if (!subjectId) {
    // Delete temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(400).json({ error: 'Subject ID is required.' });
    return;
  }

  const subject = queryOne('SELECT id FROM subjects WHERE id = ? AND user_id = ?', [subjectId, userId]);
  if (!subject) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(404).json({ error: 'Subject not found.' });
    return;
  }

  const materialId = uuidv4();
  const displayTitle = title?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
  const fileType = file.originalname.split('.').pop()?.toUpperCase() || 'DOCUMENT';

  try {
    // Insert initial material row
    execute(
      `INSERT INTO materials (
        id, subject_id, user_id, title, filename, file_path, file_size, file_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        materialId,
        subjectId,
        userId,
        displayTitle,
        file.originalname,
        file.path,
        file.size,
        fileType,
        'processing',
      ]
    );

    // Process document synchronously for fast feedback
    const extracted = await extractTextFromFile(file.path, file.originalname);
    if (!extracted.text || extracted.text.trim().length === 0) {
      throw new Error('Could not extract any readable text from the file.');
    }

    const chunks = chunkDocument(extracted, 800, 100);
    const aiService = getAIService();

    // Generate embeddings for chunks
    const chunkTexts = chunks.map(c => c.content);
    let embeddings: number[][] = [];
    try {
      embeddings = await aiService.generateEmbeddings(chunkTexts);
    } catch {
      // Vectorizer fallback handled automatically
    }

    withTransaction(() => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const emb = embeddings[i] ? JSON.stringify(embeddings[i]) : null;
        execute(
          `INSERT INTO document_chunks (
            id, material_id, chunk_index, content, section_heading, page_number, embedding_json, token_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            materialId,
            chunk.index,
            chunk.content,
            chunk.sectionHeading,
            chunk.pageNumber,
            emb,
            chunk.tokenCount,
          ]
        );
      }

      execute(
        `UPDATE materials SET 
          status = 'ready',
          extracted_text = ?,
          chunk_count = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [extracted.text.slice(0, 50000), chunks.length, materialId]
      );

      // Award XP for uploading study material
      execute('UPDATE profiles SET xp = xp + 30 WHERE user_id = ?', [userId]);

      // Add activity log
      execute(
        `INSERT INTO study_activity_logs (id, user_id, subject_id, activity_type, duration_minutes, xp_earned)
         VALUES (?, ?, ?, 'reading', 10, 30)`,
        [uuidv4(), userId, subjectId]
      );
    });

    const readyMaterial = queryOne<Material>('SELECT * FROM materials WHERE id = ?', [materialId]);
    res.status(201).json({
      success: true,
      material: readyMaterial,
      chunksProcessed: chunks.length,
    });
  } catch (error: any) {
    console.error('[Upload/Processing Error]:', error);
    execute(
      `UPDATE materials SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [error.message || 'Processing failed.', materialId]
    );

    res.status(500).json({
      error: `File processing failed: ${error.message || 'Unknown error'}`,
      materialId,
    });
  }
});

// POST /api/materials/:id/reprocess
router.post('/:id/reprocess', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const material = queryOne<Material>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [id, userId]);
    if (!material) {
      res.status(404).json({ error: 'Material not found.' });
      return;
    }

    if (!fs.existsSync(material.file_path)) {
      res.status(404).json({ error: 'Original file is missing from disk.' });
      return;
    }

    execute("UPDATE materials SET status = 'processing', error_message = NULL WHERE id = ?", [id]);
    execute('DELETE FROM document_chunks WHERE material_id = ?', [id]);

    const extracted = await extractTextFromFile(material.file_path, material.filename);
    const chunks = chunkDocument(extracted, 800, 100);
    const aiService = getAIService();
    const embeddings = await aiService.generateEmbeddings(chunks.map(c => c.content));

    withTransaction(() => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        execute(
          `INSERT INTO document_chunks (
            id, material_id, chunk_index, content, section_heading, page_number, embedding_json, token_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            id,
            chunk.index,
            chunk.content,
            chunk.sectionHeading,
            chunk.pageNumber,
            embeddings[i] ? JSON.stringify(embeddings[i]) : null,
            chunk.tokenCount,
          ]
        );
      }

      execute(
        `UPDATE materials SET status = 'ready', extracted_text = ?, chunk_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [extracted.text.slice(0, 50000), chunks.length, id]
      );
    });

    const updated = queryOne('SELECT * FROM materials WHERE id = ?', [id]);
    res.json({ success: true, material: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Reprocessing failed.' });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const material = queryOne<Material>('SELECT * FROM materials WHERE id = ? AND user_id = ?', [id, userId]);
    if (!material) {
      res.status(404).json({ error: 'Material not found.' });
      return;
    }

    // Delete local file
    if (fs.existsSync(material.file_path)) {
      try {
        fs.unlinkSync(material.file_path);
      } catch {
        // ignore disk deletion error
      }
    }

    execute('DELETE FROM materials WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: 'Material deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete material.' });
  }
});

export default router;
