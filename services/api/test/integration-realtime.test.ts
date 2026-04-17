/**
 * Integration tests for realtime observability and auth rejection.
 *
 * Requires a running PostgreSQL instance with DATABASE_URL set.
 */
import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { io as createClient, type Socket } from 'socket.io-client';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

type CapturedLog = Record<string, unknown> & { msg?: string };

const GENERAL_CHAT_ID = '00000000-0000-0000-0000-000000000001';

function captureLog(args: unknown[]): CapturedLog {
  if (typeof args[0] === 'string') {
    return { msg: args[0] };
  }
  if (args[0] && typeof args[0] === 'object') {
    return {
      ...(args[0] as Record<string, unknown>),
      msg: typeof args[1] === 'string' ? args[1] : undefined
    };
  }
  return { msg: typeof args[1] === 'string' ? args[1] : undefined };
}

async function closeSocket(socket: Socket): Promise<void> {
  if (socket.disconnected) return;
  await new Promise<void>((resolve) => {
    socket.once('disconnect', () => resolve());
    socket.disconnect();
  });
}

async function waitForSocketConnect(socket: Socket, timeoutMs = 1_500): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('connect', handleConnect);
      reject(new Error('Timed out waiting for connect'));
    }, timeoutMs);

    const handleConnect = () => {
      clearTimeout(timeout);
      socket.off('connect', handleConnect);
      resolve();
    };

    socket.once('connect', handleConnect);
  });
}

async function waitForConnectError(socket: Socket, timeoutMs = 1_500): Promise<Error> {
  return new Promise<Error>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('connect_error', handleError);
      reject(new Error('Timed out waiting for connect_error'));
    }, timeoutMs);

    const handleError = (error: Error) => {
      clearTimeout(timeout);
      socket.off('connect_error', handleError);
      resolve(error);
    };

    socket.once('connect_error', handleError);
  });
}

async function waitForSocketEvent<T>(
  socket: Socket,
  eventName: string,
  predicate: (payload: T) => boolean,
  timeoutMs: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler as (...args: any[]) => void);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timeout);
      socket.off(eventName, handler as (...args: any[]) => void);
      resolve(payload);
    };

    socket.on(eventName, handler as (...args: any[]) => void);
  });
}

describe('[integration] realtime observability', { skip: SKIP }, () => {
  let app: any;
  let ioServer: any;
  let baseUrl = '';
  let infoLogs: CapturedLog[] = [];
  let warnLogs: CapturedLog[] = [];

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const { cleanup, migrate } = await import('./helpers.js');
    await migrate();
    await cleanup();

    const { createApp } = await import('../src/app.js');
    const { initRealtime } = await import('../src/realtime/socket.js');

    app = await createApp();

    const originalInfo = app.log.info.bind(app.log);
    const originalWarn = app.log.warn.bind(app.log);

    app.log.info = ((...args: unknown[]) => {
      infoLogs.push(captureLog(args));
      return originalInfo(...args as Parameters<typeof originalInfo>);
    }) as typeof app.log.info;

    app.log.warn = ((...args: unknown[]) => {
      warnLogs.push(captureLog(args));
      return originalWarn(...args as Parameters<typeof originalWarn>);
    }) as typeof app.log.warn;

    ioServer = initRealtime(app);
    app.decorate('io', ioServer as any);

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (ioServer) {
      await new Promise<void>((resolve) => {
        ioServer.close(() => resolve());
      });
    }
    await app?.close();
    const { cleanup } = await import('./helpers.js');
    await cleanup();
  });

  test('logs successful socket connections with userId, socketId, and transport', async () => {
    const { cleanup, registerUser } = await import('./helpers.js');
    await cleanup();
    infoLogs = [];
    warnLogs = [];

    const user = await registerUser(app, 'socket_user');
    const socket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: user.accessToken },
      reconnection: false,
      forceNew: true
    });

    await waitForSocketConnect(socket);
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.ok(
      infoLogs.some(
        (entry) =>
          entry.msg === 'socket handshake start' &&
          entry.transport === 'polling'
      ),
      'expected socket handshake start log'
    );

    assert.ok(
      infoLogs.some(
        (entry) =>
          entry.msg === 'socket connected' &&
          entry.userId === user.user.id &&
          typeof entry.socketId === 'string' &&
          entry.transport === 'polling'
      ),
      'expected successful socket connection log with userId, socketId, and transport'
    );

    await closeSocket(socket);
  });

  test('logs invalid token auth rejection', async () => {
    infoLogs = [];
    warnLogs = [];

    const socket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: 'not-a-real-jwt' },
      reconnection: false,
      forceNew: true
    });

    const error = await waitForConnectError(socket);
    assert.equal(error.message, 'Unauthorized');
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.ok(
      warnLogs.some((entry) => entry.msg === 'socket auth failed: invalid token'),
      'expected invalid token auth rejection log'
    );

    await closeSocket(socket);
  });

  test('rejects unavailable accounts during socket auth', async () => {
    const { cleanup, pool, registerUser } = await import('./helpers.js');
    await cleanup();
    infoLogs = [];
    warnLogs = [];

    const user = await registerUser(app, 'banned_socket_user');
    await pool.query(`UPDATE users SET status = 'banned' WHERE id = $1`, [user.user.id]);

    const socket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: user.accessToken },
      reconnection: false,
      forceNew: true
    });

    const error = await waitForConnectError(socket);
    assert.equal(error.message, 'Account unavailable');
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.ok(
      warnLogs.some((entry) => entry.msg === 'socket auth failed: account unavailable'),
      'expected unavailable account auth rejection log'
    );

    await closeSocket(socket);
  });

  test('sends boolean presence sync on connect and broadcasts client-driven presence changes', async () => {
    const { cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const actor = await registerUser(app, 'presence_actor');
    const observer = await registerUser(app, 'presence_observer');

    const actorSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: actor.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(actorSocket);

    const syncedObserverSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: observer.accessToken },
      reconnection: false,
      forceNew: true,
      autoConnect: false
    });

    const presenceSync = waitForSocketEvent<Record<string, boolean>>(
      syncedObserverSocket,
      'presence.sync',
      (event) => event?.[actor.user.id] === true && event?.[observer.user.id] === true,
      1_500
    );
    syncedObserverSocket.connect();
    await waitForSocketConnect(syncedObserverSocket);

    const syncPayload = await presenceSync;
    assert.equal(syncPayload[actor.user.id], true);
    assert.equal(syncPayload[observer.user.id], true);

    actorSocket.emit('presence.update', { online: false });

    await waitForSocketEvent(syncedObserverSocket, 'presence.update', (event: any) => (
      event?.userId === actor.user.id &&
      event?.online === false &&
      typeof event?.timestamp === 'string'
    ), 1_500);

    actorSocket.emit('presence.update', { online: true });

    await waitForSocketEvent(syncedObserverSocket, 'presence.update', (event: any) => (
      event?.userId === actor.user.id &&
      event?.online === true &&
      typeof event?.timestamp === 'string'
    ), 1_500);

    const disconnected = waitForSocketEvent(syncedObserverSocket, 'presence.update', (event: any) => (
      event?.userId === actor.user.id &&
      event?.online === false &&
      typeof event?.timestamp === 'string'
    ), 1_500);

    await closeSocket(actorSocket);
    await disconnected;
    await closeSocket(syncedObserverSocket);
  });

  test('GET /api/v1/presence returns the current boolean presence snapshot', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const onlineUser = await registerUser(app, 'presence_route_online');
    const offlineUser = await registerUser(app, 'presence_route_offline');

    const onlineSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: onlineUser.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(onlineSocket);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/presence',
      headers: authHeaders(offlineUser.accessToken)
    });
    assert.equal(response.statusCode, 200);

    const snapshot = JSON.parse(response.payload) as Record<string, boolean>;
    assert.equal(snapshot[onlineUser.user.id], true);
    assert.equal(snapshot[offlineUser.user.id], false);

    await closeSocket(onlineSocket);
  });

  test('replays active typing state to a member who joins after typing has started', async () => {
    const { cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'typing_sender');
    const receiver = await registerUser(app, 'typing_receiver');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const receiverSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: receiver.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(receiverSocket);

    await new Promise<void>((resolve, reject) => {
      senderSocket.emit('chat.join', { chatId: GENERAL_CHAT_ID }, (response: { ok?: boolean }) => {
        if (response?.ok) {
          resolve();
          return;
        }
        reject(new Error('sender join failed'));
      });
    });

    senderSocket.emit('typing.start', { chatId: GENERAL_CHAT_ID });

    const typingReplay = waitForSocketEvent(receiverSocket, 'typing.update', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.userId === sender.user.id &&
      event?.payload?.status === 'start'
    ), 1_500);

    await new Promise<void>((resolve, reject) => {
      receiverSocket.emit('chat.join', { chatId: GENERAL_CHAT_ID }, (response: { ok?: boolean }) => {
        if (response?.ok) {
          resolve();
          return;
        }
        reject(new Error('receiver join failed'));
      });
    });

    await typingReplay;

    await closeSocket(senderSocket);
    await closeSocket(receiverSocket);
  });

  test('socket message send uses the latest profile display name after a profile update', async () => {
    const { authHeaders, cleanup, pool, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_profile_sender');
    const receiver = await registerUser(app, 'socket_profile_receiver');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const receiverSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: receiver.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(receiverSocket);

    const avatarId = randomUUID();
    const storageKey = `socket-profile-${avatarId}.png`;
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
        'socket-profile.png',
        storageKey,
        `/tmp/${storageKey}`,
        128,
        'image/png',
        'image'
      ]
    );

    const profileUpdate = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: authHeaders(sender.accessToken),
      payload: {
        displayName: 'Fresh Alias',
        bio: 'updated over HTTP before socket send'
      }
    });
    assert.equal(profileUpdate.statusCode, 200);
    await pool.query('UPDATE users SET avatar_media_id = $1 WHERE id = $2', [avatarId, sender.user.id]);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const clientMessageId = 'socket-profile-parity-001';
    const messageNew = waitForSocketEvent(receiverSocket, 'message.new', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.clientMessageId === clientMessageId
    ), 1_500);

    senderSocket.emit('message.send', {
      chatId: GENERAL_CHAT_ID,
      content: 'profile parity check',
      clientMessageId
    });

    const delivered = await messageNew;
    assert.equal(delivered.payload.senderDisplayName, 'Fresh Alias');
    assert.equal(delivered.payload.senderUsername, 'socket_profile_sender');
    assert.equal(delivered.payload.senderAvatarUrl, `/uploads/${encodeURIComponent(storageKey)}`);

    await closeSocket(senderSocket);
    await closeSocket(receiverSocket);
  });

  test('chat read marks broadcast message.read to connected chat members', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_read_sender');
    const reader = await registerUser(app, 'socket_read_reader');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const readerSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: reader.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(readerSocket);

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'socket read receipt broadcast',
        clientMessageId: 'socket-read-receipt-001'
      }
    });
    assert.equal(send.statusCode, 200);
    const sentMessageId = JSON.parse(send.payload).message.id as string;

    const readEvent = waitForSocketEvent(senderSocket, 'message.read', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.readerUserId === reader.user.id &&
      event?.payload?.seenThroughMessageId === sentMessageId &&
      typeof event?.payload?.seenAt === 'string'
    ), 1_500);

    const markRead = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/read`,
      headers: authHeaders(reader.accessToken),
      payload: {
        throughMessageId: sentMessageId
      }
    });
    assert.equal(markRead.statusCode, 200);

    const payload = await readEvent;
    assert.equal(payload.type, 'message.read');
    assert.equal(payload.payload.chatId, GENERAL_CHAT_ID);
    assert.equal(payload.payload.readerUserId, reader.user.id);
    assert.equal(payload.payload.seenThroughMessageId, sentMessageId);

    await closeSocket(senderSocket);
    await closeSocket(readerSocket);
  });

  test('disconnecting from an active chat marks the latest message as read', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_disconnect_read_sender');
    const reader = await registerUser(app, 'socket_disconnect_read_reader');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const readerSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: reader.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(readerSocket);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for chat.join ack')), 1_500);
      readerSocket.emit('chat.join', { chatId: GENERAL_CHAT_ID }, (response: { ok: boolean; error?: string }) => {
        clearTimeout(timeout);
        if (!response?.ok) {
          reject(new Error(response?.error ?? 'chat.join failed'));
          return;
        }
        resolve();
      });
    });

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'disconnect read mark',
        clientMessageId: 'socket-disconnect-read-001'
      }
    });
    assert.equal(send.statusCode, 200);
    const sentMessageId = JSON.parse(send.payload).message.id as string;

    const readEvent = waitForSocketEvent(senderSocket, 'message.read', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.readerUserId === reader.user.id &&
      event?.payload?.seenThroughMessageId === sentMessageId &&
      typeof event?.payload?.seenAt === 'string'
    ), 1_500);

    await closeSocket(readerSocket);

    const payload = await readEvent;
    assert.equal(payload.type, 'message.read');
    assert.equal(payload.payload.seenThroughMessageId, sentMessageId);

    await closeSocket(senderSocket);
  });

  test('reconnected sockets still receive message.new events from their member chats without rejoining manually', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_reconnect_sender');
    const receiver = await registerUser(app, 'socket_reconnect_receiver');

    const initialReceiverSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: receiver.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(initialReceiverSocket);
    await closeSocket(initialReceiverSocket);

    const reconnectedReceiverSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: receiver.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(reconnectedReceiverSocket);
    await new Promise((resolve) => setTimeout(resolve, 75));

    const senderChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: authHeaders(sender.accessToken)
    });
    const chatId = JSON.parse(senderChats.payload).find((chat: any) => chat.name === 'General').id as string;
    const clientMessageId = 'reconnect-room-regression-001';

    const messageNew = waitForSocketEvent(reconnectedReceiverSocket, 'message.new', (event: any) => (
      event?.payload?.chatId === chatId &&
      event?.payload?.clientMessageId === clientMessageId
    ), 1_500);

    const send = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'reconnect room regression check',
        clientMessageId
      }
    });
    assert.equal(send.statusCode, 200);

    await messageNew;
    await closeSocket(reconnectedReceiverSocket);
  });

  test('poll votes broadcast poll.voted to connected chat members', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const creator = await registerUser(app, 'socket_poll_creator');
    const voter = await registerUser(app, 'socket_poll_voter');

    const creatorSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: creator.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(creatorSocket);

    const voterSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: voter.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(voterSocket);

    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/polls`,
      headers: authHeaders(creator.accessToken),
      payload: {
        question: 'Best rooftop snack?',
        options: ['Fries', 'Wings']
      }
    });
    assert.equal(created.statusCode, 200);
    const pollId = JSON.parse(created.payload).message.metadata.id as string;

    const voteEvent = waitForSocketEvent(creatorSocket, 'poll.voted', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.pollId === pollId &&
      Array.isArray(event?.payload?.poll?.options?.[1]?.voterIds) &&
      event.payload.poll.options[1].voterIds.includes(voter.user.id)
    ), 1_500);

    const voted = await app.inject({
      method: 'POST',
      url: `/api/v1/polls/${pollId}/vote`,
      headers: authHeaders(voter.accessToken),
      payload: {
        optionIndex: 1
      }
    });
    assert.equal(voted.statusCode, 200);

    const payload = await voteEvent;
    assert.equal(payload.type, 'poll.voted');
    assert.equal(payload.payload.chatId, GENERAL_CHAT_ID);
    assert.equal(payload.payload.pollId, pollId);
    assert.ok(payload.payload.poll.options[1].voterIds.includes(voter.user.id));

    await closeSocket(creatorSocket);
    await closeSocket(voterSocket);
  });

  test('message reactions broadcast reaction.add and reaction.remove to connected chat members', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_reaction_sender');
    const reactor = await registerUser(app, 'socket_reaction_user');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const reactorSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: reactor.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(reactorSocket);

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'socket reaction target',
        clientMessageId: 'socket-reaction-target-001'
      }
    });
    assert.equal(sent.statusCode, 200);
    const messageId = JSON.parse(sent.payload).message.id as string;

    const addEventPromise = waitForSocketEvent(senderSocket, 'reaction.add', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.messageId === messageId &&
      event?.payload?.userId === reactor.user.id &&
      event?.payload?.emoji === '🔥'
    ), 1_500);

    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages/${messageId}/reactions`,
      headers: authHeaders(reactor.accessToken),
      payload: {
        emoji: '🔥'
      }
    });
    assert.equal(addRes.statusCode, 200);

    const addEvent = await addEventPromise;
    assert.equal(addEvent.type, 'reaction.add');

    const removeEventPromise = waitForSocketEvent(senderSocket, 'reaction.remove', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.messageId === messageId &&
      event?.payload?.userId === reactor.user.id &&
      event?.payload?.emoji === '🔥'
    ), 1_500);

    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages/${messageId}/reactions/%F0%9F%94%A5`,
      headers: authHeaders(reactor.accessToken)
    });
    assert.equal(removeRes.statusCode, 204);

    const removeEvent = await removeEventPromise;
    assert.equal(removeEvent.type, 'reaction.remove');

    await closeSocket(senderSocket);
    await closeSocket(reactorSocket);
  });

  test('pin lifecycle broadcasts message.pinned and message.unpinned to connected chat members', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const sender = await registerUser(app, 'socket_pin_sender');
    const pinner = await registerUser(app, 'socket_pin_user');

    const senderSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: sender.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(senderSocket);

    const pinnerSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: pinner.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(pinnerSocket);

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: authHeaders(sender.accessToken),
      payload: {
        content: 'socket pin target',
        clientMessageId: 'socket-pin-target-001'
      }
    });
    assert.equal(sent.statusCode, 200);
    const messageId = JSON.parse(sent.payload).message.id as string;

    const pinEventPromise = waitForSocketEvent(senderSocket, 'message.pinned', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.messageId === messageId &&
      event?.payload?.pinnedByUserId === pinner.user.id
    ), 1_500);

    const pinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages/${messageId}/pin`,
      headers: authHeaders(pinner.accessToken)
    });
    assert.equal(pinRes.statusCode, 200);

    const pinEvent = await pinEventPromise;
    assert.equal(pinEvent.type, 'message.pinned');

    const unpinEventPromise = waitForSocketEvent(senderSocket, 'message.unpinned', (event: any) => (
      event?.payload?.chatId === GENERAL_CHAT_ID &&
      event?.payload?.messageId === messageId
    ), 1_500);

    const unpinRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages/${messageId}/pin`,
      headers: authHeaders(pinner.accessToken)
    });
    assert.equal(unpinRes.statusCode, 204);

    const unpinEvent = await unpinEventPromise;
    assert.equal(unpinEvent.type, 'message.unpinned');

    await closeSocket(senderSocket);
    await closeSocket(pinnerSocket);
  });
});
