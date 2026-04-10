import type { Message, MessageReadReceipt } from '@penthouse/contracts';
import type { Queryable } from './users.js';

type ReadMarkerRow = {
  id: string;
  created_at: string | Date;
};

type MembershipReadRow = {
  last_read_at: string | Date | null;
  last_read_message_id: string | null;
};

type ReadReceiptRow = {
  message_id: string;
  user_id: string;
  read_at: string | Date;
};

type MarkChatReadResult = {
  advanced: boolean;
  lastReadAt: string | null;
  unreadCount: number;
  seenThroughMessageId: string | null;
};

type ChatMemberReadStateRow = {
  user_id: string;
  last_read_at: string | Date | null;
  last_read_message_id: string | null;
};

async function getVisibleReadMarker(
  db: Queryable,
  chatId: string,
  throughMessageId?: string
): Promise<ReadMarkerRow | null> {
  if (throughMessageId) {
    const target = await db.query(
      `SELECT m.id, m.created_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
         AND m.id = $2
         AND u.status = 'active'
         AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE`,
      [chatId, throughMessageId]
    );
    return (target.rows[0] as ReadMarkerRow | undefined) ?? null;
  }

  const latest = await db.query(
    `SELECT m.id, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
       AND u.status = 'active'
       AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
     ORDER BY m.created_at DESC
     LIMIT 1`,
    [chatId]
  );

  return (latest.rows[0] as ReadMarkerRow | undefined) ?? null;
}

export async function markChatRead(
  db: Queryable,
  chatId: string,
  userId: string,
  throughMessageId?: string
): Promise<MarkChatReadResult> {
  const membership = await db.query(
    `SELECT last_read_at, last_read_message_id
     FROM chat_members
     WHERE chat_id = $1 AND user_id = $2
     FOR UPDATE`,
    [chatId, userId]
  );

  if (!membership.rowCount) {
    throw new Error('Forbidden');
  }

  const current = membership.rows[0] as MembershipReadRow;
  const currentLastReadAt = current.last_read_at ? new Date(current.last_read_at) : null;
  const readMarker = await getVisibleReadMarker(db, chatId, throughMessageId);
  const markerCreatedAt = readMarker?.created_at ? new Date(readMarker.created_at) : null;
  const advanced = Boolean(markerCreatedAt && (!currentLastReadAt || markerCreatedAt > currentLastReadAt));
  const nextReadAt = new Date();
  const effectiveReadAt = advanced ? nextReadAt : (currentLastReadAt ?? nextReadAt);
  const effectiveThroughMessageId = advanced
    ? (readMarker?.id ?? null)
    : (current.last_read_message_id ?? null);

  if (advanced) {
    await db.query(
      `UPDATE chat_members
       SET last_read_at = $1,
           last_read_message_id = $2
       WHERE chat_id = $3 AND user_id = $4`,
      [nextReadAt.toISOString(), readMarker?.id ?? null, chatId, userId]
    );
  }

  const unread = await db.query(
    `SELECT COUNT(*)::int AS unread_count
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
       AND m.sender_id <> $2
       AND u.status = 'active'
       AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
       AND m.created_at > $3`,
    [chatId, userId, effectiveReadAt.toISOString()]
  );

  return {
    advanced,
    lastReadAt: effectiveReadAt.toISOString(),
    unreadCount: Number(unread.rows[0]?.unread_count ?? 0),
    seenThroughMessageId: effectiveThroughMessageId
  };
}

export async function hydrateMessageReadReceipts(
  db: Queryable,
  currentUserId: string,
  messages: Message[]
): Promise<Message[]> {
  const sentMessageIds = messages.filter((message) => message.senderId === currentUserId).map((message) => message.id);
  if (sentMessageIds.length === 0) {
    return messages;
  }

  const receiptResult = await db.query(
    `SELECT m.id AS message_id,
            cm.user_id,
            cm.last_read_at AS read_at
     FROM messages m
     JOIN chat_members cm ON cm.chat_id = m.chat_id
     JOIN messages read_marker ON read_marker.id = cm.last_read_message_id
     JOIN users u_seen ON u_seen.id = cm.user_id
     WHERE m.id = ANY($1::uuid[])
       AND m.sender_id = $2
       AND cm.user_id <> m.sender_id
       AND cm.last_read_at IS NOT NULL
       AND read_marker.created_at >= m.created_at
       AND u_seen.status = 'active'
     ORDER BY cm.last_read_at DESC`,
    [sentMessageIds, currentUserId]
  );

  const receiptsByMessageId = new Map<string, MessageReadReceipt[]>();
  for (const row of receiptResult.rows as ReadReceiptRow[]) {
    const current = receiptsByMessageId.get(row.message_id) ?? [];
    current.push({
      userId: row.user_id,
      readAt: new Date(row.read_at).toISOString()
    });
    receiptsByMessageId.set(row.message_id, current);
  }

  return messages.map((message) => {
    const readReceipts = receiptsByMessageId.get(message.id);
    if (!readReceipts) return message;
    return {
      ...message,
      readReceipts
    };
  });
}

export async function listChatMemberReadStates(
  db: Queryable,
  chatId: string
): Promise<Array<{ userId: string; lastReadAt: string | null; seenThroughMessageId: string | null }>> {
  const result = await db.query(
    `SELECT cm.user_id,
            cm.last_read_at,
            cm.last_read_message_id
     FROM chat_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.chat_id = $1
       AND u.status = 'active'
     ORDER BY cm.user_id ASC`,
    [chatId]
  );

  return (result.rows as ChatMemberReadStateRow[]).map((row) => ({
    userId: row.user_id,
    lastReadAt: row.last_read_at ? new Date(row.last_read_at).toISOString() : null,
    seenThroughMessageId: row.last_read_message_id ?? null
  }));
}
