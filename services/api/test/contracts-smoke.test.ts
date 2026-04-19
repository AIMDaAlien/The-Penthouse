import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AddReactionRequestSchema,
  AppDistributionResponseSchema,
  ClientPresenceUpdateEventSchema,
  PollDataSchema,
  ServerMessageDeletedEventSchema,
  ServerMessageEditedEventSchema,
  RegisterRequestSchema,
  ServerMessagePinnedEventSchema,
  ServerMessageUnpinnedEventSchema,
  ServerPollVotedEventSchema,
  ServerPresenceSyncEventSchema,
  ServerPresenceUpdateEventSchema,
  ServerReactionAddEventSchema,
  ServerReactionRemoveEventSchema,
  SendMessageRequestSchema,
  ClientMessageSendEventSchema
} from '@penthouse/contracts';

test('app distribution schema makes the PWA canonical and Android legacy', () => {
  const ok = AppDistributionResponseSchema.safeParse({
    sourceOfTruth: 'pwa',
    defaultPlatform: 'pwa',
    pwa: {
      status: 'live',
      url: 'https://penthouse.blog',
      installUrl: 'https://penthouse.blog'
    },
    legacyAndroid: {
      status: 'unavailable',
      deprecated: true,
      url: 'https://penthouse.blog/downloads/legacy/the-penthouse.apk',
      fileName: 'the-penthouse.apk',
      notes: 'Deprecated Android APK retained only for existing installs. Use the PWA for new installs.'
    }
  });

  assert.equal(ok.success, true);
});

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

test('poll metadata and realtime vote payload schemas are enforced', () => {
  const poll = PollDataSchema.safeParse({
    id: '11111111-1111-1111-1111-111111111111',
    question: 'Best rooftop snack?',
    options: [
      { text: 'Fries', voterIds: [] },
      { text: 'Nachos', voterIds: ['user-1'] }
    ],
    createdByUserId: '22222222-2222-2222-2222-222222222222'
  });

  const voted = ServerPollVotedEventSchema.safeParse({
    type: 'poll.voted',
    payload: {
      chatId: 'chat-1',
      pollId: '11111111-1111-1111-1111-111111111111',
      poll: {
        id: '11111111-1111-1111-1111-111111111111',
        question: 'Best rooftop snack?',
        options: [
          { text: 'Fries', voterIds: [] },
          { text: 'Nachos', voterIds: [] }
        ],
        createdByUserId: '22222222-2222-2222-2222-222222222222'
      }
    }
  });

  assert.equal(poll.success, true);
  assert.equal(voted.success, true);
});

test('reaction request and realtime reaction payload schemas are enforced', () => {
  const request = AddReactionRequestSchema.safeParse({
    emoji: '🔥'
  });
  const added = ServerReactionAddEventSchema.safeParse({
    type: 'reaction.add',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1',
      userId: 'user-1',
      emoji: '🔥',
      createdAt: new Date().toISOString()
    }
  });
  const removed = ServerReactionRemoveEventSchema.safeParse({
    type: 'reaction.remove',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1',
      userId: 'user-1',
      emoji: '🔥'
    }
  });

  assert.equal(request.success, true);
  assert.equal(added.success, true);
  assert.equal(removed.success, true);
});

test('pin realtime payload schemas are enforced', () => {
  const pinned = ServerMessagePinnedEventSchema.safeParse({
    type: 'message.pinned',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1',
      pinnedByUserId: 'user-1',
      pinnedAt: new Date().toISOString()
    }
  });
  const unpinned = ServerMessageUnpinnedEventSchema.safeParse({
    type: 'message.unpinned',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1'
    }
  });

  assert.equal(pinned.success, true);
  assert.equal(unpinned.success, true);
});

test('edit and delete realtime payload schemas are enforced', () => {
  const editedAt = new Date().toISOString();
  const deletedAt = new Date().toISOString();

  const edited = ServerMessageEditedEventSchema.safeParse({
    type: 'message.edited',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1',
      content: 'Updated message',
      editedAt,
      editCount: 1
    }
  });
  const deleted = ServerMessageDeletedEventSchema.safeParse({
    type: 'message.deleted',
    payload: {
      chatId: 'chat-1',
      messageId: 'message-1',
      deletedAt,
      deletedByUserId: 'user-1'
    }
  });

  assert.equal(edited.success, true);
  assert.equal(deleted.success, true);
});
