import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { pool } from '../db/pool.js';
import { ClientMessageSendEventSchema, type MessageType } from '@penthouse/contracts';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { avatarUrlFromFileName, getUserById } from '../utils/users.js';

async function isMember(userId: string, chatId: string): Promise<boolean> {
  const res = await pool.query('SELECT 1 FROM chat_members WHERE user_id = $1 AND chat_id = $2', [userId, chatId]);
  return Boolean(res.rowCount);
}

function parseAllowedOrigins(): Set<string> {
  const allowed = new Set(
    env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  // Native local testing can surface these origins depending on the WebView/runtime.
  for (const localOrigin of [
    'http://localhost',
    'https://localhost',
    'http://127.0.0.1',
    'https://127.0.0.1',
    'capacitor://localhost',
    'ionic://localhost',
    'app://localhost'
  ]) {
    allowed.add(localOrigin);
  }

  return allowed;
}

function isAllowedSocketOrigin(allowedOrigins: Set<string>, origin?: string | string[]): boolean {
  if (!origin || origin === 'null') return true;
  if (Array.isArray(origin)) {
    return origin.every((value) => allowedOrigins.has(value));
  }
  return allowedOrigins.has(origin);
}

function requestTransport(req: any): string {
  return String(req?._query?.transport ?? req?._query?.EIO ?? 'unknown');
}

export function initRealtime(app: FastifyInstance): Server {
  const allowedOrigins = parseAllowedOrigins();
  const io = new Server(app.server, {
    path: '/socket.io/',
    cors: {
      origin(origin, callback) {
        if (isAllowedSocketOrigin(allowedOrigins, origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed'), false);
      },
      credentials: true
    },
    allowRequest(req, callback) {
      const allowed = isAllowedSocketOrigin(allowedOrigins, req.headers.origin);
      if (!allowed) {
        app.log.warn(
          {
            origin: req.headers.origin ?? null,
            transport: requestTransport(req),
            url: req.url
          },
          'socket handshake rejected: origin not allowed'
        );
      }
      callback(null, allowed);
    }
  });

  const onlineUsers = new Map<string, Set<string>>();

  // Socket observability counters
  let socketConnections = 0;
  let socketDisconnections = 0;
  let socketAuthFailures = 0;

  io.engine.on('initial_headers', (_headers, req) => {
    app.log.info(
      {
        origin: req.headers.origin ?? null,
        transport: requestTransport(req),
        url: req.url
      },
      'socket handshake start'
    );
  });

  io.engine.on('connection_error', (error: any) => {
    app.log.warn(
      {
        code: error?.code ?? null,
        message: error?.message ?? null,
        transport: requestTransport(error?.req),
        origin: error?.req?.headers?.origin ?? null,
        url: error?.req?.url ?? null
      },
      'socket engine connection error'
    );
  });

  io.engine.on('connection', (engineSocket) => {
    app.log.info(
      {
        socketId: engineSocket.id,
        transport: engineSocket.transport.name
      },
      'socket engine connected'
    );

    engineSocket.on('upgrade', (transport: { name: string }) => {
      app.log.info(
        {
          socketId: engineSocket.id,
          transport: transport.name
        },
        'socket transport upgraded'
      );
    });

    engineSocket.on('close', (reason: string) => {
      app.log.info(
        {
          socketId: engineSocket.id,
          reason
        },
        'socket engine closed'
      );
    });
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socketAuthFailures++;
        app.log.warn(
          {
            socketAuthFailures,
            socketId: socket.id,
            transport: socket.conn.transport.name,
            origin: socket.handshake.headers.origin ?? null
          },
          'socket auth failed: missing token'
        );
        return next(new Error('Missing token'));
      }
      const payload = await app.jwt.verify<{ userId: string; username: string }>(token);
      const user = await getUserById(pool, payload.userId);
      if (!user || user.status !== 'active' || user.must_change_password) {
        socketAuthFailures++;
        app.log.warn(
          {
            socketAuthFailures,
            socketId: socket.id,
            transport: socket.conn.transport.name,
            origin: socket.handshake.headers.origin ?? null
          },
          'socket auth failed: account unavailable'
        );
        return next(new Error('Account unavailable'));
      }
      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.displayName = user.display_name;
      socket.data.avatarUrl = avatarUrlFromFileName(user.avatar_storage_key);
      next();
    } catch (error) {
      socketAuthFailures++;
      app.log.warn(
        {
          socketAuthFailures,
          socketId: socket.id,
          transport: socket.conn.transport.name,
          origin: socket.handshake.headers.origin ?? null
        },
        'socket auth failed: invalid token'
      );
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socketConnections++;
    app.log.info(
      {
        socketConnections,
        userId,
        socketId: socket.id,
        transport: socket.conn.transport.name
      },
      'socket connected'
    );

    socket.conn.on('upgrade', (transport) => {
      app.log.info(
        {
          userId,
          socketId: socket.id,
          transport: transport.name
        },
        'socket connection upgraded'
      );
    });

    socket.join(`user:${userId}`);
    const set = onlineUsers.get(userId) ?? new Set<string>();
    set.add(socket.id);
    onlineUsers.set(userId, set);
    io.emit('presence.update', { type: 'presence.update', payload: { userId, status: 'online' } });
    socket.emit('presence.sync', {
      type: 'presence.sync',
      payload: { onlineUserIds: Array.from(onlineUsers.keys()) }
    });

    socket.on('chat.join', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.join(`chat:${chatId}`);
      app.log.info(
        {
          userId,
          socketId: socket.id,
          chatId
        },
        'socket chat joined'
      );
    });

    socket.on('chat.leave', (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
      app.log.info(
        {
          userId,
          socketId: socket.id,
          chatId
        },
        'socket chat left'
      );
    });

    socket.on('typing.start', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId,
          status: 'start',
          displayName: socket.data.displayName as string,
          avatarUrl: (socket.data.avatarUrl as string | null) ?? null
        }
      });
    });

    socket.on('typing.stop', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId,
          status: 'stop',
          displayName: socket.data.displayName as string,
          avatarUrl: (socket.data.avatarUrl as string | null) ?? null
        }
      });
    });

    socket.on('message.send', async (payload: unknown) => {
      const parsed = ClientMessageSendEventSchema.safeParse({ type: 'message.send', ...(payload as object) });
      if (!parsed.success) return;

      const event = parsed.data;
      if (!(await isMember(userId, event.chatId))) return;

      const inserted = await pool.query(
        `INSERT INTO messages(id, chat_id, sender_id, content, message_type, metadata, client_message_id)
         VALUES($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (chat_id, sender_id, client_message_id) DO NOTHING
         RETURNING id, chat_id, sender_id, content, message_type, metadata, created_at, client_message_id`,
        [randomUUID(), event.chatId, userId, event.content, event.messageType ?? 'text', event.metadata ?? null, event.clientMessageId]
      );

      const row = inserted.rowCount
        ? inserted.rows[0]
        : (
            await pool.query(
              `SELECT id, chat_id, sender_id, content, message_type, metadata, created_at, client_message_id
               FROM messages
               WHERE chat_id = $1 AND sender_id = $2 AND client_message_id = $3`,
              [event.chatId, userId, event.clientMessageId]
            )
          ).rows[0];

      if (!row) return;

      app.log.info(
        {
          userId,
          socketId: socket.id,
          chatId: event.chatId,
          messageId: row.id
        },
        'socket message handled'
      );

      const messagePayload = {
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderUsername: socket.data.username as string,
        senderDisplayName: socket.data.displayName as string,
        senderAvatarUrl: (socket.data.avatarUrl as string | null) ?? null,
        content: row.content,
        type: (row.message_type as MessageType | null) ?? 'text',
        metadata: row.metadata ?? null,
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

    socket.on('disconnect', (reason) => {
      socketDisconnections++;
      app.log.info(
        {
          socketDisconnections,
          userId,
          socketId: socket.id,
          transport: socket.conn.transport.name,
          reason
        },
        'socket disconnected'
      );
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
