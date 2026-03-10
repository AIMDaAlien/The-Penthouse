import type { AuthResponse, ChatSummary, Message, MessageMetadata, MessageType } from '@penthouse/contracts';

export type Session = AuthResponse;
export type Chat = ChatSummary;
export type ChatMessage = Message;
export type PresenceStatus = 'online' | 'offline';
export type RealtimeState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'failed';
export type RealtimeTransport = 'polling' | 'websocket' | 'unknown';
export type RealtimeDiagnostics = {
  transport: RealtimeTransport;
  lastError: string | null;
  lastDisconnectReason: string | null;
  lastConnectedAt: string | null;
  fallbackActive: boolean;
};
export type TypingParticipant = {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export type PendingMessage = {
  chatId: string;
  content: string;
  type: MessageType;
  metadata?: MessageMetadata | null;
  clientMessageId: string;
  enqueuedAt: string;
  attempts: number;
};
