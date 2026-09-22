import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute, query } from '../db/connection.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { User, Profile } from '../types/index.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, university, department, semester, preferredLanguage, studyGoals } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required.' });
      return;
    }

    const existing = queryOne<User>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toLowerCase().trim();

    execute(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, normalizedEmail, passwordHash, 'student']
    );

    execute(
      `INSERT INTO profiles (
        user_id, name, university, department, semester, preferred_language, study_goals, streak_count, xp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        university || 'University Student',
        department || 'Computer Science & Engineering',
        semester || 'Semester 5',
        preferredLanguage === 'bn' ? 'bn' : 'en',
        studyGoals || 'Prepare for upcoming semester finals and master core courses.',
        1,
        100, // Initial signup welcome XP
      ]
    );

    // Initial Welcome Notification
    execute(
      `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        'Welcome to AI Study Companion! 🎓',
        'Upload your first lecture slides or notes to get AI summaries, flashcards, and quizzes.',
        'achievement',
      ]
    );

    const token = generateToken({ id: userId, email: normalizedEmail, role: 'student' });
    const profile = queryOne<Profile>('SELECT * FROM profiles WHERE user_id = ?', [userId]);

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: normalizedEmail,
        role: 'student',
        profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = queryOne<User>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const profile = queryOne<Profile>('SELECT * FROM profiles WHERE user_id = ?', [user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = queryOne<User>('SELECT id, email, role, created_at FROM users WHERE id = ?', [userId]);
    const profile = queryOne<Profile>('SELECT * FROM profiles WHERE user_id = ?', [userId]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        ...user,
        profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, university, department, semester, preferredLanguage, studyGoals } = req.body;

    execute(
      `UPDATE profiles SET
        name = COALESCE(?, name),
        university = COALESCE(?, university),
        department = COALESCE(?, department),
        semester = COALESCE(?, semester),
        preferred_language = COALESCE(?, preferred_language),
        study_goals = COALESCE(?, study_goals),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [name, university, department, semester, preferredLanguage, studyGoals, userId]
    );

    const profile = queryOne<Profile>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    res.json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const user = queryOne<User>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      res.status(400).json({ error: 'Incorrect current password.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userId]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to change password.' });
  }
});

export default router;
