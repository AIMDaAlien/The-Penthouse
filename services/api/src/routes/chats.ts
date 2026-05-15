import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  ChatPreferencesRequestSchema,
  CreateDirectChatRequestSchema,
  EditMessageRequestSchema,
  MarkChatReadRequestSchema,
  PinMessageRequestSchema,
  SendMessageRequestSchema
} from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { chatMembers, chats, directChats, messageDeletions, messageEdits, messageReactions, messages, pinnedMessages, users } from '../db/schema.js';
import { badRequest, forbidden, notFound } from '../utils/error-responses.js';
import { assertChatMember, createMessage, hydrateMessage, listMessages, unreadCount } from '../utils/messages.js';
import { avatarUrlFromMediaId } from '../utils/users.js';
import { appEvents } from '../core/events.js';
import { appendSyncEvent, buildChatSummaryForUser } from '../features/sync/service.js';

export async function registerChatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chats/dm', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateDirectChatRequestSchema.parse(request.body);
    const memberId = body.memberId;
    const myId = request.authUser!.userId;

    if (memberId === myId) throw badRequest('Cannot create a DM with yourself');

    const [otherUser] = await db.select().from(users).where(eq(users.id, memberId)).limit(1);
    if (!otherUser) throw notFound('User not found');

    const firstUserId = myId < memberId ? myId : memberId;
    const secondUserId = myId < memberId ? memberId : myId;

    const [existing] = await db.select().from(directChats)
      .where(and(eq(directChats.firstUserId, firstUserId), eq(directChats.secondUserId, secondUserId)))
      .limit(1);

    if (existing) {
      return { chatId: existing.chatId };
    }

    const [chat] = await db.insert(chats).values({
      type: 'dm',
      name: otherUser.displayName
    }).returning();

    await db.insert(chatMembers).values([
      { chatId: chat.id, userId: myId },
      { chatId: chat.id, userId: memberId }
    ]);

    await db.insert(directChats).values({
      chatId: chat.id,
      firstUserId,
      secondUserId
    });

    const memberRows = await db.select().from(chatMembers).where(eq(chatMembers.chatId, chat.id));
    for (const member of memberRows) {
      await appendSyncEvent({
        scope: 'user',
        userId: member.userId,
        actorUserId: myId,
        entityId: chat.id,
        op: { type: 'chat.upsert', payload: await buildChatSummaryForUser(chat, member, member.userId) }
      });
    }

    return { chatId: chat.id };
  });

  fastify.get('/api/v1/chats', { preHandler: fastify.authenticate }, async (request) => {
    const rows = await db.select({
      chat: chats,
      member: chatMembers
    })
      .from(chatMembers)
      .innerJoin(chats, eq(chatMembers.chatId, chats.id))
      .where(and(
        eq(chatMembers.userId, request.authUser!.userId),
        isNull(chats.parentChatId)
      ))
      .orderBy(sql`${chats.updatedAt} DESC`);

    const summaries = [];
    for (const row of rows) {
      let name = row.chat.name;
      let counterpartMemberId: string | undefined;
      let counterpartAvatarUrl: string | null | undefined;

      if (row.chat.type === 'dm') {
        const [other] = await db.select({ user: users })
          .from(chatMembers)
          .innerJoin(users, eq(chatMembers.userId, users.id))
          .where(and(eq(chatMembers.chatId, row.chat.id), sql`${chatMembers.userId} <> ${request.authUser!.userId}`))
          .limit(1);
        if (other) {
          name = other.user.displayName;
          counterpartMemberId = other.user.id;
          counterpartAvatarUrl = avatarUrlFromMediaId(other.user.avatarMediaId);
        }
      }

      summaries.push({
        id: row.chat.id,
        type: row.chat.type,
        name,
        updatedAt: row.chat.updatedAt.toISOString(),
        archivedAt: row.member.archivedAt?.toISOString() ?? null,
        unreadCount: await unreadCount(row.chat.id, request.authUser!.userId),
        counterpartMemberId,
        counterpartAvatarUrl,
        notificationsMuted: row.member.notificationsMuted
      });
    }

    return { chats: summaries };
  });

  fastify.get('/api/v1/chats/:id/messages', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { before?: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    return { messages: await listMessages(chatId, request.authUser!.userId, query.before) };
  });

  fastify.get('/api/v1/chats/:id/messages/search', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { q?: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const searchTerm = (query.q ?? '').trim();
    if (!searchTerm) return { messages: [] };

    const rows = await db.select({ id: messages.id })
      .from(messages)
      .where(and(
        eq(messages.chatId, chatId),
        ilike(messages.content, `%${searchTerm}%`)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    const hydrated = [];
    for (const row of rows) {
      hydrated.push(await hydrateMessage(row.id, request.authUser!.userId));
    }
    return { messages: hydrated };
  });

  fastify.get('/api/v1/chats/:id/members', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const rows = await db.select({ user: users })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(eq(chatMembers.chatId, chatId))
      .orderBy(users.displayName);

    return {
      members: rows.map(({ user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: avatarUrlFromMediaId(user.avatarMediaId),
        bio: user.bio,
        timezone: user.timezone,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        profileStyle: user.profileStyle,
        bannerUrl: user.bannerUrl
      }))
    };
  });

  fastify.post('/api/v1/chats/:id/messages', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = SendMessageRequestSchema.parse({ ...(request.body as object), chatId });
    const result = await createMessage({
      chatId,
      senderId: request.authUser!.userId,
      content: body.content,
      messageType: body.type,
      metadata: body.metadata,
      replyToMessageId: body.replyToMessageId,
      clientMessageId: body.clientMessageId
    });

    // Broadcast to other room members via Socket.IO
    fastify.io.to(`chat:${chatId}`).emit('message.new', {
      type: 'message.new',
      payload: result.message
    });

    await appendSyncEvent({
      scope: 'chat',
      chatId,
      actorUserId: request.authUser!.userId,
      entityId: result.message.id,
      op: { type: 'message.upsert', payload: result.message }
    });

    appEvents.emit('message.sent', { message: result.message, senderId: request.authUser!.userId });

    return result;
  });

  fastify.patch('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = EditMessageRequestSchema.parse(request.body);
    const [message] = await db.select().from(messages).where(eq(messages.id, params.id)).limit(1);
    if (!message) throw notFound('Message not found');
    await assertChatMember(message.chatId, request.authUser!.userId);
    if (message.senderId !== request.authUser!.userId) throw forbidden('Only the sender can edit this message');

    await db.transaction(async (tx) => {
      await tx.insert(messageEdits).values({
        messageId: message.id,
        previousContent: message.content,
        editedBy: request.authUser!.userId
      });
      await tx.update(messages).set({ content: body.content }).where(eq(messages.id, message.id));
    });

    const hydrated = await hydrateMessage(message.id, request.authUser!.userId);

    fastify.io.to(`chat:${message.chatId}`).emit('message.edited', {
      type: 'message.edited',
      payload: {
        chatId: message.chatId,
        messageId: message.id,
        content: hydrated.content,
        editedAt: hydrated.editedAt ?? new Date().toISOString(),
        editCount: hydrated.editCount ?? 0
      }
    });

    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: request.authUser!.userId,
      entityId: message.id,
      op: { type: 'message.upsert', payload: hydrated }
    });

    return { message: hydrated };
  });

  fastify.delete('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const [message] = await db.select().from(messages).where(eq(messages.id, params.id)).limit(1);
    if (!message) throw notFound('Message not found');
    await assertChatMember(message.chatId, request.authUser!.userId);
    if (message.senderId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the sender can delete this message');
    }

    const [deletion] = await db.insert(messageDeletions).values({
      messageId: message.id,
      deletedByUserId: request.authUser!.userId
    }).onConflictDoUpdate({
      target: messageDeletions.messageId,
      set: {
        deletedByUserId: request.authUser!.userId,
        deletedAt: new Date()
      }
    }).returning();

    fastify.io.to(`chat:${message.chatId}`).emit('message.deleted', {
      type: 'message.deleted',
      payload: {
        chatId: message.chatId,
        messageId: message.id,
        deletedAt: deletion.deletedAt.toISOString(),
        deletedByUserId: deletion.deletedByUserId
      }
    });

    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: request.authUser!.userId,
      entityId: message.id,
      op: {
        type: 'message.delete',
        payload: {
          chatId: message.chatId,
          messageId: message.id,
          deletedAt: deletion.deletedAt.toISOString(),
          deletedByUserId: deletion.deletedByUserId
        }
      }
    });

    return {
      messageId: message.id,
      deletedAt: deletion.deletedAt.toISOString(),
      deletedByUserId: deletion.deletedByUserId
    };
  });

  fastify.post('/api/v1/chats/:id/read', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = MarkChatReadRequestSchema.parse(request.body);
    if (!body.throughMessageId) throw badRequest('throughMessageId is required');

    const [message] = await db.select().from(messages)
      .where(and(eq(messages.id, body.throughMessageId), eq(messages.chatId, chatId)))
      .limit(1);
    if (!message) throw badRequest('throughMessageId must belong to this chat');

    const [member] = await db.update(chatMembers)
      .set({ lastReadMessageId: message.id, lastReadAt: new Date() })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, request.authUser!.userId)))
      .returning();

    fastify.io.to(`chat:${chatId}`).emit('message.read', {
      type: 'message.read',
      payload: {
        chatId,
        readerUserId: request.authUser!.userId,
        seenAt: member.lastReadAt.toISOString(),
        seenThroughMessageId: message.id
      }
    });

    await appendSyncEvent({
      scope: 'chat',
      chatId,
      actorUserId: request.authUser!.userId,
      entityId: `${chatId}:${request.authUser!.userId}`,
      op: {
        type: 'read.upsert',
        payload: {
          chatId,
          userId: request.authUser!.userId,
          lastReadAt: member.lastReadAt.toISOString(),
          lastReadMessageId: member.lastReadMessageId ?? null,
          notificationsMuted: member.notificationsMuted,
          archivedAt: member.archivedAt?.toISOString() ?? null
        }
      }
    });

    return {
      chatId,
      unreadCount: await unreadCount(chatId, request.authUser!.userId),
      lastReadAt: member.lastReadAt.toISOString(),
      seenThroughMessageId: message.id
    };
  });

  fastify.patch('/api/v1/chats/:id/preferences', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const body = ChatPreferencesRequestSchema.parse(request.body);
    const [member] = await db.update(chatMembers)
      .set({ notificationsMuted: body.notificationsMuted, notificationsMutedUpdatedAt: new Date() })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, request.authUser!.userId)))
      .returning();

    await appendSyncEvent({
      scope: 'user',
      userId: request.authUser!.userId,
      actorUserId: request.authUser!.userId,
      entityId: `${chatId}:${request.authUser!.userId}`,
      op: {
        type: 'read.upsert',
        payload: {
          chatId,
          userId: request.authUser!.userId,
          lastReadAt: member.lastReadAt.toISOString(),
          lastReadMessageId: member.lastReadMessageId ?? null,
          notificationsMuted: member.notificationsMuted,
          archivedAt: member.archivedAt?.toISOString() ?? null
        }
      }
    });

    return {
      chatId,
      notificationsMuted: member.notificationsMuted,
      updatedAt: member.notificationsMutedUpdatedAt.toISOString()
    };
  });

  fastify.post('/api/v1/chats/:id/pins', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = PinMessageRequestSchema.parse(request.body);
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);

    const [message] = await db.select({ message: messages, sender: users })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.id, body.messageId), eq(messages.chatId, chatId)))
      .limit(1);
    if (!message) throw notFound('Message not found');
    if (message.message.senderId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the sender or admins can pin messages');
    }

    const pinnedAt = new Date();
    const [pin] = await db.insert(pinnedMessages).values({
      chatId,
      messageId: body.messageId,
      pinnedBy: request.authUser!.userId,
      pinnedAt,
      contentSnapshot: message.message.content,
      senderDisplayNameSnapshot: message.sender.displayName
    }).onConflictDoUpdate({
      target: [pinnedMessages.chatId, pinnedMessages.messageId],
      set: {
        pinnedBy: request.authUser!.userId,
        pinnedAt,
        contentSnapshot: message.message.content,
        senderDisplayNameSnapshot: message.sender.displayName
      }
    }).returning();

    const payload = {
      chatId: pin.chatId,
      messageId: pin.messageId,
      pinnedByUserId: pin.pinnedBy,
      pinnedAt: pin.pinnedAt.toISOString(),
      content: pin.contentSnapshot,
      senderDisplayName: pin.senderDisplayNameSnapshot
    };
    fastify.io.to(`chat:${chatId}`).emit('message.pinned', {
      type: 'message.pinned',
      payload
    });
    await appendSyncEvent({
      scope: 'chat',
      chatId,
      actorUserId: request.authUser!.userId,
      entityId: pin.messageId,
      op: { type: 'message.pin', payload }
    });

    return { pin: payload };
  });

  fastify.delete('/api/v1/chats/:id/pins/:messageId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string; messageId: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const [pin] = await db.select({ pinnedBy: pinnedMessages.pinnedBy })
      .from(pinnedMessages)
      .where(and(eq(pinnedMessages.chatId, chatId), eq(pinnedMessages.messageId, params.messageId)))
      .limit(1);
    if (!pin) throw notFound('Pin not found');
    if (pin.pinnedBy !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the pinner or admins can unpin messages');
    }
    await db.delete(pinnedMessages)
      .where(and(eq(pinnedMessages.chatId, chatId), eq(pinnedMessages.messageId, params.messageId)));
    fastify.io.to(`chat:${chatId}`).emit('message.unpinned', {
      type: 'message.unpinned',
      payload: { chatId, messageId: params.messageId }
    });
    await appendSyncEvent({
      scope: 'chat',
      chatId,
      actorUserId: request.authUser!.userId,
      entityId: params.messageId,
      op: { type: 'message.unpin', payload: { chatId, messageId: params.messageId } }
    });
    return { success: true };
  });

  fastify.get('/api/v1/chats/:id/pins', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chatId } = await assertChatMember(params.id, request.authUser!.userId);
    const rows = await db.select({ pin: pinnedMessages, message: messages, sender: users })
      .from(pinnedMessages)
      .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(pinnedMessages.chatId, chatId))
      .orderBy(desc(pinnedMessages.pinnedAt));

    return {
      pins: rows.map(({ pin, message, sender }) => ({
        chatId: pin.chatId,
        messageId: pin.messageId,
        pinnedByUserId: pin.pinnedBy,
        pinnedAt: pin.pinnedAt.toISOString(),
        content: pin.contentSnapshot,
        senderDisplayName: pin.senderDisplayNameSnapshot,
        message: {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderDisplayName: sender.displayName,
          senderAvatarUrl: avatarUrlFromMediaId(sender.avatarMediaId),
          content: message.content,
          type: message.messageType,
          createdAt: message.createdAt.toISOString()
        }
      }))
    };
  });

  fastify.post('/api/v1/messages/:id/reactions', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { emoji?: string };
    if (!body.emoji) throw badRequest('emoji is required');
    const message = await hydrateMessage(params.id, request.authUser!.userId);
    await assertChatMember(message.chatId, request.authUser!.userId);
    await db.insert(messageReactions).values({
      messageId: params.id,
      userId: request.authUser!.userId,
      emoji: body.emoji
    }).onConflictDoNothing();
    fastify.io.to(`chat:${message.chatId}`).emit('reaction.add', {
      type: 'reaction.add',
      payload: {
        chatId: message.chatId,
        messageId: params.id,
        userId: request.authUser!.userId,
        emoji: body.emoji,
        createdAt: new Date().toISOString()
      }
    });
    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: request.authUser!.userId,
      entityId: `${params.id}:${request.authUser!.userId}:${body.emoji}`,
      op: {
        type: 'reaction.add',
        payload: {
          chatId: message.chatId,
          messageId: params.id,
          userId: request.authUser!.userId,
          emoji: body.emoji,
          createdAt: new Date().toISOString()
        }
      }
    });
    return reply.status(204).send();
  });
}
