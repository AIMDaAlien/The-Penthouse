import type { FastifyInstance } from 'fastify';
import { MarkChatReadRequestSchema } from '@penthouse/contracts';
import {
  markChatRead,
  unreadCount
} from '../../utils/messages.js';
import { emitToChatMembers } from './shared.js';

export async function registerChatReadRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/:id/read', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = MarkChatReadRequestSchema.parse(request.body);
    const read = await markChatRead({
      chatId: params.id,
      userId: request.authUser!.userId,
      throughMessageId: body.throughMessageId
    });

    await emitToChatMembers(fastify, read.chatId, 'message.read', {
      type: 'message.read',
      payload: {
        chatId: read.chatId,
        readerUserId: request.authUser!.userId,
        seenAt: read.member.lastReadAt.toISOString(),
        seenThroughMessageId: read.messageId
      }
    });

    return {
      chatId: read.chatId,
      unreadCount: await unreadCount(read.chatId, request.authUser!.userId),
      lastReadAt: read.member.lastReadAt.toISOString(),
      seenThroughMessageId: read.messageId
    };
  });
}
