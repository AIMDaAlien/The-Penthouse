import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const syncEvents = pgTable('sync_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  scope: text('scope').notNull(),
  opType: text('op_type').notNull(),
  entityId: text('entity_id').notNull(),
  chatId: uuid('chat_id'),
  userId: uuid('user_id'),
  actorUserId: uuid('actor_user_id'),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_sync_events_created').on(table.createdAt),
  index('idx_sync_events_chat').on(table.chatId),
  index('idx_sync_events_user').on(table.userId),
  index('idx_sync_events_scope').on(table.scope)
]);
