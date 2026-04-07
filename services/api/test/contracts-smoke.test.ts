import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ClientPresenceUpdateEventSchema,
  RegisterRequestSchema,
  ServerPresenceSyncEventSchema,
  ServerPresenceUpdateEventSchema,
  SendMessageRequestSchema,
  ClientMessageSendEventSchema
} from '@penthouse/contracts';

test('register schema validates invite-code fields', () => {
  const ok = RegisterRequestSchema.safeParse({
    username: 'aim',
    password: 'supersecurepassword',
    inviteCode: 'PENTHOUSE-ALPHA',
    captchaToken: 'valid-captcha-payload',
    acceptTestNotice: true,
    testNoticeVersion: 'alpha-v1'
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

test('presence update event uses boolean online shape', () => {
  const ok = ClientPresenceUpdateEventSchema.safeParse({
    type: 'presence.update',
    online: false
  });

  assert.equal(ok.success, true);
});

test('server presence payloads use boolean sync/update shapes', () => {
  const update = ServerPresenceUpdateEventSchema.safeParse({
    userId: 'user-1',
    online: true,
    timestamp: new Date().toISOString()
  });
  const sync = ServerPresenceSyncEventSchema.safeParse({
    'user-1': true,
    'user-2': false
  });

  assert.equal(update.success, true);
  assert.equal(sync.success, true);
});
