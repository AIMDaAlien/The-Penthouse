import { z } from 'zod';
import { ChatFolderItemSchema, ChatFolderSchema, MessageMetadataSchema, MessageSchema, MessageTypeSchema, ModerationActionSchema, PollDataSchema } from './api.js';

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

export const PresenceStateSchema = z.enum(['available', 'busy', 'dnd', 'afk', 'offline']);

export const ClientPresenceUpdateEventSchema = z.object({
  type: z.literal('presence.update'),
  state: PresenceStateSchema,
  note: z.string().max(100).optional()
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
    pinnedAt: z.string(),
    content: z.string(),
    senderDisplayName: z.string().nullable().optional()
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
  state: PresenceStateSchema,
  note: z.string().optional(),
  timestamp: z.string()
});

export const ServerPresenceSyncEventSchema = z.record(z.string(), z.object({
  state: PresenceStateSchema,
  note: z.string().optional(),
  lastSeenAt: z.string().optional()
}));

export const ServerChatSyncRequiredEventSchema = z.object({
  type: z.literal('chat.sync_required'),
  payload: z.object({
    chatId: z.string(),
    reason: z.string()
  })
});

export const ServerFolderUpsertEventSchema = z.object({
  type: z.literal('folder.upsert'),
  payload: ChatFolderSchema
});

export const ServerFolderDeleteEventSchema = z.object({
  type: z.literal('folder.delete'),
  payload: z.object({ folderId: z.string().uuid() })
});

export const ServerFolderItemUpsertEventSchema = z.object({
  type: z.literal('folder_item.upsert'),
  payload: ChatFolderItemSchema
});

export const ServerFolderItemDeleteEventSchema = z.object({
  type: z.literal('folder_item.delete'),
  payload: z.object({ folderId: z.string().uuid(), chatId: z.string().uuid() })
});

export const ClientVoiceJoinEventSchema = z.object({
  type: z.literal('voice.join'),
  chatId: z.string()
});

export const ClientVoiceLeaveEventSchema = z.object({
  type: z.literal('voice.leave'),
  chatId: z.string()
});

export const ClientVoiceSignalEventSchema = z.object({
  type: z.literal('voice.signal'),
  targetUserId: z.string(),
  data: z.record(z.string(), z.unknown())
});

export const ClientVoiceMuteEventSchema = z.object({
  type: z.literal('voice.mute'),
  muted: z.boolean()
});

export const ClientVoicePttEventSchema = z.object({
  type: z.literal('voice.ptt'),
  active: z.boolean()
});

export const ClientVoiceDeafenEventSchema = z.object({
  type: z.literal('voice.deafen'),
  deafened: z.boolean()
});

export const ServerVoiceUserJoinedEventSchema = z.object({
  type: z.literal('voice.user_joined'),
  payload: z.object({
    userId: z.string(),
    displayName: z.string()
  })
});

export const ServerVoiceUserLeftEventSchema = z.object({
  type: z.literal('voice.user_left'),
  payload: z.object({
    userId: z.string()
  })
});

export const ServerVoiceSignalEventSchema = z.object({
  type: z.literal('voice.signal'),
  payload: z.object({
    fromUserId: z.string(),
    data: z.record(z.string(), z.unknown())
  })
});

export const ServerVoiceMuteEventSchema = z.object({
  type: z.literal('voice.mute'),
  payload: z.object({
    userId: z.string(),
    muted: z.boolean()
  })
});

export const ServerVoiceSpeakingEventSchema = z.object({
  type: z.literal('voice.speaking'),
  payload: z.object({
    userId: z.string(),
    speaking: z.boolean()
  })
});

export const ServerVoiceStateEventSchema = z.object({
  type: z.literal('voice.state'),
  payload: z.object({
    participants: z.array(z.object({
      userId: z.string(),
      displayName: z.string(),
      muted: z.boolean(),
      deafened: z.boolean().optional(),
      speaking: z.boolean().optional()
    }))
  })
});

export type ClientPresenceUpdateEvent = z.infer<typeof ClientPresenceUpdateEventSchema>;
export type ClientMessageSendEvent = z.infer<typeof ClientMessageSendEventSchema>;
export type ServerPresenceUpdateEvent = z.infer<typeof ServerPresenceUpdateEventSchema>;
export type ServerPresenceSyncEvent = z.infer<typeof ServerPresenceSyncEventSchema>;
export type ServerMessageNewEvent = z.infer<typeof ServerMessageNewEventSchema>;
export type ServerMessageAckEvent = z.infer<typeof ServerMessageAckEventSchema>;
export type ServerMessageReadEvent = z.infer<typeof ServerMessageReadEventSchema>;
export type ServerMessageEditedEvent = z.infer<typeof ServerMessageEditedEventSchema>;
export type ServerMessageDeletedEvent = z.infer<typeof ServerMessageDeletedEventSchema>;
export type ServerPollVotedEvent = z.infer<typeof ServerPollVotedEventSchema>;
export type ServerReactionAddEvent = z.infer<typeof ServerReactionAddEventSchema>;
export type ServerReactionRemoveEvent = z.infer<typeof ServerReactionRemoveEventSchema>;
export type ServerMessagePinnedEvent = z.infer<typeof ServerMessagePinnedEventSchema>;
export type ServerMessageUnpinnedEvent = z.infer<typeof ServerMessageUnpinnedEventSchema>;
export type ServerTypingUpdateEvent = z.infer<typeof ServerTypingUpdateEventSchema>;
export type ServerChatSyncRequiredEvent = z.infer<typeof ServerChatSyncRequiredEventSchema>;
export type ServerFolderUpsertEvent = z.infer<typeof ServerFolderUpsertEventSchema>;
export type ServerFolderDeleteEvent = z.infer<typeof ServerFolderDeleteEventSchema>;
export type ServerFolderItemUpsertEvent = z.infer<typeof ServerFolderItemUpsertEventSchema>;
export type ServerFolderItemDeleteEvent = z.infer<typeof ServerFolderItemDeleteEventSchema>;
export type ServerMessageModeratedEvent = z.infer<typeof ServerMessageModeratedEventSchema>;
export type ClientVoiceJoinEvent = z.infer<typeof ClientVoiceJoinEventSchema>;
export type ClientVoiceLeaveEvent = z.infer<typeof ClientVoiceLeaveEventSchema>;
export type ClientVoiceSignalEvent = z.infer<typeof ClientVoiceSignalEventSchema>;
export type ClientVoiceMuteEvent = z.infer<typeof ClientVoiceMuteEventSchema>;
export type ClientVoicePttEvent = z.infer<typeof ClientVoicePttEventSchema>;
export type ClientVoiceDeafenEvent = z.infer<typeof ClientVoiceDeafenEventSchema>;
export type ServerVoiceUserJoinedEvent = z.infer<typeof ServerVoiceUserJoinedEventSchema>;
export type ServerVoiceUserLeftEvent = z.infer<typeof ServerVoiceUserLeftEventSchema>;
export type ServerVoiceSignalEvent = z.infer<typeof ServerVoiceSignalEventSchema>;
export type ServerVoiceMuteEvent = z.infer<typeof ServerVoiceMuteEventSchema>;
export type ServerVoiceSpeakingEvent = z.infer<typeof ServerVoiceSpeakingEventSchema>;
export type ServerVoiceStateEvent = z.infer<typeof ServerVoiceStateEventSchema>;
