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

  test('marks a backgrounded user offline after 10 seconds and back online on foreground', async () => {
    const { cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const actor = await registerUser(app, 'presence_actor');
    const observer = await registerUser(app, 'presence_observer');

    const observerSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: observer.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(observerSocket);

    const actorSocket = createClient(baseUrl, {
      path: '/socket.io/',
      transports: ['polling'],
      auth: { token: actor.accessToken },
      reconnection: false,
      forceNew: true
    });
    await waitForSocketConnect(actorSocket);

    await waitForSocketEvent(observerSocket, 'presence.update', (event: any) => (
      event?.payload?.userId === actor.user.id && event?.payload?.status === 'online'
    ), 1_500);

    actorSocket.emit('app.state', { active: false });

    await waitForSocketEvent(observerSocket, 'presence.update', (event: any) => (
      event?.payload?.userId === actor.user.id && event?.payload?.status === 'offline'
    ), 12_000);

    actorSocket.emit('app.state', { active: true });

    await waitForSocketEvent(observerSocket, 'presence.update', (event: any) => (
      event?.payload?.userId === actor.user.id && event?.payload?.status === 'online'
    ), 1_500);

    await closeSocket(actorSocket);
    await closeSocket(observerSocket);
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
});
