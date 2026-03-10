import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  ChatSummarySchema,
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

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/chats', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request) => {
    const userId = request.user.userId;
    const rows = await pool.query(
      `SELECT c.id, c.type, c.name, c.updated_at
       FROM chats c
       JOIN chat_members cm ON cm.chat_id = c.id
       WHERE cm.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    return rows.rows.map((r: { id: string; type: 'dm' | 'channel'; name: string; updated_at: string }) =>
      ChatSummarySchema.parse({
        id: r.id,
        type: r.type,
        name: r.name,
        updatedAt: new Date(r.updated_at).toISOString()
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
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.created_at, m.client_message_id
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
           AND u.status = 'active'
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata, m.created_at, m.client_message_id
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
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
        clientMessageId: m.client_message_id ?? undefined
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
      clientMessageId: msg.client_message_id ?? undefined
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
}
