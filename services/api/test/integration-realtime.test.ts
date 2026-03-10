/**
 * Integration tests for realtime observability and auth rejection.
 *
 * Requires a running PostgreSQL instance with DATABASE_URL set.
 */
import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket } from 'socket.io-client';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

type CapturedLog = Record<string, unknown> & { msg?: string };

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

    await once(socket, 'connect');
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

    const [error] = (await once(socket, 'connect_error')) as [Error];
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

    const [error] = (await once(socket, 'connect_error')) as [Error];
    assert.equal(error.message, 'Account unavailable');
    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.ok(
      warnLogs.some((entry) => entry.msg === 'socket auth failed: account unavailable'),
      'expected unavailable account auth rejection log'
    );

    await closeSocket(socket);
  });
});
