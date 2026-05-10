import type { Server } from 'socket.io';
import type { Message } from '@penthouse/contracts';
import { appEvents } from '../../core/events.js';
import { sendPushForMessage } from '../../push/send.js';

/**
 * Register push notification event listeners.
 *
 * Call once at application startup (after Socket.IO is initialized).
 */
export function registerPushHandlers(io: Server) {
  const onMessageSent = ({ message, senderId }: { message: Message; senderId: string }) => {
    // Push failures are non-critical; do not break the message flow
    sendPushForMessage(io, message, senderId).catch(() => {
      /* silently ignore push errors */
    });
  };

  appEvents.on('message.sent', onMessageSent);

  return () => {
    appEvents.off('message.sent', onMessageSent);
  };
}
