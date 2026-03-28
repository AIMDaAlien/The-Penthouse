import test, { afterEach, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;
const GENERAL_CHAT_ID = '00000000-0000-0000-0000-000000000001';

describe('[integration] message moderation', { skip: SKIP, concurrency: false }, () => {
  let app: any;
  let emitted: Array<{ room: string | null; event: string; data: unknown }>;
  let helpers: typeof import('./helpers.js');

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    helpers = await import('./helpers.js');
    await helpers.migrate();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    const built = await helpers.buildTestApp();
    app = built.app;
    emitted = built.emitted;
  });

  afterEach(async () => {
    await app?.close();
    await helpers.cleanup();
  });

  test('admin can hide and restore a message with required reasons', async () => {
    const admin = await helpers.registerUser(app, 'moderator_owner');
    await helpers.pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const member = await helpers.registerUser(app, 'moderated_member');

    const sentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(member.accessToken),
      payload: {
        content: 'moderation target message',
        clientMessageId: 'client-moderation-target-001'
      }
    });
    assert.equal(sentRes.statusCode, 200);
    const sent = JSON.parse(sentRes.payload);
    const messageId = sent.message.id as string;

    const hideRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/hide`,
      headers: helpers.authHeaders(admin.accessToken),
      payload: {
        reason: 'Spam cleanup'
      }
    });
    assert.equal(hideRes.statusCode, 200);
    const hidden = JSON.parse(hideRes.payload);
    assert.equal(hidden.hidden, true);
    assert.equal(hidden.moderation.hiddenByModeration, true);
    assert.equal(hidden.moderation.latestAction, 'hide');
    assert.equal(hidden.moderation.latestReason, 'Spam cleanup');

    const eventRows = await helpers.pool.query(
      `SELECT action, reason
       FROM message_moderation_events
       WHERE message_id = $1
       ORDER BY created_at DESC`,
      [messageId]
    );
    assert.equal(eventRows.rowCount, 1);
    assert.equal(eventRows.rows[0].action, 'hide');
    assert.equal(eventRows.rows[0].reason, 'Spam cleanup');

    const memberMessagesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(member.accessToken)
    });
    assert.equal(memberMessagesRes.statusCode, 200);
    const memberMessages = JSON.parse(memberMessagesRes.payload);
    const tombstoned = memberMessages.find((entry: any) => entry.id === messageId);
    assert.ok(tombstoned);
    assert.equal(tombstoned.hidden, true);
    assert.equal(tombstoned.content, 'Message removed by moderation.');
    assert.equal(tombstoned.type, 'text');
    assert.equal(tombstoned.metadata, null);

    const adminAuditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(admin.accessToken)
    });
    assert.equal(adminAuditRes.statusCode, 200);
    const adminAudit = JSON.parse(adminAuditRes.payload);
    const auditMessage = adminAudit.find((entry: any) => entry.id === messageId);
    assert.ok(auditMessage);
    assert.equal(auditMessage.content, 'moderation target message');
    assert.equal(auditMessage.hidden, true);
    assert.equal(auditMessage.moderation.latestReason, 'Spam cleanup');

    const moderationEvent = emitted.find((entry) => entry.room === `chat:${GENERAL_CHAT_ID}` && entry.event === 'message.moderated');
    assert.ok(moderationEvent);
    assert.equal((moderationEvent?.data as any)?.payload?.message?.hidden, true);

    const unhideRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/unhide`,
      headers: helpers.authHeaders(admin.accessToken),
      payload: {
        reason: 'Restored after review'
      }
    });
    assert.equal(unhideRes.statusCode, 200);
    const restored = JSON.parse(unhideRes.payload);
    assert.equal(restored.hidden, false);
    assert.equal(restored.moderation.hiddenByModeration, false);
    assert.equal(restored.moderation.latestAction, 'unhide');
    assert.equal(restored.moderation.latestReason, 'Restored after review');

    const restoredMessagesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(member.accessToken)
    });
    assert.equal(restoredMessagesRes.statusCode, 200);
    const restoredMessages = JSON.parse(restoredMessagesRes.payload);
    const restoredMemberMessage = restoredMessages.find((entry: any) => entry.id === messageId);
    assert.ok(restoredMemberMessage);
    assert.equal(restoredMemberMessage.hidden, false);
    assert.equal(restoredMemberMessage.content, 'moderation target message');
  });

  test('rejects non-admin moderation attempts and missing reasons', async () => {
    const member = await helpers.registerUser(app, 'plain_member_mod');
    const target = await helpers.registerUser(app, 'target_member_mod');

    const sentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(target.accessToken),
      payload: {
        content: 'another moderation target',
        clientMessageId: 'client-moderation-target-002'
      }
    });
    assert.equal(sentRes.statusCode, 200);
    const messageId = JSON.parse(sentRes.payload).message.id as string;

    const nonAdminRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/hide`,
      headers: helpers.authHeaders(member.accessToken),
      payload: {
        reason: 'No authority'
      }
    });
    assert.equal(nonAdminRes.statusCode, 403);

    await helpers.pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [member.user.id]);

    const missingReasonRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/hide`,
      headers: helpers.authHeaders(member.accessToken),
      payload: {
        reason: '   '
      }
    });
    assert.equal(missingReasonRes.statusCode, 400);
  });

  test('moderating a media message strips member-visible type and metadata to a tombstone', async () => {
    const admin = await helpers.registerUser(app, 'moderator_media_owner');
    await helpers.pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const member = await helpers.registerUser(app, 'moderated_media_member');

    const sentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(member.accessToken),
      payload: {
        content: 'photo.png',
        type: 'image',
        metadata: {
          url: '/uploads/photo-full.png',
          previewUrl: '/uploads/photo-preview.png',
          originalFileName: 'photo.png'
        },
        clientMessageId: 'client-moderation-media-001'
      }
    });
    assert.equal(sentRes.statusCode, 200);
    const messageId = JSON.parse(sentRes.payload).message.id as string;

    const hideRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/hide`,
      headers: helpers.authHeaders(admin.accessToken),
      payload: {
        reason: 'Sensitive image'
      }
    });
    assert.equal(hideRes.statusCode, 200);

    const memberMessagesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(member.accessToken)
    });
    assert.equal(memberMessagesRes.statusCode, 200);
    const memberMessages = JSON.parse(memberMessagesRes.payload);
    const tombstoned = memberMessages.find((entry: any) => entry.id === messageId);
    assert.ok(tombstoned);
    assert.equal(tombstoned.hidden, true);
    assert.equal(tombstoned.content, 'Message removed by moderation.');
    assert.equal(tombstoned.type, 'text');
    assert.equal(tombstoned.metadata, null);

    const adminAuditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(admin.accessToken)
    });
    assert.equal(adminAuditRes.statusCode, 200);
    const adminAudit = JSON.parse(adminAuditRes.payload);
    const auditMessage = adminAudit.find((entry: any) => entry.id === messageId);
    assert.ok(auditMessage);
    assert.equal(auditMessage.type, 'image');
    assert.equal(auditMessage.metadata.url, '/uploads/photo-full.png');
    assert.equal(auditMessage.moderation.latestReason, 'Sensitive image');
  });

  test('admin chat list includes DMs and moderation works on DM messages', async () => {
    const admin = await helpers.registerUser(app, 'moderator_dm_owner');
    await helpers.pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const alice = await helpers.registerUser(app, 'moderated_dm_alice');
    const bob = await helpers.registerUser(app, 'moderated_dm_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: helpers.authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    assert.equal(created.statusCode, 200);
    const chatId = JSON.parse(created.payload).id as string;

    const sentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: helpers.authHeaders(alice.accessToken),
      payload: {
        content: 'dm moderation target',
        clientMessageId: 'client-dm-moderation-target-001'
      }
    });
    assert.equal(sentRes.statusCode, 200);
    const messageId = JSON.parse(sentRes.payload).message.id as string;

    const chatListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/chats',
      headers: helpers.authHeaders(admin.accessToken)
    });
    assert.equal(chatListRes.statusCode, 200);
    const adminChats = JSON.parse(chatListRes.payload);
    const dmChat = adminChats.find((chat: any) => chat.id === chatId);
    assert.ok(dmChat);
    assert.deepEqual(
      dmChat.name.split(' + ').sort(),
      ['@moderated_dm_alice', '@moderated_dm_bob']
    );

    const hideRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/messages/${messageId}/hide`,
      headers: helpers.authHeaders(admin.accessToken),
      payload: {
        reason: 'DM review'
      }
    });
    assert.equal(hideRes.statusCode, 200);

    const memberMessagesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: helpers.authHeaders(alice.accessToken)
    });
    assert.equal(memberMessagesRes.statusCode, 200);
    const memberMessages = JSON.parse(memberMessagesRes.payload);
    const tombstoned = memberMessages.find((entry: any) => entry.id === messageId);
    assert.ok(tombstoned);
    assert.equal(tombstoned.hidden, true);

    const auditRes = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/chats/${chatId}/messages`,
      headers: helpers.authHeaders(admin.accessToken)
    });
    assert.equal(auditRes.statusCode, 200);
    const auditMessages = JSON.parse(auditRes.payload);
    const auditEntry = auditMessages.find((entry: any) => entry.id === messageId);
    assert.ok(auditEntry);
    assert.equal(auditEntry.content, 'dm moderation target');
    assert.equal(auditEntry.moderation.latestReason, 'DM review');
  });
});
