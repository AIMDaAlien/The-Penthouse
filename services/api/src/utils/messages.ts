import { and, count, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { Message } from '@penthouse/contracts';
import { db } from '../db/pool.js';
import {
  chatMembers,
  chats,
  messageDeletions,
  messageEdits,
  messageReactions,
  messages,
  users
} from '../db/schema.js';
import { badRequest, forbidden, notFound } from './error-responses.js';
import { avatarUrlFromMediaId } from './users.js';
import { appendSyncEvent } from '../features/sync/events.js';
import { assertMessageMediaRefsAllowed, rewriteMessageMediaUrls } from './media-access.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type MessageReader = Pick<typeof db, 'select'>;

export async function resolveChatId(chatId: string) {
  if (UUID_RE.test(chatId)) return chatId;
  const [general] = await db.select({ id: chats.id }).from(chats).where(eq(chats.systemKey, 'general')).limit(1);
  return general?.id ?? chatId;
}

export async function assertChatMember(chatId: string, userId: string) {
  const resolvedChatId = await resolveChatId(chatId);
  const [chat] = await db.select({ parentChatId: chats.parentChatId })
    .from(chats)
    .where(eq(chats.id, resolvedChatId))
    .limit(1);

  if (chat?.parentChatId) {
    const [parentMember] = await db.select()
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chat.parentChatId), eq(chatMembers.userId, userId)))
      .limit(1);

    if (!parentMember) throw forbidden('You are not a member of this chat', 'CHAT_FORBIDDEN');

    const [inserted] = await db.insert(chatMembers)
      .values({ chatId: resolvedChatId, userId })
      .onConflictDoNothing()
      .returning();

    const member = inserted ?? (await db.select()
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, resolvedChatId), eq(chatMembers.userId, userId)))
      .limit(1))[0];

    return { chatId: resolvedChatId, member };
  }

  let [member] = await db.select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, resolvedChatId), eq(chatMembers.userId, userId)))
    .limit(1);

  if (!member) throw forbidden('You are not a member of this chat', 'CHAT_FORBIDDEN');
  return { chatId: resolvedChatId, member };
}

export async function hydrateMessage(messageId: string, viewerUserId?: string, reader: MessageReader = db): Promise<Message> {
  const [row] = await reader.select({
    message: messages,
    sender: users,
    deletion: messageDeletions
  })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .leftJoin(messageDeletions, eq(messages.id, messageDeletions.messageId))
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!row) throw notFound('Message not found');

  const [{ value: editCount }] = await reader.select({ value: count() })
    .from(messageEdits)
    .where(eq(messageEdits.messageId, messageId));

  const [latestEdit] = await reader.select()
    .from(messageEdits)
    .where(eq(messageEdits.messageId, messageId))
    .orderBy(desc(messageEdits.createdAt))
    .limit(1);

  const reactionRows = await reader.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
  const reactions = new Map<string, string[]>();
  for (const reaction of reactionRows) {
    reactions.set(reaction.emoji, [...(reactions.get(reaction.emoji) ?? []), reaction.userId]);
  }

  const readRows = await reader.select({
    userId: chatMembers.userId,
    readAt: chatMembers.lastReadAt
  })
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, row.message.chatId), eq(chatMembers.lastReadMessageId, messageId)));

  let replyTo: Message['replyTo'] = null;
  if (row.message.replyToSnapshot && typeof row.message.replyToSnapshot === 'object') {
    replyTo = row.message.replyToSnapshot as Message['replyTo'];
  }

  return {
    id: row.message.id,
    chatId: row.message.chatId,
    senderId: row.message.senderId,
    senderUsername: row.sender.username,
    senderDisplayName: row.sender.displayName,
    senderAvatarUrl: avatarUrlFromMediaId(row.sender.avatarMediaId),
    content: row.message.content,
    type: row.message.messageType,
    metadata: await rewriteMessageMediaUrls(row.message.metadata, row.message.senderId, reader) as Message['metadata'],
    createdAt: row.message.createdAt.toISOString(),
    editedAt: latestEdit?.createdAt.toISOString() ?? null,
    editCount,
    deletedAt: row.deletion?.deletedAt.toISOString() ?? null,
    deletedByUserId: row.deletion?.deletedByUserId ?? null,
    clientMessageId: row.message.clientMessageId ?? undefined,
    readReceipts: readRows.map((receipt) => ({
      userId: receipt.userId,
      readAt: receipt.readAt.toISOString()
    })),
    reactions: [...reactions.entries()].map(([emoji, userIds]) => ({ emoji, userIds })),
    replyTo,
    starred: false,
    hidden: false,
    seenAt: viewerUserId === row.message.senderId ? row.message.createdAt.toISOString() : null
  };
}

export async function listMessages(chatId: string, viewerUserId: string, before?: string) {
  const where = before
    ? and(eq(messages.chatId, chatId), lt(messages.createdAt, new Date(before)))
    : eq(messages.chatId, chatId);

  const rows = await db.select({ id: messages.id })
    .from(messages)
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(50);

  const hydrated = [];
  for (const row of rows.reverse()) {
    hydrated.push(await hydrateMessage(row.id, viewerUserId));
  }
  return hydrated;
}

export async function createMessage(input: {
  chatId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'gif' | 'file' | 'poll' | 'audio' | 'sticker';
  metadata?: Record<string, unknown> | null;
  replyToMessageId?: string;
  clientMessageId?: string;
}) {
  await assertMessageMediaRefsAllowed(input.metadata, input.senderId);
  const mentionedUserIds = await mentionedMembers(input.chatId, input.senderId, input.content);
  let replySnapshot: { id: string; content: string; senderDisplayName: string | null } | null = null;
  if (input.replyToMessageId) {
    const [reply] = await db.select({
      id: messages.id,
      content: messages.content,
      senderDisplayName: users.displayName
    })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.id, input.replyToMessageId), eq(messages.chatId, input.chatId)))
      .limit(1);
    if (reply) replySnapshot = reply;
  }

  const [existing] = input.clientMessageId
    ? await db.select({ id: messages.id })
      .from(messages)
      .where(and(
        eq(messages.chatId, input.chatId),
        eq(messages.senderId, input.senderId),
        eq(messages.clientMessageId, input.clientMessageId)
      ))
      .limit(1)
    : [];

  if (existing) return { message: await hydrateMessage(existing.id, input.senderId), deduped: true };

  const created = await db.transaction(async (tx) => {
    const [message] = await tx.insert(messages).values({
      chatId: input.chatId,
      senderId: input.senderId,
      content: input.content,
      messageType: input.messageType,
      metadata: {
        ...(input.metadata ?? {}),
        ...(mentionedUserIds.length > 0 ? { mentionedUserIds } : {})
      },
      replyToMessageId: input.replyToMessageId,
      replyToSnapshot: replySnapshot,
      clientMessageId: input.clientMessageId
    }).returning();

    await tx.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, input.chatId));
    const hydrated = await hydrateMessage(message.id, input.senderId, tx);
    await appendSyncEvent({
      scope: 'chat',
      chatId: input.chatId,
      actorUserId: input.senderId,
      entityId: message.id,
      op: { type: 'message.upsert', payload: hydrated }
    }, tx);
    return hydrated;
  });

  return { message: created, deduped: false };
}

export async function editMessage(input: {
  messageId: string;
  editorUserId: string;
  content: string;
}) {
  const [message] = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
  if (!message) throw notFound('Message not found');
  await assertChatMember(message.chatId, input.editorUserId);
  if (message.senderId !== input.editorUserId) throw forbidden('Only the sender can edit this message');

  const hydrated = await db.transaction(async (tx) => {
    await tx.insert(messageEdits).values({
      messageId: message.id,
      previousContent: message.content,
      editedBy: input.editorUserId
    });
    await tx.update(messages).set({ content: input.content }).where(eq(messages.id, message.id));

    const row = await hydrateMessage(message.id, input.editorUserId, tx);
    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: input.editorUserId,
      entityId: message.id,
      op: { type: 'message.upsert', payload: row }
    }, tx);
    return row;
  });

  return {
    chatId: message.chatId,
    message: hydrated,
    event: {
      chatId: message.chatId,
      messageId: message.id,
      content: hydrated.content,
      editedAt: hydrated.editedAt ?? new Date().toISOString(),
      editCount: hydrated.editCount ?? 0
    }
  };
}

export async function deleteMessage(input: {
  messageId: string;
  actorUserId: string;
  actorRole: 'admin' | 'member';
}) {
  const [message] = await db.select().from(messages).where(eq(messages.id, input.messageId)).limit(1);
  if (!message) throw notFound('Message not found');
  await assertChatMember(message.chatId, input.actorUserId);
  if (message.senderId !== input.actorUserId && input.actorRole !== 'admin') {
    throw forbidden('Only the sender can delete this message');
  }

  return db.transaction(async (tx) => {
    const [deletion] = await tx.insert(messageDeletions).values({
      messageId: message.id,
      deletedByUserId: input.actorUserId
    }).onConflictDoUpdate({
      target: messageDeletions.messageId,
      set: {
        deletedByUserId: input.actorUserId,
        deletedAt: new Date()
      }
    }).returning();

    const payload = {
      chatId: message.chatId,
      messageId: message.id,
      deletedAt: deletion.deletedAt.toISOString(),
      deletedByUserId: deletion.deletedByUserId
    };
    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: input.actorUserId,
      entityId: message.id,
      op: { type: 'message.delete', payload }
    }, tx);
    return payload;
  });
}

export async function markChatRead(input: {
  chatId: string;
  userId: string;
  throughMessageId?: string;
}) {
  if (!input.throughMessageId) throw badRequest('throughMessageId is required');
  const { chatId } = await assertChatMember(input.chatId, input.userId);

  const result = await db.transaction(async (tx) => {
    const [message] = await tx.select({ id: messages.id }).from(messages)
      .where(and(eq(messages.id, input.throughMessageId!), eq(messages.chatId, chatId)))
      .limit(1);
    if (!message) throw badRequest('throughMessageId must belong to this chat');

    const [member] = await tx.update(chatMembers)
      .set({ lastReadMessageId: message.id, lastReadAt: new Date() })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, input.userId)))
      .returning();

    const payload = {
      chatId,
      userId: input.userId,
      lastReadAt: member.lastReadAt.toISOString(),
      lastReadMessageId: member.lastReadMessageId ?? null,
      notificationsMuted: member.notificationsMuted,
      archivedAt: member.archivedAt?.toISOString() ?? null
    };
    await appendSyncEvent({
      scope: 'chat',
      chatId,
      actorUserId: input.userId,
      entityId: `${chatId}:${input.userId}`,
      op: { type: 'read.upsert', payload }
    }, tx);

    return { member, messageId: message.id, payload };
  });

  return { chatId, ...result };
}

export async function addMessageReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const message = await hydrateMessage(input.messageId, input.userId);
  await assertChatMember(message.chatId, input.userId);
  const payload = {
    chatId: message.chatId,
    messageId: input.messageId,
    userId: input.userId,
    emoji: input.emoji,
    createdAt: new Date().toISOString()
  };

  await db.transaction(async (tx) => {
    await tx.insert(messageReactions).values({
      messageId: input.messageId,
      userId: input.userId,
      emoji: input.emoji
    }).onConflictDoNothing();
    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: input.userId,
      entityId: `${input.messageId}:${input.userId}:${input.emoji}`,
      op: { type: 'reaction.add', payload }
    }, tx);
  });

  return payload;
}

export async function removeMessageReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const message = await hydrateMessage(input.messageId, input.userId);
  await assertChatMember(message.chatId, input.userId);
  const payload = {
    chatId: message.chatId,
    messageId: input.messageId,
    userId: input.userId,
    emoji: input.emoji
  };

  await db.transaction(async (tx) => {
    await tx.delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, input.messageId),
        eq(messageReactions.userId, input.userId),
        eq(messageReactions.emoji, input.emoji)
      ));
    await appendSyncEvent({
      scope: 'chat',
      chatId: message.chatId,
      actorUserId: input.userId,
      entityId: `${input.messageId}:${input.userId}:${input.emoji}`,
      op: { type: 'reaction.remove', payload }
    }, tx);
  });

  return payload;
}

async function mentionedMembers(chatId: string, senderId: string, content: string) {
  const usernames = [...new Set([...content.matchAll(/(^|[^\w.])@([a-z0-9._-]{3,32})/gi)]
    .map((match) => match[2].replace(/[.]+$/g, '').toLowerCase())
    .filter(Boolean))];
  if (usernames.length === 0) return [];

  const rows = await db.select({ id: users.id, username: users.username })
    .from(chatMembers)
    .innerJoin(users, eq(chatMembers.userId, users.id))
    .where(and(eq(chatMembers.chatId, chatId), inArray(sql`lower(${users.username})`, usernames)));

  return rows
    .filter((row) => row.id !== senderId)
    .map((row) => row.id);
}

export async function unreadCount(chatId: string, userId: string) {
  const [member] = await db.select().from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  if (!member) return 0;

  if (member.lastReadMessageId) {
    const [readMessage] = await db.select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, member.lastReadMessageId))
      .limit(1);
    if (readMessage) {
      const [{ value }] = await db.select({ value: count() })
        .from(messages)
        .where(and(eq(messages.chatId, chatId), sql`${messages.createdAt} > ${readMessage.createdAt}`, sql`${messages.senderId} <> ${userId}`));
      return value;
    }
  }

  const [{ value }] = await db.select({ value: count() })
    .from(messages)
    .where(and(eq(messages.chatId, chatId), sql`${messages.senderId} <> ${userId}`));
  return value;
}

export async function chatMemberIds(chatId: string) {
  const rows = await db.select({ userId: chatMembers.userId }).from(chatMembers).where(eq(chatMembers.chatId, chatId));
  return rows.map((row) => row.userId);
}
