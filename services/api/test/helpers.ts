/**
 * Integration test helpers.
 *
 * Provides a test-ready Fastify app with a stub Socket.IO instance,
 * plus DB cleanup and user registration utilities.
 *
 * Requires DATABASE_URL and JWT_SECRET in the environment.
 */
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { maybeBootstrapAdmin } from '../src/utils/users.js';
import { assertSafeTestDatabase } from './safe-db.js';

export async function buildTestApp() {
  assertSafeTestDatabase();
  await maybeBootstrapAdmin(pool);
  const app = await createApp();

  const emitted: Array<{ room: string | null; event: string; data: unknown }> = [];
  const roomJoins: Array<{ sourceRoom: string; targetRoom: string }> = [];

  // Stub Socket.IO so route handlers that call app.io.to(...).emit(...) don't crash
  app.decorate('io', {
    to(room: string) {
      return {
        emit(event: string, data: unknown) {
          emitted.push({ room, event, data });
        }
      };
    },
    in(sourceRoom: string) {
      return {
        async fetchSockets() {
          return [];
        },
        socketsJoin(targetRoom: string) {
          roomJoins.push({ sourceRoom, targetRoom });
        }
      };
    },
    emit(event: string, data: unknown) {
      emitted.push({ room: null, event, data });
    },
    sockets: {
      adapter: {
        rooms: new Map<string, Set<string>>()
      },
      sockets: new Map<string, { data: { userId?: string } }>()
    }
  } as any);

  return { app, emitted, roomJoins };
}

export async function migrate() {
  assertSafeTestDatabase();
  await runMigrations();
}

export async function cleanup() {
  assertSafeTestDatabase();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('cleanup() refused in production');
  }
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM device_tokens');
    await client.query('DELETE FROM chat_members');
    await client.query('DELETE FROM chats');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM media_uploads');
    await client.query('DELETE FROM users');
    await client.query(`DELETE FROM signup_invites`);
    await client.query(
      `INSERT INTO signup_invites(id, code, label, max_uses, uses)
       VALUES (gen_random_uuid(), 'PENTHOUSE-ALPHA', 'Test invite', 999999, 0)`
    );
    await client.query(
      `INSERT INTO server_settings (key, value, updated_at)
       VALUES ('registration_mode', 'invite_only', NOW())
       ON CONFLICT (key) DO UPDATE SET value = 'invite_only', updated_at = NOW()`
    );
  } finally {
    client.release();
  }
}

let injectedClientCounter = 1;

function nextInjectedRemoteAddress(): string {
  const counter = injectedClientCounter++;
  const thirdOctet = Math.floor((counter - 1) / 250);
  const fourthOctet = ((counter - 1) % 250) + 1;
  return `10.0.${thirdOctet}.${fourthOctet}`;
}

export async function registerUser(app: FastifyInstance, username: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    remoteAddress: nextInjectedRemoteAddress(),
    payload: {
      username,
      password: 'supersecurepassword',
      inviteCode: 'PENTHOUSE-ALPHA',
      acceptTestNotice: true,
      testNoticeVersion: 'alpha-v1'
    }
  });
  if (res.statusCode !== 201) {
    throw new Error(`Register failed (${res.statusCode}): ${res.payload}`);
  }
  return JSON.parse(res.payload) as {
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: 'admin' | 'member';
      mustChangePassword: boolean;
      mustAcceptTestNotice: boolean;
      requiredTestNoticeVersion: string;
      acceptedTestNoticeVersion: string | null;
    };
    accessToken: string;
    refreshToken: string;
    recoveryCode?: string;
  };
}

export async function loginUser(app: FastifyInstance, username: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: nextInjectedRemoteAddress(),
    payload: { username, password }
  });

  if (res.statusCode !== 200) {
    throw new Error(`Login failed (${res.statusCode}): ${res.payload}`);
  }

  return JSON.parse(res.payload) as {
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role: 'admin' | 'member';
      mustChangePassword: boolean;
      mustAcceptTestNotice: boolean;
      requiredTestNoticeVersion: string;
      acceptedTestNoticeVersion: string | null;
    };
    accessToken: string;
    refreshToken: string;
    recoveryCode?: string;
  };
}

export function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export async function createPrivateChannelForUser(userId: string, name = 'Private Test Room') {
  const chatId = randomUUID();
  await pool.query("INSERT INTO chats(id, type, name) VALUES($1, 'channel', $2)", [chatId, name]);
  await pool.query('INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2)', [chatId, userId]);
  return chatId;
}

export { pool };
