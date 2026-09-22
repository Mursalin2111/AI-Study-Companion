import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { initializeDatabase } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getAIService } from './services/ai/aiService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import studyPlanRoutes from './routes/studyPlanRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.uploadDir));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const aiService = getAIService();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiProvider: aiService.name,
    version: '1.0.0',
  });
});

// Seed endpoint for convenience
app.post('/api/seed', async (_req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database seeded with sample university courses!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Seeding failed.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use(errorHandler);

// In production or when client build exists, serve frontend static files
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Initialize DB schema on module load
initializeDatabase();

// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 AI Study Companion Server running on http://localhost:${config.port}`);
    console.log(`🤖 AI Provider: ${getAIService().name}`);
    console.log(`📁 Upload Directory: ${config.uploadDir}`);
    console.log(`💾 SQLite Database: ${config.databasePath}`);
    console.log(`======================================================\n`);
  });
}
