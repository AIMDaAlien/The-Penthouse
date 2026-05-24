import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { AddChatMemberRequestSchema } from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chatMembers, chats, users } from '../../db/schema.js';
import { appendMemberAddedSync } from '../../features/chats/sync.js';
import {
  assertNotLastOwner,
  childChannels,
  requireChatManager,
  resolveChatHierarchy,
  rootMember
} from '../../utils/chat-management.js';
import { badRequest, forbidden, notFound } from '../../utils/error-responses.js';
import { assertChatMember } from '../../utils/messages.js';
import { avatarUrlFromMediaId, bannerUrlFromMediaId } from '../../utils/users.js';
import { removeMemberFromGroup } from './shared.js';

export async function registerChatMemberRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/:id/members', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = AddChatMemberRequestSchema.parse(request.body);
    const { root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);

    const [user] = await db.select().from(users).where(eq(users.id, body.memberId)).limit(1);
    if (!user) throw notFound('User not found');

    const existingMember = await rootMember(root.id, body.memberId);
    if (existingMember?.role === 'owner' && body.role !== 'owner') {
      await assertNotLastOwner(root.id, existingMember);
    }

    const channels = await childChannels(root.id);
    const { member } = await db.transaction(async (tx) => {
      const [rootRow] = await tx.insert(chatMembers).values({
        chatId: root.id,
        userId: body.memberId,
        role: body.role
      }).onConflictDoUpdate({
        target: [chatMembers.chatId, chatMembers.userId],
        set: { role: body.role }
      }).returning();

      if (channels.length > 0) {
        await tx.insert(chatMembers).values(
          channels.map((channel) => ({ chatId: channel.id, userId: body.memberId }))
        ).onConflictDoNothing();
      }

      await appendMemberAddedSync(root, rootRow, channels, request.authUser!.userId, tx);

      return { member: rootRow };
    });

    fastify.io.to(`user:${body.memberId}`).emit('chat.sync_required', {
      type: 'chat.sync_required',
      payload: { chatId: root.id, reason: 'member.added' }
    });

    return { member: { id: user.id, username: user.username, displayName: user.displayName, role: member.role } };
  });

  fastify.delete('/api/v1/chats/:id/members/:memberId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string; memberId: string };
    const { root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);
    if (params.memberId === request.authUser!.userId) throw badRequest('Use the leave endpoint to remove yourself');

    const member = await rootMember(root.id, params.memberId);
    if (!member) throw notFound('Chat member not found');
    await removeMemberFromGroup(root.id, member, request.authUser!.userId);

    fastify.io.to(`user:${params.memberId}`).emit('chat.sync_required', {
      type: 'chat.sync_required',
      payload: { chatId: root.id, reason: 'member.removed' }
    });

    return { success: true };
  });

  fastify.post('/api/v1/chats/:id/leave', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { root } = await resolveChatHierarchy(params.id);
    if (root.type !== 'group') throw badRequest('Only group chats can be left');

    const member = await rootMember(root.id, request.authUser!.userId);
    if (!member) throw forbidden('You are not a member of this chat', 'CHAT_FORBIDDEN');
    await removeMemberFromGroup(root.id, member, request.authUser!.userId);

    return { success: true };
  });

  fastify.get('/api/v1/chats/:id/members', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);

    // Child channels mirror parent membership.
    const [chat] = await db.select({ parentChatId: chats.parentChatId })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);
    const rootChatId = chat?.parentChatId ?? chatId;

    const rows = await db.select({ user: users, member: chatMembers })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(eq(chatMembers.chatId, rootChatId))
      .orderBy(users.displayName);

    return {
      members: rows.map(({ user, member }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: avatarUrlFromMediaId(user.avatarMediaId),
        bio: user.bio,
        timezone: user.timezone,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        profileStyle: user.profileStyle,
        bannerMediaId: user.bannerMediaId,
        bannerUrl: bannerUrlFromMediaId(user.bannerMediaId, user.bannerUrl),
        role: member.role
      }))
    };
  });
}
