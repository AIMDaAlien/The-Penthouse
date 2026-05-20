import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  AddChatMemberRequestSchema,
  ChatPreferencesRequestSchema,
  CreateDirectChatRequestSchema,
  CreateGroupChatRequestSchema,
  EditMessageRequestSchema,
  MarkChatReadRequestSchema,
  PinMessageRequestSchema,
  SendMessageRequestSchema,
  UpdateChatRequestSchema
} from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { chatMembers, chats, directChats, messages, pinnedMessages, users } from '../db/schema.js';
import { badRequest, forbidden, notFound } from '../utils/error-responses.js';
import {
  addMessageReaction,
  assertChatMember,
  createMessage,
  deleteMessage,
  editMessage,
  hydrateMessage,
  listMessages,
  markChatRead,
  unreadCount
} from '../utils/messages.js';
import { avatarUrlFromMediaId, bannerUrlFromMediaId } from '../utils/users.js';
import { appEvents } from '../core/events.js';
import { appendSyncEvent, buildChatSummaryForUser } from '../features/sync/service.js';
import {
  assertNotLastOwner,
  childChannels,
  requireChatManager,
  resolveChatHierarchy,
  rootMember,
  serializeChannel
} from '../utils/chat-management.js';

type ChatMember = typeof chatMembers.$inferSelect;
type Chat = typeof chats.$inferSelect;

function readStatePayload(member: ChatMember) {
  return {
    chatId: member.chatId,
    userId: member.userId,
    lastReadAt: member.lastReadAt?.toISOString() ?? null,
    lastReadMessageId: member.lastReadMessageId ?? null,
    notificationsMuted: member.notificationsMuted,
    archivedAt: member.archivedAt?.toISOString() ?? null
  };
}

async function appendChatSummaryForMembers(
  chat: Chat,
  members: ChatMember[],
  actorUserId: string,
  writer: Pick<typeof db, 'insert'> = db
) {
  for (const member of members) {
    await appendSyncEvent({
      scope: 'user',
      userId: member.userId,
      actorUserId,
      entityId: chat.id,
      op: { type: 'chat.upsert', payload: await buildChatSummaryForUser(chat, member, member.userId) }
    }, writer);
  }
}

async function setArchivedAt(chatId: string, userId: string, actorUserId: string, archivedAt: Date | null) {
  const { chatId: resolvedChatId } = await assertChatMember(chatId, userId);
  const [member] = await db.update(chatMembers)
    .set({ archivedAt })
    .where(and(eq(chatMembers.chatId, resolvedChatId), eq(chatMembers.userId, userId)))
    .returning();

  await appendSyncEvent({
    scope: 'user',
    userId,
    actorUserId,
    entityId: `${resolvedChatId}:${userId}`,
    op: { type: 'read.upsert', payload: readStatePayload(member) }
  });

  return {
    chatId: resolvedChatId,
    archivedAt: member.archivedAt?.toISOString() ?? null
  };
}

async function removeMemberFromGroup(rootChatId: string, member: ChatMember, actorUserId: string) {
  await assertNotLastOwner(rootChatId, member);
  const channels = await childChannels(rootChatId);
  const channelIds = channels.map((channel) => channel.id);
  const chatIds = [rootChatId, ...channelIds];

  await db.transaction(async (tx) => {
    await tx.delete(chatMembers)
      .where(and(eq(chatMembers.userId, member.userId), inArray(chatMembers.chatId, chatIds)));

    for (const channel of channels) {
      await appendSyncEvent({
        scope: 'user',
        userId: member.userId,
        actorUserId,
        entityId: channel.id,
        op: { type: 'channel.delete', payload: { channelId: channel.id, parentChatId: rootChatId } }
      }, tx);
    }

    await appendSyncEvent({
      scope: 'user',
      userId: member.userId,
      actorUserId,
      entityId: rootChatId,
      op: { type: 'chat.delete', payload: { chatId: rootChatId } }
    }, tx);
  });
}

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

  fastify.post('/api/v1/chats/group', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateGroupChatRequestSchema.parse(request.body);
    const myId = request.authUser!.userId;
    const memberIds = [...new Set(body.memberIds.filter((id) => id !== myId))];

    if (memberIds.length > 0) {
      const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, memberIds));
      if (found.length !== memberIds.length) throw notFound('One or more users were not found');
    }

    const { chat, members } = await db.transaction(async (tx) => {
      const [created] = await tx.insert(chats).values({
        type: 'group',
        name: body.name
      }).returning();

      const values = [
        { chatId: created.id, userId: myId, role: 'owner' as const },
        ...memberIds.map((memberId) => ({ chatId: created.id, userId: memberId, role: 'member' as const }))
      ];
      const insertedMembers = await tx.insert(chatMembers).values(values).returning();

      await appendChatSummaryForMembers(created, insertedMembers, myId, tx);
      return { chat: created, members: insertedMembers };
    });

    for (const member of members) {
      fastify.io.to(`user:${member.userId}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: chat.id, reason: 'group.created' }
      });
    }

    const ownMember = members.find((member) => member.userId === myId)!;
    return { chat: await buildChatSummaryForUser(chat, ownMember, myId) };
  });

  fastify.patch('/api/v1/chats/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = UpdateChatRequestSchema.parse(request.body);
    const { chat, root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);
    if (chat.type === 'dm') throw badRequest('DMs cannot be renamed');

    const [updated] = await db.update(chats)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(chats.id, chat.id))
      .returning();

    if (updated.type === 'channel') {
      const serialized = serializeChannel(updated);
      await appendSyncEvent({
        scope: 'chat',
        chatId: updated.id,
        actorUserId: request.authUser!.userId,
        entityId: updated.id,
        op: { type: 'channel.upsert', payload: serialized }
      });
      fastify.io.to(`chat:${updated.id}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: root.id, reason: 'channel.renamed' }
      });
      return { channel: serialized };
    }

    const memberRows = await db.select().from(chatMembers).where(eq(chatMembers.chatId, updated.id));
    await appendChatSummaryForMembers(updated, memberRows, request.authUser!.userId);
    for (const member of memberRows) {
      fastify.io.to(`user:${member.userId}`).emit('chat.sync_required', {
        type: 'chat.sync_required',
        payload: { chatId: updated.id, reason: 'group.renamed' }
      });
    }

    const viewerMember = memberRows.find((member) => member.userId === request.authUser!.userId) ?? memberRows[0];
    return { chat: await buildChatSummaryForUser(updated, viewerMember, request.authUser!.userId) };
  });

  fastify.delete('/api/v1/chats/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { chat, root } = await resolveChatHierarchy(params.id);

    if (chat.type === 'dm') {
      return setArchivedAt(chat.id, request.authUser!.userId, request.authUser!.userId, new Date());
    }

    await requireChatManager(chat.id, request.authUser!.userId, request.authUser!.role);

    if (chat.type === 'channel') {
      const memberRows = await db.select({ userId: chatMembers.userId })
        .from(chatMembers)
        .where(eq(chatMembers.chatId, chat.id));

      await db.transaction(async (tx) => {
        await tx.delete(chats).where(eq(chats.id, chat.id));
        for (const member of memberRows) {
          await appendSyncEvent({
            scope: 'user',
            userId: member.userId,
            actorUserId: request.authUser!.userId,
            entityId: chat.id,
            op: { type: 'channel.delete', payload: { channelId: chat.id, parentChatId: root.id } }
          }, tx);
        }
      });

      return { chatId: chat.id, deletedAt: new Date().toISOString() };
    }

    const channels = await childChannels(chat.id);
    const memberRows = await db.select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chat.id));

    await db.transaction(async (tx) => {
      await tx.delete(chats).where(eq(chats.id, chat.id));
      for (const member of memberRows) {
        for (const channel of channels) {
          await appendSyncEvent({
            scope: 'user',
            userId: member.userId,
            actorUserId: request.authUser!.userId,
            entityId: channel.id,
            op: { type: 'channel.delete', payload: { channelId: channel.id, parentChatId: chat.id } }
          }, tx);
        }
        await appendSyncEvent({
          scope: 'user',
          userId: member.userId,
          actorUserId: request.authUser!.userId,
          entityId: chat.id,
          op: { type: 'chat.delete', payload: { chatId: chat.id } }
        }, tx);
      }
    });

    return { chatId: chat.id, deletedAt: new Date().toISOString() };
  });

  fastify.post('/api/v1/chats/:id/archive', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    return setArchivedAt(params.id, request.authUser!.userId, request.authUser!.userId, new Date());
  });

  fastify.post('/api/v1/chats/:id/unarchive', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    return setArchivedAt(params.id, request.authUser!.userId, request.authUser!.userId, null);
  });

  fastify.post('/api/v1/chats/:id/members', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = AddChatMemberRequestSchema.parse(request.body);
    const { root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);

    const [user] = await db.select().from(users).where(eq(users.id, body.memberId)).limit(1);
    if (!user) throw notFound('User not found');

    const existingMember = await rootMember(root.id, body.memberId);
    if (existingMember?.role === 'owner' && body.role !== 'owner') {
      await assertNotLastOwner(root.id, existingMember);
    }

    const channels = await childChannels(root.id);
    const { member } = await db.transaction(async (tx) => {
      const [rootRow] = await tx.insert(chatMembers).values({
        chatId: root.id,
        userId: body.memberId,
        role: body.role
      }).onConflictDoUpdate({
        target: [chatMembers.chatId, chatMembers.userId],
        set: { role: body.role }
      }).returning();

      if (channels.length > 0) {
        await tx.insert(chatMembers).values(
          channels.map((channel) => ({ chatId: channel.id, userId: body.memberId }))
        ).onConflictDoNothing();
      }

      await appendSyncEvent({
        scope: 'user',
        userId: body.memberId,
        actorUserId: request.authUser!.userId,
        entityId: root.id,
        op: { type: 'chat.upsert', payload: await buildChatSummaryForUser(root, rootRow, body.memberId) }
      }, tx);

      for (const channel of channels) {
        await appendSyncEvent({
          scope: 'user',
          userId: body.memberId,
          actorUserId: request.authUser!.userId,
          entityId: channel.id,
          op: { type: 'channel.upsert', payload: serializeChannel(channel) }
        }, tx);
      }

      return { member: rootRow };
    });

    fastify.io.to(`user:${body.memberId}`).emit('chat.sync_required', {
      type: 'chat.sync_required',
      payload: { chatId: root.id, reason: 'member.added' }
    });

    return { member: { id: user.id, username: user.username, displayName: user.displayName, role: member.role } };
  });

  fastify.delete('/api/v1/chats/:id/members/:memberId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string; memberId: string };
    const { root } = await requireChatManager(params.id, request.authUser!.userId, request.authUser!.role);
    if (params.memberId === request.authUser!.userId) throw badRequest('Use the leave endpoint to remove yourself');

    const member = await rootMember(root.id, params.memberId);
    if (!member) throw notFound('Chat member not found');
    await removeMemberFromGroup(root.id, member, request.authUser!.userId);

    fastify.io.to(`user:${params.memberId}`).emit('chat.sync_required', {
      type: 'chat.sync_required',
      payload: { chatId: root.id, reason: 'member.removed' }
    });

    return { success: true };
  });

  fastify.post('/api/v1/chats/:id/leave', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const { root } = await resolveChatHierarchy(params.id);
    if (root.type !== 'group') throw badRequest('Only group chats can be left');

    const member = await rootMember(root.id, request.authUser!.userId);
    if (!member) throw forbidden('You are not a member of this chat', 'CHAT_FORBIDDEN');
    await removeMemberFromGroup(root.id, member, request.authUser!.userId);

    return { success: true };
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
        role: row.member.role,
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

    // Resolve root chat for role authorization — child channels mirror parent membership
    const [chat] = await db.select({ parentChatId: chats.parentChatId })
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);
    const rootChatId = chat?.parentChatId ?? chatId;

    const rows = await db.select({ user: users, member: chatMembers })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(eq(chatMembers.chatId, rootChatId))
      .orderBy(users.displayName);

    return {
      members: rows.map(({ user, member }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: avatarUrlFromMediaId(user.avatarMediaId),
        bio: user.bio,
        timezone: user.timezone,
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
        profileStyle: user.profileStyle,
        bannerMediaId: user.bannerMediaId,
        bannerUrl: bannerUrlFromMediaId(user.bannerMediaId, user.bannerUrl),
        role: member.role
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

    appEvents.emit('message.sent', { message: result.message, senderId: request.authUser!.userId });

    return result;
  });

  fastify.patch('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = EditMessageRequestSchema.parse(request.body);
    const result = await editMessage({
      messageId: params.id,
      editorUserId: request.authUser!.userId,
      content: body.content
    });

    fastify.io.to(`chat:${result.chatId}`).emit('message.edited', {
      type: 'message.edited',
      payload: result.event
    });

    return { message: result.message };
  });

  fastify.delete('/api/v1/messages/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const deletion = await deleteMessage({
      messageId: params.id,
      actorUserId: request.authUser!.userId,
      actorRole: request.authUser!.role
    });

    fastify.io.to(`chat:${deletion.chatId}`).emit('message.deleted', {
      type: 'message.deleted',
      payload: deletion
    });

    return {
      messageId: deletion.messageId,
      deletedAt: deletion.deletedAt,
      deletedByUserId: deletion.deletedByUserId
    };
  });

  fastify.post('/api/v1/chats/:id/read', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = MarkChatReadRequestSchema.parse(request.body);
    const read = await markChatRead({
      chatId: params.id,
      userId: request.authUser!.userId,
      throughMessageId: body.throughMessageId
    });

    fastify.io.to(`chat:${read.chatId}`).emit('message.read', {
      type: 'message.read',
      payload: {
        chatId: read.chatId,
        readerUserId: request.authUser!.userId,
        seenAt: read.member.lastReadAt.toISOString(),
        seenThroughMessageId: read.messageId
      }
    });

    return {
      chatId: read.chatId,
      unreadCount: await unreadCount(read.chatId, request.authUser!.userId),
      lastReadAt: read.member.lastReadAt.toISOString(),
      seenThroughMessageId: read.messageId
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
    const payload = await addMessageReaction({
      messageId: params.id,
      userId: request.authUser!.userId,
      emoji: body.emoji
    });
    fastify.io.to(`chat:${payload.chatId}`).emit('reaction.add', {
      type: 'reaction.add',
      payload
    });
    return reply.status(204).send();
  });
}
