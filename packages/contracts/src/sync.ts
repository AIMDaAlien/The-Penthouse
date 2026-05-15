import { z } from 'zod';
import {
  ChatFolderItemSchema,
  ChatFolderSchema,
  ChannelSchema,
  ChatSummarySchema,
  MemberDetailSchema,
  MessageSchema,
  PinResponseSchema
} from './api.js';

export const SyncCursorSchema = z.string().regex(/^\d+$/, 'Cursor must be a numeric sync event id');

export const SyncReadStateSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  lastReadAt: z.string().nullable(),
  lastReadMessageId: z.string().uuid().nullable().optional(),
  notificationsMuted: z.boolean().optional(),
  archivedAt: z.string().nullable().optional()
});

export const SyncOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chat.upsert'), payload: ChatSummarySchema }),
  z.object({ type: z.literal('channel.upsert'), payload: ChannelSchema }),
  z.object({ type: z.literal('folder.upsert'), payload: ChatFolderSchema }),
  z.object({ type: z.literal('folder.delete'), payload: z.object({ folderId: z.string().uuid() }) }),
  z.object({ type: z.literal('folder_item.upsert'), payload: ChatFolderItemSchema }),
  z.object({
    type: z.literal('folder_item.delete'),
    payload: z.object({ folderId: z.string().uuid(), chatId: z.string().uuid() })
  }),
  z.object({ type: z.literal('user.upsert'), payload: MemberDetailSchema }),
  z.object({ type: z.literal('message.upsert'), payload: MessageSchema }),
  z.object({
    type: z.literal('message.delete'),
    payload: z.object({
      chatId: z.string().uuid(),
      messageId: z.string().uuid(),
      deletedAt: z.string(),
      deletedByUserId: z.string().uuid()
    })
  }),
  z.object({
    type: z.literal('reaction.add'),
    payload: z.object({
      chatId: z.string().uuid(),
      messageId: z.string().uuid(),
      userId: z.string().uuid(),
      emoji: z.string().min(1).max(8),
      createdAt: z.string()
    })
  }),
  z.object({
    type: z.literal('reaction.remove'),
    payload: z.object({
      chatId: z.string().uuid(),
      messageId: z.string().uuid(),
      userId: z.string().uuid(),
      emoji: z.string().min(1).max(8)
    })
  }),
  z.object({ type: z.literal('message.pin'), payload: PinResponseSchema }),
  z.object({
    type: z.literal('message.unpin'),
    payload: z.object({ chatId: z.string().uuid(), messageId: z.string().uuid() })
  }),
  z.object({ type: z.literal('read.upsert'), payload: SyncReadStateSchema })
]);

export const SyncEventSchema = z.object({
  id: SyncCursorSchema,
  createdAt: z.string(),
  op: SyncOperationSchema
});

export const ClientSyncRequestSchema = z.object({
  type: z.literal('sync.request'),
  cursor: SyncCursorSchema.optional(),
  limit: z.number().int().min(1).max(500).optional()
});

export const SyncResponseSchema = z.object({
  cursor: SyncCursorSchema,
  nextCursor: SyncCursorSchema,
  hasMore: z.boolean(),
  ops: z.array(SyncEventSchema)
});

export const ServerSyncBatchEventSchema = z.object({
  type: z.literal('sync.batch'),
  payload: SyncResponseSchema
});

export type SyncCursor = z.infer<typeof SyncCursorSchema>;
export type SyncReadState = z.infer<typeof SyncReadStateSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncEvent = z.infer<typeof SyncEventSchema>;
export type ClientSyncRequest = z.infer<typeof ClientSyncRequestSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;
export type ServerSyncBatchEvent = z.infer<typeof ServerSyncBatchEventSchema>;
