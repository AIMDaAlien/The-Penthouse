import {
  MessageReactionSchema,
  PinnedMessageSchema,
  ReplyToSchema,
  type Message,
  type MessageReaction,
  type PinnedMessage,
  type ReplyTo
} from '@penthouse/contracts';
import type { Queryable } from './users.js';

type ReactionRow = {
  message_id: string;
  emoji: string;
  user_ids: string[];
};

type ReplySnapshotRow = {
  id: string;
  content: string;
  sender_display_name: string | null;
};

type PinnedMessageRow = {
  message_id: string;
  chat_id: string;
  pinned_by: string;
  pinned_at: string | Date;
  content_snapshot: string;
  sender_display_name_snapshot: string | null;
};

export async function loadGroupedReactionsForMessageIds(
  db: Queryable,
  messageIds: string[]
): Promise<Map<string, MessageReaction[]>> {
  if (messageIds.length === 0) {
    return new Map();
  }

  const result = await db.query(
    `SELECT mr.message_id,
            mr.emoji,
            ARRAY_AGG(mr.user_id ORDER BY mr.created_at ASC, mr.user_id ASC) AS user_ids
     FROM message_reactions mr
     WHERE mr.message_id = ANY($1::uuid[])
     GROUP BY mr.message_id, mr.emoji
     ORDER BY mr.message_id ASC, mr.emoji ASC`,
    [messageIds]
  );

  const grouped = new Map<string, MessageReaction[]>();
  for (const row of result.rows as ReactionRow[]) {
    const current = grouped.get(row.message_id) ?? [];
    current.push(
      MessageReactionSchema.parse({
        emoji: row.emoji,
        userIds: row.user_ids ?? []
      })
    );
    grouped.set(row.message_id, current);
  }

  return grouped;
}

export async function hydrateMessageReactions(db: Queryable, messages: Message[]): Promise<Message[]> {
  const visibleMessageIds = messages
    .filter((message) => !message.hidden && !message.deletedAt)
    .map((message) => message.id);
  if (visibleMessageIds.length === 0) {
    return messages;
  }

  const grouped = await loadGroupedReactionsForMessageIds(db, visibleMessageIds);
  return messages.map((message) => {
    if (message.hidden || message.deletedAt) return message;
    const reactions = grouped.get(message.id);
    if (!reactions?.length) return message;
    return {
      ...message,
      reactions
    };
  });
}

export async function buildReplySnapshot(
  db: Queryable,
  chatId: string,
  replyToMessageId: string
): Promise<{ replyToMessageId: string; replyToSnapshot: ReplyTo } | null> {
  const result = await db.query(
    `SELECT m.id, m.content, u.display_name AS sender_display_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.id = $1
       AND m.chat_id = $2
       AND u.status = 'active'
       AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
       AND m.deleted_at IS NULL`,
    [replyToMessageId, chatId]
  );

  const row = (result.rows[0] as ReplySnapshotRow | undefined) ?? null;
  if (!row) {
    return null;
  }

  return {
    replyToMessageId,
    replyToSnapshot: ReplyToSchema.parse({
      id: row.id,
      content: row.content,
      senderDisplayName: row.sender_display_name
    })
  };
}

export function toPinnedMessage(row: PinnedMessageRow): PinnedMessage {
  return PinnedMessageSchema.parse({
    messageId: row.message_id,
    chatId: row.chat_id,
    pinnedByUserId: row.pinned_by,
    pinnedAt: new Date(row.pinned_at).toISOString(),
    content: row.content_snapshot,
    senderDisplayName: row.sender_display_name_snapshot
  });
}
