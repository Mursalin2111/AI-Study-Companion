import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db/connection.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/admin/overview
router.get('/overview', (_req: Request, res: Response) => {
  try {
    const totalUsers = queryOne<any>('SELECT COUNT(*) as c FROM users')?.c || 0;
    const totalMaterials = queryOne<any>('SELECT COUNT(*) as c FROM materials')?.c || 0;
    const totalQuizzes = queryOne<any>('SELECT COUNT(*) as c FROM quizzes')?.c || 0;
    const totalConversations = queryOne<any>('SELECT COUNT(*) as c FROM ai_conversations')?.c || 0;
    const totalMessages = queryOne<any>('SELECT COUNT(*) as c FROM ai_messages')?.c || 0;
    const totalStorageBytes = queryOne<any>('SELECT SUM(file_size) as s FROM materials')?.s || 0;

    const storageMb = Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100;

    // AI query metrics
    const aiUsage = {
      totalQueries: totalMessages,
      conversations: totalConversations,
      avgMessagesPerConv: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
      activeAIProvider: process.env.GEMINI_API_KEY ? 'Google Gemini (gemini-3.8-flash)' : 'Offline NLP Semantic Fallback Engine',
    };

    // Recent system errors/warnings (from failed materials or logs)
    const recentFailures = query(
      `SELECT m.id, m.filename, m.error_message, m.updated_at, u.email as user_email
       FROM materials m
       JOIN users u ON m.user_id = u.id
       WHERE m.status = 'failed'
       ORDER BY m.updated_at DESC LIMIT 5`
    );

    res.json({
      metrics: {
        totalUsers,
        totalMaterials,
        totalQuizzes,
        storageMb,
      },
      aiUsage,
      recentFailures,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin overview.' });
  }
});

// GET /api/admin/users
router.get('/users', (_req: Request, res: Response) => {
  try {
    const users = query(
      `SELECT 
        u.id, u.email, u.role, u.created_at,
        p.name, p.university, p.department, p.streak_count, p.xp,
        (SELECT COUNT(*) FROM materials WHERE user_id = u.id) AS material_count,
        (SELECT COUNT(*) FROM quizzes WHERE user_id = u.id) AS quiz_count
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own admin account.' });
      return;
    }

    execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete user.' });
  }
});

export default router;
