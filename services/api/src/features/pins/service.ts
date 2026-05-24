import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/pool.js';
import { messages, pinnedMessages, users } from '../../db/schema.js';
import { appendSyncEvent } from '../sync/service.js';
import { forbidden, notFound } from '../../utils/error-responses.js';
import { assertChatMember } from '../../utils/messages.js';
import { avatarUrlFromMediaId } from '../../utils/users.js';

type MissingBehavior = 'throw' | 'return-null';

type PinMessageInput = {
  chatId?: string;
  messageId: string;
  actorUserId: string;
  missingBehavior?: MissingBehavior;
};

type ThrowingPinMessageInput = PinMessageInput & {
  missingBehavior?: 'throw';
};

type NullablePinMessageInput = PinMessageInput & {
  missingBehavior: 'return-null';
};

type UnpinMessageInput = {
  chatId?: string;
  messageId: string;
  actorUserId: string;
  actorRole: 'admin' | 'member';
  missingBehavior?: MissingBehavior;
};

type ThrowingUnpinMessageInput = UnpinMessageInput & {
  missingBehavior?: 'throw';
};

type NullableUnpinMessageInput = UnpinMessageInput & {
  missingBehavior: 'return-null';
};

type PinPayload = {
  chatId: string;
  messageId: string;
  pinnedByUserId: string;
  pinnedAt: string;
  content: string;
  senderDisplayName: string | null;
};

type UnpinPayload = {
  chatId: string;
  messageId: string;
};

function shouldReturnNull(behavior: MissingBehavior) {
  return behavior === 'return-null';
}

function serializePin(pin: typeof pinnedMessages.$inferSelect): PinPayload {
  return {
    chatId: pin.chatId,
    messageId: pin.messageId,
    pinnedByUserId: pin.pinnedBy,
    pinnedAt: pin.pinnedAt.toISOString(),
    content: pin.contentSnapshot,
    senderDisplayName: pin.senderDisplayNameSnapshot
  };
}

async function resolvePinnedMessageTarget(
  input: PinMessageInput | UnpinMessageInput
) {
  const scopedChatId = input.chatId
    ? (await assertChatMember(input.chatId, input.actorUserId)).chatId
    : null;
  const where = scopedChatId
    ? and(eq(messages.id, input.messageId), eq(messages.chatId, scopedChatId))
    : eq(messages.id, input.messageId);

  const [row] = await db.select({ message: messages, sender: users })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(where)
    .limit(1);

  if (!row) return null;
  await assertChatMember(row.message.chatId, input.actorUserId);
  return row;
}

export async function pinMessage(input: ThrowingPinMessageInput): Promise<PinPayload>;
export async function pinMessage(input: NullablePinMessageInput): Promise<PinPayload | null>;
export async function pinMessage(input: PinMessageInput): Promise<PinPayload | null> {
  const missingBehavior = input.missingBehavior ?? 'throw';
  const row = await resolvePinnedMessageTarget(input);
  if (!row) {
    if (shouldReturnNull(missingBehavior)) return null;
    throw notFound('Message not found');
  }

  const pinnedAt = new Date();
  const [pin] = await db.insert(pinnedMessages).values({
    chatId: row.message.chatId,
    messageId: row.message.id,
    pinnedBy: input.actorUserId,
    pinnedAt,
    contentSnapshot: row.message.content,
    senderDisplayNameSnapshot: row.sender.displayName
  }).onConflictDoUpdate({
    target: [pinnedMessages.chatId, pinnedMessages.messageId],
    set: {
      pinnedBy: input.actorUserId,
      pinnedAt,
      contentSnapshot: row.message.content,
      senderDisplayNameSnapshot: row.sender.displayName
    }
  }).returning();

  const payload = serializePin(pin);
  await appendSyncEvent({
    scope: 'chat',
    chatId: payload.chatId,
    actorUserId: input.actorUserId,
    entityId: payload.messageId,
    op: { type: 'message.pin', payload }
  });

  return payload;
}

export async function unpinMessage(input: ThrowingUnpinMessageInput): Promise<UnpinPayload>;
export async function unpinMessage(input: NullableUnpinMessageInput): Promise<UnpinPayload | null>;
export async function unpinMessage(input: UnpinMessageInput): Promise<UnpinPayload | null> {
  const missingBehavior = input.missingBehavior ?? 'throw';
  const row = await resolvePinnedMessageTarget(input);
  if (!row) {
    if (shouldReturnNull(missingBehavior)) return null;
    throw notFound('Message not found');
  }

  const [pin] = await db.select({ pinnedBy: pinnedMessages.pinnedBy })
    .from(pinnedMessages)
    .where(and(eq(pinnedMessages.chatId, row.message.chatId), eq(pinnedMessages.messageId, row.message.id)))
    .limit(1);

  if (!pin) {
    if (shouldReturnNull(missingBehavior)) return null;
    throw notFound('Pin not found');
  }

  if (pin.pinnedBy !== input.actorUserId && input.actorRole !== 'admin') {
    throw forbidden('Only the pinner or admins can unpin messages');
  }

  await db.delete(pinnedMessages)
    .where(and(eq(pinnedMessages.chatId, row.message.chatId), eq(pinnedMessages.messageId, row.message.id)));

  const payload = { chatId: row.message.chatId, messageId: row.message.id };
  await appendSyncEvent({
    scope: 'chat',
    chatId: payload.chatId,
    actorUserId: input.actorUserId,
    entityId: payload.messageId,
    op: { type: 'message.unpin', payload }
  });

  return payload;
}

export async function listPinnedMessages(chatId: string, viewerUserId: string) {
  const { chatId: resolvedChatId } = await assertChatMember(chatId, viewerUserId);
  const rows = await db.select({ pin: pinnedMessages, message: messages, sender: users })
    .from(pinnedMessages)
    .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(pinnedMessages.chatId, resolvedChatId))
    .orderBy(desc(pinnedMessages.pinnedAt));

  return rows.map(({ pin, message, sender }) => ({
    ...serializePin(pin),
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
  }));
}
