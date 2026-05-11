import { relations } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/schema.js';

export const chatFolders = pgTable('chat_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_chat_folders_user').on(table.userId),
  index('idx_chat_folders_user_sort').on(table.userId, table.sortOrder)
]);

export const chatFolderItems = pgTable('chat_folder_items', {
  folderId: uuid('folder_id').notNull().references(() => chatFolders.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_chat_folder_items_folder').on(table.folderId),
  index('idx_chat_folder_items_chat').on(table.chatId),
  unique('unique_chat_folder_item').on(table.folderId, table.chatId)
]);

export const chatFoldersRelations = relations(chatFolders, ({ many }) => ({
  items: many(chatFolderItems)
}));

export const chatFolderItemsRelations = relations(chatFolderItems, ({ one }) => ({
  folder: one(chatFolders, { fields: [chatFolderItems.folderId], references: [chatFolders.id] })
}));
