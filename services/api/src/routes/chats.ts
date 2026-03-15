import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  ChatSummarySchema,
  MarkChatReadResponseSchema,
  MessageSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  type MessageType
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { avatarUrlFromFileName } from '../utils/users.js';

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
    const userId = request.user.userId;
    const rows = await pool.query(
      `SELECT c.id, c.type, c.name, c.updated_at,
              COUNT(m.id) FILTER (
                WHERE m.sender_id <> $1
                  AND u.status = 'active'
                  AND m.created_at > cm.last_read_at
              )::int AS unread_count
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       LEFT JOIN messages m ON m.chat_id = c.id
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE cm.user_id = $1
       GROUP BY c.id, c.type, c.name, c.updated_at, cm.last_read_at
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    return rows.rows.map((r: { id: string; type: 'dm' | 'channel'; name: string; updated_at: string; unread_count: number }) =>
      ChatSummarySchema.parse({
        id: r.id,
        type: r.type,
        name: r.name,
        updatedAt: new Date(r.updated_at).toISOString(),
        unreadCount: Number(r.unread_count ?? 0)
      })
    );
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
           AND u.status = 'active'
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
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
           AND u.status = 'active'
         ORDER BY m.created_at DESC
         LIMIT $2`;

    const values = cursor ? [chatId, cursor, safeLimit] : [chatId, safeLimit];
    const rows = await pool.query(query, values);

    return rows.rows.map((m: any) =>
      MessageSchema.parse({
        id: m.id,
        chatId: m.chat_id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderDisplayName: m.sender_display_name,
        senderAvatarUrl: avatarUrlFromFileName(m.avatar_storage_key),
        content: m.content,
        type: (m.message_type as MessageType | null) ?? 'text',
        metadata: m.metadata ?? null,
        createdAt: new Date(m.created_at).toISOString(),
        clientMessageId: m.client_message_id ?? undefined,
        seenAt: m.seen_at ? new Date(m.seen_at).toISOString() : null
      })
    );
  });

  app.post('/api/v1/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const userId = request.user.userId;
    const params = request.params as { chatId: string };

    const parsed = SendMessageRequestSchema.safeParse({
      ...(request.body as object),
      chatId: params.chatId
    });

    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const isMember = await ensureMembership(userId, parsed.data.chatId);
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' });

    const messageType = parsed.data.type ?? 'text';
    const metadata = parsed.data.metadata ?? null;

    const inserted = await pool.query(
      `INSERT INTO messages(id, chat_id, sender_id, content, message_type, metadata, client_message_id)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (chat_id, sender_id, client_message_id) DO NOTHING
       RETURNING id, chat_id, sender_id, content, message_type, metadata, created_at, client_message_id`,
      [randomUUID(), parsed.data.chatId, userId, parsed.data.content, messageType, metadata, parsed.data.clientMessageId]
    );

    const deduped = inserted.rowCount === 0;
    const msg = deduped
      ? (
          await pool.query(
            `SELECT id, chat_id, sender_id, content, message_type, metadata, created_at, client_message_id
             FROM messages
             WHERE chat_id = $1 AND sender_id = $2 AND client_message_id = $3`,
            [parsed.data.chatId, userId, parsed.data.clientMessageId]
          )
        ).rows[0]
      : inserted.rows[0];

    if (!msg) {
      request.log.error({ chatId: parsed.data.chatId, userId }, 'message missing after insert/dedup lookup');
      return reply.status(500).send({ error: 'Failed to send message' });
    }

    if (!deduped) {
      await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [parsed.data.chatId]);
    }

    const messagePayload = {
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderUsername: request.user.username,
      senderDisplayName: request.user.displayName,
      senderAvatarUrl: request.user.avatarUrl,
      content: msg.content,
      type: (msg.message_type as MessageType | null) ?? 'text',
      metadata: msg.metadata ?? null,
      createdAt: new Date(msg.created_at).toISOString(),
      clientMessageId: msg.client_message_id ?? undefined,
      seenAt: null
    };

    app.io.to(`chat:${parsed.data.chatId}`).emit('message.new', {
      type: 'message.new',
      payload: messagePayload
    });

    app.io.to(`user:${userId}`).emit('message.ack', {
      type: 'message.ack',
      payload: {
        clientMessageId: parsed.data.clientMessageId,
        messageId: msg.id,
        chatId: parsed.data.chatId,
        deliveredAt: new Date().toISOString()
      }
    });

    const response = SendMessageResponseSchema.parse({
      message: messagePayload,
      deduped
    });

    return reply.send(response);
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
