import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/schema.js';
import { mediaUploads } from '../media/schema.js';

export const customEmotes = pgTable('custom_emotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mediaUploadId: uuid('media_upload_id').notNull().references(() => mediaUploads.id, { onDelete: 'cascade' }),
  width: integer('width').notNull().default(48),
  height: integer('height').notNull().default(48),
  isAnimated: boolean('is_animated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_custom_emotes_user').on(table.userId),
  index('idx_custom_emotes_name').on(table.name)
]);

export const customEmotesRelations = relations(customEmotes, ({ one }) => ({
  user: one(users, { fields: [customEmotes.userId], references: [users.id] }),
  mediaUpload: one(mediaUploads, { fields: [customEmotes.mediaUploadId], references: [mediaUploads.id] })
}));

export const stickerPacks = pgTable('sticker_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  thumbnailMediaUploadId: uuid('thumbnail_media_upload_id').references(() => mediaUploads.id, { onDelete: 'set null' }),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const stickerPacksRelations = relations(stickerPacks, ({ one, many }) => ({
  user: one(users, { fields: [stickerPacks.userId], references: [users.id] }),
  thumbnail: one(mediaUploads, { fields: [stickerPacks.thumbnailMediaUploadId], references: [mediaUploads.id] }),
  stickers: many(stickers)
}));

export const stickers = pgTable('stickers', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').notNull().references(() => stickerPacks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mediaUploadId: uuid('media_upload_id').notNull().references(() => mediaUploads.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_stickers_pack').on(table.packId)
]);

export const stickersRelations = relations(stickers, ({ one }) => ({
  pack: one(stickerPacks, { fields: [stickers.packId], references: [stickerPacks.id] }),
  mediaUpload: one(mediaUploads, { fields: [stickers.mediaUploadId], references: [mediaUploads.id] })
}));
