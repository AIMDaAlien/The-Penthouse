/**
 * Integration tests for chat authorization and message idempotency.
 *
 * Requires a running PostgreSQL instance with DATABASE_URL set.
 * Skips gracefully when DATABASE_URL is not available.
 */
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

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

  test('idempotent send emits socket events for both sends', async () => {
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

    // Check that message.new and message.ack were emitted
    const newEvents = emitted.slice(startIdx).filter((e: any) => e.event === 'message.new');
    const ackEvents = emitted.slice(startIdx).filter((e: any) => e.event === 'message.ack');
    assert.ok(newEvents.length >= 1, 'message.new should be emitted');
    assert.ok(ackEvents.length >= 1, 'message.ack should be emitted');
    assert.equal(ackEvents[0].data.payload.clientMessageId, clientMessageId);
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
