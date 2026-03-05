import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { pool } from '../db/pool.js';
import { ClientMessageSendEventSchema } from '@penthouse/contracts';
import { randomUUID } from 'node:crypto';

async function isMember(userId: string, chatId: string): Promise<boolean> {
  const res = await pool.query('SELECT 1 FROM chat_members WHERE user_id = $1 AND chat_id = $2', [userId, chatId]);
  return Boolean(res.rowCount);
}

export function initRealtime(app: FastifyInstance): Server {
  const io = new Server(app.server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  const onlineUsers = new Map<string, Set<string>>();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      const payload = await app.jwt.verify<{ userId: string; username: string }>(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.join(`user:${userId}`);
    const set = onlineUsers.get(userId) ?? new Set<string>();
    set.add(socket.id);
    onlineUsers.set(userId, set);
    io.emit('presence.update', { type: 'presence.update', payload: { userId, status: 'online' } });

    socket.on('chat.join', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat.leave', (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
    });

    socket.on('typing.start', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: { chatId, userId, status: 'start' }
      });
    });

    socket.on('typing.stop', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: { chatId, userId, status: 'stop' }
      });
    });

    socket.on('message.send', async (payload: unknown) => {
      const parsed = ClientMessageSendEventSchema.safeParse({ type: 'message.send', ...(payload as object) });
      if (!parsed.success) return;

      const event = parsed.data;
      if (!(await isMember(userId, event.chatId))) return;

      const existing = await pool.query(
        `SELECT id, chat_id, sender_id, content, created_at, client_message_id
         FROM messages
         WHERE chat_id = $1 AND sender_id = $2 AND client_message_id = $3`,
        [event.chatId, userId, event.clientMessageId]
      );

      const row = existing.rowCount
        ? existing.rows[0]
        : (
            await pool.query(
              `INSERT INTO messages(id, chat_id, sender_id, content, client_message_id)
               VALUES($1, $2, $3, $4, $5)
               RETURNING id, chat_id, sender_id, content, created_at, client_message_id`,
              [randomUUID(), event.chatId, userId, event.content, event.clientMessageId]
            )
          ).rows[0];

      const messagePayload = {
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        content: row.content,
        createdAt: new Date(row.created_at).toISOString(),
        clientMessageId: row.client_message_id ?? undefined
      };

      io.to(`chat:${event.chatId}`).emit('message.new', {
        type: 'message.new',
        payload: messagePayload
      });

      io.to(`user:${userId}`).emit('message.ack', {
        type: 'message.ack',
        payload: {
          clientMessageId: event.clientMessageId,
          messageId: row.id,
          chatId: event.chatId,
          deliveredAt: new Date().toISOString()
        }
      });
    });

    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (!userSockets) return;
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('presence.update', { type: 'presence.update', payload: { userId, status: 'offline' } });
      }
    });
  });

  return io;
}
