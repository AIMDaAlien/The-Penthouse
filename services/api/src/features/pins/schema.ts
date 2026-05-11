import { relations } from 'drizzle-orm';
import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/schema.js';
import { chats } from '../chats/schema.js';
import { messages } from '../chats/schema.js';

export const pinnedMessages = pgTable('pinned_messages', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  pinnedBy: uuid('pinned_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pinnedAt: timestamp('pinned_at', { withTimezone: true }).defaultNow().notNull(),
  contentSnapshot: text('content_snapshot').notNull().default(''),
  senderDisplayNameSnapshot: text('sender_display_name_snapshot')
}, (table) => [
  primaryKey({ columns: [table.chatId, table.messageId] }),
  index('idx_pinned_messages_chat_pinned_at').on(table.chatId, table.pinnedAt)
]);

export const pinnedMessagesRelations = relations(pinnedMessages, ({ one }) => ({
  chat: one(chats, { fields: [pinnedMessages.chatId], references: [chats.id] }),
  message: one(messages, { fields: [pinnedMessages.messageId], references: [messages.id] }),
  pinner: one(users, { fields: [pinnedMessages.pinnedBy], references: [users.id] })
}));
