import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { pool } from '../db/pool.js';
import { ClientMessageSendEventSchema } from '@penthouse/contracts';
import { env } from '../config/env.js';
import { avatarUrlFromFileName, getUserById, requiresTestNoticeAck } from '../utils/users.js';
import { getChatSendState } from '../utils/chats.js';
import { sendChatMessage } from '../utils/chatMessages.js';

async function isMember(userId: string, chatId: string): Promise<boolean> {
  const res = await pool.query('SELECT 1 FROM chat_members WHERE user_id = $1 AND chat_id = $2', [userId, chatId]);
  return Boolean(res.rowCount);
}

async function listChatIdsForUser(userId: string): Promise<string[]> {
  const res = await pool.query('SELECT chat_id FROM chat_members WHERE user_id = $1', [userId]);
  return res.rows.map((row) => String(row.chat_id));
}

function activeChatRoom(chatId: string): string {
  return `active-chat:${chatId}`;
}

const PRESENCE_INACTIVE_TIMEOUT_MS = 10_000;
const TYPING_TTL_MS = 6_000;

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
  const inactivePresenceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const typingByChat = new Map<string, Map<string, { displayName: string; avatarUrl: string | null; timeout: ReturnType<typeof setTimeout> }>>();

  // Socket observability counters
  let socketConnections = 0;
  let socketDisconnections = 0;
  let socketAuthFailures = 0;

  function emitPresenceStatus(userId: string, status: 'online' | 'offline'): void {
    io.emit('presence.update', { type: 'presence.update', payload: { userId, status } });
  }

  function clearInactivePresenceTimer(socketId: string): void {
    const timer = inactivePresenceTimers.get(socketId);
    if (!timer) return;
    clearTimeout(timer);
    inactivePresenceTimers.delete(socketId);
  }

  function markSocketOnline(socket: { id: string; data: { userId?: string } }): void {
    const userId = socket.data.userId;
    if (!userId) return;
    clearInactivePresenceTimer(socket.id);
    const sockets = onlineUsers.get(userId) ?? new Set<string>();
    const wasOffline = sockets.size === 0;
    if (!sockets.has(socket.id)) {
      sockets.add(socket.id);
      onlineUsers.set(userId, sockets);
    }
    if (wasOffline) {
      emitPresenceStatus(userId, 'online');
    }
  }

  function clearTypingState(chatId: string, userId: string, emitStop = true): void {
    const chatTyping = typingByChat.get(chatId);
    if (!chatTyping) return;
    const existing = chatTyping.get(userId);
    if (!existing) return;

    clearTimeout(existing.timeout);
    chatTyping.delete(userId);
    if (chatTyping.size === 0) {
      typingByChat.delete(chatId);
    }

    if (emitStop) {
      io.to(activeChatRoom(chatId)).emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId,
          status: 'stop',
          displayName: existing.displayName,
          avatarUrl: existing.avatarUrl
        }
      });
    }
  }

  function clearTypingStateForUser(userId: string): void {
    for (const chatId of typingByChat.keys()) {
      clearTypingState(chatId, userId);
    }
  }

  function markSocketOffline(socket: { id: string; data: { userId?: string } }): void {
    const userId = socket.data.userId;
    if (!userId) return;
    clearInactivePresenceTimer(socket.id);
    const sockets = onlineUsers.get(userId);
    if (!sockets?.has(socket.id)) return;
    sockets.delete(socket.id);
    clearTypingStateForUser(userId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
      emitPresenceStatus(userId, 'offline');
    }
  }

  function scheduleSocketOffline(socket: { id: string; data: { userId?: string } }): void {
    clearInactivePresenceTimer(socket.id);
    app.log.info(
      {
        userId: socket.data.userId,
        socketId: socket.id,
        timeoutMs: PRESENCE_INACTIVE_TIMEOUT_MS
      },
      'socket presence expiry scheduled'
    );
    inactivePresenceTimers.set(socket.id, setTimeout(() => {
      markSocketOffline(socket);
    }, PRESENCE_INACTIVE_TIMEOUT_MS));
  }

  function setTypingActive(chatId: string, userId: string, displayName: string, avatarUrl: string | null): void {
    clearTypingState(chatId, userId, false);
    const timeout = setTimeout(() => {
      clearTypingState(chatId, userId);
    }, TYPING_TTL_MS);
    const chatTyping = typingByChat.get(chatId) ?? new Map<string, { displayName: string; avatarUrl: string | null; timeout: ReturnType<typeof setTimeout> }>();
    chatTyping.set(userId, { displayName, avatarUrl, timeout });
    typingByChat.set(chatId, chatTyping);
    io.to(activeChatRoom(chatId)).emit('typing.update', {
      type: 'typing.update',
      payload: {
        chatId,
        userId,
        status: 'start',
        displayName,
        avatarUrl
      }
    });
  }

  function replayTypingState(socket: { emit: (event: string, payload: unknown) => void; data: { userId?: string } }, chatId: string): void {
    const chatTyping = typingByChat.get(chatId);
    if (!chatTyping) return;
    const currentUserId = socket.data.userId;
    app.log.info(
      {
        userId: currentUserId,
        socketId: (socket as { id?: string }).id ?? null,
        chatId,
        activeTypers: Array.from(chatTyping.keys()).filter((userId) => userId !== currentUserId)
      },
      'socket typing state replayed'
    );
    for (const [userId, entry] of chatTyping.entries()) {
      if (userId === currentUserId) continue;
      socket.emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId,
          status: 'start',
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl
        }
      });
    }
  }

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
      if (!user || user.status !== 'active') {
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
      if (user.must_change_password) {
        socketAuthFailures++;
        app.log.warn(
          {
            socketAuthFailures,
            socketId: socket.id,
            userId: user.id,
            transport: socket.conn.transport.name,
            origin: socket.handshake.headers.origin ?? null
          },
          'socket auth failed: password change required'
        );
        return next(new Error('Password change required'));
      }
      if (requiresTestNoticeAck(user)) {
        socketAuthFailures++;
        app.log.warn(
          {
            socketAuthFailures,
            socketId: socket.id,
            userId: user.id,
            requiredVersion: env.TEST_ACCOUNT_NOTICE_VERSION,
            acceptedVersion: user.test_notice_accepted_version,
            transport: socket.conn.transport.name,
            origin: socket.handshake.headers.origin ?? null
          },
          'socket auth failed: test notice acknowledgement required'
        );
        return next(new Error('Test account acknowledgement required'));
      }
      socket.data.userId = user.id;
      socket.data.username = user.username;
      socket.data.displayName = user.display_name;
      socket.data.avatarUrl = avatarUrlFromFileName(user.avatar_storage_key);
      socket.data.appActive = true;
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
    void listChatIdsForUser(userId).then((chatIds) => {
      chatIds.forEach((chatId) => socket.join(`chat:${chatId}`));
      app.log.info(
        {
          userId,
          socketId: socket.id,
          chatCount: chatIds.length
        },
        'socket joined member chats'
      );
    }).catch((error) => {
      app.log.warn({ error, userId, socketId: socket.id }, 'failed to join member chats');
    });
    markSocketOnline(socket);
    socket.emit('presence.sync', {
      type: 'presence.sync',
      payload: { onlineUserIds: Array.from(onlineUsers.keys()) }
    });

    socket.on('app.state', (payload: unknown) => {
      const active = Boolean((payload as { active?: boolean } | null)?.active ?? false);
      socket.data.appActive = active;
      app.log.info(
        {
          userId,
          socketId: socket.id,
          active
        },
        'socket app state updated'
      );
      if (active) {
        markSocketOnline(socket);
        return;
      }

      clearTypingStateForUser(userId);
      scheduleSocketOffline(socket);
    });

    socket.on('chat.join', async (payload: unknown, ack?: (response: { ok: boolean; chatId: string; error?: string }) => void) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) {
        ack?.({ ok: false, chatId, error: 'invalid_chat' });
        return;
      }
      if (!(await isMember(userId, chatId))) {
        ack?.({ ok: false, chatId, error: 'not_a_member' });
        return;
      }
      socket.join(activeChatRoom(chatId));
      app.log.info(
        {
          userId,
          socketId: socket.id,
          chatId
        },
        'socket chat joined'
      );
      replayTypingState(socket, chatId);
      ack?.({ ok: true, chatId });
    });

    socket.on('chat.leave', (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      socket.leave(activeChatRoom(chatId));
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
      setTypingActive(chatId, userId, socket.data.displayName as string, (socket.data.avatarUrl as string | null) ?? null);
    });

    socket.on('typing.stop', async (payload: unknown) => {
      const chatId = String((payload as any)?.chatId || '');
      if (!chatId) return;
      if (!(await isMember(userId, chatId))) return;
      clearTypingState(chatId, userId);
    });

    socket.on('message.send', async (payload: unknown) => {
      const parsed = ClientMessageSendEventSchema.safeParse({ type: 'message.send', ...(payload as object) });
      if (!parsed.success) return;

      const event = parsed.data;
      const sendState = await getChatSendState(pool, userId, event.chatId);
      if (!sendState.isMember || sendState.isReadOnly) return;

      try {
        const response = await sendChatMessage({
          io,
          log: app.log,
          chatId: event.chatId,
          senderUserId: userId,
          content: event.content,
          clientMessageId: event.clientMessageId,
          messageType: event.messageType ?? 'text',
          metadata: event.metadata ?? null,
          beforeBroadcast: () => {
            clearTypingState(event.chatId, userId);
          }
        });

        app.log.info(
          {
            userId,
            socketId: socket.id,
            chatId: event.chatId,
            messageId: response.message.id
          },
          'socket message handled'
        );
      } catch (error) {
        app.log.error({ error, userId, socketId: socket.id, chatId: event.chatId }, 'socket message failed');
      }
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
      clearInactivePresenceTimer(socket.id);
      clearTypingStateForUser(userId);
      if (!userSockets) return;
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        emitPresenceStatus(userId, 'offline');
      }
    });
  });

  return io;
}
