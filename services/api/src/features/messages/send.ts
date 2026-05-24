import type { Message, MessageType, ServerMessageAckEvent, ServerMessageNewEvent } from '@penthouse/contracts';
import { appEvents, type MessageSentEvent } from '../../core/events.js';
import { createMessage } from '../../utils/messages.js';

type MessageRoomEmitter = {
  emit(event: 'message.new', payload: ServerMessageNewEvent): unknown;
};

type MessageAckEmitter = {
  emit(event: 'message.ack', payload: ServerMessageAckEvent): unknown;
};

type MessageEventBus = {
  emit(event: 'message.sent', payload: MessageSentEvent): unknown;
};

type MessageDelivery = {
  roomEmitter: MessageRoomEmitter;
  ackEmitter?: MessageAckEmitter;
  clientMessageId?: string;
  deliveredAt?: Date;
  events?: MessageEventBus;
};

type SendChatMessageInput = {
  chatId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  metadata?: Record<string, unknown> | null;
  replyToMessageId?: string;
  clientMessageId?: string;
  delivery: MessageDelivery;
};

export function deliverChatMessage(input: {
  message: Message;
  senderId: string;
  delivery: MessageDelivery;
}) {
  const { message, senderId, delivery } = input;

  if (delivery.ackEmitter && delivery.clientMessageId) {
    delivery.ackEmitter.emit('message.ack', {
      type: 'message.ack',
      payload: {
        clientMessageId: delivery.clientMessageId,
        messageId: message.id,
        chatId: message.chatId,
        deliveredAt: (delivery.deliveredAt ?? new Date()).toISOString()
      }
    });
  }

  delivery.roomEmitter.emit('message.new', {
    type: 'message.new',
    payload: message
  });

  (delivery.events ?? appEvents).emit('message.sent', { message, senderId });
}

export async function sendChatMessage(input: SendChatMessageInput) {
  const result = await createMessage({
    chatId: input.chatId,
    senderId: input.senderId,
    content: input.content,
    messageType: input.messageType,
    metadata: input.metadata,
    replyToMessageId: input.replyToMessageId,
    clientMessageId: input.clientMessageId
  });

  deliverChatMessage({
    message: result.message,
    senderId: input.senderId,
    delivery: {
      ...input.delivery,
      clientMessageId: input.delivery.clientMessageId ?? input.clientMessageId
    }
  });

  return result;
}
