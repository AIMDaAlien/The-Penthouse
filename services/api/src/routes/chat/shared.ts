import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db, pool } from '../../db/pool.js';
import { chatMembers, chats } from '../../db/schema.js';
import {
  appendChatDeleteForMemberWithChannels,
  appendReadStateForMember
} from '../../features/chats/sync.js';
import { assertNotLastOwner, childChannels, type ChatMemberRow } from '../../utils/chat-management.js';
import { assertChatMember } from '../../utils/messages.js';

type ChatMember = typeof chatMembers.$inferSelect;

export type ChatListDecorations = {
  unreadCounts: Map<string, number>;
  dmCounterparts: Map<string, {
    id: string;
    displayName: string;
    avatarMediaId: string | null;
  }>;
};

export async function setArchivedAt(chatId: string, userId: string, actorUserId: string, archivedAt: Date | null) {
  const { chatId: resolvedChatId } = await assertChatMember(chatId, userId);
  const [member] = await db.update(chatMembers)
    .set({ archivedAt })
    .where(and(eq(chatMembers.chatId, resolvedChatId), eq(chatMembers.userId, userId)))
    .returning();

  await appendReadStateForMember(member, actorUserId);

  return {
    chatId: resolvedChatId,
    archivedAt: member.archivedAt?.toISOString() ?? null
  };
}

export async function loadChatListDecorations(
  chatIds: string[],
  dmChatIds: string[],
  viewerUserId: string
): Promise<ChatListDecorations> {
  const unreadCounts = new Map<string, number>();
  const dmCounterparts = new Map<string, {
    id: string;
    displayName: string;
    avatarMediaId: string | null;
  }>();

  if (chatIds.length > 0) {
    const unreadRows = await pool.query<{
      chat_id: string;
      unread_count: number;
    }>(`
      SELECT cm.chat_id, count(m.id)::int AS unread_count
      FROM chat_members cm
      LEFT JOIN messages read_message
        ON read_message.id = cm.last_read_message_id
      LEFT JOIN messages m
        ON m.chat_id = cm.chat_id
       AND m.sender_id <> $2
       AND (
         cm.last_read_message_id IS NULL
         OR read_message.id IS NULL
         OR m.created_at > read_message.created_at
       )
      WHERE cm.user_id = $2
        AND cm.chat_id = ANY($1::uuid[])
      GROUP BY cm.chat_id
    `, [chatIds, viewerUserId]);

    for (const row of unreadRows.rows) {
      unreadCounts.set(row.chat_id, row.unread_count);
    }
  }

  if (dmChatIds.length > 0) {
    const counterpartRows = await pool.query<{
      chat_id: string;
      id: string;
      display_name: string;
      avatar_media_id: string | null;
    }>(`
      SELECT cm.chat_id, u.id, u.display_name, u.avatar_media_id
      FROM chat_members cm
      INNER JOIN users u ON u.id = cm.user_id
      WHERE cm.chat_id = ANY($1::uuid[])
        AND cm.user_id <> $2
    `, [dmChatIds, viewerUserId]);

    for (const row of counterpartRows.rows) {
      dmCounterparts.set(row.chat_id, {
        id: row.id,
        displayName: row.display_name,
        avatarMediaId: row.avatar_media_id
      });
    }
  }

  return { unreadCounts, dmCounterparts };
}

export async function removeMemberFromGroup(rootChatId: string, member: ChatMemberRow, actorUserId: string) {
  await assertNotLastOwner(rootChatId, member);
  const channels = await childChannels(rootChatId);
  const channelIds = channels.map((channel) => channel.id);
  const chatIds = [rootChatId, ...channelIds];

  await db.transaction(async (tx) => {
    await tx.delete(chatMembers)
      .where(and(eq(chatMembers.userId, member.userId), inArray(chatMembers.chatId, chatIds)));

    await appendChatDeleteForMemberWithChannels(rootChatId, channels, member, actorUserId, tx);
  });
}

export async function emitToChatMembers(
  fastify: FastifyInstance,
  chatId: string,
  event: string,
  payload: unknown
) {
  const members = await db.select({ userId: chatMembers.userId })
    .from(chatMembers)
    .where(eq(chatMembers.chatId, chatId));
  for (const member of members) {
    fastify.io.to(`user:${member.userId}`).emit(event, payload);
  }
}
