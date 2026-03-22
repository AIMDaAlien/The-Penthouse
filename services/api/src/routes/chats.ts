import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  ChatPreferencesRequestSchema,
  ChatPreferencesResponseSchema,
  CreateDirectChatRequestSchema,
  MarkChatReadResponseSchema,
  MessageSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { sendChatMessage } from '../utils/chatMessages.js';
import { toMemberMessage } from '../utils/messages.js';
import { getUserById } from '../utils/users.js';
import {
  getChatSendState,
  getChatSummaryForUser,
  listChatSummariesForUser,
  orderDirectChatParticipants
} from '../utils/chats.js';

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

async function markChatRead(chatId: string, userId: string): Promise<{
  advanced: boolean;
  lastReadAt: string | null;
  unreadCount: number;
  seenThroughMessageId: string | null;
}> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const membership = await client.query(
      'SELECT last_read_at FROM chat_members WHERE chat_id = $1 AND user_id = $2 FOR UPDATE',
      [chatId, userId]
    );

    if (!membership.rowCount) {
      throw new Error('Forbidden');
    }

    const latestMessage = await client.query(
      `SELECT m.id, m.created_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
         AND u.status = 'active'
         AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [chatId]
    );

    const currentLastReadAt = membership.rows[0].last_read_at
      ? new Date(membership.rows[0].last_read_at as string)
      : null;
    const latestRow = latestMessage.rows[0] as { id: string; created_at: string } | undefined;
    const latestMessageAt = latestRow?.created_at ? new Date(latestRow.created_at) : null;
    const advanced = Boolean(latestMessageAt && (!currentLastReadAt || latestMessageAt > currentLastReadAt));
    const nextReadAt = new Date();
    const effectiveReadAt = advanced ? nextReadAt : (currentLastReadAt ?? nextReadAt);

    if (advanced) {
      await client.query(
        'UPDATE chat_members SET last_read_at = $1 WHERE chat_id = $2 AND user_id = $3',
        [nextReadAt.toISOString(), chatId, userId]
      );
    }

    const unread = await client.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
         AND m.sender_id <> $2
         AND u.status = 'active'
         AND COALESCE(m.hidden_by_moderation, FALSE) = FALSE
         AND m.created_at > $3`,
      [chatId, userId, effectiveReadAt.toISOString()]
    );

    await client.query('COMMIT');

    return {
      advanced,
      lastReadAt: effectiveReadAt.toISOString(),
      unreadCount: Number(unread.rows[0]?.unread_count ?? 0),
      seenThroughMessageId: latestRow?.id ?? null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/chats', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request) => {
    return listChatSummariesForUser(pool, request.user.userId);
  });

  app.post('/api/v1/chats/dm', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const parsed = CreateDirectChatRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

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

  app.get('/api/v1/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const { cursor, limit = '30' } = request.query as { cursor?: string; limit?: string };

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' });

    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 30));

    const query = cursor
      ? `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at, m.moderation_actor_user_id,
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.created_at, m.client_message_id,
                seen.seen_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN LATERAL (
           SELECT MAX(cm_seen.last_read_at) AS seen_at
           FROM chat_members cm_seen
           JOIN users u_seen ON u_seen.id = cm_seen.user_id
           WHERE cm_seen.chat_id = m.chat_id
             AND cm_seen.user_id <> m.sender_id
             AND u_seen.status = 'active'
         ) seen ON TRUE
         WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at, m.moderation_actor_user_id,
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.created_at, m.client_message_id,
                seen.seen_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN LATERAL (
           SELECT MAX(cm_seen.last_read_at) AS seen_at
           FROM chat_members cm_seen
           JOIN users u_seen ON u_seen.id = cm_seen.user_id
           WHERE cm_seen.chat_id = m.chat_id
             AND cm_seen.user_id <> m.sender_id
             AND u_seen.status = 'active'
         ) seen ON TRUE
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`;

    const values = cursor ? [chatId, cursor, safeLimit] : [chatId, safeLimit];
    const rows = await pool.query(query, values);

    return rows.rows.map((m: any) => MessageSchema.parse(toMemberMessage(m)));
  });

  app.post('/api/v1/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const params = request.params as { chatId: string };

    const parsed = SendMessageRequestSchema.safeParse({
      ...(request.body as object),
      chatId: params.chatId
    });

    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const sendState = await getChatSendState(pool, userId, parsed.data.chatId);
    if (!sendState.isMember) return reply.status(403).send({ error: 'Forbidden' });
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
        metadata: parsed.data.metadata ?? null
      });

      return reply.send(SendMessageResponseSchema.parse(response));
    } catch (error) {
      request.log.error({ error, chatId: parsed.data.chatId, userId }, 'failed to send message');
      return reply.status(500).send({ error: 'Failed to send message' });
    }
  });

  app.patch('/api/v1/chats/:chatId/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const parsed = ChatPreferencesRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const result = await pool.query(
      `UPDATE chat_members
       SET notifications_muted = $1
       WHERE chat_id = $2 AND user_id = $3
       RETURNING chat_id, notifications_muted`,
      [parsed.data.notificationsMuted, chatId, userId]
    );

    if (!result.rowCount) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const row = result.rows[0] as { chat_id: string; notifications_muted: boolean };
    return reply.send(
      ChatPreferencesResponseSchema.parse({
        chatId: row.chat_id,
        notificationsMuted: Boolean(row.notifications_muted)
      })
    );
  });

  app.post('/api/v1/chats/:chatId/read', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };

    const isMember = await ensureMembership(userId, chatId);
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' });

    try {
      const result = await markChatRead(chatId, userId);
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
      if (error?.message === 'Forbidden') {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      request.log.error({ error, chatId, userId }, 'failed to mark chat read');
      return reply.status(500).send({ error: 'Failed to mark chat read' });
    }
  });
}
