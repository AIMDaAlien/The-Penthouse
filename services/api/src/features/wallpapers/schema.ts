import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/schema.js';
import { chats } from '../chats/schema.js';

export const userWallpapers = pgTable('user_wallpapers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  isGlobal: boolean('is_global').notNull().default(false),
  wallpaperUrl: text('wallpaper_url'),
  wallpaperColor: text('wallpaper_color'),
  opacity: text('opacity').notNull().default('1'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
