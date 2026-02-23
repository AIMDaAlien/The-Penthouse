const request = require('supertest');
const { app } = require('../src/index');
const dbModule = require('../src/database');

describe('Servers / Channels / Member Management', () => {
  let ownerToken;
  let memberToken;
  let memberId;
  let serverId;
  let generalChannelId;

  beforeAll(async () => {
    await dbModule.initializeDatabase();
  });

  beforeEach(async () => {
    dbModule.db.prepare('DELETE FROM server_members').run();
    dbModule.db.prepare('DELETE FROM chats').run();
    dbModule.db.prepare('DELETE FROM servers').run();
    dbModule.db.prepare('DELETE FROM users').run();

    const owner = await request(app).post('/api/auth/register').send({
      username: 'owner_srv',
      password: 'Passw0rd!'
    });
    ownerToken = owner.body.accessToken;

    const member = await request(app).post('/api/auth/register').send({
      username: 'member_srv',
      password: 'Passw0rd!'
    });
    memberToken = member.body.accessToken;
    memberId = member.body.user.id;

    const createdServer = await request(app)
      .post('/api/servers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Srv' });
    serverId = createdServer.body.id;

    const join = await request(app)
      .post(`/api/invites/server/${serverId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ maxUses: 10 });
    const code = join.body.code;

    await request(app)
      .post(`/api/invites/${code}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    const details = await request(app)
      .get(`/api/servers/${serverId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    generalChannelId = details.body.channels.find(c => c.name === 'general').id;
  });

  it('owner can update and delete a non-general channel', async () => {
    const created = await request(app)
      .post(`/api/servers/${serverId}/channels`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'random' });
    expect(created.statusCode).toBe(201);
    const channelId = created.body.id;

    const updated = await request(app)
      .put(`/api/servers/${serverId}/channels/${channelId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'random2' });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.success).toBe(true);

    const deleted = await request(app)
      .delete(`/api/servers/${serverId}/channels/${channelId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleted.statusCode).toBe(200);
    expect(deleted.body.success).toBe(true);
  });

  it('legacy /api/channels routes work for update/delete', async () => {
    const created = await request(app)
      .post(`/api/servers/${serverId}/channels`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'legacychan' });
    const channelId = created.body.id;

    const upd = await request(app)
      .put(`/api/channels/${channelId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'legacychan2' });
    expect(upd.statusCode).toBe(200);
    expect(upd.body.success).toBe(true);

    const del = await request(app)
      .delete(`/api/channels/${channelId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(del.statusCode).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it('cannot delete general channel', async () => {
    const deleted = await request(app)
      .delete(`/api/servers/${serverId}/channels/${generalChannelId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(deleted.statusCode).toBe(400);
  });

  it('member cannot update or delete channels', async () => {
    const res1 = await request(app)
      .put(`/api/servers/${serverId}/channels/${generalChannelId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'nope' });
    expect(res1.statusCode).toBe(403);

    const res2 = await request(app)
      .delete(`/api/servers/${serverId}/channels/${generalChannelId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res2.statusCode).toBe(403);
  });

  it('member can leave, owner cannot leave without transfer', async () => {
    const leaveMember = await request(app)
      .post(`/api/servers/${serverId}/leave`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(leaveMember.statusCode).toBe(200);

    const leaveOwner = await request(app)
      .post(`/api/servers/${serverId}/leave`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(leaveOwner.statusCode).toBe(400);
  });

  it('owner can kick a member and transfer ownership', async () => {
    const kicked = await request(app)
      .delete(`/api/servers/${serverId}/members/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(kicked.statusCode).toBe(200);
    expect(kicked.body.success).toBe(true);

    // re-add member directly for transfer test
    dbModule.db.prepare('INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?, ?)').run(serverId, memberId);

    const transferred = await request(app)
      .post(`/api/servers/${serverId}/transfer/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(transferred.statusCode).toBe(200);
    expect(transferred.body.success).toBe(true);
    expect(transferred.body.ownerId).toBe(memberId);
  });
});
