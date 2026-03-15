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

  // Stub Socket.IO so route handlers that call app.io.to(...).emit(...) don't crash
  app.decorate('io', {
    to(room: string) {
      return {
        emit(event: string, data: unknown) {
          emitted.push({ room, event, data });
        }
      };
    },
    emit(event: string, data: unknown) {
      emitted.push({ room: null, event, data });
    }
  } as any);

  return { app, emitted };
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
    await client.query('DELETE FROM chat_members');
    await client.query('DELETE FROM chats');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM media_uploads');
    await client.query('DELETE FROM users');
    await client.query(`DELETE FROM signup_invites WHERE system_key IS DISTINCT FROM 'master'`);
    await client.query(
      `INSERT INTO signup_invites(code, max_uses, uses, system_key)
       VALUES ('PENTHOUSE-ALPHA', 999999, 0, 'master')
       ON CONFLICT (system_key) DO UPDATE
       SET code = EXCLUDED.code,
           max_uses = EXCLUDED.max_uses,
           uses = EXCLUDED.uses,
           revoked_at = NULL`
    );
  } finally {
    client.release();
  }
}

export async function registerUser(app: FastifyInstance, username: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
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
