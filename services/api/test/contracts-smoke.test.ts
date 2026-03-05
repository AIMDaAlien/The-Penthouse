import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RegisterRequestSchema,
  SendMessageRequestSchema,
  ClientMessageSendEventSchema
} from '@penthouse/contracts';

test('register schema validates invite fields', () => {
  const ok = RegisterRequestSchema.safeParse({
    username: 'aim',
    password: 'supersecurepassword',
    inviteCode: 'PENTHOUSE-ALPHA'
  });

  assert.equal(ok.success, true);
});

test('message request requires clientMessageId for idempotency', () => {
  const bad = SendMessageRequestSchema.safeParse({
    chatId: 'chat-1',
    content: 'hello world'
  });

  assert.equal(bad.success, false);
});

test('realtime message.send event shape is enforced', () => {
  const ok = ClientMessageSendEventSchema.safeParse({
    type: 'message.send',
    chatId: 'chat-1',
    content: 'hi',
    clientMessageId: 'client-msg-001'
  });

  assert.equal(ok.success, true);
});
