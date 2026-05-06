import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ClientMessageSendEventSchema,
  ServerMessageNewEventSchema,
  ServerTypingUpdateEventSchema
} from '../src/events.js';
import { MessageSchema } from '../src/api.js';

describe('ClientMessageSendEventSchema', () => {
  it('accepts valid message send event', () => {
    const result = ClientMessageSendEventSchema.safeParse({
      type: 'message.send',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello',
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects audio without audioUrl', () => {
    const result = ClientMessageSendEventSchema.safeParse({
      type: 'message.send',
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      messageType: 'audio',
      metadata: {},
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, false);
  });
});

describe('ServerMessageNewEventSchema', () => {
  it('accepts valid message new event', () => {
    const result = ServerMessageNewEventSchema.safeParse({
      type: 'message.new',
      payload: {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Hello',
        type: 'text',
        createdAt: new Date().toISOString()
      }
    });
    assert.strictEqual(result.success, true);
  });
});

describe('ServerTypingUpdateEventSchema', () => {
  it('accepts valid typing update', () => {
    const result = ServerTypingUpdateEventSchema.safeParse({
      type: 'typing.update',
      payload: {
        chatId: 'chat-1',
        userId: 'user-1',
        status: 'start',
        displayName: 'Test User'
      }
    });
    assert.strictEqual(result.success, true);
  });
});
