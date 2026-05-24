import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  CreatePollRequestSchema,
  VotePollRequestSchema
} from '@penthouse/contracts';
import { db, pool } from '../../db/pool.js';
import { messages } from '../../db/schema.js';
import { badRequest, forbidden, notFound } from '../../utils/error-responses.js';
import {
  assertChatMember,
  createMessage,
  hydrateMessage
} from '../../utils/messages.js';
import { createPollRecords, loadPollVoteContext, recordPollVote } from '../../utils/polls.js';
import { deliverChatMessage } from '../../features/messages/send.js';
import { emitToChatMembers } from './shared.js';

export async function registerChatPollRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/:id/polls', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = CreatePollRequestSchema.parse(request.body);
    const result = await createMessage({
      chatId,
      senderId: request.authUser!.userId,
      content: body.question,
      messageType: 'poll',
      metadata: null,
      clientMessageId: `poll:${randomUUID()}`
    });
    const poll = await createPollRecords(pool, {
      chatId,
      messageId: result.message.id,
      createdByUserId: request.authUser!.userId,
      question: body.question,
      options: body.options,
      multiSelect: body.multiSelect,
      expiresAt: body.expiresAt
    });
    await db.update(messages).set({ metadata: poll }).where(eq(messages.id, result.message.id));
    const message = await hydrateMessage(result.message.id, request.authUser!.userId);

    deliverChatMessage({
      message,
      senderId: request.authUser!.userId,
      delivery: {
        roomEmitter: fastify.io.to(`chat:${chatId}`)
      }
    });

    return { message };
  });

  fastify.post('/api/v1/polls/:pollId/vote', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { pollId: string };
    const body = VotePollRequestSchema.parse(request.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const context = await loadPollVoteContext(client, params.pollId, request.authUser!.userId);
      if (!context) throw notFound('Poll not found');
      if (!context.isMember) throw forbidden('You are not a member of this chat', 'CHAT_FORBIDDEN');
      if (context.expiresAt && new Date(context.expiresAt) <= new Date()) throw badRequest('Poll has expired', 'POLL_EXPIRED');
      const optionId = context.optionIdsByIndex.get(body.optionIndex);
      if (!optionId) throw badRequest('Invalid poll option', 'POLL_OPTION_INVALID');
      const { poll } = await recordPollVote(client, {
        pollId: params.pollId,
        userId: request.authUser!.userId,
        optionId,
        multiSelect: context.multiSelect,
        existingOptionIds: context.existingOptionIds
      });
      await client.query('COMMIT');

      await emitToChatMembers(fastify, context.chatId, 'poll.voted', {
        type: 'poll.voted',
        payload: {
          chatId: context.chatId,
          pollId: params.pollId,
          userId: request.authUser!.userId,
          poll
        }
      });

      return { poll };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error instanceof Error && error.message === 'You have already voted on this poll') {
        throw badRequest(error.message, 'POLL_ALREADY_VOTED');
      }
      throw error;
    } finally {
      client.release();
    }
  });
}
