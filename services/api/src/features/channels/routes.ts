import { eq, asc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { CreateChannelRequestSchema } from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chats, chatMembers } from '../../db/schema.js';
import { assertChatMember } from '../../utils/messages.js';
import { badRequest, notFound } from '../../utils/error-responses.js';
import { appendSyncEvent } from '../sync/service.js';
import { serializeChannel } from '../../utils/chat-management.js';

async function resolveChannelParent(chatId: string) {
  const [chat] = await db.select({
    id: chats.id,
    type: chats.type,
    parentChatId: chats.parentChatId
  }).from(chats).where(eq(chats.id, chatId)).limit(1);
  if (!chat) throw notFound('Chat not found');
  if (chat.type === 'dm') throw badRequest('DMs cannot have channels');

  const parentChatId = chat.parentChatId ?? chat.id;
  const [parent] = await db.select({ type: chats.type }).from(chats).where(eq(chats.id, parentChatId)).limit(1);
  if (parent?.type !== 'group') throw badRequest('Channels must belong to a group');
  return parentChatId;
}

export async function registerChannelRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/:id/channels', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const parentChatId = await resolveChannelParent(chatId);
    const body = CreateChannelRequestSchema.parse(request.body);

    const parentMembers = await db.select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, parentChatId));

    const [channel] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(chats).values({
        type: 'channel',
        name: body.name,
        parentChatId
      }).returning();

      if (parentMembers.length > 0) {
        await tx.insert(chatMembers).values(
          parentMembers.map((m) => ({ chatId: created.id, userId: m.userId }))
        );
      }

      const serialized = serializeChannel(created);
      await appendSyncEvent({
        scope: 'chat',
        chatId: created.id,
        actorUserId: request.authUser!.userId,
        entityId: created.id,
        op: { type: 'channel.upsert', payload: serialized }
      }, tx);

      return [created];
    });

    const serialized = serializeChannel(channel);
    const syncEvent = {
      type: 'chat.sync_required',
      payload: { chatId: parentChatId, reason: 'channel.created' }
    };
    for (const member of parentMembers) {
      fastify.io.to(`user:${member.userId}`).emit('chat.sync_required', syncEvent);
    }

    return { channel: serialized };
  });

  fastify.get('/api/v1/chats/:id/channels', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const parentChatId = await resolveChannelParent(chatId);

    const rows = await db.select()
      .from(chats)
      .where(eq(chats.parentChatId, parentChatId))
      .orderBy(asc(chats.createdAt));

    return { channels: rows.map(serializeChannel) };
  });
}
