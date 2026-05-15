import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userRoleEnum, userStatusEnum, presenceStateEnum } from '../../db/enums.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  avatarMediaId: uuid('avatar_media_id'),
  role: userRoleEnum('role').notNull().default('member'),
  status: userStatusEnum('status').notNull().default('active'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  recoveryCodeHash: text('recovery_code_hash'),
  timezone: text('timezone'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
  presenceState: presenceStateEnum('presence_state').notNull().default('offline'),
  presenceNote: text('presence_note').notNull().default(''),
  presenceNoteUpdatedAt: timestamp('presence_note_updated_at', { withTimezone: true }),
  testNoticeAcceptedVersion: text('test_notice_accepted_version'),
  testNoticeAcceptedAt: timestamp('test_notice_accepted_at', { withTimezone: true }),
  profileStyle: text('profile_style').notNull().default('editorial'),
  bannerUrl: text('banner_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_users_status').on(table.status),
  index('idx_users_role').on(table.role)
]);

export const signupInvites = pgTable('signup_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  label: text('label').notNull().default(''),
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const serverSettings = pgTable('server_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessionDevices = pgTable('session_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceLabel: text('device_label').notNull().default('Unknown device'),
  appContext: text('app_context'),
  hasPushToken: boolean('has_push_token').notNull().default(false),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionDeviceId: uuid('session_device_id').references(() => sessionDevices.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  rotatedToTokenHash: text('rotated_to_token_hash')
}, (table) => [
  index('idx_refresh_tokens_user').on(table.userId),
  index('idx_refresh_tokens_session').on(table.sessionDeviceId),
  index('idx_refresh_tokens_rotated_to_token_hash').on(table.rotatedToTokenHash)
]);
