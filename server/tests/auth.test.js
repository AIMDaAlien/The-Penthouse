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
          password: 'Passw0rd!',
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
          password: 'Passw0rd!'
        });

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'Newpass1!'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('error', 'Username is already taken');
    });

    it('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakpassuser',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some((item) => item.field === 'password')).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'loginuser',
          email: 'loginuser@example.com',
          password: 'Passw0rd!'
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Passw0rd!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.username).toBe('loginuser');
    });

    it('should login with email credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser@example.com',
          password: 'Passw0rd!'
        });

      expect(res.statusCode).toBe(200);
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

    it('should return 401 for invalid access token on protected endpoint', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
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
          password: 'Oldpass1!',
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
          newPassword: 'Newsecure1!'
        });

      expect(res.statusCode).toBe(200);

      // 3. Verify Login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'recoveryuser',
          password: 'Newsecure1!'
        });
      
      expect(loginRes.statusCode).toBe(200);
    });
  });
});
