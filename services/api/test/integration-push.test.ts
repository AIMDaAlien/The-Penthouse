import test, { after, afterEach, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;
const GENERAL_CHAT_ID = '00000000-0000-0000-0000-000000000001';

async function waitForCondition(check: () => Promise<boolean> | boolean, timeoutMs = 1500): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for condition');
}

describe('[integration] push delivery', { skip: SKIP }, () => {
  let app: any;
  let helpers: typeof import('./helpers.js');
  let setMessagingClientForTests: typeof import('../src/push/fcm.js').setMessagingClientForTests;
  let setWebPushSenderForTests: typeof import('../src/push/web.js').setWebPushSenderForTests;

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    helpers = await import('./helpers.js');
    ({ setMessagingClientForTests } = await import('../src/push/fcm.js'));
    ({ setWebPushSenderForTests } = await import('../src/push/web.js'));
    await helpers.migrate();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    ({ app } = await helpers.buildTestApp());
  });

  afterEach(async () => {
    setMessagingClientForTests(null);
    setWebPushSenderForTests(null);
    await app?.close();
    app = null;
  });

  after(async () => {
    setMessagingClientForTests(null);
    setWebPushSenderForTests(null);
    await helpers.cleanup();
  });

  test('web push subscription endpoints register, update, and unregister browser subscriptions', async () => {
    const user = await helpers.registerUser(app, 'web_push_subscriber');

    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/api/v1/push/preferences'
    });
    assert.equal(unauthenticated.statusCode, 401);

    let response = await app.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-push-001',
        keys: {
          p256dh: 'first-p256dh',
          auth: 'first-auth'
        },
        userAgent: 'Test Browser'
      }
    });
    assert.equal(response.statusCode, 201);
    let body = JSON.parse(response.payload);
    assert.equal(body.endpoint, 'https://push.example.com/subscriptions/web-push-001');
    assert.equal(body.keys.p256dh, 'first-p256dh');
    assert.equal(body.userAgent, 'Test Browser');

    response = await app.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-push-001',
        keys: {
          p256dh: 'updated-p256dh',
          auth: 'updated-auth'
        },
        userAgent: 'Updated Browser'
      }
    });
    assert.equal(response.statusCode, 201);
    body = JSON.parse(response.payload);
    assert.equal(body.keys.p256dh, 'updated-p256dh');
    assert.equal(body.userAgent, 'Updated Browser');

    let rows = await helpers.pool.query(
      'SELECT endpoint, p256dh, auth, user_agent FROM push_subscriptions WHERE user_id = $1',
      [user.user.id]
    );
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].p256dh, 'updated-p256dh');
    assert.equal(rows.rows[0].auth, 'updated-auth');

    response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-push-001'
      }
    });
    assert.equal(response.statusCode, 204);

    rows = await helpers.pool.query('SELECT 1 FROM push_subscriptions WHERE user_id = $1', [user.user.id]);
    assert.equal(rows.rowCount, 0);
  });

  test('web push preferences return defaults, reject invalid timezones, and persist updates', async () => {
    const user = await helpers.registerUser(app, 'web_push_prefs');

    let response = await app.inject({
      method: 'GET',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(user.accessToken)
    });
    assert.equal(response.statusCode, 200);
    let prefs = JSON.parse(response.payload);
    assert.equal(prefs.enabled, true);
    assert.equal(prefs.scopeDefault, 'dm_and_mention');
    assert.equal(prefs.payloadPrivacy, 'metadata');
    assert.equal(prefs.quietHoursEnabled, false);
    assert.equal(prefs.quietHoursStart, null);
    assert.equal(prefs.quietHoursEnd, null);
    assert.equal(prefs.quietHoursTz, null);

    response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        quietHoursTz: 'Not/A_Zone'
      }
    });
    assert.equal(response.statusCode, 400);

    response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        enabled: false,
        scopeDefault: 'all',
        payloadPrivacy: 'full',
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00:00',
        quietHoursTz: 'America/New_York'
      }
    });
    assert.equal(response.statusCode, 200);
    prefs = JSON.parse(response.payload);
    assert.equal(prefs.enabled, false);
    assert.equal(prefs.scopeDefault, 'all');
    assert.equal(prefs.payloadPrivacy, 'full');
    assert.equal(prefs.quietHoursEnabled, true);
    assert.equal(prefs.quietHoursStart, '22:00:00');
    assert.equal(prefs.quietHoursEnd, '07:00:00');
    assert.equal(prefs.quietHoursTz, 'America/New_York');

    response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        quietHoursEnabled: false
      }
    });
    assert.equal(response.statusCode, 200);
    prefs = JSON.parse(response.payload);
    assert.equal(prefs.quietHoursEnabled, false);
    assert.equal(prefs.quietHoursStart, null);
    assert.equal(prefs.quietHoursEnd, null);
    assert.equal(prefs.quietHoursTz, null);
  });

  test('web push chat overrides enforce membership and revert to defaults', async () => {
    const owner = await helpers.registerUser(app, 'web_push_chat_owner');
    const outsider = await helpers.registerUser(app, 'web_push_chat_outsider');
    const chatId = await helpers.createPrivateChannelForUser(owner.user.id, 'Web Push Private');

    let response = await app.inject({
      method: 'GET',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken)
    });
    assert.equal(response.statusCode, 200);
    let override = JSON.parse(response.payload);
    assert.equal(override.chatId, chatId);
    assert.equal(override.scope, null);
    assert.equal(override.dndOverride, false);
    assert.equal(override.updatedAt, null);

    response = await app.inject({
      method: 'GET',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(outsider.accessToken)
    });
    assert.equal(response.statusCode, 403);

    response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken),
      payload: {
        dndOverride: true
      }
    });
    assert.equal(response.statusCode, 400);

    response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken),
      payload: {
        scope: 'off',
        dndOverride: true
      }
    });
    assert.equal(response.statusCode, 200);
    override = JSON.parse(response.payload);
    assert.equal(override.scope, 'off');
    assert.equal(override.dndOverride, true);
    assert.equal(typeof override.updatedAt, 'string');

    response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken),
      payload: {
        dndOverride: false
      }
    });
    assert.equal(response.statusCode, 200);
    override = JSON.parse(response.payload);
    assert.equal(override.scope, 'off');
    assert.equal(override.dndOverride, false);

    response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken)
    });
    assert.equal(response.statusCode, 204);

    response = await app.inject({
      method: 'GET',
      url: `/api/v1/push/chats/${chatId}`,
      headers: helpers.authHeaders(owner.accessToken)
    });
    assert.equal(response.statusCode, 200);
    override = JSON.parse(response.payload);
    assert.equal(override.scope, null);
    assert.equal(override.dndOverride, false);
  });

  test('web push sends metadata payloads for subscribed direct-message recipients', async () => {
    const sent: Array<{ subscription: any; payload: any }> = [];
    setWebPushSenderForTests(async (subscription, payload) => {
      sent.push({ subscription, payload: JSON.parse(String(payload)) });
      return { statusCode: 201, body: '', headers: {} };
    });

    const sender = await helpers.registerUser(app, 'web_sender_meta');
    const recipient = await helpers.registerUser(app, 'web_recipient_meta');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: helpers.authHeaders(sender.accessToken),
      payload: { memberId: recipient.user.id }
    });
    assert.equal(created.statusCode, 200);
    const chatId = JSON.parse(created.payload).id as string;

    const subscribed = await app.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-send-meta',
        keys: {
          p256dh: 'meta-p256dh',
          auth: 'meta-auth'
        }
      }
    });
    assert.equal(subscribed.statusCode, 201);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'private hello',
        clientMessageId: 'web-push-meta-001'
      }
    });
    assert.equal(response.statusCode, 200);

    await waitForCondition(() => sent.length === 1);
    assert.equal(sent[0].subscription.endpoint, 'https://push.example.com/subscriptions/web-send-meta');
    assert.equal(sent[0].payload.v, 1);
    assert.equal(sent[0].payload.type, 'message');
    assert.equal(sent[0].payload.chatId, chatId);
    assert.equal(sent[0].payload.senderName, 'web_sender_meta');
    assert.equal(typeof sent[0].payload.chatName, 'string');
    assert.equal('body' in sent[0].payload, false);
    assert.equal('senderAvatar' in sent[0].payload, false);
  });

  test('web push respects mentions, payload privacy, quiet hours, and per-chat off overrides', async () => {
    const sent: any[] = [];
    setWebPushSenderForTests(async (_subscription, payload) => {
      sent.push(JSON.parse(String(payload)));
      return { statusCode: 201, body: '', headers: {} };
    });

    const sender = await helpers.registerUser(app, 'web_sender_scope');
    const recipient = await helpers.registerUser(app, 'web_recipient_scope');

    await app.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-scope',
        keys: {
          p256dh: 'scope-p256dh',
          auth: 'scope-auth'
        }
      }
    });

    const recipientChats = await app.inject({
      method: 'GET',
      url: '/api/v1/chats',
      headers: helpers.authHeaders(recipient.accessToken)
    });
    const generalChatId = JSON.parse(recipientChats.payload).find((chat: any) => chat.name === 'General').id;

    let response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'general channel noise',
        clientMessageId: 'web-push-channel-no-mention-001'
      }
    });
    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sent.length === 0, 250);
    assert.equal(sent.length, 0);

    response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        payloadPrivacy: 'full'
      }
    });
    assert.equal(response.statusCode, 200);

    response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'hello @web_recipient_scope with preview',
        clientMessageId: 'web-push-channel-mention-001'
      }
    });
    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sent.length === 1);
    assert.equal(sent[0].body, 'hello @web_recipient_scope with preview');
    assert.equal(sent[0].senderAvatar, null);

    response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        quietHoursEnabled: true,
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        quietHoursTz: 'UTC'
      }
    });
    assert.equal(response.statusCode, 200);

    response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'quiet @web_recipient_scope',
        clientMessageId: 'web-push-quiet-001'
      }
    });
    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sent.length === 1, 250);
    assert.equal(sent.length, 1);

    response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/push/chats/${generalChatId}`,
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        scope: 'all',
        dndOverride: true
      }
    });
    assert.equal(response.statusCode, 200);

    response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'override channel send',
        clientMessageId: 'web-push-dnd-override-001'
      }
    });
    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sent.length === 2);

    response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/push/chats/${generalChatId}`,
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        scope: 'off',
        dndOverride: true
      }
    });
    assert.equal(response.statusCode, 200);

    response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${generalChatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'off should suppress @web_recipient_scope',
        clientMessageId: 'web-push-off-001'
      }
    });
    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sent.length === 2, 250);
    assert.equal(sent.length, 2);
  });

  test('web push removes stale subscriptions on gone responses', async () => {
    setWebPushSenderForTests(async () => {
      const error = new Error('gone') as Error & { statusCode?: number };
      error.statusCode = 410;
      throw error;
    });

    const sender = await helpers.registerUser(app, 'web_sender_stale');
    const recipient = await helpers.registerUser(app, 'web_recipient_stale');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: helpers.authHeaders(sender.accessToken),
      payload: { memberId: recipient.user.id }
    });
    assert.equal(created.statusCode, 200);
    const chatId = JSON.parse(created.payload).id as string;

    await app.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: {
        endpoint: 'https://push.example.com/subscriptions/web-stale',
        keys: {
          p256dh: 'stale-p256dh',
          auth: 'stale-auth'
        }
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'remove stale endpoint',
        clientMessageId: 'web-push-stale-001'
      }
    });
    assert.equal(response.statusCode, 200);

    await waitForCondition(async () => {
      const rows = await helpers.pool.query(
        'SELECT 1 FROM push_subscriptions WHERE endpoint = $1',
        ['https://push.example.com/subscriptions/web-stale']
      );
      return rows.rowCount === 0;
    });
  });

  test('registers, reassigns, and unregisters device tokens per authenticated user', async () => {
    const userA = await helpers.registerUser(app, 'push_user_a');
    const userB = await helpers.registerUser(app, 'push_user_b');

    let response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(userA.accessToken),
      payload: {
        platform: 'android',
        token: 'shared-device-token'
      }
    });
    assert.equal(response.statusCode, 200);

    response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(userA.accessToken),
      payload: {
        platform: 'android',
        token: 'shared-device-token'
      }
    });
    assert.equal(response.statusCode, 200);

    let rows = await helpers.pool.query('SELECT user_id, token FROM device_tokens WHERE token = $1', ['shared-device-token']);
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].user_id, userA.user.id);

    response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(userB.accessToken),
      payload: {
        platform: 'android',
        token: 'shared-device-token'
      }
    });
    assert.equal(response.statusCode, 200);

    rows = await helpers.pool.query('SELECT user_id, token FROM device_tokens WHERE token = $1', ['shared-device-token']);
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].user_id, userB.user.id);

    response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(userA.accessToken),
      payload: { token: 'shared-device-token' }
    });
    assert.equal(response.statusCode, 204);

    rows = await helpers.pool.query('SELECT user_id, token FROM device_tokens WHERE token = $1', ['shared-device-token']);
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].user_id, userB.user.id);

    response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(userB.accessToken),
      payload: { token: 'shared-device-token' }
    });
    assert.equal(response.statusCode, 204);

    rows = await helpers.pool.query('SELECT token FROM device_tokens WHERE token = $1', ['shared-device-token']);
    assert.equal(rows.rowCount, 0);
  });

  test('gets and updates device notification settings for the authenticated user token', async () => {
    const user = await helpers.registerUser(app, 'push_settings_user');

    const registerResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(user.accessToken),
      payload: { platform: 'android', token: 'settings-token' }
    });
    assert.equal(registerResponse.statusCode, 200);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me/device-notification-settings?token=settings-token',
      headers: helpers.authHeaders(user.accessToken)
    });
    assert.equal(getResponse.statusCode, 200);
    const defaults = JSON.parse(getResponse.payload);
    assert.equal(defaults.notificationsEnabled, true);
    assert.equal(defaults.previewsEnabled, true);
    assert.equal(defaults.quietHoursEnabled, false);

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        token: 'settings-token',
        notificationsEnabled: false,
        previewsEnabled: false,
        quietHoursEnabled: true,
        quietHoursStartMinute: 1320,
        quietHoursEndMinute: 420,
        timezone: 'America/New_York'
      }
    });
    assert.equal(updateResponse.statusCode, 200);
    const updated = JSON.parse(updateResponse.payload);
    assert.equal(updated.notificationsEnabled, false);
    assert.equal(updated.previewsEnabled, false);
    assert.equal(updated.quietHoursEnabled, true);
    assert.equal(updated.quietHoursStartMinute, 1320);
    assert.equal(updated.quietHoursEndMinute, 420);
    assert.equal(updated.timezone, 'America/New_York');
  });

  test('rejects wrong-user access and invalid quiet-hours updates', async () => {
    const owner = await helpers.registerUser(app, 'push_owner_user');
    const other = await helpers.registerUser(app, 'push_other_user');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(owner.accessToken),
      payload: { platform: 'android', token: 'owner-token' }
    });

    const wrongUserGet = await app.inject({
      method: 'GET',
      url: '/api/v1/me/device-notification-settings?token=owner-token',
      headers: helpers.authHeaders(other.accessToken)
    });
    assert.equal(wrongUserGet.statusCode, 404);

    const unauthenticatedGet = await app.inject({
      method: 'GET',
      url: '/api/v1/me/device-notification-settings?token=owner-token'
    });
    assert.equal(unauthenticatedGet.statusCode, 401);

    const invalidQuietHours = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(owner.accessToken),
      payload: {
        token: 'owner-token',
        notificationsEnabled: true,
        previewsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStartMinute: 600,
        quietHoursEndMinute: 600,
        timezone: 'UTC'
      }
    });
    assert.equal(invalidQuietHours.statusCode, 400);
  });

  test('token refresh preserves notification settings when previousToken is provided', async () => {
    const user = await helpers.registerUser(app, 'push_refresh_settings');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(user.accessToken),
      payload: { platform: 'android', token: 'old-push-token' }
    });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(user.accessToken),
      payload: {
        token: 'old-push-token',
        notificationsEnabled: false,
        previewsEnabled: false,
        quietHoursEnabled: true,
        quietHoursStartMinute: 1380,
        quietHoursEndMinute: 360,
        timezone: 'America/Chicago'
      }
    });

    const refreshResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(user.accessToken),
      payload: { platform: 'android', token: 'new-push-token', previousToken: 'old-push-token' }
    });
    assert.equal(refreshResponse.statusCode, 200);

    const settingsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me/device-notification-settings?token=new-push-token',
      headers: helpers.authHeaders(user.accessToken)
    });
    assert.equal(settingsResponse.statusCode, 200);
    const migrated = JSON.parse(settingsResponse.payload);
    assert.equal(migrated.notificationsEnabled, false);
    assert.equal(migrated.previewsEnabled, false);
    assert.equal(migrated.quietHoursEnabled, true);
    assert.equal(migrated.quietHoursStartMinute, 1380);
    assert.equal(migrated.quietHoursEndMinute, 360);
    assert.equal(migrated.timezone, 'America/Chicago');
  });

  test('does not suppress push just because stale chat-room sockets still exist', async () => {
    const sentMessages: any[] = [];
    setMessagingClientForTests({
      send: async (message) => {
        sentMessages.push(message);
        return 'projects/test/messages/1';
      }
    } as any);

    const sender = await helpers.registerUser(app, 'push_sender');
    const offlineRecipient = await helpers.registerUser(app, 'push_offline_recipient');
    const staleSocketRecipient = await helpers.registerUser(app, 'push_stale_socket_recipient');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(offlineRecipient.accessToken),
      payload: { platform: 'android', token: 'offline-token' }
    });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(staleSocketRecipient.accessToken),
      payload: { platform: 'android', token: 'active-token' }
    });

    const io = app.io as any;
    io.sockets.adapter.rooms.set(`chat:${GENERAL_CHAT_ID}`, new Set(['socket-active']));
    io.sockets.sockets.set('socket-active', { data: { userId: staleSocketRecipient.user.id, appActive: true } });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'hello from push route',
        clientMessageId: 'client-push-route-001'
      }
    });

    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sentMessages.length === 2);
    assert.equal(sentMessages.length, 2);
    assert.deepEqual(sentMessages.map((entry) => entry.token).sort(), ['active-token', 'offline-token']);
    assert.equal(sentMessages[0].android.notification.channelId, 'messages');
    assert.equal(sentMessages[0].android.notification.tag, `chat:${GENERAL_CHAT_ID}`);
  });

  test('suppresses push for a muted direct-message recipient only', async () => {
    const sentMessages: any[] = [];
    setMessagingClientForTests({
      send: async (message) => {
        sentMessages.push(message);
        return 'projects/test/messages/dm-muted';
      }
    } as any);

    const sender = await helpers.registerUser(app, 'push_dm_sender');
    const recipient = await helpers.registerUser(app, 'push_dm_recipient');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/chats/dm',
      headers: helpers.authHeaders(sender.accessToken),
      payload: { memberId: recipient.user.id }
    });
    assert.equal(created.statusCode, 200);
    const chatId = JSON.parse(created.payload).id as string;

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: { platform: 'android', token: 'muted-dm-token' }
    });

    const muted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/chats/${chatId}/preferences`,
      headers: helpers.authHeaders(recipient.accessToken),
      payload: { notificationsMuted: true }
    });
    assert.equal(muted.statusCode, 200);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${chatId}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'stay quiet',
        clientMessageId: 'client-push-dm-muted-001'
      }
    });

    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sentMessages.length === 0, 250);
    assert.equal(sentMessages.length, 0);
  });

  test('device-token endpoints require full access', async () => {
    const member = await helpers.registerUser(app, 'push_blocked_member');
    await helpers.pool.query('UPDATE users SET must_change_password = TRUE WHERE id = $1', [member.user.id]);

    const registerResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(member.accessToken),
      payload: { platform: 'android', token: 'blocked-token' }
    });
    assert.equal(registerResponse.statusCode, 403);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(member.accessToken),
      payload: { token: 'blocked-token' }
    });
    assert.equal(deleteResponse.statusCode, 403);
  });

  test('removes stale device tokens when FCM reports they are unregistered', async () => {
    setMessagingClientForTests({
      send: async () => {
        const error = new Error('token not registered') as Error & { code?: string };
        error.code = 'messaging/registration-token-not-registered';
        throw error;
      }
    } as any);

    const sender = await helpers.registerUser(app, 'push_sender_stale');
    const recipient = await helpers.registerUser(app, 'push_recipient_stale');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: { platform: 'android', token: 'stale-token' }
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'remove the stale token',
        clientMessageId: 'client-push-route-002'
      }
    });

    assert.equal(response.statusCode, 200);
    await waitForCondition(async () => {
      const nextRows = await helpers.pool.query('SELECT token FROM device_tokens WHERE token = $1', ['stale-token']);
      return nextRows.rowCount === 0;
    });
    const rows = await helpers.pool.query('SELECT token FROM device_tokens WHERE token = $1', ['stale-token']);
    assert.equal(rows.rowCount, 0);
  });

  test('excludes must-change-password users from push recipients', async () => {
    const sentMessages: any[] = [];
    setMessagingClientForTests({
      send: async (message) => {
        sentMessages.push(message);
        return 'projects/test/messages/3';
      }
    } as any);

    const sender = await helpers.registerUser(app, 'push_sender_guarded');
    const recipient = await helpers.registerUser(app, 'push_recipient_guarded');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(recipient.accessToken),
      payload: { platform: 'android', token: 'guarded-token' }
    });

    await helpers.pool.query('UPDATE users SET must_change_password = TRUE WHERE id = $1', [recipient.user.id]);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'must-change-password users should not get push',
        clientMessageId: 'client-push-route-004'
      }
    });

    assert.equal(response.statusCode, 200);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(sentMessages.length, 0);
  });

  test('suppresses push when notifications are disabled or quiet hours are active and uses generic body when previews are off', async () => {
    const sentMessages: any[] = [];
    setMessagingClientForTests({
      send: async (message) => {
        sentMessages.push(message);
        return `projects/test/messages/${sentMessages.length}`;
      }
    } as any);

    const sender = await helpers.registerUser(app, 'push_sender_preferences');
    const notificationsOff = await helpers.registerUser(app, 'push_notifications_off');
    const previewsOff = await helpers.registerUser(app, 'push_previews_off');
    const quietHoursUser = await helpers.registerUser(app, 'push_quiet_hours_user');

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(notificationsOff.accessToken),
      payload: { platform: 'android', token: 'notifications-off-token' }
    });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(notificationsOff.accessToken),
      payload: {
        token: 'notifications-off-token',
        notificationsEnabled: false,
        previewsEnabled: true,
        quietHoursEnabled: false,
        quietHoursStartMinute: null,
        quietHoursEndMinute: null,
        timezone: null
      }
    });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(previewsOff.accessToken),
      payload: { platform: 'android', token: 'previews-off-token' }
    });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(previewsOff.accessToken),
      payload: {
        token: 'previews-off-token',
        notificationsEnabled: true,
        previewsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStartMinute: null,
        quietHoursEndMinute: null,
        timezone: null
      }
    });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-tokens',
      headers: helpers.authHeaders(quietHoursUser.accessToken),
      payload: { platform: 'android', token: 'quiet-hours-token' }
    });

    const now = new Date();
    const currentUtcMinute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const quietStart = (currentUtcMinute + 1430) % 1440;
    const quietEnd = (currentUtcMinute + 10) % 1440;

    await app.inject({
      method: 'PUT',
      url: '/api/v1/me/device-notification-settings',
      headers: helpers.authHeaders(quietHoursUser.accessToken),
      payload: {
        token: 'quiet-hours-token',
        notificationsEnabled: true,
        previewsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStartMinute: quietStart,
        quietHoursEndMinute: quietEnd,
        timezone: 'UTC'
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/chats/${GENERAL_CHAT_ID}/messages`,
      headers: helpers.authHeaders(sender.accessToken),
      payload: {
        content: 'private preview text',
        clientMessageId: 'client-push-route-005'
      }
    });

    assert.equal(response.statusCode, 200);
    await waitForCondition(() => sentMessages.length === 1);
    assert.equal(sentMessages[0].token, 'previews-off-token');
    assert.equal(sentMessages[0].notification.body, 'Open the app to view this message');
  });
});
