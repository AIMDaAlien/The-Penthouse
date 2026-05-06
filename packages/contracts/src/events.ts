import { z } from 'zod';
import { MessageMetadataSchema, MessageSchema, MessageTypeSchema, ModerationActionSchema, PollDataSchema } from './api.js';

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
  content: z.string().max(4000),
  messageType: MessageTypeSchema.optional().default('text'),
  metadata: MessageMetadataSchema.nullable().optional(),
  replyToMessageId: z.string().uuid().optional(),
  clientMessageId: z.string().min(8).max(128)
}).superRefine((value, ctx) => {
  if (value.messageType !== 'audio' && value.content.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: 'Content is required'
    });
  }

  if (value.messageType === 'audio') {
    const metadata = value.metadata;
    const audioUrl = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).audioUrl
      : null;

    if (typeof audioUrl !== 'string' || audioUrl.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metadata', 'audioUrl'],
        message: 'audioUrl is required for audio messages'
      });
    }
  }
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

export const ServerMessageEditedEventSchema = z.object({
  type: z.literal('message.edited'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    content: z.string(),
    editedAt: z.string(),
    editCount: z.number().int()
  })
});

export const ServerMessageDeletedEventSchema = z.object({
  type: z.literal('message.deleted'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    deletedAt: z.string(),
    deletedByUserId: z.string()
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

export const ServerPollVotedEventSchema = z.object({
  type: z.literal('poll.voted'),
  payload: z.object({
    chatId: z.string(),
    pollId: z.string().uuid(),
    poll: PollDataSchema
  })
});

export const ServerReactionAddEventSchema = z.object({
  type: z.literal('reaction.add'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    userId: z.string(),
    emoji: z.string(),
    createdAt: z.string()
  })
});

export const ServerReactionRemoveEventSchema = z.object({
  type: z.literal('reaction.remove'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    userId: z.string(),
    emoji: z.string()
  })
});

export const ServerMessagePinnedEventSchema = z.object({
  type: z.literal('message.pinned'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    pinnedByUserId: z.string(),
    pinnedAt: z.string()
  })
});

export const ServerMessageUnpinnedEventSchema = z.object({
  type: z.literal('message.unpinned'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string()
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
export type ServerMessageEditedEvent = z.infer<typeof ServerMessageEditedEventSchema>;
export type ServerMessageDeletedEvent = z.infer<typeof ServerMessageDeletedEventSchema>;
export type ServerPollVotedEvent = z.infer<typeof ServerPollVotedEventSchema>;
export type ServerReactionAddEvent = z.infer<typeof ServerReactionAddEventSchema>;
export type ServerReactionRemoveEvent = z.infer<typeof ServerReactionRemoveEventSchema>;
export type ServerMessagePinnedEvent = z.infer<typeof ServerMessagePinnedEventSchema>;
export type ServerMessageUnpinnedEvent = z.infer<typeof ServerMessageUnpinnedEventSchema>;
