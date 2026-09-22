import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Quiz & Mock Exam Tests', () => {
  let authToken = '';

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@versity.edu',
        password: 'password123',
      });
    authToken = loginRes.body.token;
  });

  it('should fetch seeded quizzes with question details', async () => {
    const listRes = await request(app)
      .get('/api/quizzes')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.quizzes.length).toBeGreaterThan(0);

    const quizId = listRes.body.quizzes[0].id;
    const detailRes = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.questions.length).toBeGreaterThan(0);
    expect(detailRes.body.questions[0]).toHaveProperty('options');
  });

  it('should score a submitted quiz attempt and provide topic analysis', async () => {
    const detailRes = await request(app)
      .get('/api/quizzes/quiz-compiler-practice')
      .set('Authorization', `Bearer ${authToken}`);

    const questions = detailRes.body.questions;
    const answersMap: Record<string, string> = {};

    // Submit correct answer for first question and incorrect for second
    answersMap[questions[0].id] = questions[0].correct_answer;
    if (questions.length > 1) {
      answersMap[questions[1].id] = 'Wrong Answer Completely';
    }

    const submitRes = await request(app)
      .post('/api/quizzes/quiz-compiler-practice/submit')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        answers: answersMap,
        timeSpentSecs: 180,
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body).toHaveProperty('score');
    expect(submitRes.body).toHaveProperty('accuracy');
    expect(submitRes.body).toHaveProperty('xpGained');
    expect(submitRes.body).toHaveProperty('answers');
    expect(submitRes.body.answers[0].isCorrect).toBe(true);
  });
});
