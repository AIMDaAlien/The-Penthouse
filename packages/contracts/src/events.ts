import { z } from 'zod';
import { MessageMetadataSchema, MessageSchema, MessageTypeSchema, ModerationActionSchema } from './api.js';

export const ClientJoinChatEventSchema = z.object({
  type: z.literal('chat.join'),
  chatId: z.string()
});

export const ClientLeaveChatEventSchema = z.object({
  type: z.literal('chat.leave'),
  chatId: z.string()
});

export const ClientTypingStartEventSchema = z.object({
  type: z.literal('typing.start'),
  chatId: z.string()
});

export const ClientTypingStopEventSchema = z.object({
  type: z.literal('typing.stop'),
  chatId: z.string()
});

export const ClientPresenceUpdateEventSchema = z.object({
  type: z.literal('presence.update'),
  online: z.boolean()
});

export const ClientMessageSendEventSchema = z.object({
  type: z.literal('message.send'),
  chatId: z.string(),
  content: z.string().min(1).max(4000),
  messageType: MessageTypeSchema.optional().default('text'),
  metadata: MessageMetadataSchema.nullable().optional(),
  clientMessageId: z.string().min(8).max(128)
});

export const ServerMessageNewEventSchema = z.object({
  type: z.literal('message.new'),
  payload: MessageSchema
});

export const ServerMessageModeratedEventSchema = z.object({
  type: z.literal('message.moderated'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    action: ModerationActionSchema,
    moderatedAt: z.string(),
    message: MessageSchema
  })
});

export const ServerMessageAckEventSchema = z.object({
  type: z.literal('message.ack'),
  payload: z.object({
    clientMessageId: z.string(),
    messageId: z.string(),
    chatId: z.string(),
    deliveredAt: z.string()
  })
});

export const ServerMessageReadEventSchema = z.object({
  type: z.literal('message.read'),
  payload: z.object({
    chatId: z.string(),
    readerUserId: z.string(),
    seenAt: z.string(),
    seenThroughMessageId: z.string().nullable().optional()
  })
});

export const ServerTypingUpdateEventSchema = z.object({
  type: z.literal('typing.update'),
  payload: z.object({
    chatId: z.string(),
    userId: z.string(),
    status: z.enum(['start', 'stop']),
    displayName: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional()
  })
});

export const ServerPresenceUpdateEventSchema = z.object({
  userId: z.string(),
  online: z.boolean(),
  timestamp: z.string()
});

export const ServerPresenceSyncEventSchema = z.record(z.string(), z.boolean());

export const ServerChatSyncRequiredEventSchema = z.object({
  type: z.literal('chat.sync_required'),
  payload: z.object({
    chatId: z.string(),
    reason: z.string()
  })
});

export type ClientPresenceUpdateEvent = z.infer<typeof ClientPresenceUpdateEventSchema>;
export type ClientMessageSendEvent = z.infer<typeof ClientMessageSendEventSchema>;
export type ServerPresenceUpdateEvent = z.infer<typeof ServerPresenceUpdateEventSchema>;
export type ServerPresenceSyncEvent = z.infer<typeof ServerPresenceSyncEventSchema>;
