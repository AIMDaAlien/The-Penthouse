import { ChatSummarySchema, type ChatSummary } from '@penthouse/contracts';
import { avatarUrlFromFileName, type Queryable } from './users.js';

type MemberChatSummaryRow = {
  id: string;
  type: 'dm' | 'channel';
  chat_name: string;
  updated_at: string;
  unread_count: number;
  notifications_muted: boolean;
  counterpart_member_id: string | null;
  counterpart_display_name: string | null;
  counterpart_username: string | null;
  counterpart_avatar_storage_key: string | null;
};

type AdminChatSummaryRow = {
  id: string;
  type: 'dm' | 'channel';
  chat_name: string;
  updated_at: string;
  first_username: string | null;
  second_username: string | null;
};

type ChatSendStateRow = {
  type: 'dm' | 'channel';
  counterpart_status: 'active' | 'removed' | 'banned' | null;
};

function mapMemberChatSummary(row: MemberChatSummaryRow): ChatSummary {
  const isDm = row.type === 'dm';
  const resolvedName = isDm
    ? row.counterpart_display_name || row.counterpart_username || row.chat_name
    : row.chat_name;

  return ChatSummarySchema.parse({
    id: row.id,
    type: row.type,
    name: resolvedName,
    updatedAt: new Date(row.updated_at).toISOString(),
    unreadCount: Number(row.unread_count ?? 0),
    counterpartMemberId: isDm ? row.counterpart_member_id ?? undefined : undefined,
    counterpartAvatarUrl: isDm ? avatarUrlFromFileName(row.counterpart_avatar_storage_key) : undefined,
    notificationsMuted: isDm ? Boolean(row.notifications_muted) : undefined
  });
}

function mapAdminChatSummary(row: AdminChatSummaryRow): ChatSummary {
  const name = row.type === 'dm'
    ? `@${row.first_username ?? 'unknown'} + @${row.second_username ?? 'unknown'}`
    : row.chat_name;

  return ChatSummarySchema.parse({
    id: row.id,
    type: row.type,
    name,
    updatedAt: new Date(row.updated_at).toISOString(),
    unreadCount: 0
  });
}

export function orderDirectChatParticipants(userId: string, counterpartMemberId: string): [string, string] {
  return userId < counterpartMemberId ? [userId, counterpartMemberId] : [counterpartMemberId, userId];
}

export async function listChatSummariesForUser(db: Queryable, userId: string): Promise<ChatSummary[]> {
  const result = await db.query(
    `SELECT c.id,
            c.type,
            c.name AS chat_name,
            c.updated_at,
            COUNT(m.id) FILTER (
              WHERE m.sender_id <> $1
                AND u.status = 'active'
                AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
                AND m.created_at > cm.last_read_at
            )::int AS unread_count,
            cm.notifications_muted,
            counterpart.id AS counterpart_member_id,
            counterpart.display_name AS counterpart_display_name,
            counterpart.username AS counterpart_username,
            counterpart_media.storage_key AS counterpart_avatar_storage_key
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     LEFT JOIN direct_chats dc ON dc.chat_id = c.id
     LEFT JOIN users counterpart
       ON counterpart.id = CASE
         WHEN dc.first_user_id = $1 THEN dc.second_user_id
         WHEN dc.second_user_id = $1 THEN dc.first_user_id
         ELSE NULL
       END
     LEFT JOIN media_uploads counterpart_media ON counterpart_media.id = counterpart.avatar_media_id
     LEFT JOIN messages m ON m.chat_id = c.id
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE cm.user_id = $1
     GROUP BY c.id,
              c.type,
              c.name,
              c.updated_at,
              cm.last_read_at,
              cm.notifications_muted,
              counterpart.id,
              counterpart.display_name,
              counterpart.username,
              counterpart_media.storage_key
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => mapMemberChatSummary(row as MemberChatSummaryRow));
}

export async function getChatSummaryForUser(db: Queryable, userId: string, chatId: string): Promise<ChatSummary | null> {
  const result = await db.query(
    `SELECT c.id,
            c.type,
            c.name AS chat_name,
            c.updated_at,
            COUNT(m.id) FILTER (
              WHERE m.sender_id <> $1
                AND u.status = 'active'
                AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
                AND m.created_at > cm.last_read_at
            )::int AS unread_count,
            cm.notifications_muted,
            counterpart.id AS counterpart_member_id,
            counterpart.display_name AS counterpart_display_name,
            counterpart.username AS counterpart_username,
            counterpart_media.storage_key AS counterpart_avatar_storage_key
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     LEFT JOIN direct_chats dc ON dc.chat_id = c.id
     LEFT JOIN users counterpart
       ON counterpart.id = CASE
         WHEN dc.first_user_id = $1 THEN dc.second_user_id
         WHEN dc.second_user_id = $1 THEN dc.first_user_id
         ELSE NULL
       END
     LEFT JOIN media_uploads counterpart_media ON counterpart_media.id = counterpart.avatar_media_id
     LEFT JOIN messages m ON m.chat_id = c.id
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE cm.user_id = $1
       AND c.id = $2
     GROUP BY c.id,
              c.type,
              c.name,
              c.updated_at,
              cm.last_read_at,
              cm.notifications_muted,
              counterpart.id,
              counterpart.display_name,
              counterpart.username,
              counterpart_media.storage_key`,
    [userId, chatId]
  );

  const row = result.rows[0] as MemberChatSummaryRow | undefined;
  return row ? mapMemberChatSummary(row) : null;
}

export async function listAdminChatSummaries(db: Queryable): Promise<ChatSummary[]> {
  const result = await db.query(
    `SELECT c.id,
            c.type,
            c.name AS chat_name,
            c.updated_at,
            first_user.username AS first_username,
            second_user.username AS second_username
     FROM chats c
     LEFT JOIN direct_chats dc ON dc.chat_id = c.id
     LEFT JOIN users first_user ON first_user.id = dc.first_user_id
     LEFT JOIN users second_user ON second_user.id = dc.second_user_id
     ORDER BY c.updated_at DESC`
  );

  return result.rows.map((row) => mapAdminChatSummary(row as AdminChatSummaryRow));
}

export async function getChatSendState(
  db: Queryable,
  userId: string,
  chatId: string
): Promise<{ isMember: boolean; type: 'dm' | 'channel' | null; isReadOnly: boolean }> {
  const result = await db.query(
    `SELECT c.type,
            counterpart.status AS counterpart_status
     FROM chat_members cm
     JOIN chats c ON c.id = cm.chat_id
     LEFT JOIN direct_chats dc ON dc.chat_id = c.id
     LEFT JOIN users counterpart
       ON counterpart.id = CASE
         WHEN dc.first_user_id = $1 THEN dc.second_user_id
         WHEN dc.second_user_id = $1 THEN dc.first_user_id
         ELSE NULL
       END
     WHERE cm.user_id = $1
       AND cm.chat_id = $2`,
    [userId, chatId]
  );

  const row = result.rows[0] as ChatSendStateRow | undefined;
  if (!row) {
    return {
      isMember: false,
      type: null,
      isReadOnly: false
    };
  }

  return {
    isMember: true,
    type: row.type,
    isReadOnly: row.type === 'dm' && row.counterpart_status !== 'active'
  };
}
