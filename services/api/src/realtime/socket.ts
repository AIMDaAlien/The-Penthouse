import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Server, Socket } from 'socket.io';
import {
  ClientJoinChatEventSchema,
  ClientLeaveChatEventSchema,
  ClientMessageSendEventSchema,
  ClientPresenceUpdateEventSchema,
  ClientTypingStartEventSchema,
  ClientTypingStopEventSchema
} from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { chatMembers, messageDeletions, messageReactions, messages, pinnedMessages, users } from '../db/schema.js';
import { assertChatMember, createMessage, hydrateMessage } from '../utils/messages.js';
import { appEvents } from '../core/events.js';

type SocketData = {
  userId: string;
  username: string;
  role: 'admin' | 'member';
};

type PresenceSnapshot = {
  state: 'available' | 'busy' | 'dnd' | 'afk' | 'offline';
  note?: string;
  lastSeenAt?: string;
};

async function guarded(socket: Socket, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    socket.emit('error', {
      code: error instanceof Error ? error.name : 'SOCKET_ERROR',
      message: error instanceof Error ? error.message : 'Socket error'
    });
  }
}

const onlineUserSockets = new Map<string, number>();
const userPresenceCache = new Map<string, PresenceSnapshot>();
const MAX_VOICE_PARTICIPANTS = 8;

interface VoiceParticipantMeta {
  displayName: string;
  muted: boolean;
  deafened: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceParticipantMeta>>(); // chatId -> userId -> metadata

export function registerSocket(io: Server, fastify: FastifyInstance) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') return next(new Error('AUTH_REQUIRED'));
    try {
      const payload = await fastify.jwt.verify<SocketData & { sessionDeviceId: string | null }>(token);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.role = payload.role;
      socket.join(`user:${payload.userId}`);
      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, payload.userId));
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
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
      const body = payload as { messageId: string; content: string };
      const [message] = await db.select().from(messages).where(eq(messages.id, body.messageId)).limit(1);
      if (!message) return;
      await assertChatMember(message.chatId, socket.data.userId);
      if (message.senderId !== socket.data.userId) return;
      await db.update(messages).set({ content: body.content }).where(eq(messages.id, message.id));
      const hydrated = await hydrateMessage(message.id, socket.data.userId);
      io.to(`chat:${message.chatId}`).emit('message.edited', {
        type: 'message.edited',
        payload: {
          chatId: message.chatId,
          messageId: message.id,
          content: hydrated.content,
          editedAt: hydrated.editedAt ?? new Date().toISOString(),
          editCount: hydrated.editCount ?? 0
        }
      });
    }));

    socket.on('message.delete', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string };
      const [message] = await db.select().from(messages).where(eq(messages.id, body.messageId)).limit(1);
      if (!message) return;
      await assertChatMember(message.chatId, socket.data.userId);
      if (message.senderId !== socket.data.userId && socket.data.role !== 'admin') return;
      const [deletion] = await db.insert(messageDeletions).values({
        messageId: message.id,
        deletedByUserId: socket.data.userId
      }).onConflictDoUpdate({
        target: messageDeletions.messageId,
        set: { deletedByUserId: socket.data.userId, deletedAt: new Date() }
      }).returning();
      io.to(`chat:${message.chatId}`).emit('message.deleted', {
        type: 'message.deleted',
        payload: {
          chatId: message.chatId,
          messageId: message.id,
          deletedAt: deletion.deletedAt.toISOString(),
          deletedByUserId: deletion.deletedByUserId
        }
      });
    }));

    socket.on('message.react', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string; emoji: string };
      const message = await hydrateMessage(body.messageId, socket.data.userId);
      await assertChatMember(message.chatId, socket.data.userId);
      await db.insert(messageReactions).values({
        messageId: body.messageId,
        userId: socket.data.userId,
        emoji: body.emoji
      }).onConflictDoNothing();
      io.to(`chat:${message.chatId}`).emit('reaction.add', {
        type: 'reaction.add',
        payload: {
          chatId: message.chatId,
          messageId: body.messageId,
          userId: socket.data.userId,
          emoji: body.emoji,
          createdAt: new Date().toISOString()
        }
      });
    }));

    socket.on('message.unreact', (payload) => guarded(socket, async () => {
      const body = payload as { messageId: string; emoji: string };
      const message = await hydrateMessage(body.messageId, socket.data.userId);
      await assertChatMember(message.chatId, socket.data.userId);
      await db.delete(messageReactions)
        .where(and(
          eq(messageReactions.messageId, body.messageId),
          eq(messageReactions.userId, socket.data.userId),
          eq(messageReactions.emoji, body.emoji)
        ));
      io.to(`chat:${message.chatId}`).emit('reaction.remove', {
        type: 'reaction.remove',
        payload: {
          chatId: message.chatId,
          messageId: body.messageId,
          userId: socket.data.userId,
          emoji: body.emoji
        }
      });
    }));

    socket.on('message.read', (payload) => guarded(socket, async () => {
      const body = payload as { chatId: string; throughMessageId?: string };
      if (!body.throughMessageId) return;
      const { chatId } = await assertChatMember(body.chatId, socket.data.userId);
      await db.update(chatMembers)
        .set({ lastReadMessageId: body.throughMessageId, lastReadAt: new Date() })
        .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, socket.data.userId)));
      io.to(`chat:${chatId}`).emit('message.read', {
        type: 'message.read',
        payload: {
          chatId,
          readerUserId: socket.data.userId,
          seenAt: new Date().toISOString(),
          seenThroughMessageId: body.throughMessageId
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
      room.set(socket.data.userId, { displayName: socket.data.username, muted: false, deafened: false });

      // Send existing participants to newcomer
      const existing = Array.from(room.entries())
        .filter(([id]) => id !== socket.data.userId)
        .map(([id, meta]) => ({ userId: id, displayName: meta.displayName, muted: meta.muted, deafened: meta.deafened }));
      socket.emit('voice.state', {
        type: 'voice.state',
        payload: { participants: existing }
      });

      // Notify existing participants
      socket.to(roomKey).emit('voice.user_joined', {
        type: 'voice.user_joined',
        payload: { userId: socket.data.userId, displayName: socket.data.username, muted: false, deafened: false }
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

    socket.on('voice.signal', (payload) => {
      try {
        const parsed = payload as { targetUserId: string; data: Record<string, unknown> };
        io.to(`user:${parsed.targetUserId}`).emit('voice.signal', {
          type: 'voice.signal',
          payload: { fromUserId: socket.data.userId, data: parsed.data }
        });
      } catch (error) {
        fastify.log.warn({ error, userId: socket.data.userId }, 'voice.signal relay failed');
      }
    });

    socket.on('voice.mute', (payload) => {
      try {
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
      } catch (error) {
        fastify.log.warn({ error, userId: socket.data.userId }, 'voice.mute relay failed');
      }
    });

    socket.on('voice.deafen', (payload) => {
      try {
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
      } catch (error) {
        fastify.log.warn({ error, userId: socket.data.userId }, 'voice.deafen relay failed');
      }
    });

    socket.on('voice.ptt', (payload) => {
      try {
        const parsed = payload as { active: boolean };
        const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
        for (const roomKey of rooms) {
          socket.to(roomKey).emit('voice.ptt', {
            type: 'voice.ptt',
            payload: { userId: socket.data.userId, active: parsed.active }
          });
        }
      } catch (error) {
        fastify.log.warn({ error, userId: socket.data.userId }, 'voice.ptt relay failed');
      }
    });

    socket.on('voice.speaking', (payload) => {
      try {
        const parsed = payload as { speaking: boolean };
        const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('voice:'));
        for (const roomKey of rooms) {
          socket.to(roomKey).emit('voice.speaking', {
            type: 'voice.speaking',
            payload: { userId: socket.data.userId, speaking: parsed.speaking }
          });
        }
      } catch (error) {
        fastify.log.warn({ error, userId: socket.data.userId }, 'voice.speaking relay failed');
      }
    });
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
