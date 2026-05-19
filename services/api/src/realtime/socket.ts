import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Server, Socket } from 'socket.io';
import {
  AddReactionRequestSchema,
  ClientJoinChatEventSchema,
  ClientLeaveChatEventSchema,
  ClientMessageSendEventSchema,
  ClientPresenceUpdateEventSchema,
  ClientSyncRequestSchema,
  ClientTypingStartEventSchema,
  ClientTypingStopEventSchema,
  EditMessageRequestSchema,
  MarkChatReadRequestSchema
} from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { messages, pinnedMessages, users } from '../db/schema.js';
import {
  addMessageReaction,
  assertChatMember,
  createMessage,
  deleteMessage,
  editMessage,
  markChatRead,
  removeMessageReaction
} from '../utils/messages.js';
import { appEvents } from '../core/events.js';
import { appendSyncEvent, getSyncResponse } from '../features/sync/service.js';
import { closeSocketMediaSessions, registerMediaSignaling } from './media-signaling.js';
import { assertActiveSession } from '../utils/sessions.js';
import { AppError } from '../utils/error-responses.js';

type SocketData = {
  userId: string;
  username: string;
  sessionDeviceId: string | null;
  role: 'admin' | 'member';
};

type PresenceSnapshot = {
  state: 'available' | 'busy' | 'dnd' | 'afk' | 'offline';
  note?: string;
  lastSeenAt?: string;
};

async function guarded(socket: Socket, fn: () => Promise<void>) {
  try {
    await assertSocketSession(socket);
    await fn();
  } catch (error) {
    socket.emit('error', {
      code: error instanceof AppError ? error.code : error instanceof Error ? error.name : 'SOCKET_ERROR',
      message: error instanceof Error ? error.message : 'Socket error'
    });
  }
}

async function assertSocketSession(socket: Socket) {
  await assertActiveSession({
    userId: socket.data.userId,
    username: socket.data.username,
    sessionDeviceId: socket.data.sessionDeviceId,
    role: socket.data.role
  });
}

const onlineUserSockets = new Map<string, number>();
const userPresenceCache = new Map<string, PresenceSnapshot>();
const MAX_VOICE_PARTICIPANTS = 8;

interface VoiceParticipantMeta {
  displayName: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceParticipantMeta>>(); // chatId -> userId -> metadata

export function registerSocket(io: Server, fastify: FastifyInstance) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') return next(new Error('AUTH_REQUIRED'));
    try {
      const payload = await fastify.jwt.verify<SocketData>(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.sessionDeviceId = payload.sessionDeviceId;
      socket.data.role = payload.role;
      await assertActiveSession(payload);
      socket.join(`user:${payload.userId}`);
      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, payload.userId));
      next();
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'AUTH_INVALID';
      next(new Error(code));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const count = (onlineUserSockets.get(userId) ?? 0) + 1;
      onlineUserSockets.set(userId, count);
      socket.join('presence:global');

      void initializePresence(socket, userId, count);

      socket.on('disconnecting', () => {
        closeSocketMediaSessions(socket);

        // Clean up voice rooms
        for (const roomKey of socket.rooms) {
          if (roomKey.startsWith('voice:')) {
            const chatId = roomKey.slice(6);
            const room = voiceRooms.get(chatId);
            if (room) {
              room.delete(userId);
              if (room.size === 0) {
                voiceRooms.delete(chatId);
              }
            }
            socket.to(roomKey).emit('voice.user_left', {
              type: 'voice.user_left',
              payload: { userId }
            });
          }
        }

        const current = onlineUserSockets.get(userId) ?? 0;
        if (current <= 1) {
          onlineUserSockets.delete(userId);
          userPresenceCache.delete(userId);
          db.update(users).set({ presenceState: 'offline', lastSeenAt: new Date() }).where(eq(users.id, userId))
            .catch((error) => {
              fastify.log.warn({ error, userId }, 'Failed to persist socket disconnect presence');
            });
          io.to('presence:global').emit('presence.update', {
            userId,
            state: 'offline',
            timestamp: new Date().toISOString()
          });
        } else {
          onlineUserSockets.set(userId, current - 1);
        }
      });
    }

    socket.on('sync.request', (payload) => guarded(socket, async () => {
      const parsed = ClientSyncRequestSchema.parse({ type: 'sync.request', ...payload });
      const response = await getSyncResponse(socket.data.userId, parsed.cursor ?? '0', parsed.limit);
      socket.emit('sync.batch', {
        type: 'sync.batch',
        payload: response
      });
    }));

    registerMediaSignaling(socket, io, fastify);

    socket.on('chat.join', (payload) => guarded(socket, async () => {
      const parsed = ClientJoinChatEventSchema.parse({ type: 'chat.join', ...payload });
      const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
      socket.join(`chat:${chatId}`);
      socket.emit('chat.joined', { type: 'chat.joined', payload: { chatId } });
    }));

    socket.on('chat.leave', (payload) => guarded(socket, async () => {
      const parsed = ClientLeaveChatEventSchema.parse({ type: 'chat.leave', ...payload });
      socket.leave(`chat:${parsed.chatId}`);
    }));

    socket.on('typing.start', (payload) => guarded(socket, async () => {
      const parsed = ClientTypingStartEventSchema.parse({ type: 'typing.start', ...payload });
      const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId: socket.data.userId,
          status: 'start',
          displayName: socket.data.username,
          avatarUrl: null
        }
      });
    }));

    socket.on('typing.stop', (payload) => guarded(socket, async () => {
      const parsed = ClientTypingStopEventSchema.parse({ type: 'typing.stop', ...payload });
      const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
      socket.to(`chat:${chatId}`).emit('typing.update', {
        type: 'typing.update',
        payload: {
          chatId,
          userId: socket.data.userId,
          status: 'stop',
          displayName: socket.data.username,
          avatarUrl: null
        }
      });
    }));

    socket.on('message.send', (payload) => guarded(socket, async () => {
      const parsed = ClientMessageSendEventSchema.parse({ type: 'message.send', ...payload });
      const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
      const result = await createMessage({
        chatId,
        senderId: socket.data.userId,
        content: parsed.content,
        messageType: parsed.messageType,
        metadata: parsed.metadata,
        replyToMessageId: parsed.replyToMessageId,
        clientMessageId: parsed.clientMessageId
      });

      socket.emit('message.ack', {
        type: 'message.ack',
        payload: {
          clientMessageId: parsed.clientMessageId,
          messageId: result.message.id,
          chatId,
          deliveredAt: new Date().toISOString()
        }
      });

      socket.to(`chat:${chatId}`).emit('message.new', {
        type: 'message.new',
        payload: result.message
      });

      appEvents.emit('message.sent', { message: result.message, senderId: socket.data.userId });
    }));

    socket.on('message.edit', (payload) => guarded(socket, async () => {
      const body = payload as { messageId?: string; content?: string };
      if (!body.messageId) throw new Error('messageId is required');
      const parsed = EditMessageRequestSchema.parse({ content: body.content });
      const result = await editMessage({
        messageId: body.messageId,
        editorUserId: socket.data.userId,
        content: parsed.content
      });
      io.to(`chat:${result.chatId}`).emit('message.edited', {
        type: 'message.edited',
        payload: result.event
      });
    }));

    socket.on('message.delete', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string };
      const deletion = await deleteMessage({
        messageId: body.messageId,
        actorUserId: socket.data.userId,
        actorRole: socket.data.role
      });
      io.to(`chat:${deletion.chatId}`).emit('message.deleted', {
        type: 'message.deleted',
        payload: deletion
      });
    }));

    socket.on('message.react', (payload) => guarded(socket, async () => {
      const body = payload as { messageId?: string; emoji?: string };
      if (!body.messageId) throw new Error('messageId is required');
      const parsed = AddReactionRequestSchema.parse({ emoji: body.emoji });
      const event = await addMessageReaction({
        messageId: body.messageId,
        userId: socket.data.userId,
        emoji: parsed.emoji
      });
      io.to(`chat:${event.chatId}`).emit('reaction.add', {
        type: 'reaction.add',
        payload: event
      });
    }));

    socket.on('message.unreact', (payload) => guarded(socket, async () => {
      const body = payload as { messageId?: string; emoji?: string };
      if (!body.messageId) throw new Error('messageId is required');
      const parsed = AddReactionRequestSchema.parse({ emoji: body.emoji });
      const event = await removeMessageReaction({
        messageId: body.messageId,
        userId: socket.data.userId,
        emoji: parsed.emoji
      });
      io.to(`chat:${event.chatId}`).emit('reaction.remove', {
        type: 'reaction.remove',
        payload: event
      });
    }));

    socket.on('message.read', (payload) => guarded(socket, async () => {
      const body = payload as { chatId: string; throughMessageId?: string };
      const parsed = MarkChatReadRequestSchema.parse({ throughMessageId: body.throughMessageId });
      const read = await markChatRead({
        chatId: body.chatId,
        userId: socket.data.userId,
        throughMessageId: parsed.throughMessageId
      });
      io.to(`chat:${read.chatId}`).emit('message.read', {
        type: 'message.read',
        payload: {
          chatId: read.chatId,
          readerUserId: socket.data.userId,
          seenAt: read.member.lastReadAt.toISOString(),
          seenThroughMessageId: read.messageId
        }
      });
    }));

    socket.on('message.pin', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string };
      const [row] = await db.select({ message: messages, sender: users })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.id, body.messageId))
        .limit(1);
      if (!row) return;
      await assertChatMember(row.message.chatId, socket.data.userId);
      if (row.message.senderId !== socket.data.userId && socket.data.role !== 'admin') {
        throw new Error('Only the sender or admins can pin messages');
      }
      const pinnedAt = new Date();
      await db.insert(pinnedMessages).values({
        chatId: row.message.chatId,
        messageId: row.message.id,
        pinnedBy: socket.data.userId,
        pinnedAt,
        contentSnapshot: row.message.content,
        senderDisplayNameSnapshot: row.sender.displayName
      }).onConflictDoUpdate({
        target: [pinnedMessages.chatId, pinnedMessages.messageId],
        set: {
          pinnedBy: socket.data.userId,
          pinnedAt,
          contentSnapshot: row.message.content,
          senderDisplayNameSnapshot: row.sender.displayName
        }
      });
      io.to(`chat:${row.message.chatId}`).emit('message.pinned', {
        type: 'message.pinned',
        payload: {
          chatId: row.message.chatId,
          messageId: row.message.id,
          pinnedByUserId: socket.data.userId,
          pinnedAt: pinnedAt.toISOString(),
          content: row.message.content,
          senderDisplayName: row.sender.displayName
        }
      });
      await appendSyncEvent({
        scope: 'chat',
        chatId: row.message.chatId,
        actorUserId: socket.data.userId,
        entityId: row.message.id,
        op: {
          type: 'message.pin',
          payload: {
            chatId: row.message.chatId,
            messageId: row.message.id,
            pinnedByUserId: socket.data.userId,
            pinnedAt: pinnedAt.toISOString(),
            content: row.message.content,
            senderDisplayName: row.sender.displayName
          }
        }
      });
    }));

    socket.on('message.unpin', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string };
      const [message] = await db.select().from(messages).where(eq(messages.id, body.messageId)).limit(1);
      if (!message) return;
      await assertChatMember(message.chatId, socket.data.userId);
      const [pin] = await db.select({ pinnedBy: pinnedMessages.pinnedBy })
        .from(pinnedMessages)
        .where(and(eq(pinnedMessages.chatId, message.chatId), eq(pinnedMessages.messageId, message.id)))
        .limit(1);
      if (!pin) return;
      if (pin.pinnedBy !== socket.data.userId && socket.data.role !== 'admin') {
        throw new Error('Only the pinner or admins can unpin messages');
      }
      await db.delete(pinnedMessages)
        .where(and(eq(pinnedMessages.chatId, message.chatId), eq(pinnedMessages.messageId, message.id)));
      io.to(`chat:${message.chatId}`).emit('message.unpinned', {
        type: 'message.unpinned',
        payload: {
          chatId: message.chatId,
          messageId: message.id
        }
      });
      await appendSyncEvent({
        scope: 'chat',
        chatId: message.chatId,
        actorUserId: socket.data.userId,
        entityId: message.id,
        op: { type: 'message.unpin', payload: { chatId: message.chatId, messageId: message.id } }
      });
    }));

    socket.on('presence.update', (payload) => guarded(socket, async () => {
      const parsed = ClientPresenceUpdateEventSchema.parse({ type: 'presence.update', ...payload });
      // Persist to DB
      await db.update(users).set({
        presenceState: parsed.state,
        presenceNote: parsed.note ?? '',
        presenceNoteUpdatedAt: new Date()
      }).where(eq(users.id, socket.data.userId));
      userPresenceCache.set(socket.data.userId, {
        state: parsed.state,
        note: parsed.note ?? '',
        lastSeenAt: new Date().toISOString()
      });
      io.to('presence:global').emit('presence.update', {
        userId: socket.data.userId,
        state: parsed.state,
        note: parsed.note,
        timestamp: new Date().toISOString()
      });
    }));

    // ─── Voice ───

    socket.on('voice.join', (payload) => guarded(socket, async () => {
      const parsed = { type: 'voice.join', ...payload } as { chatId: string };
      const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
      const roomKey = `voice:${chatId}`;

      let room = voiceRooms.get(chatId);
      if (room && room.size >= MAX_VOICE_PARTICIPANTS) {
        socket.emit('error', { code: 'VOICE_ROOM_FULL', message: `Voice room is full (max ${MAX_VOICE_PARTICIPANTS})` });
        return;
      }

      socket.join(roomKey);

      if (!room) {
        room = new Map();
        voiceRooms.set(chatId, room);
      }
      room.set(socket.data.userId, { displayName: socket.data.username, muted: false, deafened: false, speaking: false });

      // Send existing participants to newcomer
      const existing = Array.from(room.entries())
        .filter(([id]) => id !== socket.data.userId)
        .map(([id, meta]) => ({
          userId: id,
          displayName: meta.displayName,
          muted: meta.muted,
          deafened: meta.deafened,
          speaking: meta.speaking
        }));
      socket.emit('voice.state', {
        type: 'voice.state',
        payload: { participants: existing }
      });

      // Notify existing participants
      socket.to(roomKey).emit('voice.user_joined', {
        type: 'voice.user_joined',
        payload: { userId: socket.data.userId, displayName: socket.data.username, muted: false, deafened: false, speaking: false }
      });
    }));

    socket.on('voice.leave', (payload) => guarded(socket, async () => {
      const parsed = { type: 'voice.leave', ...payload } as { chatId: string };
      const chatId = parsed.chatId;
      const roomKey = `voice:${chatId}`;

      socket.leave(roomKey);

      const room = voiceRooms.get(chatId);
      if (room) {
        room.delete(socket.data.userId);
        if (room.size === 0) {
          voiceRooms.delete(chatId);
        }
      }

      socket.to(roomKey).emit('voice.user_left', {
        type: 'voice.user_left',
        payload: { userId: socket.data.userId }
      });
    }));

    socket.on('voice.signal', (payload) => guarded(socket, async () => {
      const parsed = payload as { targetUserId: string; data: Record<string, unknown> };
      io.to(`user:${parsed.targetUserId}`).emit('voice.signal', {
        type: 'voice.signal',
        payload: { fromUserId: socket.data.userId, data: parsed.data }
      });
    }));

    socket.on('voice.mute', (payload) => guarded(socket, async () => {
      const parsed = payload as { muted: boolean };
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
      for (const roomKey of rooms) {
        const chatId = roomKey.slice(6);
        const room = voiceRooms.get(chatId);
        if (room) {
          const meta = room.get(socket.data.userId);
          if (meta) meta.muted = parsed.muted;
        }
        socket.to(roomKey).emit('voice.mute', {
          type: 'voice.mute',
          payload: { userId: socket.data.userId, muted: parsed.muted }
        });
      }
    }));

    socket.on('voice.deafen', (payload) => guarded(socket, async () => {
      const parsed = payload as { deafened: boolean };
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
      for (const roomKey of rooms) {
        const chatId = roomKey.slice(6);
        const room = voiceRooms.get(chatId);
        if (room) {
          const meta = room.get(socket.data.userId);
          if (meta) meta.deafened = parsed.deafened;
        }
        socket.to(roomKey).emit('voice.deafen', {
          type: 'voice.deafen',
          payload: { userId: socket.data.userId, deafened: parsed.deafened }
        });
      }
    }));

    socket.on('voice.ptt', (payload) => guarded(socket, async () => {
      const parsed = payload as { active: boolean };
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
      for (const roomKey of rooms) {
        socket.to(roomKey).emit('voice.ptt', {
          type: 'voice.ptt',
          payload: { userId: socket.data.userId, active: parsed.active }
        });
      }
    }));

    socket.on('voice.speaking', (payload) => guarded(socket, async () => {
      const parsed = payload as { speaking: boolean };
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
      for (const roomKey of rooms) {
        const chatId = roomKey.slice(6);
        const room = voiceRooms.get(chatId);
        if (room) {
          const meta = room.get(socket.data.userId);
          if (meta) meta.speaking = parsed.speaking;
        }
        socket.to(roomKey).emit('voice.speaking', {
          type: 'voice.speaking',
          payload: { userId: socket.data.userId, speaking: parsed.speaking }
        });
      }
    }));
  });

  async function initializePresence(socket: Socket, userId: string, connectionCount: number) {
    try {
      const [userRow] = await db.select({
        presenceState: users.presenceState,
        presenceNote: users.presenceNote,
        lastSeenAt: users.lastSeenAt
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const currentPresence: PresenceSnapshot = {
        state: userRow?.presenceState ?? 'available',
        note: userRow?.presenceNote ?? '',
        lastSeenAt: userRow?.lastSeenAt?.toISOString()
      };
      userPresenceCache.set(userId, currentPresence);

      const sync: Record<string, PresenceSnapshot> = {};
      for (const [uid, count] of onlineUserSockets) {
        if (count > 0) {
          sync[uid] = userPresenceCache.get(uid) ?? { state: 'available' };
        }
      }
      socket.emit('presence.sync', sync);

      if (connectionCount === 1) {
        socket.to('presence:global').emit('presence.update', {
          userId,
          state: currentPresence.state,
          note: currentPresence.note,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      fastify.log.warn({ error, userId }, 'Failed to initialize socket presence');
      userPresenceCache.set(userId, { state: 'available' });
      socket.emit('presence.sync', Object.fromEntries(userPresenceCache));
    }
  }
}
