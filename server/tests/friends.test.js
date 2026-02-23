const request = require('supertest');
const { app } = require('../src/index');
const dbModule = require('../src/database');

describe('Friends Endpoints', () => {
  let user1, user2, user3;
  let token1, token2, token3;

  beforeAll(async () => {
    await dbModule.initializeDatabase();
  });

  beforeEach(async () => {
    // Clear DB
    dbModule.db.prepare('DELETE FROM users').run();
    dbModule.db.prepare('DELETE FROM friend_requests').run();
    dbModule.db.prepare('DELETE FROM friendships').run();

    // Create 3 users
    const res1 = await request(app).post('/api/auth/register').send({ username: 'user1', password: 'Passw0rd!' });
    user1 = res1.body.user;
    token1 = res1.body.accessToken;

    const res2 = await request(app).post('/api/auth/register').send({ username: 'user2', password: 'Passw0rd!' });
    user2 = res2.body.user;
    token2 = res2.body.accessToken;

    const res3 = await request(app).post('/api/auth/register').send({ username: 'user3', password: 'Passw0rd!' });
    user3 = res3.body.user;
    token3 = res3.body.accessToken;
  });

  describe('POST /api/friends/request', () => {
    it('should send a friend request', async () => {
      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Friend request sent');

      // Verify in DB
      const requestRecord = dbModule.db.prepare('SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?')
        .get(user1.id, user2.id);
      expect(requestRecord).toBeTruthy();
      expect(requestRecord.status).toBe('pending');
    });

    it('should not allow self-request', async () => {
      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user1.id }); // Self ID

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('yourself');
    });

    it('should not allow duplicate requests', async () => {
      // Send first request
      await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      // Send duplicate
      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already sent');
    });
  });

  describe('POST /api/friends/requests/:id/accept', () => {
    it('should accept a friend request', async () => {
      // 1. User1 requests User2
      await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      // Get request ID
      const requestRecord = dbModule.db.prepare('SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ?')
        .get(user1.id, user2.id);

      // 2. User2 accepts
      const res = await request(app)
        .post(`/api/friends/accept/${requestRecord.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Friend request accepted');

      // 3. Verify Friendship (reciprocal)
      const friendship1 = dbModule.db.prepare('SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?')
        .get(user1.id, user2.id);
      const friendship2 = dbModule.db.prepare('SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?')
        .get(user2.id, user1.id);
      
      expect(friendship1).toBeTruthy();
      expect(friendship2).toBeTruthy();
    });
  });

  describe('GET /api/friends', () => {
    it('should list friends', async () => {
      // Establish friendship between User1 <-> User2
      // Manually for speed
      dbModule.db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(user1.id, user2.id);
      dbModule.db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(user2.id, user1.id);

      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].username).toBe('user2');
    });
  });

  describe('GET /api/friends/blocked', () => {
    it('should list blocked users without schema errors', async () => {
      await request(app)
        .post(`/api/friends/block/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`);

      const res = await request(app)
        .get('/api/friends/blocked')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].user_id).toBe(user2.id);
    });
  });
});
