import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { resetRateLimitBucketsForTests } from '../src/middleware/rateLimit.js';
import { resetPresenceState } from '../src/utils/presence.js';

export { pool };

let registerRemoteAddressCounter = 1;

async function assertTestDatabase() {
  const { rows } = await pool.query<{ name: string }>('SELECT current_database() AS name');
  const databaseName = rows[0]?.name ?? '';
  if (!/(^|_)test($|_)/i.test(databaseName)) {
    throw new Error(`Refusing to reset non-test database: ${databaseName}`);
  }
}

export async function resetDb() {
  await assertTestDatabase();
  resetRateLimitBucketsForTests();
  resetPresenceState();
  await pool.query(`
	    TRUNCATE
	      sync_events,
	      push_notifications,
      chat_notification_overrides,
      notification_prefs,
      push_subscriptions,
      pinned_messages,
      message_reactions,
      stickers,
      sticker_packs,
      custom_emotes,
      chat_folder_items,
      chat_folders,
      media_uploads,
      message_moderation_events,
      message_deletions,
      message_edits,
      messages,
      direct_chats,
      chat_members,
      chats,
      refresh_tokens,
      session_devices,
      server_settings,
      signup_invites,
      users
    RESTART IDENTITY CASCADE
  `);
  await pool.query("INSERT INTO server_settings (key, value) VALUES ('registration_mode', 'open')");
  await pool.query("INSERT INTO signup_invites (code, label, max_uses) VALUES ('PENTHOUSE-ALPHA', 'Default alpha invite', 999999)");
  await pool.query(`
    INSERT INTO chats (id, type, name, system_key)
    VALUES ('00000000-0000-0000-0000-000000000001', 'group', 'General', 'general')
  `);
}

export async function migrate() {
  // The test script applies migrations before loading test files.
}

export const cleanup = resetDb;

export async function testApp() {
  const app = await buildApp();
  return app;
}

export async function buildTestApp() {
  const app = await buildApp();
  const emitted: Array<{ room: string | null; event: string; data: unknown }> = [];
  const originalTo = app.io.to.bind(app.io);
  app.io.to = ((room: string) => {
    const target = originalTo(room);
    const originalEmit = target.emit.bind(target);
    target.emit = ((event: string, data: unknown) => {
      emitted.push({ room, event, data });
      return originalEmit(event, data);
    }) as typeof target.emit;
    return target;
  }) as typeof app.io.to;
  return { app, emitted };
}

export async function registerUser(app: Awaited<ReturnType<typeof buildApp>>, username: string) {
  const addressCounter = registerRemoteAddressCounter++;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    remoteAddress: `10.42.${Math.floor(addressCounter / 250)}.${(addressCounter % 250) + 1}`,
    payload: {
      username,
      displayName: username,
      password: 'password-1234',
      captchaToken: 'dev-token',
      acceptTestNotice: true,
      testNoticeVersion: 'alpha-v1'
    }
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json() as { accessToken: string; refreshToken: string; user: { id: string } };
}

export async function authHeader(app: Awaited<ReturnType<typeof buildApp>>, username = 'aim') {
  const session = await registerUser(app, username);
  return { authorization: `Bearer ${session.accessToken}` };
}

export function authHeaders(token: string): { authorization: string };
export function authHeaders(app: Awaited<ReturnType<typeof buildApp>>, username?: string): Promise<{ authorization: string }>;
export function authHeaders(appOrToken: Awaited<ReturnType<typeof buildApp>> | string, username = 'aim') {
  if (typeof appOrToken === 'string') return { authorization: `Bearer ${appOrToken}` };
  return authHeader(appOrToken, username);
}

export async function createCaptchaToken() {
  return 'dev-token';
}
