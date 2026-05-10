import { boolean, check, index, integer, pgTable, primaryKey, text, time, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { notificationScopeEnum, chatOverrideScopeEnum, payloadPrivacyEnum } from '../../db/enums.js';
import { users } from '../auth/schema.js';
import { sessionDevices } from '../auth/schema.js';
import { messages } from '../chats/schema.js';
import { chats } from '../chats/schema.js';

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionDeviceId: uuid('session_device_id').references(() => sessionDevices.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_push_subscriptions_user').on(table.userId),
  index('idx_push_subscriptions_session').on(table.sessionDeviceId)
]);

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  scopeDefault: notificationScopeEnum('scope_default').notNull().default('dm_and_mention'),
  payloadPrivacy: payloadPrivacyEnum('payload_privacy').notNull().default('metadata'),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  quietHoursTz: text('quiet_hours_tz'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  check('quiet_hours_complete', sql`
    ${table.quietHoursEnabled} = FALSE OR (
      ${table.quietHoursStart} IS NOT NULL AND
      ${table.quietHoursEnd} IS NOT NULL AND
      ${table.quietHoursTz} IS NOT NULL
    )
  `)
]);

export const chatNotificationOverrides = pgTable('chat_notification_overrides', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  scope: chatOverrideScopeEnum('scope').notNull(),
  dndOverride: boolean('dnd_override').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.userId, table.chatId] }),
  index('idx_chat_notification_overrides_chat').on(table.chatId)
]);

export const pushNotifications = pgTable('push_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => pushSubscriptions.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  payloadVersion: integer('payload_version').notNull().default(1),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  succeeded: boolean('succeeded').notNull(),
  errorCode: text('error_code')
});
