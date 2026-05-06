import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PushSubscribeRequestSchema,
  NotificationPrefsSchema,
  PatchNotificationPrefsRequestSchema,
  WebPushMessagePayloadSchema
} from '../src/push.js';

describe('PushSubscribeRequestSchema', () => {
  it('accepts valid subscription', () => {
    const result = PushSubscribeRequestSchema.safeParse({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg'
      },
      userAgent: 'Mozilla/5.0'
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects invalid endpoint', () => {
    const result = PushSubscribeRequestSchema.safeParse({
      endpoint: 'not-a-url',
      keys: { p256dh: 'key', auth: 'auth' }
    });
    assert.strictEqual(result.success, false);
  });
});

describe('NotificationPrefsSchema', () => {
  it('accepts valid prefs', () => {
    const result = NotificationPrefsSchema.safeParse({
      enabled: true,
      scopeDefault: 'dm_only',
      payloadPrivacy: 'metadata',
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      quietHoursTz: null,
      updatedAt: new Date().toISOString()
    });
    assert.strictEqual(result.success, true);
  });

  it('accepts quiet hours with valid time', () => {
    const result = NotificationPrefsSchema.safeParse({
      enabled: true,
      scopeDefault: 'all',
      payloadPrivacy: 'full',
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      quietHoursTz: 'America/New_York',
      updatedAt: new Date().toISOString()
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects invalid time format', () => {
    const result = NotificationPrefsSchema.safeParse({
      enabled: true,
      scopeDefault: 'all',
      payloadPrivacy: 'full',
      quietHoursEnabled: true,
      quietHoursStart: '25:00',
      quietHoursEnd: '07:00',
      quietHoursTz: 'America/New_York',
      updatedAt: new Date().toISOString()
    });
    assert.strictEqual(result.success, false);
  });
});

describe('PatchNotificationPrefsRequestSchema', () => {
  it('accepts partial patch', () => {
    const result = PatchNotificationPrefsRequestSchema.safeParse({
      enabled: false
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects empty patch', () => {
    const result = PatchNotificationPrefsRequestSchema.safeParse({});
    assert.strictEqual(result.success, false);
  });
});

describe('WebPushMessagePayloadSchema', () => {
  it('accepts valid payload', () => {
    const result = WebPushMessagePayloadSchema.safeParse({
      v: 1,
      type: 'message',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      messageId: '550e8400-e29b-41d4-a716-446655440001',
      senderName: 'Alice',
      chatName: 'General',
      body: 'Hello!'
    });
    assert.strictEqual(result.success, true);
  });
});
