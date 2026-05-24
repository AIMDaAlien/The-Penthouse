import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Message } from '@penthouse/contracts';
import { deliverChatMessage } from '../src/features/messages/send.js';

const message: Message = {
  id: 'message-1',
  chatId: 'chat-1',
  senderId: 'sender-1',
  senderUsername: 'sender',
  senderDisplayName: 'Sender',
  senderAvatarUrl: null,
  content: 'hello',
  type: 'text',
  metadata: null,
  createdAt: '2026-05-22T12:00:00.000Z',
  editedAt: null,
  deletedAt: null,
  deletedByUserId: null,
  readReceipts: [],
  reactions: []
};

describe('[unit] message delivery', () => {
  test('broadcasts HTTP-created messages and emits the push event without ack', () => {
    const roomEvents: Array<{ event: string; payload: unknown }> = [];
    const ackEvents: Array<{ event: string; payload: unknown }> = [];
    const appEvents: Array<{ event: string; payload: unknown }> = [];

    deliverChatMessage({
      message,
      senderId: message.senderId,
      delivery: {
        roomEmitter: {
          emit: (event, payload) => roomEvents.push({ event, payload })
        },
        ackEmitter: {
          emit: (event, payload) => ackEvents.push({ event, payload })
        },
        events: {
          emit: (event, payload) => appEvents.push({ event, payload })
        }
      }
    });

    assert.deepEqual(ackEvents, []);
    assert.deepEqual(roomEvents, [{
      event: 'message.new',
      payload: { type: 'message.new', payload: message }
    }]);
    assert.deepEqual(appEvents, [{
      event: 'message.sent',
      payload: { message, senderId: message.senderId }
    }]);
  });

  test('acks socket-created messages before broadcast and push emission', () => {
    const calls: Array<{ channel: string; event: string; payload: unknown }> = [];
    const deliveredAt = new Date('2026-05-22T12:34:56.000Z');

    deliverChatMessage({
      message,
      senderId: message.senderId,
      delivery: {
        clientMessageId: 'client-message-1',
        deliveredAt,
        ackEmitter: {
          emit: (event, payload) => calls.push({ channel: 'ack', event, payload })
        },
        roomEmitter: {
          emit: (event, payload) => calls.push({ channel: 'room', event, payload })
        },
        events: {
          emit: (event, payload) => calls.push({ channel: 'app', event, payload })
        }
      }
    });

    assert.deepEqual(calls, [
      {
        channel: 'ack',
        event: 'message.ack',
        payload: {
          type: 'message.ack',
          payload: {
            clientMessageId: 'client-message-1',
            messageId: message.id,
            chatId: message.chatId,
            deliveredAt: deliveredAt.toISOString()
          }
        }
      },
      {
        channel: 'room',
        event: 'message.new',
        payload: { type: 'message.new', payload: message }
      },
      {
        channel: 'app',
        event: 'message.sent',
        payload: { message, senderId: message.senderId }
      }
    ]);
  });
});
