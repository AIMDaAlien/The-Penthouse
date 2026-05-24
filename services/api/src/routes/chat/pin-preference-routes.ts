import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  ChatPreferencesRequestSchema,
  PinMessageRequestSchema
} from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { chatMembers } from '../../db/schema.js';
import { assertChatMember } from '../../utils/messages.js';
import { emitToChatMembers } from './shared.js';
import {
  listPinnedMessages,
  pinMessage,
  unpinMessage
} from '../../features/pins/service.js';
import { appendReadStateForMember } from '../../features/chats/sync.js';

export async function registerChatPinPreferenceRoutes(fastify: FastifyInstance) {
  fastify.patch('/api/v1/chats/:id/preferences', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = ChatPreferencesRequestSchema.parse(request.body);
    const [member] = await db.update(chatMembers)
      .set({ notificationsMuted: body.notificationsMuted, notificationsMutedUpdatedAt: new Date() })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, request.authUser!.userId)))
      .returning();

    await appendReadStateForMember(member, request.authUser!.userId);

    return {
      chatId,
      notificationsMuted: member.notificationsMuted,
      updatedAt: member.notificationsMutedUpdatedAt.toISOString()
    };
  });

  fastify.post('/api/v1/chats/:id/pins', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = PinMessageRequestSchema.parse(request.body);
    const payload = await pinMessage({
      chatId: params.id,
      messageId: body.messageId,
      actorUserId: request.authUser!.userId
    });
    await emitToChatMembers(fastify, payload.chatId, 'message.pinned', {
      type: 'message.pinned',
      payload
    });

    return { pin: payload };
  });

  fastify.delete('/api/v1/chats/:id/pins/:messageId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string; messageId: string };
    const payload = await unpinMessage({
      chatId: params.id,
      messageId: params.messageId,
      actorUserId: request.authUser!.userId,
      actorRole: request.authUser!.role
    });
    await emitToChatMembers(fastify, payload.chatId, 'message.unpinned', {
      type: 'message.unpinned',
      payload
    });
    return { success: true };
  });

  fastify.get('/api/v1/chats/:id/pins', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    return { pins: await listPinnedMessages(params.id, request.authUser!.userId) };
  });

  fastify.post('/api/v1/chats/:chatId/messages/:messageId/pin', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { chatId: string; messageId: string };
    const payload = await pinMessage({
      chatId: params.chatId,
      messageId: params.messageId,
      actorUserId: request.authUser!.userId
    });
    await emitToChatMembers(fastify, payload.chatId, 'message.pinned', {
      type: 'message.pinned',
      payload
    });
    return { pin: payload };
  });

  fastify.delete('/api/v1/chats/:chatId/messages/:messageId/pin', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { chatId: string; messageId: string };
    const payload = await unpinMessage({
      chatId: params.chatId,
      messageId: params.messageId,
      actorUserId: request.authUser!.userId,
      actorRole: request.authUser!.role
    });
    await emitToChatMembers(fastify, payload.chatId, 'message.unpinned', {
      type: 'message.unpinned',
      payload
    });
    return reply.status(204).send();
  });
}
