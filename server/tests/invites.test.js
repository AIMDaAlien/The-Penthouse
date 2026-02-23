const request = require('supertest');
const { app } = require('../src/index');
const dbModule = require('../src/database');

describe('Invite Endpoints', () => {
  let ownerToken, user2Token, user3Token;
  let serverId;
  let inviteCode;

  beforeAll(async () => {
    await dbModule.initializeDatabase();
  });

  beforeEach(async () => {
    dbModule.db.prepare('DELETE FROM server_invites').run();
    dbModule.db.prepare('DELETE FROM server_members').run();
    dbModule.db.prepare('DELETE FROM chats').run();
    dbModule.db.prepare('DELETE FROM servers').run();
    dbModule.db.prepare('DELETE FROM users').run();

    const owner = await request(app).post('/api/auth/register').send({
      username: 'owner',
      password: 'Passw0rd!',
    });
    ownerToken = owner.body.accessToken;

    const user2 = await request(app).post('/api/auth/register').send({
      username: 'user2_inv',
      password: 'Passw0rd!',
    });
    user2Token = user2.body.accessToken;

    const user3 = await request(app).post('/api/auth/register').send({
      username: 'user3_inv',
      password: 'Passw0rd!',
    });
    user3Token = user3.body.accessToken;

    const createdServer = await request(app)
      .post('/api/servers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Invites Server' });
    serverId = createdServer.body.id;

    const invite = await request(app)
      .post(`/api/invites/server/${serverId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ maxUses: 1 });
    inviteCode = invite.body.code;
  });

  it('should enforce max_uses and return 410 when invite is exhausted', async () => {
    const firstJoin = await request(app)
      .post(`/api/invites/${inviteCode}/join`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(firstJoin.statusCode).toBe(200);
    expect(firstJoin.body.success).toBe(true);

    const secondJoin = await request(app)
      .post(`/api/invites/${inviteCode}/join`)
      .set('Authorization', `Bearer ${user3Token}`);

    expect(secondJoin.statusCode).toBe(410);
    expect(secondJoin.body.error).toBe('Invite has reached max uses');
  });
});
