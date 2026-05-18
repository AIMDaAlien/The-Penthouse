import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

let registerRemoteAddressCounter = 1;

export async function resetDb() {
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
  await pool.query("INSERT INTO server_settings (key, value) VALUES ('registration_mode', 'invite_only')");
  await pool.query("INSERT INTO signup_invites (code, label, max_uses) VALUES ('PENTHOUSE-ALPHA', 'Default alpha invite', 999999)");
  await pool.query("INSERT INTO chats (type, name, system_key) VALUES ('group', 'General', 'general')");
}

export async function testApp() {
  const app = await buildApp();
  return app;
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
      inviteCode: 'PENTHOUSE-ALPHA',
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
