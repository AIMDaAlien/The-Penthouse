import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { mediaKindEnum } from '../../db/enums.js';
import { users } from '../auth/schema.js';

export const mediaUploads = pgTable('media_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  storageKey: text('storage_key').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  contentType: text('content_type'),
  mediaKind: mediaKindEnum('media_kind').notNull(),
  scope: text('scope').notNull().default('private'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_media_uploads_uploader').on(table.uploaderId),
  unique('unique_media_storage_key').on(table.storageKey)
]);
