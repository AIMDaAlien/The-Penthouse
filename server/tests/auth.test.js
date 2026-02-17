const request = require('supertest');
const { app } = require('../src/index');
const dbModule = require('../src/database');

describe('Auth Endpoints', () => {
  // Initialize DB before tests
  beforeAll(async () => {
    await dbModule.initializeDatabase();
  });

  // Clear database before each test
  beforeEach(() => {
    dbModule.db.prepare('DELETE FROM users').run();
    dbModule.db.prepare('DELETE FROM password_resets').run();
    dbModule.db.prepare('DELETE FROM refresh_tokens').run();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          displayName: 'Test User'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('testuser');
    });

    it('should not allow duplicate usernames', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'newpassword'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('error', 'Username or email already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'loginuser',
          password: 'password123'
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.username).toBe('loginuser');
    });

    it('should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Password Recovery', () => {
    let authUser;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'recoveryuser',
          email: 'recovery@example.com',
          password: 'oldpassword',
          displayName: 'Recovery User'
        });
      authUser = res.body.user;
    });

    it('should send recovery email for valid user', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'recovery@example.com'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('email has been sent');
      
      // Verify token in DB
      const resetRecord = dbModule.db.prepare('SELECT * FROM password_resets WHERE user_id = ?').get(authUser.id);
      expect(resetRecord).toBeTruthy();
      expect(resetRecord.token).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      // 1. Request Token
      await request(app).post('/api/auth/forgot-password').send({ email: 'recovery@example.com' });
      const resetRecord = dbModule.db.prepare('SELECT token FROM password_resets WHERE user_id = ?').get(authUser.id);
      
      // 2. Reset Password
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetRecord.token,
          newPassword: 'newsecurepassword'
        });

      expect(res.statusCode).toBe(200);

      // 3. Verify Login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'recoveryuser',
          password: 'newsecurepassword'
        });
      
      expect(loginRes.statusCode).toBe(200);
    });
  });
});
