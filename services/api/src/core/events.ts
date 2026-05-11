import { EventEmitter } from 'node:events';

/**
 * Lightweight application-wide event bus.
 *
 * Used to decouple features. Each feature publishes domain events
 * and subscribes to the ones it cares about. No feature should
 * import another feature's business logic.
 */
export const appEvents = new EventEmitter();

// Prevent unhandled listener warnings; we manage cleanup explicitly
appEvents.setMaxListeners(50);

/** Typed event payload for message.sent */
export interface MessageSentEvent {
  message: {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    messageType: string;
    createdAt: string;
    [key: string]: unknown;
  };
  senderId: string;
}
