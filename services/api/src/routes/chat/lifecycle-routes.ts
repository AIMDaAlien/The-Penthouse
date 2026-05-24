import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  CreateDirectChatRequestSchema,
  CreateGroupChatRequestSchema,
  UpdateChatRequestSchema
} from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chatMembers, chats, directChats, users } from '../../db/schema.js';
import { buildChatSummaryForUser } from '../../features/sync/service.js';
import {
  appendChannelDeleteForMembers,
  appendChannelUpsertForChat,
  appendChatDeleteForMemberWithChannels,
  appendChatSummaryForMembers
} from '../../features/chats/sync.js';
import {
  childChannels,
  requireChatManager,
  resolveChatHierarchy,
  serializeChannel
} from '../../utils/chat-management.js';
import { badRequest, notFound } from '../../utils/error-responses.js';
import { setArchivedAt } from './shared.js';

export async function registerChatLifecycleRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/dm', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateDirectChatRequestSchema.parse(request.body);
    const memberId = body.memberId;
    const myId = request.authUser!.userId;

    if (memberId === myId) throw badRequest('Cannot create a DM with yourself');

    const [otherUser] = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
    if (!otherUser) throw notFound('User not found');

    const firstUserId = myId < memberId ? myId : memberId;
    const secondUserId = myId < memberId ? memberId : myId;

    const [existing] = await db.select().from(directChats)
      .where(and(eq(directChats.firstUserId, firstUserId), eq(directChats.secondUserId, secondUserId)))
      .limit(1);

    if (existing) {
      return { chatId: existing.chatId, id: existing.chatId };
    }

    const [chat] = await db.insert(chats).values({
      type: 'dm',
      name: otherUser.displayName
    }).returning();

    await db.insert(chatMembers).values([
      { chatId: chat.id, userId: myId },
      { chatId: chat.id, userId: memberId }
    ]);

    await db.insert(directChats).values({
      chatId: chat.id,
      firstUserId,
      secondUserId
    });

    const memberRows = await db.select().from(chatMembers).where(eq(chatMembers.chatId, chat.id));
    await appendChatSummaryForMembers(chat, memberRows, myId);

    return { chatId: chat.id, id: chat.id };
  });

  fastify.post('/api/v1/chats/group', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateGroupChatRequestSchema.parse(request.body);
    const myId = request.authUser!.userId;
    const memberIds = [...new Set(body.memberIds.filter((id) => id !== myId))];

    if (memberIds.length > 0) {
      const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, memberIds));
      if (found.length !== memberIds.length) throw notFound('One or more users were not found');
    }

    const { chat, members } = await db.transaction(async (tx) => {
      const [created] = await tx.insert(chats).values({
        type: 'group',
        name: body.name
      }).returning();

      const values = [
        { chatId: created.id, userId: myId, role: 'owner' as const },
        ...memberIds.map((memberId) => ({ chatId: created.id, userId: memberId, role: 'member' as const }))
      ];
      const insertedMembers = await tx.insert(chatMembers).values(values).returning();

      await appendChatSummaryForMembers(created, insertedMembers, myId, tx);
      return { chat: created, members: insertedMembers };
    });

    for (const member of members) {
      fastify.io.to(`user:${member.userId}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: chat.id, reason: 'group.created' }
      });
    }

    const ownMember = members.find((member) => member.userId === myId)!;
    return { chat: await buildChatSummaryForUser(chat, ownMember, myId) };
  });

  fastify.patch('/api/v1/chats/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = UpdateChatRequestSchema.parse(request.body);
    const { chat, root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);
    if (chat.type === 'dm') throw badRequest('DMs cannot be renamed');

    const [updated] = await db.update(chats)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(chats.id, chat.id))
      .returning();

    if (updated.type === 'channel') {
      const serialized = serializeChannel(updated);
      await appendChannelUpsertForChat(updated, request.authUser!.userId);
      fastify.io.to(`chat:${updated.id}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: root.id, reason: 'channel.renamed' }
      });
      return { channel: serialized };
    }

    const memberRows = await db.select().from(chatMembers).where(eq(chatMembers.chatId, updated.id));
    await appendChatSummaryForMembers(updated, memberRows, request.authUser!.userId);
    for (const member of memberRows) {
      fastify.io.to(`user:${member.userId}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: updated.id, reason: 'group.renamed' }
      });
    }

    const viewerMember = memberRows.find((member) => member.userId === request.authUser!.userId) ?? memberRows[0];
    return { chat: await buildChatSummaryForUser(updated, viewerMember, request.authUser!.userId) };
  });

  fastify.delete('/api/v1/chats/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chat, root } = await resolveChatHierarchy(params.id);

    if (chat.type === 'dm') {
      return setArchivedAt(chat.id, request.authUser!.userId, request.authUser!.userId, new Date());
    }

    await requireChatManager(chat.id, request.authUser!.userId, request.authUser!.role);

    if (chat.type === 'channel') {
      const memberRows = await db.select({ userId: chatMembers.userId })
        .from(chatMembers)
        .where(eq(chatMembers.chatId, chat.id));

      await db.transaction(async (tx) => {
        await tx.delete(chats).where(eq(chats.id, chat.id));
        await appendChannelDeleteForMembers(chat.id, root.id, memberRows, request.authUser!.userId, tx);
      });

      return { chatId: chat.id, deletedAt: new Date().toISOString() };
    }

    const channels = await childChannels(chat.id);
    const memberRows = await db.select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chat.id));

    await db.transaction(async (tx) => {
      await tx.delete(chats).where(eq(chats.id, chat.id));
      for (const member of memberRows) {
        await appendChatDeleteForMemberWithChannels(chat.id, channels, member, request.authUser!.userId, tx);
      }
    });

    return { chatId: chat.id, deletedAt: new Date().toISOString() };
  });

  fastify.post('/api/v1/chats/:id/archive', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    return setArchivedAt(params.id, request.authUser!.userId, request.authUser!.userId, new Date());
  });

  fastify.post('/api/v1/chats/:id/unarchive', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    return setArchivedAt(params.id, request.authUser!.userId, request.authUser!.userId, null);
  });
}
