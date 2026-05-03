import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChatNotificationOverrideSchema,
  DeviceNotificationSettingsSchema,
  GetDeviceNotificationSettingsQuerySchema,
  NotificationPrefsSchema,
  PatchChatNotificationOverrideRequestSchema,
  PatchNotificationPrefsRequestSchema,
  PushSubscribeRequestSchema,
  PushSubscriptionSchema,
  PushUnsubscribeRequestSchema,
  WebPushMessagePayloadSchema,
  RegisterDeviceTokenRequestSchema,
  RegisterDeviceTokenResponseSchema,
  UnregisterDeviceTokenRequestSchema,
  UpdateDeviceNotificationSettingsRequestSchema
} from '@penthouse/contracts';
import { isInQuietHours } from '../src/push/dnd.js';
import { isMentionForUsername, shouldSendWebPush } from '../src/push/scope.js';

test('[schema] registerDeviceToken accepts valid payload', () => {
  const result = RegisterDeviceTokenRequestSchema.safeParse({
    platform: 'android',
    token: 'fcm-token-123'
  });

  assert.equal(result.success, true);
});

test('[schema] registerDeviceToken rejects empty token', () => {
  const result = RegisterDeviceTokenRequestSchema.safeParse({
    platform: 'android',
    token: ''
  });

  assert.equal(result.success, false);
});

test('[schema] registerDeviceTokenResponse requires uuid id', () => {
  const result = RegisterDeviceTokenResponseSchema.safeParse({ id: 'not-a-uuid' });
  assert.equal(result.success, false);
});

test('[schema] unregisterDeviceToken requires token', () => {
  const result = UnregisterDeviceTokenRequestSchema.safeParse({ token: 'fcm-token-123' });
  assert.equal(result.success, true);
});

test('[schema] deviceNotificationSettings accepts valid quiet hours', () => {
  const result = UpdateDeviceNotificationSettingsRequestSchema.safeParse({
    token: 'fcm-token-123',
    notificationsEnabled: true,
    previewsEnabled: false,
    quietHoursEnabled: true,
    quietHoursStartMinute: 1320,
    quietHoursEndMinute: 420,
    timezone: 'America/New_York'
  });
  assert.equal(result.success, true);
});

test('[schema] web push subscription accepts browser endpoint keys', () => {
  const request = PushSubscribeRequestSchema.safeParse({
    endpoint: 'https://push.example.com/subscription/abc',
    keys: {
      p256dh: 'p256dh-key',
      auth: 'auth-secret'
    },
    userAgent: 'Mozilla/5.0'
  });
  const response = PushSubscriptionSchema.safeParse({
    id: '11111111-1111-1111-1111-111111111111',
    endpoint: 'https://push.example.com/subscription/abc',
    keys: {
      p256dh: 'p256dh-key',
      auth: 'auth-secret'
    },
    userAgent: 'Mozilla/5.0',
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  });

  assert.equal(request.success, true);
  assert.equal(response.success, true);
});

test('[schema] web push unsubscribe requires an endpoint URL', () => {
  const result = PushUnsubscribeRequestSchema.safeParse({
    endpoint: 'not-a-url'
  });

  assert.equal(result.success, false);
});

test('[schema] notification preferences accept quiet-hour web push settings', () => {
  const patch = PatchNotificationPrefsRequestSchema.safeParse({
    enabled: false,
    scopeDefault: 'all',
    payloadPrivacy: 'full',
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00:00',
    quietHoursTz: 'America/New_York'
  });
  const response = NotificationPrefsSchema.safeParse({
    enabled: false,
    scopeDefault: 'all',
    payloadPrivacy: 'full',
    quietHoursEnabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '07:00:00',
    quietHoursTz: 'America/New_York',
    updatedAt: new Date().toISOString()
  });

  assert.equal(patch.success, true);
  assert.equal(response.success, true);
});

test('[schema] chat notification override supports unset default state', () => {
  const patch = PatchChatNotificationOverrideRequestSchema.safeParse({
    scope: 'off',
    dndOverride: true
  });
  const response = ChatNotificationOverrideSchema.safeParse({
    chatId: '11111111-1111-1111-1111-111111111111',
    scope: null,
    dndOverride: false,
    updatedAt: null
  });

  assert.equal(patch.success, true);
  assert.equal(response.success, true);
});

test('[schema] web push message payload supports metadata and full preview modes', () => {
  const metadata = WebPushMessagePayloadSchema.safeParse({
    v: 1,
    type: 'message',
    chatId: '11111111-1111-1111-1111-111111111111',
    messageId: '22222222-2222-2222-2222-222222222222',
    senderName: 'Alice',
    chatName: 'General'
  });
  const full = WebPushMessagePayloadSchema.safeParse({
    v: 1,
    type: 'message',
    chatId: '11111111-1111-1111-1111-111111111111',
    messageId: '22222222-2222-2222-2222-222222222222',
    senderName: 'Alice',
    chatName: 'General',
    body: 'Hello there',
    senderAvatar: null
  });

  assert.equal(metadata.success, true);
  assert.equal(full.success, true);
});

test('[unit] web push DND handles same-day, wraparound, and invalid timezone cases', () => {
  assert.equal(isInQuietHours({
    quietHoursEnabled: true,
    quietHoursStart: '09:00:00',
    quietHoursEnd: '17:00:00',
    quietHoursTz: 'UTC'
  }, new Date('2026-05-03T12:00:00Z')), true);
  assert.equal(isInQuietHours({
    quietHoursEnabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '07:00:00',
    quietHoursTz: 'UTC'
  }, new Date('2026-05-03T23:00:00Z')), true);
  assert.equal(isInQuietHours({
    quietHoursEnabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '07:00:00',
    quietHoursTz: 'Not/A_Zone'
  }, new Date('2026-05-03T23:00:00Z')), false);
});

test('[unit] web push scope applies defaults, overrides, mute, and mentions', () => {
  assert.equal(isMentionForUsername('hello @aim', 'aim'), true);
  assert.equal(isMentionForUsername('hello @aimbot', 'aim'), false);
  assert.equal(shouldSendWebPush({
    notificationsEnabled: true,
    scopeDefault: 'dm_and_mention',
    overrideScope: null,
    dndOverride: false,
    notificationsMuted: false,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    quietHoursTz: null,
    isMention: false,
    isDm: true
  }), true);
  assert.equal(shouldSendWebPush({
    notificationsEnabled: true,
    scopeDefault: 'dm_and_mention',
    overrideScope: 'off',
    dndOverride: false,
    notificationsMuted: false,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    quietHoursTz: null,
    isMention: true,
    isDm: true
  }), false);
  assert.equal(shouldSendWebPush({
    notificationsEnabled: true,
    scopeDefault: 'all',
    overrideScope: null,
    dndOverride: true,
    notificationsMuted: true,
    quietHoursEnabled: true,
    quietHoursStart: '00:00:00',
    quietHoursEnd: '23:59:00',
    quietHoursTz: 'UTC',
    isMention: false,
    isDm: false
  }, new Date('2026-05-03T12:00:00Z')), true);
});

test('[schema] deviceNotificationSettings rejects equal quiet-hours start/end', () => {
  const result = UpdateDeviceNotificationSettingsRequestSchema.safeParse({
    token: 'fcm-token-123',
    notificationsEnabled: true,
    previewsEnabled: true,
    quietHoursEnabled: true,
    quietHoursStartMinute: 480,
    quietHoursEndMinute: 480,
    timezone: 'UTC'
  });
  assert.equal(result.success, false);
});

test('[schema] deviceNotificationSettings query requires token', () => {
  const result = GetDeviceNotificationSettingsQuerySchema.safeParse({ token: 'fcm-token-123' });
  assert.equal(result.success, true);
});

test('[schema] deviceNotificationSettings response shape accepts null quiet hours', () => {
  const result = DeviceNotificationSettingsSchema.safeParse({
    token: 'fcm-token-123',
    notificationsEnabled: true,
    previewsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStartMinute: null,
    quietHoursEndMinute: null,
    timezone: null
  });
  assert.equal(result.success, true);
});
