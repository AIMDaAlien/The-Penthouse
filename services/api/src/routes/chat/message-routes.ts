import { and, desc, eq, ilike } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  EditMessageRequestSchema,
  SendMessageRequestSchema
} from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import { messages } from '../../db/schema.js';
import { badRequest } from '../../utils/error-responses.js';
import {
  addMessageReaction,
  assertChatMember,
  deleteMessage,
  editMessage,
  hydrateMessages,
  listMessages,
  removeMessageReaction
} from '../../utils/messages.js';
import { sendChatMessage } from '../../features/messages/send.js';
import { emitToChatMembers } from './shared.js';
import { sanitizeMessageContent } from '../../utils/sanitize.js';

const MAX_SEARCH_LENGTH = 100;

export async function registerChatMessageRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/chats/:id/messages', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { before?: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    return { messages: await listMessages(chatId, request.authUser!.userId, query.before) };
  });

  fastify.get('/api/v1/chats/:id/messages/search', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { q?: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const searchTerm = (query.q ?? '').trim();
    if (!searchTerm) return { messages: [] };
    if (searchTerm.length > MAX_SEARCH_LENGTH) {
      throw badRequest(`Search query too long (max ${MAX_SEARCH_LENGTH} characters)`);
    }

    const rows = await db.select({ id: messages.id })
      .from(messages)
      .where(and(
        eq(messages.chatId, chatId),
        ilike(messages.content, `%${searchTerm}%`)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    return { messages: await hydrateMessages(rows.map((row) => row.id), request.authUser!.userId) };
  });

  fastify.post('/api/v1/chats/:id/messages', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = SendMessageRequestSchema.parse({ ...(request.body as object), chatId });
    return sendChatMessage({
      chatId,
      senderId: request.authUser!.userId,
      content: sanitizeMessageContent(body.content),
      messageType: body.type,
      metadata: body.metadata,
      replyToMessageId: body.replyToMessageId,
      clientMessageId: body.clientMessageId,
      delivery: {
        roomEmitter: fastify.io.to(`chat:${chatId}`)
      }
    });
  });

  fastify.patch('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = EditMessageRequestSchema.parse(request.body);
    const result = await editMessage({
      messageId: params.id,
      editorUserId: request.authUser!.userId,
      content: sanitizeMessageContent(body.content)
    });

    fastify.io.to(`chat:${result.chatId}`).emit('message.edited', {
      type: 'message.edited',
      payload: result.event
    });

    return { message: result.message };
  });

  fastify.delete('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const deletion = await deleteMessage({
      messageId: params.id,
      actorUserId: request.authUser!.userId,
      actorRole: request.authUser!.role
    });

    fastify.io.to(`chat:${deletion.chatId}`).emit('message.deleted', {
      type: 'message.deleted',
      payload: deletion
    });

    return {
      messageId: deletion.messageId,
      deletedAt: deletion.deletedAt,
      deletedByUserId: deletion.deletedByUserId
    };
  });

  fastify.post('/api/v1/messages/:id/reactions', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { emoji?: string };
    if (!body.emoji) throw badRequest('emoji is required');
    const payload = await addMessageReaction({
      messageId: params.id,
      userId: request.authUser!.userId,
      emoji: body.emoji
    });
    await emitToChatMembers(fastify, payload.chatId, 'reaction.add', {
      type: 'reaction.add',
      payload
    });
    return reply.status(204).send();
  });

  fastify.post('/api/v1/chats/:chatId/messages/:messageId/reactions', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { chatId: string; messageId: string };
    const body = request.body as { emoji?: string };
    if (!body.emoji) throw badRequest('emoji is required');
    await assertChatMember(params.chatId, request.authUser!.userId);
    const payload = await addMessageReaction({
      messageId: params.messageId,
      userId: request.authUser!.userId,
      emoji: body.emoji
    });
    fastify.io.to(`chat:${payload.chatId}`).emit('reaction.add', {
      type: 'reaction.add',
      payload
    });
    return { reaction: payload };
  });

  fastify.delete('/api/v1/chats/:chatId/messages/:messageId/reactions/:emoji', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { chatId: string; messageId: string; emoji: string };
    await assertChatMember(params.chatId, request.authUser!.userId);
    const payload = await removeMessageReaction({
      messageId: params.messageId,
      userId: request.authUser!.userId,
      emoji: decodeURIComponent(params.emoji)
    });
    await emitToChatMembers(fastify, payload.chatId, 'reaction.remove', {
      type: 'reaction.remove',
      payload
    });
    return reply.status(204).send();
  });
}
