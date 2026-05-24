import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/pool.js';
import { chatMembers, chats } from '../../db/schema.js';
import { avatarUrlFromMediaId } from '../../utils/users.js';
import { loadChatListDecorations } from './shared.js';

export async function registerChatListRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/chats', { preHandler: fastify.authenticate }, async (request) => {
    const viewerUserId = request.authUser!.userId;
    const rows = await db.select({
      chat: chats,
      member: chatMembers
    })
      .from(chatMembers)
      .innerJoin(chats, eq(chatMembers.chatId, chats.id))
      .where(and(
        eq(chatMembers.userId, request.authUser!.userId),
        isNull(chats.parentChatId)
      ))
      .orderBy(sql`${chats.updatedAt} DESC`);

    const chatIds = rows.map((row) => row.chat.id);
    const dmChatIds = rows.filter((row) => row.chat.type === 'dm').map((row) => row.chat.id);
    const { unreadCounts, dmCounterparts } = await loadChatListDecorations(chatIds, dmChatIds, viewerUserId);

    const summaries = [];
    for (const row of rows) {
      let name = row.chat.name;
      let counterpartMemberId: string | undefined;
      let counterpartAvatarUrl: string | null | undefined;

      if (row.chat.type === 'dm') {
        const other = dmCounterparts.get(row.chat.id);
        if (other) {
          name = other.displayName;
          counterpartMemberId = other.id;
          counterpartAvatarUrl = avatarUrlFromMediaId(other.avatarMediaId);
        }
      }

      summaries.push({
        id: row.chat.id,
        type: row.chat.type,
        name,
        role: row.member.role,
        updatedAt: row.chat.updatedAt.toISOString(),
        archivedAt: row.member.archivedAt?.toISOString() ?? null,
        unreadCount: unreadCounts.get(row.chat.id) ?? 0,
        counterpartMemberId,
        counterpartAvatarUrl,
        notificationsMuted: row.member.notificationsMuted
      });
    }

    return { chats: summaries };
  });
}
