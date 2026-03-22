import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeviceNotificationSettingsSchema,
  GetDeviceNotificationSettingsQuerySchema,
  RegisterDeviceTokenRequestSchema,
  RegisterDeviceTokenResponseSchema,
  UnregisterDeviceTokenRequestSchema,
  UpdateDeviceNotificationSettingsRequestSchema
} from '@penthouse/contracts';

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
