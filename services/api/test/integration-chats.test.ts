/**
 * Integration tests for chat authorization and message idempotency.
 *
 * Requires a running PostgreSQL instance with DATABASE_URL set.
 * Skips gracefully when DATABASE_URL is not available.
 */
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

describe('[integration] chat authorization', { skip: SKIP }, () => {
  let app: any;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('non-member cannot read messages from a foreign chat', async () => {
    const { registerUser, createPrivateChannelForUser } = await import('./helpers.js');
    const alice = await registerUser(app, 'alice_read');
    const bob = await registerUser(app, 'bob_read');

    const aliceChatId = await createPrivateChannelForUser(alice.user.id, 'Alice Private');

    // Bob tries to read Alice's chat — must get 403
    const bobRead = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${aliceChatId}/messages`,
      headers: { authorization: `Bearer ${bob.accessToken}` }
    });
    assert.equal(bobRead.statusCode, 403, 'non-member must be forbidden from reading');
    assert.equal(JSON.parse(bobRead.payload).error, 'You are not a member of this chat');
  });

  test('non-member cannot send message to a foreign chat', async () => {
    const { registerUser, createPrivateChannelForUser } = await import('./helpers.js');
    const carol = await registerUser(app, 'carol_send');
    const dave = await registerUser(app, 'dave_send');

    const chatId = await createPrivateChannelForUser(carol.user.id, 'Carol Private');

    // Dave tries to send into Carol's chat — must get 403
    const daveSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${dave.accessToken}` },
      payload: {
        content: 'unauthorized message',
        clientMessageId: 'dave-sneaky-001'
      }
    });
    assert.equal(daveSend.statusCode, 403, 'non-member must be forbidden from sending');
    assert.equal(JSON.parse(daveSend.payload).error, 'You are not a member of this chat');
  });

  test('unauthenticated request is rejected with 401', async () => {
    const { registerUser } = await import('./helpers.js');
    const eve = await registerUser(app, 'eve_noauth');

    const eveChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${eve.accessToken}` }
    });
    const chatId = JSON.parse(eveChats.payload)[0].id;

    // Request without any auth header
    const noAuth = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${chatId}/messages`
    });
    assert.equal(noAuth.statusCode, 401, 'missing auth must return 401');
  });
});

describe('[integration] shared General channel', { skip: SKIP }, () => {
  let app: any;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('new users are added to the same General channel', async () => {
    const { registerUser } = await import('./helpers.js');
    const alice = await registerUser(app, 'shared_alice');
    const bob = await registerUser(app, 'shared_bob');

    const [aliceChats, bobChats] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: { authorization: `Bearer ${alice.accessToken}` }
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: { authorization: `Bearer ${bob.accessToken}` }
      })
    ]);

    assert.equal(aliceChats.statusCode, 200);
    assert.equal(bobChats.statusCode, 200);

    const aliceGeneral = JSON.parse(aliceChats.payload).find((chat: any) => chat.name === 'General');
    const bobGeneral = JSON.parse(bobChats.payload).find((chat: any) => chat.name === 'General');

    assert.ok(aliceGeneral, 'alice should have the shared General channel');
    assert.ok(bobGeneral, 'bob should have the shared General channel');
    assert.equal(aliceGeneral.id, bobGeneral.id, 'shared General must have the same chat id for both users');
  });

  test('a message sent in shared General is readable by another member', async () => {
    const { registerUser } = await import('./helpers.js');
    const alice = await registerUser(app, 'general_sender');
    const bob = await registerUser(app, 'general_reader');

    const aliceChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${alice.accessToken}` }
    });
    const generalChatId = JSON.parse(aliceChats.payload).find((chat: any) => chat.name === 'General').id;

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: { authorization: `Bearer ${alice.accessToken}` },
      payload: {
        content: 'hello shared room',
        clientMessageId: 'shared-general-001'
      }
    });
    assert.equal(send.statusCode, 200);

    const bobRead = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: { authorization: `Bearer ${bob.accessToken}` }
    });
    assert.equal(bobRead.statusCode, 200);

    const bobMessages = JSON.parse(bobRead.payload);
    const sharedMessage = bobMessages.find((message: any) => message.content === 'hello shared room');
    assert.ok(sharedMessage, 'other General members should be able to read the message');
    assert.equal(sharedMessage.senderUsername, 'general_sender');
    assert.equal(sharedMessage.senderDisplayName, 'general_sender');
  });

  test('chat unread count clears after the member marks the chat as read', async () => {
    const { registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'general_unread_sender');
    const reader = await registerUser(app, 'general_unread_reader');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${sender.accessToken}` }
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id;

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: { authorization: `Bearer ${sender.accessToken}` },
      payload: {
        content: 'unread counter test',
        clientMessageId: 'shared-general-unread-001'
      }
    });
    assert.equal(send.statusCode, 200);

    const beforeReadChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${reader.accessToken}` }
    });
    const beforeReadGeneral = JSON.parse(beforeReadChats.payload).find((chat: any) => chat.name === 'General');
    assert.equal(beforeReadGeneral.unreadCount, 1);

    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/read`,
      headers: { authorization: `Bearer ${reader.accessToken}` }
    });
    assert.equal(markRead.statusCode, 200);

    const afterReadChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${reader.accessToken}` }
    });
    const afterReadGeneral = JSON.parse(afterReadChats.payload).find((chat: any) => chat.name === 'General');
    assert.equal(afterReadGeneral.unreadCount, 0);
  });

  test('sender sees seenAt after another member reads the message', async () => {
    const { registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'general_seen_sender');
    const reader = await registerUser(app, 'general_seen_reader');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${sender.accessToken}` }
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id;

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: { authorization: `Bearer ${sender.accessToken}` },
      payload: {
        content: 'seen receipt test',
        clientMessageId: 'shared-general-seen-001'
      }
    });
    assert.equal(send.statusCode, 200);
    const sentMessage = JSON.parse(send.payload).message;
    assert.equal(sentMessage.seenAt, null);

    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/read`,
      headers: { authorization: `Bearer ${reader.accessToken}` }
    });
    assert.equal(markRead.statusCode, 200);

    const senderRead = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: { authorization: `Bearer ${sender.accessToken}` }
    });
    assert.equal(senderRead.statusCode, 200);

    const senderMessages = JSON.parse(senderRead.payload);
    const seenMessage = senderMessages.find((message: any) => message.content === 'seen receipt test');
    assert.ok(seenMessage, 'sender should still see the original message');
    assert.ok(seenMessage.seenAt, 'sender message should include a seenAt timestamp after read');
  });
});

describe('[integration] chat read receipts', { skip: SKIP }, () => {
  let app: any;
  let emitted: Array<{ room: string | null; event: string; data: any }>;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    emitted = result.emitted;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('mark read emits message.read and hydrates sender read receipts', async () => {
    const { authHeaders, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'receipt_sender');
    const reader = await registerUser(app, 'receipt_reader');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'receipt hydration test',
        clientMessageId: 'receipt-hydration-001'
      }
    });
    assert.equal(send.statusCode, 200);
    const sentMessage = JSON.parse(send.payload).message;

    const startIdx = emitted.length;
    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/read`,
      headers: authHeaders(reader.accessToken),
      payload: {
        throughMessageId: sentMessage.id
      }
    });
    assert.equal(markRead.statusCode, 200);
    const markReadBody = JSON.parse(markRead.payload);
    assert.equal(markReadBody.seenThroughMessageId, sentMessage.id);

    const readEvent = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'message.read');
    assert.ok(readEvent, 'marking a chat read should emit message.read');
    assert.deepEqual(readEvent.data, {
      type: 'message.read',
      payload: {
        chatId: generalChatId,
        readerUserId: reader.user.id,
        seenAt: markReadBody.lastReadAt,
        seenThroughMessageId: sentMessage.id
      }
    });

    const senderHistory = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken)
    });
    assert.equal(senderHistory.statusCode, 200);

    const hydratedMessage = JSON.parse(senderHistory.payload).find((message: any) => message.id === sentMessage.id);
    assert.ok(hydratedMessage.seenAt, 'sender history should expose seenAt once another member reads');
    assert.deepEqual(hydratedMessage.readReceipts, [
      {
        userId: reader.user.id,
        readAt: markReadBody.lastReadAt
      }
    ]);
  });

  test('messages newer than the explicit read marker remain unseen', async () => {
    const { authHeaders, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'receipt_precise_sender');
    const reader = await registerUser(app, 'receipt_precise_reader');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const firstSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'first precise receipt message',
        clientMessageId: 'receipt-precise-001'
      }
    });
    const secondSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'second precise receipt message',
        clientMessageId: 'receipt-precise-002'
      }
    });
    assert.equal(firstSend.statusCode, 200);
    assert.equal(secondSend.statusCode, 200);

    const firstMessage = JSON.parse(firstSend.payload).message;
    const secondMessage = JSON.parse(secondSend.payload).message;

    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/read`,
      headers: authHeaders(reader.accessToken),
      payload: {
        throughMessageId: firstMessage.id
      }
    });
    assert.equal(markRead.statusCode, 200);

    const senderHistory = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken)
    });
    assert.equal(senderHistory.statusCode, 200);

    const messages = JSON.parse(senderHistory.payload);
    const hydratedFirst = messages.find((message: any) => message.id === firstMessage.id);
    const hydratedSecond = messages.find((message: any) => message.id === secondMessage.id);
    assert.ok(hydratedFirst.seenAt, 'explicitly read message should show seenAt');
    assert.deepEqual(hydratedFirst.readReceipts?.map((receipt: any) => receipt.userId), [reader.user.id]);
    assert.equal(hydratedSecond.seenAt, null, 'newer messages should stay unseen');
    assert.equal(hydratedSecond.readReceipts, undefined, 'newer messages should not expose readReceipts');
  });

  test('message history accepts the web before cursor parameter', async () => {
    const { authHeaders, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'receipt_before_sender');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const firstSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'before cursor one',
        clientMessageId: 'before-cursor-001'
      }
    });
    const secondSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'before cursor two',
        clientMessageId: 'before-cursor-002'
      }
    });
    assert.equal(firstSend.statusCode, 200);
    assert.equal(secondSend.statusCode, 200);

    const secondMessage = JSON.parse(secondSend.payload).message;
    const paged = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages?before=${secondMessage.id}&limit=20`,
      headers: authHeaders(sender.accessToken)
    });
    assert.equal(paged.statusCode, 200);

    const pageMessages = JSON.parse(paged.payload);
    assert.ok(pageMessages.some((message: any) => message.content === 'before cursor one'));
    assert.ok(pageMessages.every((message: any) => message.id !== secondMessage.id));
  });

  test('members/read lists chat read state and rejects non-members', async () => {
    const { authHeaders, createPrivateChannelForUser, registerUser } = await import('./helpers.js');
    const alice = await registerUser(app, 'receipt_state_alice');
    const bob = await registerUser(app, 'receipt_state_bob');
    const outsider = await registerUser(app, 'receipt_state_outsider');

    const aliceChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(aliceChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'read-state marker source',
        clientMessageId: 'read-state-marker-001'
      }
    });
    assert.equal(send.statusCode, 200);
    const sentMessageId = JSON.parse(send.payload).message.id as string;

    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/read`,
      headers: authHeaders(bob.accessToken),
      payload: {
        throughMessageId: sentMessageId
      }
    });
    assert.equal(markRead.statusCode, 200);

    const readStates = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/members/read`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(readStates.statusCode, 200);
    const body = JSON.parse(readStates.payload);
    const bobState = body.find((state: any) => state.userId === bob.user.id);
    assert.equal(bobState.seenThroughMessageId, sentMessageId);
    assert.ok(bobState.lastReadAt, 'member read state should expose lastReadAt after marking read');

    const privateChatId = await createPrivateChannelForUser(alice.user.id, 'Receipt State Private');
    const outsiderRead = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${privateChatId}/members/read`,
      headers: authHeaders(outsider.accessToken)
    });
    assert.equal(outsiderRead.statusCode, 403);
    assert.equal(JSON.parse(outsiderRead.payload).error, 'You are not a member of this chat');
  });
});

describe('[integration] direct messages', { skip: SKIP }, () => {
  let app: any;
  let roomJoins: Array<{ sourceRoom: string; targetRoom: string }>;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    roomJoins = result.roomJoins;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('creates one DM per pair and resolves counterpart summary fields per viewer', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_alice');
    const bob = await registerUser(app, 'dm_bob');

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    assert.equal(first.statusCode, 200);
    const firstBody = JSON.parse(first.payload);
    assert.equal(firstBody.type, 'dm');
    assert.equal(firstBody.name, 'dm_bob');
    assert.equal(firstBody.counterpartMemberId, bob.user.id);
    assert.equal(firstBody.counterpartAvatarUrl, null);
    assert.equal(firstBody.notificationsMuted, false);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    assert.equal(second.statusCode, 200);
    const secondBody = JSON.parse(second.payload);
    assert.equal(secondBody.id, firstBody.id);

    const bobChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(bobChats.statusCode, 200);
    const bobDm = JSON.parse(bobChats.payload).find((chat: any) => chat.id === firstBody.id);
    assert.ok(bobDm);
    assert.equal(bobDm.name, 'dm_alice');
    assert.equal(bobDm.counterpartMemberId, alice.user.id);
    assert.equal(bobDm.notificationsMuted, false);
  });

  test('joins both participants current sockets to the DM room when a new thread is created', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_join_alice');
    const bob = await registerUser(app, 'dm_join_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    assert.equal(created.statusCode, 200);

    const chatId = JSON.parse(created.payload).id as string;
    const targetRoom = `chat:${chatId}`;

    assert.ok(
      roomJoins.some((join) => join.sourceRoom === `user:${alice.user.id}` && join.targetRoom === targetRoom),
      'creator sockets should join the new DM room immediately'
    );
    assert.ok(
      roomJoins.some((join) => join.sourceRoom === `user:${bob.user.id}` && join.targetRoom === targetRoom),
      'counterpart sockets should join the new DM room immediately'
    );
  });

  test('rejects self DMs and inactive targets', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_self_alice');
    const removed = await registerUser(app, 'dm_removed_target');
    const banned = await registerUser(app, 'dm_banned_target');

    await pool.query(`UPDATE users SET status = 'removed' WHERE id = $1`, [removed.user.id]);
    await pool.query(`UPDATE users SET status = 'banned' WHERE id = $1`, [banned.user.id]);

    const selfRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: alice.user.id }
    });
    assert.equal(selfRes.statusCode, 409);
    assert.equal(JSON.parse(selfRes.payload).error, 'Cannot message yourself');

    const removedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: removed.user.id }
    });
    assert.equal(removedRes.statusCode, 409);
    assert.equal(JSON.parse(removedRes.payload).error, 'Member account is not active');

    const bannedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: banned.user.id }
    });
    assert.equal(bannedRes.statusCode, 409);
    assert.equal(JSON.parse(bannedRes.payload).error, 'Member account is not active');

    const malformedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: 'not-a-uuid' }
    });
    assert.equal(malformedRes.statusCode, 400);
    assert.equal(JSON.parse(malformedRes.payload).error, 'Member ID must be a valid ID');
  });

  test('posting DM preferences updates only the caller membership row and returns a timestamp', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_pref_alice');
    const bob = await registerUser(app, 'dm_pref_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    const chatId = JSON.parse(created.payload).id as string;

    const patched = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/preferences`,
      headers: authHeaders(alice.accessToken),
      payload: { notificationsMuted: true }
    });
    assert.equal(patched.statusCode, 200);
    const patchedBody = JSON.parse(patched.payload);
    assert.equal(patchedBody.chatId, chatId);
    assert.equal(patchedBody.notificationsMuted, true);
    assert.ok(typeof patchedBody.updatedAt === 'string' && patchedBody.updatedAt.length > 0);

    const rows = await pool.query(
      `SELECT user_id, notifications_muted, notifications_muted_updated_at
       FROM chat_members
       WHERE chat_id = $1
       ORDER BY user_id`,
      [chatId]
    );
    assert.equal(rows.rowCount, 2);
    const membershipByUser = Object.fromEntries(rows.rows.map((row) => [row.user_id, row.notifications_muted]));
    assert.equal(membershipByUser[alice.user.id], true);
    assert.equal(membershipByUser[bob.user.id], false);
    const aliceMembership = rows.rows.find((row) => row.user_id === alice.user.id);
    assert.ok(aliceMembership?.notifications_muted_updated_at);

    const [aliceChats, bobChats] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/chats', headers: authHeaders(alice.accessToken) }),
      app.inject({ method: 'GET', url: '/api/v1/chats', headers: authHeaders(bob.accessToken) })
    ]);
    const aliceDm = JSON.parse(aliceChats.payload).find((chat: any) => chat.id === chatId);
    const bobDm = JSON.parse(bobChats.payload).find((chat: any) => chat.id === chatId);
    assert.equal(aliceDm.notificationsMuted, true);
    assert.equal(bobDm.notificationsMuted, false);
  });

  test('getting DM preferences returns the current mute state for that member', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_pref_get_alice');
    const bob = await registerUser(app, 'dm_pref_get_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    const chatId = JSON.parse(created.payload).id as string;

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/chats/${chatId}/preferences`,
      headers: authHeaders(bob.accessToken),
      payload: { notificationsMuted: true }
    });
    assert.equal(updated.statusCode, 200);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${chatId}/preferences`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(fetched.statusCode, 200);
    assert.deepEqual(JSON.parse(fetched.payload), JSON.parse(updated.payload));
  });

  test('muted DMs still update unread counts for the muted recipient', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const alice = await registerUser(app, 'dm_unread_alice');
    const bob = await registerUser(app, 'dm_unread_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    const chatId = JSON.parse(created.payload).id as string;

    const muted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/chats/${chatId}/preferences`,
      headers: authHeaders(bob.accessToken),
      payload: { notificationsMuted: true }
    });
    assert.equal(muted.statusCode, 200);

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'muted but unread',
        clientMessageId: 'dm-muted-unread-001'
      }
    });
    assert.equal(send.statusCode, 200);

    const bobChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(bob.accessToken)
    });
    const bobDm = JSON.parse(bobChats.payload).find((chat: any) => chat.id === chatId);
    assert.ok(bobDm);
    assert.equal(bobDm.unreadCount, 1);
    assert.equal(bobDm.notificationsMuted, true);
  });

  test('DMs become read-only after the counterpart is removed', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const admin = await registerUser(app, 'dm_admin_remove');
    await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.user.id]);
    const alice = await registerUser(app, 'dm_readonly_alice');
    const bob = await registerUser(app, 'dm_readonly_bob');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: authHeaders(alice.accessToken),
      payload: { memberId: bob.user.id }
    });
    const chatId = JSON.parse(created.payload).id as string;

    const initialSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'before removal',
        clientMessageId: 'dm-readonly-initial-001'
      }
    });
    assert.equal(initialSend.statusCode, 200);

    const removed = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/members/${bob.user.id}/remove`,
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(removed.statusCode, 204);

    const readMessages = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(readMessages.statusCode, 200);
    const messageRows = JSON.parse(readMessages.payload);
    assert.ok(messageRows.find((message: any) => message.content === 'before removal'));

    const blockedSend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'after removal',
        clientMessageId: 'dm-readonly-blocked-001'
      }
    });
    assert.equal(blockedSend.statusCode, 409);
  });
});

describe('[integration] self chats', { skip: SKIP }, () => {
  let app: any;
  let roomJoins: Array<{ sourceRoom: string; targetRoom: string }>;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    roomJoins = result.roomJoins;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('POST /api/v1/chats/self is idempotent and returns a writable self DM summary', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const user = await registerUser(app, 'notes_owner');

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/self',
      headers: authHeaders(user.accessToken)
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/self',
      headers: authHeaders(user.accessToken)
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);

    const firstBody = JSON.parse(first.payload);
    const secondBody = JSON.parse(second.payload);
    assert.equal(firstBody.id, secondBody.id, 'self chat should be reused');
    assert.equal(firstBody.type, 'dm');
    assert.equal(firstBody.name, 'Notes');
    assert.equal(firstBody.notificationsMuted, false);
    assert.equal(firstBody.counterpartMemberId, undefined);

    const targetRoom = `chat:${firstBody.id}`;
    assert.ok(
      roomJoins.some((join) => join.sourceRoom === `user:${user.user.id}` && join.targetRoom === targetRoom),
      'self chat should join the caller sockets to the chat room'
    );

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${firstBody.id}/messages`,
      headers: authHeaders(user.accessToken),
      payload: {
        content: 'note to self',
        clientMessageId: 'self-chat-note-001'
      }
    });
    assert.equal(send.statusCode, 200, 'self chats should remain writable');

    const chats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(user.accessToken)
    });
    const summaries = JSON.parse(chats.payload);
    assert.equal(summaries.filter((chat: any) => chat.id === firstBody.id).length, 1, 'self chat should appear once in the list');

    const membership = await pool.query(
      `SELECT COUNT(*)::int AS member_count
       FROM chat_members
       WHERE chat_id = $1`,
      [firstBody.id]
    );
    assert.equal(membership.rows[0].member_count, 1);

    const directLink = await pool.query('SELECT 1 FROM direct_chats WHERE chat_id = $1', [firstBody.id]);
    assert.equal(directLink.rowCount, 0, 'self chat should not create a direct_chats row');
  });
});

describe('[integration] polls', { skip: SKIP }, () => {
  let app: any;
  let emitted: Array<{ room: string | null; event: string; data: any }>;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    emitted = result.emitted;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('creating a poll persists a poll message and broadcasts message.new', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'poll_sender');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const startIdx = emitted.length;
    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/polls`,
      headers: authHeaders(sender.accessToken),
      payload: {
        question: 'Best rooftop snack?',
        options: ['Fries', 'Wings', 'Nachos']
      }
    });

    assert.equal(created.statusCode, 200);
    const body = JSON.parse(created.payload);
    assert.equal(body.deduped, false);
    assert.equal(body.message.type, 'poll');
    assert.equal(body.message.content, 'Best rooftop snack?');
    assert.equal(body.message.metadata.question, 'Best rooftop snack?');
    assert.equal(body.message.metadata.options.length, 3);
    assert.equal(body.message.metadata.createdByUserId, sender.user.id);

    const pollRow = await pool.query(
      `SELECT id
       FROM polls
       WHERE message_id = $1`,
      [body.message.id]
    );
    assert.equal(pollRow.rowCount, 1, 'poll row should be persisted for the poll message');

    const pollOptions = await pool.query(
      `SELECT option_index, option_text
       FROM poll_options
       WHERE poll_id = $1
       ORDER BY option_index ASC`,
      [body.message.metadata.id]
    );
    assert.equal(pollOptions.rowCount, 3);
    assert.deepEqual(
      pollOptions.rows.map((row) => row.option_text),
      ['Fries', 'Wings', 'Nachos']
    );

    const event = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'message.new');
    assert.ok(event, 'creating a poll should broadcast message.new');
    assert.equal(event.data.type, 'message.new');
    assert.equal(event.data.payload.type, 'poll');
    assert.equal(event.data.payload.metadata.id, body.message.metadata.id);
  });

  test('voting on a poll updates metadata and broadcasts poll.voted', async () => {
    const { authHeaders, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'poll_vote_sender');
    const voter = await registerUser(app, 'poll_vote_reader');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const generalChatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/polls`,
      headers: authHeaders(sender.accessToken),
      payload: {
        question: 'Best rooftop snack?',
        options: ['Fries', 'Wings']
      }
    });
    assert.equal(created.statusCode, 200);
    const pollMessage = JSON.parse(created.payload).message;
    const pollId = pollMessage.metadata.id as string;

    const startIdx = emitted.length;
    const voted = await app.inject({
      method: 'POST',
      url: `/api/v1/polls/${pollId}/vote`,
      headers: authHeaders(voter.accessToken),
      payload: {
        optionIndex: 1
      }
    });
    assert.equal(voted.statusCode, 200);

    const poll = JSON.parse(voted.payload);
    assert.equal(poll.id, pollId);
    assert.deepEqual(poll.options[1].voterIds, [voter.user.id]);

    const voteEvent = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'poll.voted');
    assert.ok(voteEvent, 'voting should broadcast poll.voted');
    assert.deepEqual(voteEvent.data, {
      type: 'poll.voted',
      payload: {
        chatId: generalChatId,
        pollId,
        poll
      }
    });

    const history = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(sender.accessToken)
    });
    assert.equal(history.statusCode, 200);

    const hydratedPollMessage = JSON.parse(history.payload).find((message: any) => message.id === pollMessage.id);
    assert.ok(hydratedPollMessage, 'poll message should remain in message history');
    assert.deepEqual(hydratedPollMessage.metadata.options[1].voterIds, [voter.user.id]);

    const conflictingVote = await app.inject({
      method: 'POST',
      url: `/api/v1/polls/${pollId}/vote`,
      headers: authHeaders(voter.accessToken),
      payload: {
        optionIndex: 0
      }
    });
    assert.equal(conflictingVote.statusCode, 409, 'single-select polls should reject a second distinct vote');
    assert.equal(JSON.parse(conflictingVote.payload).error, 'You have already voted on this poll');
  });
});

describe('[integration] message idempotency', { skip: SKIP }, () => {
  let app: any;
  let emitted: any[];

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    emitted = result.emitted;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('duplicate clientMessageId returns deduped: true with same message id', async () => {
    const { registerUser } = await import('./helpers.js');
    const frank = await registerUser(app, 'frank_dedup');

    const frankChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${frank.accessToken}` }
    });
    const chatId = JSON.parse(frankChats.payload)[0].id;

    const clientMessageId = 'idempotent-msg-001';
    const payload = { content: 'hello once', clientMessageId };

    // First send
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${frank.accessToken}` },
      payload
    });
    assert.equal(first.statusCode, 200);
    const firstBody = JSON.parse(first.payload);
    assert.equal(firstBody.deduped, false, 'first send must not be deduped');

    // Second send with identical clientMessageId
    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${frank.accessToken}` },
      payload
    });
    assert.equal(second.statusCode, 200);
    const secondBody = JSON.parse(second.payload);
    assert.equal(secondBody.deduped, true, 'duplicate clientMessageId must be deduped');
    assert.equal(secondBody.message.id, firstBody.message.id, 'deduped message must have same server id');
  });

  test('different clientMessageId creates separate messages', async () => {
    const { registerUser } = await import('./helpers.js');
    const grace = await registerUser(app, 'grace_unique');

    const graceChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${grace.accessToken}` }
    });
    const chatId = JSON.parse(graceChats.payload)[0].id;

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${grace.accessToken}` },
      payload: { content: 'message one', clientMessageId: 'unique-msg-001' }
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${grace.accessToken}` },
      payload: { content: 'message two', clientMessageId: 'unique-msg-002' }
    });

    const firstBody = JSON.parse(first.payload);
    const secondBody = JSON.parse(second.payload);
    assert.notEqual(firstBody.message.id, secondBody.message.id, 'different clientMessageIds must create separate messages');
    assert.equal(firstBody.deduped, false);
    assert.equal(secondBody.deduped, false);
  });

  test('idempotent send avoids rebroadcasting message.new while still acknowledging retries', async () => {
    const { registerUser } = await import('./helpers.js');
    const hank = await registerUser(app, 'hank_events');

    const hankChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${hank.accessToken}` }
    });
    const chatId = JSON.parse(hankChats.payload)[0].id;

    const startIdx = emitted.length;
    const clientMessageId = 'event-check-001';

    await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${hank.accessToken}` },
      payload: { content: 'event test', clientMessageId }
    });

    await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${hank.accessToken}` },
      payload: { content: 'event test', clientMessageId }
    });

    // First send broadcasts the message; the retry only gets an ack.
    const newEvents = emitted.slice(startIdx).filter((e: any) => e.event === 'message.new');
    const ackEvents = emitted.slice(startIdx).filter((e: any) => e.event === 'message.ack');
    assert.equal(newEvents.length, 1, 'deduped retries must not rebroadcast message.new');
    assert.equal(ackEvents.length, 2, 'sender should still receive an ack for both attempts');
    assert.equal(ackEvents[0].data.payload.clientMessageId, clientMessageId);
    assert.equal(ackEvents[1].data.payload.clientMessageId, clientMessageId);
  });

  test('REST send still acknowledges the sender when room broadcast throws after persistence', async () => {
    const { pool, registerUser } = await import('./helpers.js');
    const originalTo = app.io.to.bind(app.io);
    const sender = await registerUser(app, 'hank_broadcast_failure');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${sender.accessToken}` }
    });
    const chatId = JSON.parse(senderChats.payload)[0].id;
    const startIdx = emitted.length;
    const clientMessageId = 'broadcast-failure-001';

    app.io.to = ((room: string) => {
      const target = originalTo(room);
      return {
        emit(event: string, data: unknown) {
          if (room === `chat:${chatId}` && event === 'message.new') {
            throw new Error('simulated emit failure');
          }
          target.emit(event, data);
        }
      };
    }) as typeof app.io.to;

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers: { authorization: `Bearer ${sender.accessToken}` },
        payload: { content: 'persist despite emit failure', clientMessageId }
      });

      assert.equal(response.statusCode, 200, 'saved messages should still return success when realtime broadcast fails');
      const body = JSON.parse(response.payload);
      assert.equal(body.message.clientMessageId, clientMessageId);

      const ackEvents = emitted.slice(startIdx).filter((event: any) => event.event === 'message.ack');
      assert.equal(ackEvents.length, 1, 'sender should still receive a message.ack');
      assert.equal(ackEvents[0].data.payload.clientMessageId, clientMessageId);

      const persisted = await pool.query(
        `SELECT id
         FROM messages
         WHERE chat_id = $1
           AND sender_id = $2
           AND client_message_id = $3`,
        [chatId, sender.user.id, clientMessageId]
      );
      assert.equal(persisted.rowCount, 1, 'message should remain persisted even when broadcast fails');
    } finally {
      app.io.to = originalTo;
    }
  });

  test('REST send reflects the latest display name and avatar metadata', async () => {
    const { pool, registerUser } = await import('./helpers.js');
    const sender = await registerUser(app, 'rest_profile_sender');

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${sender.accessToken}` }
    });
    const chatId = JSON.parse(senderChats.payload)[0].id;

    const avatarId = randomUUID();
    const storageKey = `rest-profile-${avatarId}.png`;
    await pool.query(
      `INSERT INTO media_uploads(
         id,
         uploader_id,
         file_name,
         original_file_name,
         storage_key,
         file_path,
         size_bytes,
         content_type,
         media_kind
       ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        avatarId,
        sender.user.id,
        storageKey,
        'rest-profile.png',
        storageKey,
        `/tmp/${storageKey}`,
        128,
        'image/png',
        'image'
      ]
    );
    await pool.query(
      'UPDATE users SET display_name = $1, avatar_media_id = $2 WHERE id = $3',
      ['REST Fresh Alias', avatarId, sender.user.id]
    );

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: { authorization: `Bearer ${sender.accessToken}` },
      payload: {
        content: 'rest parity test',
        clientMessageId: 'rest-profile-parity-001'
      }
    });
    assert.equal(sent.statusCode, 200);

    const body = JSON.parse(sent.payload);
    assert.equal(body.message.senderDisplayName, 'REST Fresh Alias');
    assert.equal(body.message.senderAvatarUrl, `/uploads/${encodeURIComponent(storageKey)}`);
  });

  test('concurrent duplicate sends do not crash and resolve to one message id', async () => {
    const { registerUser } = await import('./helpers.js');
    const iris = await registerUser(app, 'iris_race');

    const irisChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: { authorization: `Bearer ${iris.accessToken}` }
    });
    const chatId = JSON.parse(irisChats.payload)[0].id;

    const payload = {
      content: 'concurrent dedup',
      clientMessageId: 'race-msg-001'
    };

    const [first, second] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers: { authorization: `Bearer ${iris.accessToken}` },
        payload
      }),
      app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers: { authorization: `Bearer ${iris.accessToken}` },
        payload
      })
    ]);

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);

    const firstBody = JSON.parse(first.payload);
    const secondBody = JSON.parse(second.payload);

    assert.equal(firstBody.message.id, secondBody.message.id, 'concurrent duplicates must map to same message');
    assert.equal(
      [firstBody.deduped, secondBody.deduped].filter((v: boolean) => v === false).length,
      1,
      'exactly one request should create the message'
    );
  });

  test('migrations include a partial visible-message chat ordering index', async () => {
    const { pool } = await import('./helpers.js');

    const result = await pool.query(
      `SELECT pg_get_indexdef(i.indexrelid) AS indexdef,
              pg_get_expr(i.indpred, i.indrelid) AS predicate
       FROM pg_index i
       JOIN pg_class idx ON idx.oid = i.indexrelid
       JOIN pg_class tbl ON tbl.oid = i.indrelid
       JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
       WHERE ns.nspname = 'public'
         AND tbl.relname = 'messages'
         AND pg_get_indexdef(i.indexrelid) ILIKE '%(chat_id, created_at DESC)%'
         AND COALESCE(pg_get_expr(i.indpred, i.indrelid), '') ILIKE '%hidden_by_moderation = false%'`
    );

    assert.ok(result.rowCount >= 1, 'expected a partial messages(chat_id, created_at DESC) index for visible messages');
  });
});

describe('[integration] wave b message interactions', { skip: SKIP }, () => {
  let app: any;
  let emitted: Array<{ room: string | null; event: string; data: any }>;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
    emitted = result.emitted;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('message reactions are idempotent, grouped in history, and removable', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const alice = await registerUser(app, 'reaction_alice');
    const bob = await registerUser(app, 'reaction_bob');

    const aliceChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(aliceChats.payload).find((chat: any) => chat.name === 'General').id as string;

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'react to this',
        clientMessageId: 'wave-b-reaction-001'
      }
    });
    assert.equal(sent.statusCode, 200);
    const messageId = JSON.parse(sent.payload).message.id as string;

    const startIdx = emitted.length;
    const firstReaction = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages/${messageId}/reactions`,
      headers: authHeaders(bob.accessToken),
      payload: { emoji: '🔥' }
    });
    assert.equal(firstReaction.statusCode, 200);
    assert.deepEqual(JSON.parse(firstReaction.payload), [{ emoji: '🔥', userIds: [bob.user.id] }]);

    const duplicateReaction = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages/${messageId}/reactions`,
      headers: authHeaders(bob.accessToken),
      payload: { emoji: '🔥' }
    });
    assert.equal(duplicateReaction.statusCode, 200);

    const aliceReaction = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages/${messageId}/reactions`,
      headers: authHeaders(alice.accessToken),
      payload: { emoji: '🔥' }
    });
    assert.equal(aliceReaction.statusCode, 200);
    assert.deepEqual(JSON.parse(aliceReaction.payload), [{ emoji: '🔥', userIds: [bob.user.id, alice.user.id] }]);

    const addEvents = emitted
      .slice(startIdx)
      .filter((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'reaction.add');
    assert.equal(addEvents.length, 2, 'duplicate reactions must not rebroadcast');

    const history = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(history.statusCode, 200);
    const hydrated = JSON.parse(history.payload).find((message: any) => message.id === messageId);
    assert.deepEqual(hydrated.reactions, [{ emoji: '🔥', userIds: [bob.user.id, alice.user.id] }]);

    const remove = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/messages/${messageId}/reactions/%F0%9F%94%A5`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(remove.statusCode, 204);

    const removeEvent = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'reaction.remove');
    assert.ok(removeEvent, 'reaction removal should broadcast');
    assert.deepEqual((removeEvent?.data as any)?.payload, {
      chatId: generalChatId,
      messageId,
      userId: bob.user.id,
      emoji: '🔥'
    });
  });

  test('new reaction, pin, and delete routes reject non-members and foreign deletions', async () => {
    const { authHeaders, cleanup, createPrivateChannelForUser, registerUser } = await import('./helpers.js');
    await cleanup();

    const owner = await registerUser(app, 'waveb_owner');
    const member = await registerUser(app, 'waveb_member');
    const outsider = await registerUser(app, 'waveb_outsider');

    const privateChatId = await createPrivateChannelForUser(owner.user.id, 'Wave B Private');
    await (await import('./helpers.js')).pool.query(
      'INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2)',
      [privateChatId, member.user.id]
    );

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${privateChatId}/messages`,
      headers: authHeaders(owner.accessToken),
      payload: {
        content: 'private wave b target',
        clientMessageId: 'wave-b-private-target-001'
      }
    });
    assert.equal(sent.statusCode, 200);
    const messageId = JSON.parse(sent.payload).message.id as string;

    const nonMemberAddReaction = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/reactions`,
      headers: authHeaders(outsider.accessToken),
      payload: { emoji: '🔥' }
    });
    assert.equal(nonMemberAddReaction.statusCode, 403);

    const ownerReaction = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/reactions`,
      headers: authHeaders(owner.accessToken),
      payload: { emoji: '🔥' }
    });
    assert.equal(ownerReaction.statusCode, 200);

    const nonMemberDeleteReaction = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/reactions/%F0%9F%94%A5`,
      headers: authHeaders(outsider.accessToken)
    });
    assert.equal(nonMemberDeleteReaction.statusCode, 403);

    const foreignDeleteReaction = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/reactions/%F0%9F%94%A5`,
      headers: authHeaders(member.accessToken)
    });
    assert.equal(foreignDeleteReaction.statusCode, 403);
    assert.equal(JSON.parse(foreignDeleteReaction.payload).error, `You don't have permission to perform this action`);

    const nonMemberPin = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/pin`,
      headers: authHeaders(outsider.accessToken)
    });
    assert.equal(nonMemberPin.statusCode, 403);

    const pinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/pin`,
      headers: authHeaders(owner.accessToken)
    });
    assert.equal(pinRes.statusCode, 200);

    const nonMemberUnpin = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}/pin`,
      headers: authHeaders(outsider.accessToken)
    });
    assert.equal(nonMemberUnpin.statusCode, 403);

    const nonMemberDeleteMessage = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}`,
      headers: authHeaders(outsider.accessToken)
    });
    assert.equal(nonMemberDeleteMessage.statusCode, 403);

    const foreignDeleteMessage = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${privateChatId}/messages/${messageId}`,
      headers: authHeaders(member.accessToken)
    });
    assert.equal(foreignDeleteMessage.statusCode, 403);
    assert.equal(JSON.parse(foreignDeleteMessage.payload).error, `You don't have permission to perform this action`);
  });

  test('reply snapshots survive deletion of the source message', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const alice = await registerUser(app, 'reply_alice');
    const bob = await registerUser(app, 'reply_bob');

    const chats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(chats.payload).find((chat: any) => chat.name === 'General').id as string;

    const original = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'Original rooftop take',
        clientMessageId: 'wave-b-reply-origin-001'
      }
    });
    assert.equal(original.statusCode, 200);
    const originalBody = JSON.parse(original.payload);

    const replySend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(bob.accessToken),
      payload: {
        content: 'Replying to that take',
        replyToMessageId: originalBody.message.id,
        clientMessageId: 'wave-b-reply-send-001'
      }
    });
    assert.equal(replySend.statusCode, 200);
    const replyBody = JSON.parse(replySend.payload);
    assert.deepEqual(replyBody.message.replyTo, {
      id: originalBody.message.id,
      content: 'Original rooftop take',
      senderDisplayName: 'reply_alice'
    });

    const history = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(history.statusCode, 200);
    const replyMessage = JSON.parse(history.payload).find((message: any) => message.id === replyBody.message.id);
    assert.deepEqual(replyMessage.replyTo, {
      id: originalBody.message.id,
      content: 'Original rooftop take',
      senderDisplayName: 'reply_alice'
    });

    const deleteOriginal = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/messages/${originalBody.message.id}`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(deleteOriginal.statusCode, 204);

    const afterSourceDelete = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(afterSourceDelete.statusCode, 200);
    const replyAfterSourceDelete = JSON.parse(afterSourceDelete.payload).find((message: any) => message.id === replyBody.message.id);
    assert.deepEqual(replyAfterSourceDelete.replyTo, {
      id: originalBody.message.id,
      content: 'Original rooftop take',
      senderDisplayName: 'reply_alice'
    });
  });

  test('own-message deletion emits the moderation tombstone', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const alice = await registerUser(app, 'delete_reply_alice');
    const bob = await registerUser(app, 'delete_reply_bob');

    const chats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(chats.payload).find((chat: any) => chat.name === 'General').id as string;

    const replySend = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(bob.accessToken),
      payload: {
        content: 'Delete me',
        clientMessageId: 'wave-b-reply-delete-001'
      }
    });
    assert.equal(replySend.statusCode, 200);
    const replyBody = JSON.parse(replySend.payload);

    const startIdx = emitted.length;
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/messages/${replyBody.message.id}`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(deleted.statusCode, 204);

    const moderationEvent = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'message.moderated');
    assert.ok(moderationEvent, 'own-message deletion should reuse message.moderated');
    assert.equal((moderationEvent?.data as any)?.payload?.action, 'hide');
    assert.equal((moderationEvent?.data as any)?.payload?.message?.hidden, true);

    const afterDelete = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken)
    });
    const deletedMessage = JSON.parse(afterDelete.payload).find((message: any) => message.id === replyBody.message.id);
    assert.equal(deletedMessage.hidden, true);
    assert.equal(deletedMessage.content, 'Message removed by moderation.');
  });

  test('pins preserve snapshots, broadcast events, and enforce a maximum of five per chat', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const alice = await registerUser(app, 'pin_alice');
    const bob = await registerUser(app, 'pin_bob');

    const chats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(chats.payload).find((chat: any) => chat.name === 'General').id as string;

    const messageIds: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${generalChatId}/messages`,
        headers: authHeaders(alice.accessToken),
        payload: {
          content: `pin candidate ${index + 1}`,
          clientMessageId: `wave-b-pin-${index + 1}`
        }
      });
      assert.equal(sent.statusCode, 200);
      messageIds.push(JSON.parse(sent.payload).message.id as string);
    }

    const startIdx = emitted.length;
    for (const messageId of messageIds.slice(0, 5)) {
      const pinRes = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${generalChatId}/messages/${messageId}/pin`,
        headers: authHeaders(bob.accessToken)
      });
      assert.equal(pinRes.statusCode, 200);
    }

    const sixthPin = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages/${messageIds[5]}/pin`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(sixthPin.statusCode, 422);
    assert.equal(JSON.parse(sixthPin.payload).error, 'This chat already has the maximum of 5 pinned messages');

    const listPins = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/pins`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(listPins.statusCode, 200);
    const pins = JSON.parse(listPins.payload);
    assert.equal(pins.length, 5);
    assert.equal(pins[0].chatId, generalChatId);

    const deletedSource = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/messages/${messageIds[0]}`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(deletedSource.statusCode, 204);

    const pinsAfterDelete = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/pins`,
      headers: authHeaders(alice.accessToken)
    });
    const pinnedSnapshot = JSON.parse(pinsAfterDelete.payload).find((pin: any) => pin.messageId === messageIds[0]);
    assert.equal(pinnedSnapshot.content, 'pin candidate 1', 'pin list should keep the original snapshot content');

    const unpin = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/messages/${messageIds[0]}/pin`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(unpin.statusCode, 204);

    const pinEvents = emitted
      .slice(startIdx)
      .filter((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'message.pinned');
    const unpinEvent = emitted
      .slice(startIdx)
      .find((entry) => entry.room === `chat:${generalChatId}` && entry.event === 'message.unpinned');
    assert.equal(pinEvents.length, 5);
    assert.ok(unpinEvent, 'unpinning should broadcast message.unpinned');
  });

  test('frontend pin compatibility routes add and remove pins', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const alice = await registerUser(app, 'compat_pin_alice');
    const bob = await registerUser(app, 'compat_pin_bob');

    const chats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(alice.accessToken)
    });
    const generalChatId = JSON.parse(chats.payload).find((chat: any) => chat.name === 'General').id as string;

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: authHeaders(alice.accessToken),
      payload: {
        content: 'compat pin candidate',
        clientMessageId: 'compat-pin-001'
      }
    });
    assert.equal(sent.statusCode, 200);
    const messageId = JSON.parse(sent.payload).message.id as string;

    const pinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/pins`,
      headers: authHeaders(bob.accessToken),
      payload: {
        messageId
      }
    });
    assert.equal(pinRes.statusCode, 200);
    assert.equal(JSON.parse(pinRes.payload).messageId, messageId);

    const listPinned = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/pins`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(listPinned.statusCode, 200);
    assert.ok(JSON.parse(listPinned.payload).some((pin: any) => pin.messageId === messageId));

    const unpinRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${generalChatId}/pins/${messageId}`,
      headers: authHeaders(bob.accessToken)
    });
    assert.equal(unpinRes.statusCode, 204);

    const afterUnpin = await app.inject({
      method: 'GET',
      url: `/api/v1/chats/${generalChatId}/pins`,
      headers: authHeaders(alice.accessToken)
    });
    assert.equal(afterUnpin.statusCode, 200);
    assert.ok(!JSON.parse(afterUnpin.payload).some((pin: any) => pin.messageId === messageId));
  });

  test('admins can delete another member message through the member delete route', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    const { env } = await import('../src/config/env.js');
    await cleanup();

    const originalBootstrap = env.ADMIN_BOOTSTRAP_USERNAME;
    env.ADMIN_BOOTSTRAP_USERNAME = 'delete_admin';

    try {
      const admin = await registerUser(app, 'delete_admin');
      const member = await registerUser(app, 'delete_target');

      const chats = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(member.accessToken)
      });
      const generalChatId = JSON.parse(chats.payload).find((chat: any) => chat.name === 'General').id as string;

      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${generalChatId}/messages`,
        headers: authHeaders(member.accessToken),
        payload: {
          content: 'admin delete route target',
          clientMessageId: 'wave-b-admin-delete-001'
        }
      });
      assert.equal(sent.statusCode, 200);
      const messageId = JSON.parse(sent.payload).message.id as string;

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${generalChatId}/messages/${messageId}`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(deleted.statusCode, 204);
    } finally {
      env.ADMIN_BOOTSTRAP_USERNAME = originalBootstrap;
    }
  });
});

describe('[integration] moderation visibility', { skip: SKIP }, () => {
  let app: any;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  after(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('removed member messages are hidden from normal chat history but remain visible in admin audit history', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    const { env } = await import('../src/config/env.js');
    await cleanup();

    const originalBootstrap = env.ADMIN_BOOTSTRAP_USERNAME;
    env.ADMIN_BOOTSTRAP_USERNAME = 'audit_admin';

    try {
      const admin = await registerUser(app, 'audit_admin');
      const member = await registerUser(app, 'hidden_sender');
      const observer = await registerUser(app, 'history_observer');

      const adminChats = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(admin.accessToken)
      });
      const generalChatId = JSON.parse(adminChats.payload).find((chat: any) => chat.name === 'General').id;

      const sendRes = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${generalChatId}/messages`,
        headers: authHeaders(member.accessToken),
        payload: {
          content: 'this should be hidden after removal',
          clientMessageId: 'hidden-history-001'
        }
      });
      assert.equal(sendRes.statusCode, 200);

      const removeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/members/${member.user.id}/remove`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(removeRes.statusCode, 204);

      const observerHistory = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${generalChatId}/messages`,
        headers: authHeaders(observer.accessToken)
      });
      assert.equal(observerHistory.statusCode, 200);
      const visibleMessages = JSON.parse(observerHistory.payload);
      assert.ok(
        visibleMessages.every((message: any) => message.content !== 'this should be hidden after removal'),
        'normal member history should hide messages from removed senders'
      );

      const adminAudit = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/chats/${generalChatId}/messages`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(adminAudit.statusCode, 200);
      const auditMessages = JSON.parse(adminAudit.payload);
      const hiddenMessage = auditMessages.find((message: any) => message.content === 'this should be hidden after removal');
      assert.ok(hiddenMessage, 'admin audit history should retain hidden messages');
      assert.equal(hiddenMessage.hidden, true);
      assert.equal(hiddenMessage.senderStatus, 'removed');
      assert.equal(hiddenMessage.senderUsername, 'hidden_sender');
      assert.equal(hiddenMessage.senderDisplayName, 'hidden_sender');
    } finally {
      env.ADMIN_BOOTSTRAP_USERNAME = originalBootstrap;
    }
  });
});
