/**
 * Chat route contract tests.
 *
 * Uses @penthouse/contracts schemas to verify that the enforcement boundary
 * (safeParse + parse calls in chats.ts) cannot accept or return data that
 * violates the contract. No DB or server required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AddReactionRequestSchema,
  ChatMemberReadStateSchema,
  ChatPreferencesRequestSchema,
  ChatPreferencesResponseSchema,
  CreateDirectChatRequestSchema,
  CreatePollRequestSchema,
  MarkChatReadRequestSchema,
  PinnedMessageSchema,
  PollDataSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  ChatSummarySchema,
  MessageSchema,
  PinMessageRequestSchema,
  ClientMessageSendEventSchema,
  VotePollRequestSchema
} from '@penthouse/contracts';

// ─── idempotent message sends ───────────────────────────────────────────────

test('[schema] send: rejects missing clientMessageId', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: 'Hello there'
  });
  assert.equal(result.success, false, 'clientMessageId is required for idempotency');
});

test('[schema] send: rejects clientMessageId shorter than 8 chars', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: 'Hello there',
    clientMessageId: 'short'
  });
  assert.equal(result.success, false, 'clientMessageId min length is 8');
});

test('[schema] send: rejects clientMessageId longer than 128 chars', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: 'Hello there',
    clientMessageId: 'c'.repeat(129)
  });
  assert.equal(result.success, false, 'clientMessageId max length is 128');
});

test('[schema] send: rejects empty content', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: '',
    clientMessageId: 'client-msg-001'
  });
  assert.equal(result.success, false, 'content min length is 1');
});

test('[schema] send: rejects content over 4000 chars', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: 'x'.repeat(4001),
    clientMessageId: 'client-msg-001'
  });
  assert.equal(result.success, false, 'content max length is 4000');
});

test('[schema] send: accepts valid message send payload', () => {
  const result = SendMessageRequestSchema.safeParse({
    chatId: 'chat-uuid-1234',
    content: 'Hello, world!',
    clientMessageId: 'client-msg-001',
    replyToMessageId: '11111111-1111-1111-1111-111111111111'
  });
  assert.equal(result.success, true, 'valid send payload should pass');
  if (result.success) {
    assert.equal(result.data.clientMessageId, 'client-msg-001');
    assert.equal(result.data.replyToMessageId, '11111111-1111-1111-1111-111111111111');
  }
});

// ─── deduplication response shape ──────────────────────────────────────────

test('[schema] SendMessageResponse: parses with deduped: true', () => {
  const result = SendMessageResponseSchema.safeParse({
    message: {
      id: 'msg-uuid',
      chatId: 'chat-uuid-1234',
      senderId: 'user-uuid',
      content: 'Hello, world!',
      createdAt: new Date().toISOString(),
      clientMessageId: 'client-msg-001'
    },
    deduped: true
  });
  assert.equal(result.success, true, 'deduped:true response should parse');
  if (result.success) assert.equal(result.data.deduped, true);
});

test('[schema] SendMessageResponse: parses with deduped: false', () => {
  const result = SendMessageResponseSchema.safeParse({
    message: {
      id: 'msg-uuid',
      chatId: 'chat-uuid-1234',
      senderId: 'user-uuid',
      content: 'Hello, world!',
      createdAt: new Date().toISOString(),
      clientMessageId: 'client-msg-001'
    },
    deduped: false
  });
  assert.equal(result.success, true, 'deduped:false response should parse');
  if (result.success) assert.equal(result.data.deduped, false);
});

test('[schema] SendMessageResponse: rejects missing deduped flag', () => {
  const result = SendMessageResponseSchema.safeParse({
    message: {
      id: 'msg-uuid',
      chatId: 'chat-uuid-1234',
      senderId: 'user-uuid',
      content: 'Hello, world!',
      createdAt: new Date().toISOString()
    }
    // deduped omitted
  });
  assert.equal(result.success, false, 'deduped flag is required in response');
});

// ─── unauthorized chat access blocks (contract shape) ──────────────────────

test('[schema] ChatSummary: accepts valid dm type', () => {
  const result = ChatSummarySchema.safeParse({
    id: 'chat-uuid',
    type: 'dm',
    name: 'Alice & Bob',
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    counterpartMemberId: 'user-uuid-2',
    counterpartAvatarUrl: null,
    notificationsMuted: false
  });
  assert.equal(result.success, true, 'dm type is valid');
});

test('[schema] ChatSummary: accepts valid channel type', () => {
  const result = ChatSummarySchema.safeParse({
    id: 'chat-uuid',
    type: 'channel',
    name: 'General',
    updatedAt: new Date().toISOString(),
    unreadCount: 0
  });
  assert.equal(result.success, true, 'channel type is valid');
});

test('[schema] ChatSummary: rejects invalid type (unauthorized cross-type access probe)', () => {
  // If a malicious client sends an unexpected chat type, the route's
  // ChatSummarySchema.parse() will throw before it returns data.
  const result = ChatSummarySchema.safeParse({
    id: 'chat-uuid',
    type: 'group', // not a valid enum value
    name: 'Hackers',
    updatedAt: new Date().toISOString()
  });
  assert.equal(result.success, false, 'only dm and channel types are permitted');
});

test('[schema] create direct chat request accepts memberId', () => {
  const result = CreateDirectChatRequestSchema.safeParse({ memberId: '11111111-1111-1111-1111-111111111111' });
  assert.equal(result.success, true);
});

test('[schema] create direct chat request rejects malformed memberId', () => {
  const result = CreateDirectChatRequestSchema.safeParse({ memberId: 'not-a-uuid' });
  assert.equal(result.success, false);
});

test('[schema] create poll request accepts valid poll payload', () => {
  const result = CreatePollRequestSchema.safeParse({
    question: 'Best rooftop snack?',
    options: ['Fries', 'Wings', 'Nachos'],
    multiSelect: false,
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });
  assert.equal(result.success, true);
});

test('[schema] create poll request rejects duplicate options', () => {
  const result = CreatePollRequestSchema.safeParse({
    question: 'Best rooftop snack?',
    options: ['Fries', 'fries']
  });
  assert.equal(result.success, false);
});

test('[schema] vote poll request requires a non-negative option index', () => {
  assert.equal(VotePollRequestSchema.safeParse({ optionIndex: 0 }).success, true);
  assert.equal(VotePollRequestSchema.safeParse({ optionIndex: -1 }).success, false);
});

test('[schema] chat preferences request requires notificationsMuted', () => {
  const bad = ChatPreferencesRequestSchema.safeParse({});
  assert.equal(bad.success, false);

  const good = ChatPreferencesResponseSchema.safeParse({
    chatId: 'chat-uuid-1234',
    notificationsMuted: true,
    updatedAt: new Date().toISOString()
  });
  assert.equal(good.success, true);
});

test('[schema] mark chat read request accepts an optional throughMessageId', () => {
  const empty = MarkChatReadRequestSchema.safeParse({});
  const explicit = MarkChatReadRequestSchema.safeParse({
    throughMessageId: '11111111-1111-1111-1111-111111111111'
  });

  assert.equal(empty.success, true);
  assert.equal(explicit.success, true);
});

test('[schema] chat member read state parses nullable timestamps and markers', () => {
  const result = ChatMemberReadStateSchema.safeParse({
    userId: 'reader-uuid',
    lastReadAt: null,
    seenThroughMessageId: null
  });
  assert.equal(result.success, true);
});

// ─── realtime socket message send contract ─────────────────────────────────

test('[schema] realtime: rejects message.send without clientMessageId', () => {
  const result = ClientMessageSendEventSchema.safeParse({
    type: 'message.send',
    chatId: 'chat-uuid',
    content: 'hello'
    // clientMessageId omitted — would allow non-idempotent send over socket
  });
  assert.equal(result.success, false, 'socket message.send requires clientMessageId');
});

test('[schema] realtime: accepts valid message.send event', () => {
  const result = ClientMessageSendEventSchema.safeParse({
    type: 'message.send',
    chatId: 'chat-uuid',
    content: 'hello',
    clientMessageId: 'client-msg-001'
  });
  assert.equal(result.success, true, 'valid socket send event should pass');
});

// ─── message schema ─────────────────────────────────────────────────────────

test('[schema] Message: clientMessageId is optional (server-originated messages)', () => {
  const result = MessageSchema.safeParse({
    id: 'msg-uuid',
    chatId: 'chat-uuid',
    senderId: 'user-uuid',
    senderUsername: 'alice',
    content: 'Hello',
    createdAt: new Date().toISOString()
    // clientMessageId absent
  });
  assert.equal(result.success, true, 'clientMessageId is optional on Message');
});

test('[schema] Message: readReceipts are optional but supported', () => {
  const result = MessageSchema.safeParse({
    id: 'msg-uuid',
    chatId: 'chat-uuid',
    senderId: 'user-uuid',
    senderUsername: 'alice',
    content: 'Hello',
    createdAt: new Date().toISOString(),
    seenAt: new Date().toISOString(),
    readReceipts: [
      {
        userId: 'reader-uuid',
        readAt: new Date().toISOString()
      }
    ]
  });
  assert.equal(result.success, true, 'readReceipts should parse on Message');
});

test('[schema] Message: replyTo and grouped reactions are optional but supported', () => {
  const result = MessageSchema.safeParse({
    id: 'msg-uuid',
    chatId: 'chat-uuid',
    senderId: 'user-uuid',
    senderUsername: 'alice',
    content: 'Replying with reactions',
    createdAt: new Date().toISOString(),
    replyTo: {
      id: 'parent-msg-uuid',
      content: 'Original message',
      senderDisplayName: 'Bob'
    },
    reactions: [
      {
        emoji: '🔥',
        userIds: ['user-1', 'user-2']
      }
    ]
  });
  assert.equal(result.success, true, 'replyTo and grouped reactions should parse on Message');
});

test('[schema] add reaction request limits emoji length', () => {
  assert.equal(AddReactionRequestSchema.safeParse({ emoji: '👍' }).success, true);
  assert.equal(AddReactionRequestSchema.safeParse({ emoji: '' }).success, false);
  assert.equal(AddReactionRequestSchema.safeParse({ emoji: '123456789' }).success, false);
});

test('[schema] pinned message response shape is enforced', () => {
  const result = PinnedMessageSchema.safeParse({
    messageId: 'message-uuid',
    chatId: 'chat-uuid',
    pinnedByUserId: 'user-uuid',
    pinnedAt: new Date().toISOString(),
    content: 'Pinned note',
    senderDisplayName: 'Alice'
  });
  assert.equal(result.success, true, 'pinned messages should parse');
});

test('[schema] pin message request requires a message id', () => {
  assert.equal(PinMessageRequestSchema.safeParse({ messageId: '11111111-1111-4111-8111-111111111111' }).success, true);
  assert.equal(PinMessageRequestSchema.safeParse({}).success, false);
});

test('[schema] PollData enforces poll message metadata shape', () => {
  const result = PollDataSchema.safeParse({
    id: '11111111-1111-1111-1111-111111111111',
    question: 'Best rooftop snack?',
    options: [
      { text: 'Fries', voterIds: [] },
      { text: 'Nachos', voterIds: ['22222222-2222-2222-2222-222222222222'] }
    ],
    createdByUserId: '33333333-3333-3333-3333-333333333333'
  });
  assert.equal(result.success, true, 'poll metadata should parse');
});
