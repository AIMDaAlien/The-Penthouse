import { and, eq } from 'drizzle-orm';
import { db } from '../db/pool.js';
import { chatMembers, chats } from '../db/schema.js';
import { badRequest, forbidden, notFound } from './error-responses.js';
import { resolveChatId } from './messages.js';

export type ChatRow = typeof chats.$inferSelect;
export type ChatMemberRow = typeof chatMembers.$inferSelect;

export function serializeChannel(row: ChatRow) {
  if (!row.parentChatId) throw badRequest('Channel is missing a parent chat');
  return {
    id: row.id,
    parentChatId: row.parentChatId,
    name: row.name,
    createdAt: row.createdAt.toISOString()
  };
}

export async function resolveChatHierarchy(chatId: string) {
  const resolvedChatId = await resolveChatId(chatId);
  const [chat] = await db.select().from(chats).where(eq(chats.id, resolvedChatId)).limit(1);
  if (!chat) throw notFound('Chat not found');

  if (!chat.parentChatId) return { chat, root: chat };

  const [root] = await db.select().from(chats).where(eq(chats.id, chat.parentChatId)).limit(1);
  if (!root) throw notFound('Parent chat not found');
  return { chat, root };
}

export async function childChannels(rootChatId: string) {
  return db.select().from(chats).where(eq(chats.parentChatId, rootChatId));
}

export async function rootMember(rootChatId: string, userId: string) {
  const [member] = await db.select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, rootChatId), eq(chatMembers.userId, userId)))
    .limit(1);
  return member ?? null;
}

export async function requireChatManager(chatId: string, userId: string, globalRole: 'admin' | 'member') {
  const hierarchy = await resolveChatHierarchy(chatId);
  if (hierarchy.root.type !== 'group') throw badRequest('Only group chats can be managed');
  if (globalRole === 'admin') return hierarchy;

  const member = await rootMember(hierarchy.root.id, userId);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw forbidden('Only group owners and admins can manage this chat');
  }

  return hierarchy;
}

export async function assertNotLastOwner(rootChatId: string, member: ChatMemberRow | null) {
  if (!member || member.role !== 'owner') return;

  const owners = await db.select({ userId: chatMembers.userId })
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, rootChatId), eq(chatMembers.role, 'owner')));

  if (owners.length <= 1) {
    throw badRequest('A group must keep at least one owner');
  }
}
