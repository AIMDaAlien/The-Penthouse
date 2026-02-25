const request = require('supertest');
const { app } = require('../src/index');
const dbModule = require('../src/database');

describe('Media Uploads', () => {
  let token;

  beforeAll(async () => {
    await dbModule.initializeDatabase();
  });

  beforeEach(async () => {
    dbModule.db.prepare('DELETE FROM users').run();

    const register = await request(app).post('/api/auth/register').send({
      username: 'media_tester',
      password: 'Passw0rd!',
    });

    token = register.body.accessToken;
  });

  it('accepts server icon upload under limit', async () => {
    const response = await request(app)
      .post('/api/media/server-icon')
      .set('Authorization', `Bearer ${token}`)
      .attach('icon', Buffer.from('small-image-bytes'), {
        filename: 'icon.png',
        contentType: 'image/png',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.iconUrl).toMatch(/^\/uploads\//);
  });

  it('rejects server icon upload over 25MB with 413', async () => {
    const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024, 0);

    const response = await request(app)
      .post('/api/media/server-icon')
      .set('Authorization', `Bearer ${token}`)
      .attach('icon', oversizedBuffer, {
        filename: 'icon.png',
        contentType: 'image/png',
      });

    expect(response.statusCode).toBe(413);
    expect(response.body.message).toBe('Uploaded file is too large');
  });
});
