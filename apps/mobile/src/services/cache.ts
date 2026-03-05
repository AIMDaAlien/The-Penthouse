import type { Chat, ChatMessage } from '../types';

const CHATS_KEY = 'penthouse.cache.chats';
const MSG_PREFIX = 'penthouse.cache.messages.';

export function cacheChats(chats: Chat[]): void {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function readCachedChats(): Chat[] {
  const raw = localStorage.getItem(CHATS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Chat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function cacheMessages(chatId: string, messages: ChatMessage[]): void {
  localStorage.setItem(`${MSG_PREFIX}${chatId}`, JSON.stringify(messages));
}

export function readCachedMessages(chatId: string): ChatMessage[] {
  const raw = localStorage.getItem(`${MSG_PREFIX}${chatId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
