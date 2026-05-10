import { relations, sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { chatTypeEnum, messageTypeEnum, moderationActionEnum } from '../../db/enums.js';
import { users } from '../auth/schema.js';

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: chatTypeEnum('type').notNull(),
  name: text('name').notNull(),
  systemKey: text('system_key').unique(),
  parentChatId: uuid('parent_chat_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  foreignKey({
    columns: [table.parentChatId],
    foreignColumns: [table.id],
    name: 'chats_parent_chat_id_fk'
  }).onDelete('cascade'),
  index('idx_chats_parent').on(table.parentChatId)
]);

export const chatMembers = pgTable('chat_members', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow().notNull(),
  lastReadMessageId: uuid('last_read_message_id'),
  notificationsMuted: boolean('notifications_muted').notNull().default(false),
  notificationsMutedUpdatedAt: timestamp('notifications_muted_updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true })
}, (table) => [
  primaryKey({ columns: [table.chatId, table.userId] }),
  index('idx_chat_members_user').on(table.userId),
  index('idx_chat_members_chat_last_read').on(table.chatId, table.lastReadAt),
  index('idx_chat_members_chat_last_read_message').on(table.chatId, table.lastReadMessageId),
  index('idx_chat_members_user_archived').on(table.userId, table.archivedAt)
]);

export const directChats = pgTable('direct_chats', {
  chatId: uuid('chat_id').primaryKey().references(() => chats.id, { onDelete: 'cascade' }),
  firstUserId: uuid('first_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  secondUserId: uuid('second_user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
}, (table) => [
  unique('unique_direct_chat_pair').on(table.firstUserId, table.secondUserId),
  check('direct_chats_order_check', sql`${table.firstUserId} < ${table.secondUserId}`),
  index('idx_direct_chats_first_user').on(table.firstUserId),
  index('idx_direct_chats_second_user').on(table.secondUserId)
]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  clientMessageId: text('client_message_id'),
  messageType: messageTypeEnum('message_type').notNull().default('text'),
  metadata: jsonb('metadata'),
  replyToMessageId: uuid('reply_to_message_id'),
  replyToSnapshot: jsonb('reply_to_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('unique_client_message').on(table.chatId, table.senderId, table.clientMessageId),
  index('idx_messages_chat_created').on(table.chatId, table.createdAt),
  index('idx_messages_reply_to_message_id').on(table.replyToMessageId)
]);

export const messageEdits = pgTable('message_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  previousContent: text('previous_content').notNull(),
  editedBy: uuid('edited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_message_edits_message').on(table.messageId)
]);

export const messageDeletions = pgTable('message_deletions', {
  messageId: uuid('message_id').primaryKey().references(() => messages.id, { onDelete: 'cascade' }),
  deletedByUserId: uuid('deleted_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }).defaultNow().notNull()
});

export const messageModerationEvents = pgTable('message_moderation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  action: moderationActionEnum('action').notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const messageReactions = pgTable('message_reactions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
  check('emoji_length_check', sql`length(${table.emoji}) BETWEEN 1 AND 8`),
  index('idx_message_reactions_message_id').on(table.messageId)
]);

export const chatsRelations = relations(chats, ({ one, many }) => ({
  members: many(chatMembers),
  messages: many(messages),
  parentChat: one(chats, { fields: [chats.parentChatId], references: [chats.id] }),
  childChats: many(chats)
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  user: one(users, { fields: [chatMembers.userId], references: [users.id] })
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  reactions: many(messageReactions),
  edits: many(messageEdits)
}));
