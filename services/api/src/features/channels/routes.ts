import { eq, asc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { CreateChannelRequestSchema } from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chats, chatMembers } from '../../db/schema.js';
import { assertChatMember } from '../../utils/messages.js';
import { notFound } from '../../utils/error-responses.js';
import { appendSyncEvent } from '../sync/service.js';

function serializeChannel(row: typeof chats.$inferSelect) {
  return {
    id: row.id,
    parentChatId: row.parentChatId!,
    name: row.name,
    createdAt: row.createdAt.toISOString()
  };
}

async function resolveChannelParent(chatId: string) {
  const [chat] = await db.select({
    id: chats.id,
    parentChatId: chats.parentChatId
  }).from(chats).where(eq(chats.id, chatId)).limit(1);
  if (!chat) throw notFound('Chat not found');
  return chat.parentChatId ?? chat.id;
}

export async function registerChannelRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/:id/channels', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const parentChatId = await resolveChannelParent(chatId);
    const body = CreateChannelRequestSchema.parse(request.body);

    const [channel] = await db.insert(chats).values({
      type: 'channel',
      name: body.name,
      parentChatId
    }).returning();

    const parentMembers = await db.select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, parentChatId));

    if (parentMembers.length > 0) {
      await db.insert(chatMembers).values(
        parentMembers.map((m) => ({ chatId: channel.id, userId: m.userId }))
      );
    }

    const serialized = serializeChannel(channel);
    await appendSyncEvent({
      scope: 'chat',
      chatId: channel.id,
      actorUserId: request.authUser!.userId,
      entityId: channel.id,
      op: { type: 'channel.upsert', payload: serialized }
    });
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
