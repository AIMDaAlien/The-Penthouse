const request = require('supertest');
const { app } = require('../src/index'); // Import app from index.js
const dbModule = require('../src/database');
const jwt = require('jsonwebtoken');

describe('Messages Endpoints', () => {
  let token1, token2;
  let user1, user2;
  let chatId;

  beforeAll(async () => {
    // 1. Initialize DB
    await dbModule.initializeDatabase();

    // 2. Clear data within transaction to avoid foreign key constraints issues if any
    dbModule.db.prepare('DELETE FROM messages').run();
    dbModule.db.prepare('DELETE FROM chat_members').run();
    dbModule.db.prepare('DELETE FROM chats').run();
    dbModule.db.prepare('DELETE FROM friendships').run();
    dbModule.db.prepare('DELETE FROM users').run();

    // 3. Create Users
    const authRecord1 = dbModule.db.prepare(`
      INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)
    `).run('user1', 'hashedpassword', 'User One');
    const user1Id = dbModule.db.prepare('SELECT id FROM users WHERE username = ?').get('user1').id;
    user1 = { id: user1Id, username: 'user1' };
    token1 = jwt.sign({ userId: user1.id, username: user1.username }, process.env.JWT_SECRET);

    const authRecord2 = dbModule.db.prepare(`
        INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)
      `).run('user2', 'hashedpassword', 'User Two');
    const user2Id = dbModule.db.prepare('SELECT id FROM users WHERE username = ?').get('user2').id;
    user2 = { id: user2Id, username: 'user2' };
    token2 = jwt.sign({ userId: user2.id, username: user2.username }, process.env.JWT_SECRET);

    // 4. Create Friendship (might be needed for DM)
    dbModule.db.prepare(`
      INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)
    `).run(user1.id, user2.id);

    // 5. Create DM
    const dmRes = await request(app)
        .post('/api/chats/dm')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });
    


    chatId = dmRes.body.id;
  });

  afterEach(() => {
    // Clean up messages after each test
    dbModule.db.prepare('DELETE FROM messages').run();
  });

  describe('POST /api/messages/:chatId', () => {
    it('should send a message to a chat', async () => {
      const res = await request(app)
        .post(`/api/messages/${chatId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Hello World',
          type: 'text'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.content).toBe('Hello World');
      expect(res.body.sender.id).toBe(user1.id);
      expect(res.body.chatId).toBe(chatId);
    });
  });

  describe('GET /api/messages/:chatId', () => {
    it('should retrieve conversation for a chat', async () => {
      // Seed messages
      dbModule.db.prepare(`
        INSERT INTO messages (chat_id, user_id, content, message_type) VALUES (?, ?, ?, ?)
      `).run(chatId, user1.id, 'Msg 1', 'text');
      dbModule.db.prepare(`
        INSERT INTO messages (chat_id, user_id, content, message_type) VALUES (?, ?, ?, ?)
      `).run(chatId, user2.id, 'Msg 2', 'text');

      const res = await request(app)
        .get(`/api/messages/${chatId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      expect(res.body[0].content).toBe('Msg 1'); 
      expect(res.body[1].content).toBe('Msg 2');
    });
  });
});
