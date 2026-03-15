import type { Chat, ChatMessage } from '../types';

const CHATS_KEY = 'penthouse.cache.chats';
const MSG_PREFIX = 'penthouse.cache.messages.';

function scopedChatsKey(userId: string): string {
  return `${CHATS_KEY}.${userId}`;
}

function scopedMessagesKey(userId: string, chatId: string): string {
  return `${MSG_PREFIX}${userId}.${chatId}`;
}

export function cacheChats(userId: string, chats: Chat[]): void {
  localStorage.setItem(scopedChatsKey(userId), JSON.stringify(chats));
}

export function readCachedChats(userId: string): Chat[] {
  const raw = localStorage.getItem(scopedChatsKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Chat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cacheMessages(userId: string, chatId: string, messages: ChatMessage[]): void {
  localStorage.setItem(scopedMessagesKey(userId, chatId), JSON.stringify(messages));
}

export function readCachedMessages(userId: string, chatId: string): ChatMessage[] {
  const raw = localStorage.getItem(scopedMessagesKey(userId, chatId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
