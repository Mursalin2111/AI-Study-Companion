import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Auth Endpoints Integration Tests', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('should login seeded student with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@versity.edu',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'student@versity.edu');
    expect(res.body.user.profile).toHaveProperty('name', 'Mursalin Ahmed');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@versity.edu',
        password: 'incorrectPassword',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should register a new student account successfully', async () => {
    const randomEmail = `test.student.${Date.now()}@versity.edu`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: randomEmail,
        password: 'newPassword123',
        name: 'Fatima Zahra',
        university: 'Dhaka University',
        department: 'CSE',
        semester: 'Semester 3',
        preferredLanguage: 'bn',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.profile).toHaveProperty('name', 'Fatima Zahra');
    expect(res.body.user.profile).toHaveProperty('preferred_language', 'bn');
  });

  it('should reject unauthorized access without token', async () => {
    const res = await request(app).get('/api/subjects');
    expect(res.status).toBe(401);
  });
});
