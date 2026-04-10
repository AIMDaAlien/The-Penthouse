import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  AddReactionRequestSchema,
  ChatMemberReadStateSchema,
  ChatPreferencesRequestSchema,
  ChatPreferencesResponseSchema,
  CreatePollRequestSchema,
  CreateDirectChatRequestSchema,
  MarkChatReadRequestSchema,
  MarkChatReadResponseSchema,
  MessageSchema,
  PinMessageRequestSchema,
  PinnedMessageSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  VotePollRequestSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { touchLastSeen } from '../utils/activity.js';
import { REPLY_TARGET_NOT_FOUND_ERROR, loadPersistedMessageById, sendChatMessage } from '../utils/chatMessages.js';
import { formatValidationError } from '../utils/error-responses.js';
import { hydrateMessageReadReceipts, listChatMemberReadStates, markChatRead } from '../utils/messageReads.js';
import { hydrateMessageReactions, loadGroupedReactionsForMessageIds, toPinnedMessage } from '../utils/messageHydration.js';
import { loadMemberMessageById, setMessageModerationState } from '../utils/messageModeration.js';
import { toMemberMessage } from '../utils/messages.js';
import { sendPushForNewMessage } from '../push/fcm.js';
import { createPollRecords, loadPollVoteContext, recordPollVote } from '../utils/polls.js';
import { getUserById } from '../utils/users.js';
import {
  getChatSendState,
  getChatSummaryForUser,
  listChatSummariesForUser,
  orderDirectChatParticipants
} from '../utils/chats.js';

const NOT_A_CHAT_MEMBER_ERROR = 'You are not a member of this chat';

function joinUserSocketsToChat(app: FastifyInstance, chatId: string, userIds: string[]): void {
  const io = app.io as
    | {
        in?: (room: string) => {
          socketsJoin?: (targetRoom: string) => void;
        };
      }
    | undefined;

  if (!io?.in) return;

  const targetRoom = `chat:${chatId}`;
  for (const userId of new Set(userIds)) {
    io.in(`user:${userId}`).socketsJoin?.(targetRoom);
  }
}

async function ensureMembership(userId: string, chatId: string): Promise<boolean> {
  const res = await pool.query('SELECT 1 FROM chat_members WHERE user_id = $1 AND chat_id = $2', [userId, chatId]);
  return Boolean(res.rowCount);
}

type ChatPreferencesRow = {
  chat_id: string;
  notifications_muted: boolean;
  notifications_muted_updated_at: string | Date;
};

function toChatPreferencesResponse(row: ChatPreferencesRow) {
  return ChatPreferencesResponseSchema.parse({
    chatId: row.chat_id,
    notificationsMuted: Boolean(row.notifications_muted),
    updatedAt: new Date(row.notifications_muted_updated_at).toISOString()
  });
}

async function getChatPreferencesForUser(userId: string, chatId: string): Promise<ChatPreferencesRow | null> {
  const result = await pool.query(
    `SELECT chat_id, notifications_muted, notifications_muted_updated_at
     FROM chat_members
     WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );

  if (!result.rowCount) return null;
  return result.rows[0] as ChatPreferencesRow;
}

type ChatMessageContextRow = {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  hidden_by_moderation: boolean;
  sender_status: 'active' | 'removed' | 'banned';
  sender_display_name: string | null;
};

async function getChatMessageContext(chatId: string, messageId: string): Promise<ChatMessageContextRow | null> {
  const result = await pool.query(
    `SELECT m.id AS message_id,
            m.chat_id,
            m.sender_id,
            m.content,
            COALESCE(m.hidden_by_moderation, FALSE) AS hidden_by_moderation,
            u.status AS sender_status,
            u.display_name AS sender_display_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
       AND m.id = $2`,
    [chatId, messageId]
  );

  return (result.rows[0] as ChatMessageContextRow | undefined) ?? null;
}

async function listPinnedMessagesForChat(chatId: string) {
  const result = await pool.query(
    `SELECT chat_id, message_id, pinned_by, pinned_at, content_snapshot, sender_display_name_snapshot
     FROM pinned_messages
     WHERE chat_id = $1
     ORDER BY pinned_at DESC`,
    [chatId]
  );

  return result.rows.map((row) => PinnedMessageSchema.parse(toPinnedMessage(row as any)));
}

async function pinMessageForChat(
  app: FastifyInstance,
  request: any,
  reply: any,
  chatId: string,
  messageId: string
) {
  const userId = request.user.userId;
  const isMember = await ensureMembership(userId, chatId);
  if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM chats WHERE id = $1 FOR UPDATE', [chatId]);

    const existingPinResult = await client.query(
      `SELECT chat_id, message_id, pinned_by, pinned_at, content_snapshot, sender_display_name_snapshot
       FROM pinned_messages
       WHERE chat_id = $1
         AND message_id = $2`,
      [chatId, messageId]
    );
    const existingPinRow = existingPinResult.rows[0];
    if (existingPinRow) {
      await client.query('COMMIT');
      return reply.send(PinnedMessageSchema.parse(toPinnedMessage(existingPinRow as any)));
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS pin_count
       FROM pinned_messages
       WHERE chat_id = $1`,
      [chatId]
    );
    const pinCount = Number((countResult.rows[0] as { pin_count: number }).pin_count ?? 0);
    if (pinCount >= 5) {
      await client.query('ROLLBACK');
      return reply.status(422).send({ error: 'This chat already has the maximum of 5 pinned messages' });
    }

    const messageContext = await client.query(
      `SELECT m.id AS message_id,
              m.chat_id,
              m.sender_id,
              m.content,
              COALESCE(m.hidden_by_moderation, FALSE) AS hidden_by_moderation,
              u.status AS sender_status,
              u.display_name AS sender_display_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
         AND m.id = $2`,
      [chatId, messageId]
    );
    const row = messageContext.rows[0] as ChatMessageContextRow | undefined;
    if (!row || row.hidden_by_moderation || row.sender_status !== 'active') {
      await client.query('ROLLBACK');
      return reply.status(404).send({ error: 'Message not found' });
    }

    const inserted = await client.query(
      `INSERT INTO pinned_messages(
         chat_id,
         message_id,
         pinned_by,
         content_snapshot,
         sender_display_name_snapshot
       )
       VALUES($1, $2, $3, $4, $5)
       RETURNING chat_id, message_id, pinned_by, pinned_at, content_snapshot, sender_display_name_snapshot`,
      [chatId, messageId, userId, row.content, row.sender_display_name]
    );

    await client.query('COMMIT');

    const pin = PinnedMessageSchema.parse(toPinnedMessage(inserted.rows[0] as any));
    app.io.to(`chat:${chatId}`).emit('message.pinned', {
      type: 'message.pinned',
      payload: {
        chatId,
        messageId,
        pinnedByUserId: userId,
        pinnedAt: pin.pinnedAt
      }
    });

    return reply.send(pin);
  } catch (error) {
    await client.query('ROLLBACK');
    request.log.error({ error, chatId, messageId, userId }, 'failed to pin message');
    return reply.status(500).send({ error: 'Failed to pin message' });
  } finally {
    client.release();
  }
}

async function unpinMessageForChat(
  app: FastifyInstance,
  request: any,
  reply: any,
  chatId: string,
  messageId: string
) {
  const userId = request.user.userId;
  const isMember = await ensureMembership(userId, chatId);
  if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

  const deleteResult = await pool.query(
    `DELETE FROM pinned_messages
     WHERE chat_id = $1
       AND message_id = $2`,
    [chatId, messageId]
  );

  if (deleteResult.rowCount) {
    app.io.to(`chat:${chatId}`).emit('message.unpinned', {
      type: 'message.unpinned',
      payload: {
        chatId,
        messageId
      }
    });
  }

  return reply.status(204).send();
}

async function resolveOrCreateSelfChat(userId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [`self-dm:${userId}`]);

    const existing = await client.query(
      `SELECT c.id
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       LEFT JOIN direct_chats dc ON dc.chat_id = c.id
       WHERE c.type = 'dm'
         AND dc.chat_id IS NULL
         AND c.name = 'Notes'
       GROUP BY c.id
       HAVING COUNT(*) = 1
          AND COUNT(*) FILTER (WHERE cm.user_id = $1) = 1`,
      [userId]
    );

    const existingChatId = (existing.rows[0] as { id: string } | undefined)?.id;
    if (existingChatId) {
      await client.query('COMMIT');
      return existingChatId;
    }

    const chatId = randomUUID();
    await client.query(
      `INSERT INTO chats(id, type, name)
       VALUES($1, 'dm', 'Notes')`,
      [chatId]
    );
    await client.query(
      `INSERT INTO chat_members(chat_id, user_id)
       VALUES($1, $2)`,
      [chatId, userId]
    );
    await client.query('COMMIT');
    return chatId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/chats', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request) => {
    const summaries = await listChatSummariesForUser(pool, request.user.userId);
    touchLastSeen(pool, request.user.userId, request.log);
    return summaries;
  });

  app.post('/api/v1/chats/dm', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const parsed = CreateDirectChatRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    if (parsed.data.memberId === userId) {
      return reply.status(409).send({ error: 'Cannot message yourself' });
    }

    const target = await getUserById(pool, parsed.data.memberId);
    if (!target) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    if (target.status !== 'active') {
      return reply.status(409).send({ error: 'Member account is not active' });
    }

    const [firstUserId, secondUserId] = orderDirectChatParticipants(userId, parsed.data.memberId);
    const client = await pool.connect();

    let chatId: string | null = null;

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT chat_id
         FROM direct_chats
         WHERE first_user_id = $1 AND second_user_id = $2`,
        [firstUserId, secondUserId]
      );

      chatId = (existing.rows[0] as { chat_id: string } | undefined)?.chat_id ?? null;

      if (!chatId) {
        const insertedChatId = randomUUID();
        await client.query(
          `INSERT INTO chats(id, type, name)
           VALUES($1, 'dm', 'Direct message')`,
          [insertedChatId]
        );

        const insertedDirectChat = await client.query(
          `INSERT INTO direct_chats(chat_id, first_user_id, second_user_id)
           VALUES($1, $2, $3)
           ON CONFLICT (first_user_id, second_user_id) DO NOTHING
           RETURNING chat_id`,
          [insertedChatId, firstUserId, secondUserId]
        );

        if (insertedDirectChat.rowCount) {
          chatId = insertedChatId;
        } else {
          await client.query('DELETE FROM chats WHERE id = $1', [insertedChatId]);
          const raced = await client.query(
            `SELECT chat_id
             FROM direct_chats
             WHERE first_user_id = $1 AND second_user_id = $2`,
            [firstUserId, secondUserId]
          );
          chatId = (raced.rows[0] as { chat_id: string } | undefined)?.chat_id ?? null;
        }
      }

      if (!chatId) {
        throw new Error('Failed to resolve direct chat');
      }

      await client.query(
        `INSERT INTO chat_members(chat_id, user_id)
         VALUES ($1, $2), ($1, $3)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chatId, userId, parsed.data.memberId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error({ error, userId, counterpartUserId: parsed.data.memberId }, 'failed to resolve direct chat');
      return reply.status(500).send({ error: 'Failed to resolve direct chat' });
    } finally {
      client.release();
    }

    if (!chatId) {
      return reply.status(500).send({ error: 'Failed to resolve direct chat' });
    }

    joinUserSocketsToChat(app, chatId, [userId, parsed.data.memberId]);

    const summary = await getChatSummaryForUser(pool, userId, chatId);
    if (!summary) {
      return reply.status(500).send({ error: 'Failed to load direct chat' });
    }

    return reply.send(summary);
  });

  app.post('/api/v1/chats/self', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    try {
      const chatId = await resolveOrCreateSelfChat(request.user.userId);
      joinUserSocketsToChat(app, chatId, [request.user.userId]);

      const summary = await getChatSummaryForUser(pool, request.user.userId, chatId);
      if (!summary) {
        return reply.status(500).send({ error: 'Failed to load self chat' });
      }

      return reply.send(summary);
    } catch (error) {
      request.log.error({ error, userId: request.user.userId }, 'failed to resolve self chat');
      return reply.status(500).send({ error: 'Failed to resolve self chat' });
    }
  });

  app.get('/api/v1/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const { cursor, before, limit = '30' } = request.query as { cursor?: string; before?: string; limit?: string };

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 30));
    const paginationCursor = before ?? cursor;

    const query = paginationCursor
      ? `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at, m.moderation_actor_user_id,
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.reply_to_snapshot, m.created_at, m.client_message_id,
                seen.seen_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN LATERAL (
           SELECT MAX(cm_seen.last_read_at) AS seen_at
           FROM chat_members cm_seen
           JOIN users u_seen ON u_seen.id = cm_seen.user_id
           JOIN messages m_seen ON m_seen.id = cm_seen.last_read_message_id
           WHERE cm_seen.chat_id = m.chat_id
             AND cm_seen.user_id <> m.sender_id
             AND u_seen.status = 'active'
             AND m_seen.created_at >= m.created_at
         ) seen ON TRUE
         WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at, m.moderation_actor_user_id,
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.reply_to_snapshot, m.created_at, m.client_message_id,
                seen.seen_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN LATERAL (
           SELECT MAX(cm_seen.last_read_at) AS seen_at
           FROM chat_members cm_seen
           JOIN users u_seen ON u_seen.id = cm_seen.user_id
           JOIN messages m_seen ON m_seen.id = cm_seen.last_read_message_id
           WHERE cm_seen.chat_id = m.chat_id
             AND cm_seen.user_id <> m.sender_id
             AND u_seen.status = 'active'
             AND m_seen.created_at >= m.created_at
         ) seen ON TRUE
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`;

    const values = paginationCursor ? [chatId, paginationCursor, safeLimit] : [chatId, safeLimit];
    const rows = await pool.query(query, values);
    touchLastSeen(pool, request.user.userId, request.log);

    const messagesWithReadReceipts = await hydrateMessageReadReceipts(
      pool,
      userId,
      rows.rows.map((messageRow: any) => MessageSchema.parse(toMemberMessage(messageRow)))
    );
    const messages = await hydrateMessageReactions(pool, messagesWithReadReceipts);

    return messages.map((message) => MessageSchema.parse(message));
  });

  app.post('/api/v1/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const params = request.params as { chatId: string };

    const parsed = SendMessageRequestSchema.safeParse({
      ...(request.body as object),
      chatId: params.chatId
    });

    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const sendState = await getChatSendState(pool, userId, parsed.data.chatId);
    if (!sendState.isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
    if (sendState.isReadOnly) return reply.status(409).send({ error: 'Direct message is unavailable' });

    try {
      const response = await sendChatMessage({
        io: app.io,
        log: request.log,
        chatId: parsed.data.chatId,
        senderUserId: userId,
        content: parsed.data.content,
        clientMessageId: parsed.data.clientMessageId,
        messageType: parsed.data.type ?? 'text',
        metadata: parsed.data.metadata ?? null,
        replyToMessageId: parsed.data.replyToMessageId
      });

      return reply.send(SendMessageResponseSchema.parse(response));
    } catch (error) {
      if (error instanceof Error && error.message === REPLY_TARGET_NOT_FOUND_ERROR) {
        return reply.status(404).send({ error: REPLY_TARGET_NOT_FOUND_ERROR });
      }
      request.log.error({ error, chatId: parsed.data.chatId, userId }, 'failed to send message');
      return reply.status(500).send({ error: 'Failed to send message' });
    }
  });

  app.post('/api/v1/chats/:chatId/messages/:messageId/reactions', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    const parsed = AddReactionRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    const messageContext = await getChatMessageContext(chatId, messageId);
    if (!messageContext || messageContext.hidden_by_moderation || messageContext.sender_status !== 'active') {
      return reply.status(404).send({ error: 'Message not found' });
    }

    const insertResult = await pool.query(
      `INSERT INTO message_reactions(message_id, user_id, emoji)
       VALUES($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING created_at`,
      [messageId, userId, parsed.data.emoji]
    );

    if (insertResult.rowCount) {
      app.io.to(`chat:${chatId}`).emit('reaction.add', {
        type: 'reaction.add',
        payload: {
          chatId,
          messageId,
          userId,
          emoji: parsed.data.emoji,
          createdAt: new Date((insertResult.rows[0] as { created_at: string | Date }).created_at).toISOString()
        }
      });
    }

    const grouped = await loadGroupedReactionsForMessageIds(pool, [messageId]);
    return reply.send(grouped.get(messageId) ?? []);
  });

  app.delete('/api/v1/chats/:chatId/messages/:messageId/reactions/:emoji', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId, messageId, emoji } = request.params as { chatId: string; messageId: string; emoji: string };

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    const messageContext = await getChatMessageContext(chatId, messageId);
    if (!messageContext || messageContext.hidden_by_moderation || messageContext.sender_status !== 'active') {
      return reply.status(404).send({ error: 'Message not found' });
    }

    const deleteResult = await pool.query(
      `DELETE FROM message_reactions
       WHERE message_id = $1
         AND user_id = $2
         AND emoji = $3`,
      [messageId, userId, emoji]
    );

    if (!deleteResult.rowCount) {
      const existingReaction = await pool.query(
        `SELECT 1
         FROM message_reactions
         WHERE message_id = $1
           AND emoji = $2
         LIMIT 1`,
        [messageId, emoji]
      );

      if (existingReaction.rowCount) {
        return reply.status(403).send({ error: `You don't have permission to perform this action` });
      }
    }

    if (deleteResult.rowCount) {
      app.io.to(`chat:${chatId}`).emit('reaction.remove', {
        type: 'reaction.remove',
        payload: {
          chatId,
          messageId,
          userId,
          emoji
        }
      });
    }

    return reply.status(204).send();
  });

  app.delete('/api/v1/chats/:chatId/messages/:messageId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    const isMember = await ensureMembership(request.user.userId, chatId);
    const messageContext = await getChatMessageContext(chatId, messageId);

    if (!messageContext) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    const canDelete = request.user.role === 'admin' || (isMember && messageContext.sender_id === request.user.userId);
    if (!canDelete) {
      return reply.status(403).send({ error: `You don't have permission to perform this action` });
    }

    const reason = request.user.role === 'admin' ? 'Deleted by admin' : 'Deleted by sender';
    const result = await setMessageModerationState(messageId, request.user.userId, 'hide', reason, {
      clearContent: true,
      allowNoopHide: true
    });

    if ('error' in result) {
      return reply.status(result.error === 'Message not found' ? 404 : 409).send({ error: result.error });
    }

    if (result.changed) {
      const memberMessage = await loadMemberMessageById(messageId);
      if (memberMessage) {
        app.io.to(`chat:${chatId}`).emit('message.moderated', {
          type: 'message.moderated',
          payload: {
            chatId,
            messageId,
            action: 'hide',
            moderatedAt: new Date().toISOString(),
            message: memberMessage
          }
        });
      }
    }

    return reply.status(204).send();
  });

  app.get('/api/v1/chats/:chatId/pins', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const isMember = await ensureMembership(request.user.userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    return reply.send(await listPinnedMessagesForChat(chatId));
  });

  app.post('/api/v1/chats/:chatId/messages/:messageId/pin', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    return pinMessageForChat(app, request, reply, chatId, messageId);
  });

  app.delete('/api/v1/chats/:chatId/messages/:messageId/pin', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    return unpinMessageForChat(app, request, reply, chatId, messageId);
  });

  app.post('/api/v1/chats/:chatId/pins', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const parsed = PinMessageRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    return pinMessageForChat(app, request, reply, chatId, parsed.data.messageId);
  });

  app.delete('/api/v1/chats/:chatId/pins/:messageId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId, messageId } = request.params as { chatId: string; messageId: string };
    return unpinMessageForChat(app, request, reply, chatId, messageId);
  });

  app.post('/api/v1/chats/:chatId/polls', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const parsed = CreatePollRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    if (parsed.data.expiresAt && new Date(parsed.data.expiresAt) <= new Date()) {
      return reply.status(400).send({ error: 'Poll expiry must be in the future' });
    }

    const sendState = await getChatSendState(pool, userId, chatId);
    if (!sendState.isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
    if (sendState.isReadOnly) return reply.status(409).send({ error: 'Direct message is unavailable' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const messageId = randomUUID();
      const clientMessageId = `poll-${randomUUID()}`;
      await client.query(
        `INSERT INTO messages(id, chat_id, sender_id, content, message_type, metadata, client_message_id)
         VALUES($1, $2, $3, $4, 'poll', NULL, $5)`,
        [messageId, chatId, userId, parsed.data.question, clientMessageId]
      );

      const poll = await createPollRecords(client, {
        chatId,
        messageId,
        createdByUserId: userId,
        question: parsed.data.question,
        options: parsed.data.options,
        multiSelect: parsed.data.multiSelect,
        expiresAt: parsed.data.expiresAt
      });

      await client.query(
        `UPDATE messages
         SET metadata = $1
         WHERE id = $2`,
        [poll, messageId]
      );
      await client.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

      const persistedMessage = await loadPersistedMessageById(client, messageId);
      if (!persistedMessage) {
        throw new Error('Failed to load poll message');
      }

      await client.query('COMMIT');

      const message = MessageSchema.parse(toMemberMessage(persistedMessage));
      const response = SendMessageResponseSchema.parse({
        message,
        deduped: false
      });

      app.io.to(`chat:${chatId}`).emit('message.new', {
        type: 'message.new',
        payload: message
      });
      void sendPushForNewMessage(request.log, chatId, userId, message);

      return reply.send(response);
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error({ error, chatId, userId }, 'failed to create poll');
      return reply.status(500).send({ error: 'Failed to create poll' });
    } finally {
      client.release();
    }
  });

  app.post('/api/v1/polls/:pollId/vote', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { pollId } = request.params as { pollId: string };
    const parsed = VotePollRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const context = await loadPollVoteContext(client, pollId, userId);
      if (!context) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ error: 'Poll not found' });
      }
      if (!context.isMember) {
        await client.query('ROLLBACK');
        return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
      }
      if (context.expiresAt && new Date(context.expiresAt) <= new Date()) {
        await client.query('ROLLBACK');
        return reply.status(409).send({ error: 'Poll is closed' });
      }

      const optionId = context.optionIdsByIndex.get(parsed.data.optionIndex);
      if (!optionId) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: 'Poll option is invalid' });
      }

      const { poll, changed } = await recordPollVote(client, {
        pollId,
        userId,
        optionId,
        multiSelect: context.multiSelect,
        existingOptionIds: context.existingOptionIds
      });

      await client.query(
        `UPDATE messages
         SET metadata = $1
         WHERE id = (
           SELECT message_id
           FROM polls
           WHERE id = $2
         )`,
        [poll, pollId]
      );

      await client.query('COMMIT');

      if (changed) {
        app.io.to(`chat:${context.chatId}`).emit('poll.voted', {
          type: 'poll.voted',
          payload: {
            chatId: context.chatId,
            pollId,
            poll
          }
        });
      }

      return reply.send(poll);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.message === 'You have already voted on this poll') {
        return reply.status(409).send({ error: error.message });
      }
      request.log.error({ error, pollId, userId }, 'failed to record poll vote');
      return reply.status(500).send({ error: 'Failed to record poll vote' });
    } finally {
      client.release();
    }
  });

  app.get('/api/v1/chats/:chatId/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };

    const preferences = await getChatPreferencesForUser(userId, chatId);
    if (!preferences) {
      return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
    }

    return reply.send(toChatPreferencesResponse(preferences));
  });

  const saveChatPreferences = async (request: any, reply: any) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const parsed = ChatPreferencesRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const result = await pool.query(
      `UPDATE chat_members
       SET notifications_muted = $1,
           notifications_muted_updated_at = NOW()
       WHERE chat_id = $2 AND user_id = $3
       RETURNING chat_id, notifications_muted, notifications_muted_updated_at`,
      [parsed.data.notificationsMuted, chatId, userId]
    );

    if (!result.rowCount) {
      return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
    }

    return reply.send(toChatPreferencesResponse(result.rows[0] as ChatPreferencesRow));
  };

  app.post('/api/v1/chats/:chatId/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, saveChatPreferences);
  app.patch('/api/v1/chats/:chatId/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, saveChatPreferences);

  app.post('/api/v1/chats/:chatId/read', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const parsed = MarkChatReadRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await markChatRead(client, chatId, userId, parsed.data.throughMessageId);
      await client.query('COMMIT');

      request.log.info(
        {
          chatId,
          userId,
          advanced: result.advanced,
          unreadCount: result.unreadCount,
          seenThroughMessageId: result.seenThroughMessageId
        },
        'chat read state updated'
      );

      if (result.advanced) {
        app.io.to(`chat:${chatId}`).emit('message.read', {
          type: 'message.read',
          payload: {
            chatId,
            readerUserId: userId,
            seenAt: result.lastReadAt,
            seenThroughMessageId: result.seenThroughMessageId
          }
        });
      }

      return reply.send(
        MarkChatReadResponseSchema.parse({
          chatId,
          unreadCount: result.unreadCount,
          lastReadAt: result.lastReadAt,
          seenThroughMessageId: result.seenThroughMessageId
        })
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.message === 'Forbidden') {
        return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });
      }
      request.log.error({ error, chatId, userId }, 'failed to mark chat read');
      return reply.status(500).send({ error: 'Failed to mark chat read' });
    } finally {
      client.release();
    }
  });

  app.get('/api/v1/chats/:chatId/members/read', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const isMember = await ensureMembership(request.user.userId, chatId);
    if (!isMember) return reply.status(403).send({ error: NOT_A_CHAT_MEMBER_ERROR });

    const readStates = await listChatMemberReadStates(pool, chatId);
    return reply.send(readStates.map((state) => ChatMemberReadStateSchema.parse(state)));
  });
}
