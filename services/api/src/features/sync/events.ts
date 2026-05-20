import { SyncOperationSchema, type SyncOperation } from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { syncEvents } from '../../db/schema.js';

type SyncScope = 'chat' | 'user' | 'global';
type SyncEventWriter = Pick<typeof db, 'insert'>;

type AppendSyncEventInput = {
  op: SyncOperation;
  scope: SyncScope;
  entityId: string;
  chatId?: string | null;
  userId?: string | null;
  actorUserId?: string | null;
};

export async function appendSyncEvent(input: AppendSyncEventInput, writer: SyncEventWriter = db) {
  const op = SyncOperationSchema.parse(input.op);
  const [event] = await writer.insert(syncEvents).values({
    scope: input.scope,
    opType: op.type,
    entityId: input.entityId,
    chatId: input.chatId ?? null,
    userId: input.userId ?? null,
    actorUserId: input.actorUserId ?? null,
    payload: op
  }).returning();

  return {
    id: String(event.id),
    createdAt: event.createdAt.toISOString(),
    op: SyncOperationSchema.parse(event.payload)
  };
}
