import type { AdminMessage, AdminMessageModeration, Message, MessageType, UserStatus, ModerationAction } from '@penthouse/contracts';
import { avatarUrlFromFileName } from './users.js';

export const MODERATED_MESSAGE_TOMBSTONE = 'Message removed by moderation.';

type BaseMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_username?: string | null;
  sender_display_name?: string | null;
  avatar_storage_key?: string | null;
  content: string;
  message_type?: MessageType | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | Date;
  client_message_id?: string | null;
  seen_at?: string | Date | null;
  sender_status?: UserStatus | null;
  hidden_by_moderation?: boolean | null;
  moderation_action?: ModerationAction | null;
  moderation_reason?: string | null;
  moderation_updated_at?: string | Date | null;
  moderation_actor_user_id?: string | null;
  moderation_actor_username?: string | null;
  moderation_actor_display_name?: string | null;
};

export function isHiddenFromMembers(row: Pick<BaseMessageRow, 'sender_status' | 'hidden_by_moderation'>): boolean {
  return Boolean(row.hidden_by_moderation) || Boolean(row.sender_status && row.sender_status !== 'active');
}

export function toMemberMessage(row: BaseMessageRow): Message {
  const hidden = isHiddenFromMembers(row);
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username ?? undefined,
    senderDisplayName: row.sender_display_name ?? undefined,
    senderAvatarUrl: avatarUrlFromFileName(row.avatar_storage_key ?? null),
    content: hidden ? MODERATED_MESSAGE_TOMBSTONE : row.content,
    type: hidden ? 'text' : ((row.message_type as MessageType | null) ?? 'text'),
    metadata: hidden ? null : (row.metadata ?? null),
    createdAt: new Date(row.created_at).toISOString(),
    clientMessageId: row.client_message_id ?? undefined,
    seenAt: row.seen_at ? new Date(row.seen_at).toISOString() : null,
    hidden
  };
}

export function toAdminMessage(row: BaseMessageRow): AdminMessage {
  const moderation: AdminMessageModeration = {
    hiddenByModeration: Boolean(row.hidden_by_moderation),
    latestAction: (row.moderation_action as ModerationAction | null) ?? null,
    latestReason: row.moderation_reason ?? null,
    latestCreatedAt: row.moderation_updated_at ? new Date(row.moderation_updated_at).toISOString() : null,
    latestActorUserId: row.moderation_actor_user_id ?? null,
    latestActorUsername: row.moderation_actor_username ?? null,
    latestActorDisplayName: row.moderation_actor_display_name ?? null
  };

  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username ?? undefined,
    senderDisplayName: row.sender_display_name ?? undefined,
    senderAvatarUrl: avatarUrlFromFileName(row.avatar_storage_key ?? null),
    senderStatus: (row.sender_status as UserStatus | null) ?? 'active',
    hidden: isHiddenFromMembers(row),
    moderation,
    content: row.content,
    type: (row.message_type as MessageType | null) ?? 'text',
    metadata: row.metadata ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    clientMessageId: row.client_message_id ?? undefined,
    seenAt: row.seen_at ? new Date(row.seen_at).toISOString() : null
  };
}
