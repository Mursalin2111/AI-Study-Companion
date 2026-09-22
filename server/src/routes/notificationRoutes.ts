import { Router, Request, Response } from 'express';
import { query, execute } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/notifications
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 25',
      [userId]
    );
    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark notification as read.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark all as read.' });
  }
});

export default router;
