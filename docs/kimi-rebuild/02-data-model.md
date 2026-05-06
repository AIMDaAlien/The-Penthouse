# Proposed Data Model — Drizzle ORM Mapping

**Date:** 2026-05-06  
**Basis:** Incumbent migrations 001–029 + schema health observations from Phase 0 research  
**ORM:** Drizzle ORM (`drizzle-orm/pg-core`) + `drizzle-kit` for migration generation

---

## 1. Migration mapping

Every incumbent migration maps to a Drizzle table or column definition below.

| Migration | Incumbent change | Drizzle equivalent |
|---|---|---|
| 001_initial | Core tables | `users`, `signupInvites`, `refreshTokens`, `chats`, `chatMembers`, `messages`, `mediaUploads` |
| 002_shared_general | `chats.system_key` UNIQUE | Column + unique constraint on `chats` |
| 003_auth_recovery | `users.recovery_code_hash` | Column on `users` |
| 004_user_management | `users.role`, `status`, `display_name`, `bio`, `avatar_media_id` | Columns + CHECK enums |
| 005_media_messages | `media_uploads.media_kind`, `messages.message_type`, `storage_key` | Columns + CHECK enums |
| 006_read_state | `chat_members.last_read_at` + index | Column + index |
| 007_test_account_notice | `users.test_notice_*` columns | Columns on `users` |
| 008_device_tokens | `device_tokens` table | Table (legacy FCM) |
| 009_device_notification_settings | Quiet-hours columns on `device_tokens` | Columns (legacy) |
| 010_message_moderation | `message_moderation_events` + moderation cols on `messages` | Extract to `messageModerationEvents` table |
| 011_direct_messages | `direct_chats` table | Table |
| 012_session_devices | `refresh_tokens.device_label`, `app_context`, etc. | **Extract to `sessionDevices` table** |
| 013_invite_onboarding | `server_settings`, `signup_invites` PK swap | `serverSettings` table; `signupInvites` with UUID PK |
| 014_refresh_token_grace | `refresh_tokens.rotated_at`, `rotated_to_token_hash` | Columns on `refreshTokens` |
| 015_messages_visible_chat_created_index | Partial index on `messages` | Partial index in Drizzle |
| 016_user_timezone | `users.timezone` | Column on `users` |
| 017_user_last_seen | `users.last_seen_at` | Column on `users` |
| 018_chat_member_preference_timestamps | `chat_members.notifications_muted_updated_at` | Column on `chatMembers` |
| 019_chat_member_last_read_message | `chat_members.last_read_message_id` + index | Column + FK + index |
| 020_polls | `polls`, `poll_options`, `poll_votes` | Tables |
| 021_poll_message_type | Add `'poll'` to `message_type` CHECK | Enum includes `'poll'` from day one |
| 022_message_reactions_replies_pins | `message_reactions`, `pinned_messages`, reply cols | Tables + columns |
| 023_message_editing | Add `'audio'` to `message_type`, `messages.edited_at`, `edit_count` | Enum + columns |
| 024_message_deletion | `messages.deleted_at`, `deleted_by_user_id` | **Extract to `messageDeletions` table** |
| 025_starred_messages | `starred_messages` table | Table |
| 026_chat_archive | `chat_members.archived_at` + index | Column + partial index |
| 027_push_notifications | `push_subscriptions`, `notification_prefs`, `chat_notification_overrides` | Tables |
| 028_push_payload_private_privacy | Add `'private'` to `payload_privacy` CHECK | Enum includes all values from day one |
| 029_push_subscriptions_session_id | FK `push_subscriptions.session_id → refresh_tokens` | FK to `sessionDevices` (not `refreshTokens`) |

---

## 2. Intentional schema changes

### Extract `sessionDevices` from `refreshTokens`
Incumbent conflates auth tokens and device metadata. Rebuild separates concerns:
- `sessionDevices` holds `deviceLabel`, `appContext`, `lastUsedAt`, `hasPushToken`.
- `refreshTokens` holds only `tokenHash`, `expiresAt`, `createdAt`, `rotatedAt`, `rotatedToTokenHash`.
- `pushSubscriptions.sessionId` FK → `sessionDevices` (not `refreshTokens`).
- Revoking a session device cascades to its refresh tokens and push subscriptions.

### Split `messages` god table
Incumbent `messages` carries moderation, reply, edit, and soft-delete columns. Rebuild normalizes:
- `messages` — base content only.
- `messageModerationEvents` — hide/unhide audit trail (already exists in incumbent as separate table).
- `messageEdits` — edit history (new table; incumbent has no audit).
- `messageDeletions` — soft-delete tombstones (new table; incumbent uses columns).

This keeps `messages` readable and makes moderation/deletion audit queries simple.

### Unify quiet-hours
Incumbent duplicates quiet-hours on `device_tokens` (legacy FCM) and `notification_prefs` (VAPID). Rebuild keeps only `notification_prefs`.

### Add FTS preparation
Add `messages.searchVector` as `tsvector` (generated column from `content`). Index with GIN for planned message search feature.

### `pushNotifications` table
KIMI brief lists it; incumbent schema never created it. Rebuild adds a lightweight delivery-log table for operator observability.

---

## 3. Drizzle schema

```typescript
// src/db/schema.ts
import {
  pgTable, uuid, text, timestamp, boolean, integer, jsonb,
  index, uniqueIndex, foreignKey, check, primaryKey, time,
  pgEnum, pgPolicy, serial, varchar, unique
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);
export const userStatusEnum = pgEnum('user_status', ['active', 'removed', 'banned']);
export const chatTypeEnum = pgEnum('chat_type', ['dm', 'channel']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'gif', 'file', 'poll', 'audio']);
export const mediaKindEnum = pgEnum('media_kind', ['image', 'video', 'file']);
export const moderationActionEnum = pgEnum('moderation_action', ['hide', 'unhide']);
export const notificationScopeEnum = pgEnum('notification_scope', ['off', 'dm_only', 'dm_and_mention', 'all']);
export const chatOverrideScopeEnum = pgEnum('chat_override_scope', ['off', 'mentions_only', 'all']);
export const payloadPrivacyEnum = pgEnum('payload_privacy', ['private', 'metadata', 'full']);

// ── Users ────────────────────────────────────────────────────────────────────

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
  testNoticeAcceptedVersion: text('test_notice_accepted_version'),
  testNoticeAcceptedAt: timestamp('test_notice_accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_users_status').on(table.status),
  index('idx_users_role').on(table.role),
  index('idx_users_test_notice_accepted_version').on(table.testNoticeAcceptedVersion),
]);

// ── Signup Invites ───────────────────────────────────────────────────────────

export const signupInvites = pgTable('signup_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  label: text('label').notNull().default(''),
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Server Settings ──────────────────────────────────────────────────────────

export const serverSettings = pgTable('server_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Session Devices ──────────────────────────────────────────────────────────
// Extracted from refresh_tokens in incumbent.

export const sessionDevices = pgTable('session_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceLabel: text('device_label').notNull().default('Unknown device'),
  appContext: text('app_context'),
  hasPushToken: boolean('has_push_token').notNull().default(false),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionDeviceId: uuid('session_device_id').references(() => sessionDevices.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  rotatedToTokenHash: text('rotated_to_token_hash'),
}, (table) => [
  index('idx_refresh_tokens_user').on(table.userId),
  index('idx_refresh_tokens_user_last_used').on(table.userId), // renamed conceptually
  index('idx_refresh_tokens_rotated_to_token_hash').on(table.rotatedToTokenHash),
]);

// ── Device Tokens (legacy FCM) ───────────────────────────────────────────────

export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: ['android', 'ios'] }).notNull(),
  token: text('token').notNull().unique(),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  previewsEnabled: boolean('previews_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_device_tokens_user_id').on(table.userId),
]);

// ── Chats ────────────────────────────────────────────────────────────────────

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: chatTypeEnum('type').notNull(),
  name: text('name').notNull(),
  systemKey: text('system_key').unique(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Chat Members ─────────────────────────────────────────────────────────────

export const chatMembers = pgTable('chat_members', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow().notNull(),
  lastReadMessageId: uuid('last_read_message_id').references(() => messages.id, { onDelete: 'set null' }),
  notificationsMuted: boolean('notifications_muted').notNull().default(false),
  notificationsMutedUpdatedAt: timestamp('notifications_muted_updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (table) => [
  primaryKey({ columns: [table.chatId, table.userId] }),
  index('idx_chat_members_user').on(table.userId),
  index('idx_chat_members_chat_last_read').on(table.chatId, table.lastReadAt),
  index('idx_chat_members_chat_last_read_message').on(table.chatId, table.lastReadMessageId),
  index('idx_chat_members_user_archived').on(table.userId, table.archivedAt),
]);

// ── Direct Chats ─────────────────────────────────────────────────────────────

export const directChats = pgTable('direct_chats', {
  chatId: uuid('chat_id').primaryKey().references(() => chats.id, { onDelete: 'cascade' }),
  firstUserId: uuid('first_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secondUserId: uuid('second_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  unique('unique_direct_chat_pair').on(table.firstUserId, table.secondUserId),
  check('direct_chats_order_check', sql`${table.firstUserId} < ${table.secondUserId}`),
  index('idx_direct_chats_first_user').on(table.firstUserId),
  index('idx_direct_chats_second_user').on(table.secondUserId),
]);

// ── Messages ─────────────────────────────────────────────────────────────────
// God table split: moderation → messageModerationEvents, edits → messageEdits, deletions → messageDeletions.

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  clientMessageId: text('client_message_id'),
  messageType: messageTypeEnum('message_type').notNull().default('text'),
  metadata: jsonb('metadata'),
  replyToMessageId: uuid('reply_to_message_id').references(() => messages.id, { onDelete: 'set null' }),
  replyToSnapshot: jsonb('reply_to_snapshot'),
  searchVector: text('search_vector'), // placeholder for tsvector; use raw sql migration for generated column
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_client_message').on(table.chatId, table.senderId, table.clientMessageId),
  index('idx_messages_chat_created').on(table.chatId, table.createdAt),
  index('idx_messages_reply_to_message_id').on(table.replyToMessageId),
]);

// ── Message Moderation Events ────────────────────────────────────────────────

export const messageModerationEvents = pgTable('message_moderation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  action: moderationActionEnum('action').notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_message_moderation_events_message').on(table.messageId),
  index('idx_message_moderation_events_created').on(table.createdAt),
]);

// ── Message Edits ────────────────────────────────────────────────────────────
// New table: audit trail for edits (incumbent had no history).

export const messageEdits = pgTable('message_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  previousContent: text('previous_content').notNull(),
  editedBy: uuid('edited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_message_edits_message').on(table.messageId),
]);

// ── Message Deletions ────────────────────────────────────────────────────────
// New table: soft-delete tombstones (incumbent used columns on messages).

export const messageDeletions = pgTable('message_deletions', {
  messageId: uuid('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  deletedByUserId: uuid('deleted_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Media Uploads ────────────────────────────────────────────────────────────

export const mediaUploads = pgTable('media_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  storageKey: text('storage_key').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  contentType: text('content_type'),
  mediaKind: mediaKindEnum('media_kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Message Reactions ────────────────────────────────────────────────────────

export const messageReactions = pgTable('message_reactions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
  check('emoji_length_check', sql`length(${table.emoji}) BETWEEN 1 AND 8`),
  index('idx_message_reactions_message_id').on(table.messageId),
]);

// ── Pinned Messages ──────────────────────────────────────────────────────────

export const pinnedMessages = pgTable('pinned_messages', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  pinnedBy: uuid('pinned_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pinnedAt: timestamp('pinned_at', { withTimezone: true }).defaultNow().notNull(),
  contentSnapshot: text('content_snapshot').notNull().default(''),
  senderDisplayNameSnapshot: text('sender_display_name_snapshot'),
}, (table) => [
  primaryKey({ columns: [table.chatId, table.messageId] }),
  index('idx_pinned_messages_chat_pinned_at').on(table.chatId, table.pinnedAt),
]);

// ── Polls ────────────────────────────────────────────────────────────────────

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().unique().references(() => messages.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  multiSelect: boolean('multi_select').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_polls_chat_id').on(table.chatId),
  index('idx_polls_message_id').on(table.messageId),
]);

export const pollOptions = pgTable('poll_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionIndex: integer('option_index').notNull(),
  optionText: text('option_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_poll_option_index').on(table.pollId, table.optionIndex),
  index('idx_poll_options_poll_id').on(table.pollId),
]);

export const pollVotes = pgTable('poll_votes', {
  pollId: uuid('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionId: uuid('option_id').notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.pollId, table.optionId, table.userId] }),
  index('idx_poll_votes_poll_id').on(table.pollId),
]);

// ── Starred Messages ─────────────────────────────────────────────────────────

export const starredMessages = pgTable('starred_messages', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  starredAt: timestamp('starred_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.messageId] }),
  index('idx_starred_messages_user').on(table.userId),
  index('idx_starred_messages_message').on(table.messageId),
]);

// ── Push Subscriptions ───────────────────────────────────────────────────────

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionDeviceId: uuid('session_device_id').notNull().references(() => sessionDevices.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_push_subscription').on(table.userId, table.endpoint),
  index('idx_push_subscriptions_user').on(table.userId),
  index('idx_push_subscriptions_session').on(table.sessionDeviceId),
]);

// ── Notification Prefs ───────────────────────────────────────────────────────

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  scopeDefault: notificationScopeEnum('scope_default').notNull().default('dm_and_mention'),
  payloadPrivacy: payloadPrivacyEnum('payload_privacy').notNull().default('metadata'),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  quietHoursTz: text('quiet_hours_tz'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('quiet_hours_complete', sql`
    ${table.quietHoursEnabled} = FALSE OR (
      ${table.quietHoursStart} IS NOT NULL AND
      ${table.quietHoursEnd} IS NOT NULL AND
      ${table.quietHoursTz} IS NOT NULL
    )
  `),
]);

// ── Chat Notification Overrides ──────────────────────────────────────────────

export const chatNotificationOverrides = pgTable('chat_notification_overrides', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  scope: chatOverrideScopeEnum('scope').notNull(),
  dndOverride: boolean('dnd_override').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.chatId] }),
  index('idx_chat_notification_overrides_chat').on(table.chatId),
]);

// ── Push Notifications (delivery log) ────────────────────────────────────────
// New table: lightweight observability for operator diagnostics.

export const pushNotifications = pgTable('push_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => pushSubscriptions.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  payloadVersion: integer('payload_version').notNull().default(1),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  succeeded: boolean('succeeded').notNull(),
  errorCode: text('error_code'),
});

// ── Relations (for Drizzle relational query API) ─────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  chatMembers: many(chatMembers),
  messages: many(messages),
  sessions: many(sessionDevices),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
  messages: many(messages),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  user: one(users, { fields: [chatMembers.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  reactions: many(messageReactions),
  edits: many(messageEdits),
}));
```

---

## 4. Migration generation workflow

```bash
# 1. Define schema in src/db/schema.ts
# 2. Generate migration
npx drizzle-kit generate --dialect postgresql --schema ./src/db/schema.ts --out ./src/db/migrations

# 3. Review generated SQL
# 4. Apply to local dev DB
npx drizzle-kit migrate

# 5. For rapid prototyping (dev only)
npx drizzle-kit push
```

First migration (`0000_initial.sql`) will contain all tables, enums, indexes, constraints, and relations. No incremental backfills needed because this is a green-field schema.

---

## 5. Data migration story (incumbent → rebuild)

### Phase A — Schema alignment
1. Spin up rebuild Postgres.
2. Run Drizzle `0000_initial.sql`.
3. Verify `\d` output matches incumbent schema (spot-check constraints, indexes, enums).

### Phase B — ETL
Script: `scripts/migrate-from-incumbent.ts`

| Source table | Target table | Notes |
|---|---|---|
| `users` | `users` | Direct copy. `recovery_code_hash` stays on user row. |
| `signup_invites` | `signupInvites` | Direct copy. `id` is already UUID PK. |
| `refresh_tokens` | `refreshTokens` + `sessionDevices` | Extract `device_label`, `app_context`, `has_push_token`, `last_used_at` into `sessionDevices`. Link `refreshTokens.sessionDeviceId`. |
| `device_tokens` | `deviceTokens` | Direct copy (legacy path). Drop quiet-hours columns. |
| `chats` | `chats` | Direct copy. |
| `chat_members` | `chatMembers` | Direct copy. `last_read_message_id` FK preserved. |
| `direct_chats` | `directChats` | Direct copy. Ordering CHECK enforced. |
| `messages` | `messages` + `messageModerationEvents` + `messageDeletions` + `messageEdits` | Copy base columns to `messages`. Copy moderation events to `messageModerationEvents`. Copy soft-deletes to `messageDeletions`. No edit history (incumbent had none). |
| `media_uploads` | `mediaUploads` | Direct copy. `file_path` retained for safety but deprecated. |
| `message_reactions` | `messageReactions` | Direct copy. |
| `pinned_messages` | `pinnedMessages` | Direct copy. |
| `polls` / `poll_options` / `poll_votes` | Same | Direct copy. |
| `starred_messages` | `starredMessages` | Direct copy. |
| `push_subscriptions` | `pushSubscriptions` | Copy. `session_id` FK remapped to `sessionDevices.id`. |
| `notification_prefs` | `notificationPrefs` | Direct copy. |
| `chat_notification_overrides` | `chatNotificationOverrides` | Direct copy. |

### Phase C — Dry-run script
```bash
# Validate row counts match
psql $INCUMBENT_DB -c "SELECT COUNT(*) FROM messages;"
psql $REBUILD_DB -c "SELECT COUNT(*) FROM messages;"

# Validate FK integrity
psql $REBUILD_DB -f scripts/validate-fks.sql
```

### Phase D — Rollback plan
- Rebuild DB is disposable until cutover.
- Cutover window: stop incumbent API, run ETL, start rebuild API.
- Rollback: stop rebuild, restore incumbent from pre-cutover dump, start incumbent.

---

## 6. FTS setup (message search)

Not in initial migration. Add as `0001_add_message_search.sql` when search feature is scoped:

```sql
-- Generated column for tsvector
ALTER TABLE messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN index
CREATE INDEX idx_messages_search_vector ON messages USING gin(search_vector);
```

Drizzle schema already has `searchVector: text('search_vector')` as placeholder. Raw SQL migration handles the `tsvector` type since Drizzle's `pg-core` does not yet have first-class `tsvector` support.
