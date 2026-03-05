import type { AuthResponse, ChatSummary, Message } from '@penthouse/contracts';

export type Session = AuthResponse;
export type Chat = ChatSummary;
export type ChatMessage = Message;

export type PendingMessage = {
  chatId: string;
  content: string;
  clientMessageId: string;
  enqueuedAt: string;
  attempts: number;
};
