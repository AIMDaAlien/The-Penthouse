import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  SendMessageRequestSchema,
  CreatePollRequestSchema,
  ChatSummarySchema,
  CreateGroupChatRequestSchema,
  UpdateChatRequestSchema,
  AddChatMemberRequestSchema,
  ArchiveChatResponseSchema,
  DeleteChatResponseSchema,
  MessageSchema,
  AUTH_CONSTRAINTS
} from '../src/api.js';

describe('RegisterRequestSchema', () => {
  it('accepts valid registration', () => {
    const result = RegisterRequestSchema.safeParse({
      username: 'TestUser_123',
      displayName: 'Test User',
      password: 'ValidPass123!',
      inviteCode: 'ABC123',
      captchaToken: 'captcha-token-123',
      acceptTestNotice: true,
      testNoticeVersion: 'v1.0'
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.username, 'testuser_123');
      assert.strictEqual(result.data.displayName, 'Test User');
    }
  });

  it('rejects short username', () => {
    const result = RegisterRequestSchema.safeParse({
      username: 'ab',
      password: 'ValidPass123!',
      inviteCode: 'ABC123',
      captchaToken: 'token',
      acceptTestNotice: true,
      testNoticeVersion: 'v1'
    });
    assert.strictEqual(result.success, false);
  });

  it('rejects password with leading space', () => {
    const result = RegisterRequestSchema.safeParse({
      username: 'validuser',
      password: ' ValidPass123!',
      inviteCode: 'ABC123',
      captchaToken: 'token',
      acceptTestNotice: true,
      testNoticeVersion: 'v1'
    });
    assert.strictEqual(result.success, false);
  });

  it('rejects missing acceptTestNotice', () => {
    const result = RegisterRequestSchema.safeParse({
      username: 'validuser',
      password: 'ValidPass123!',
      inviteCode: 'ABC123',
      captchaToken: 'token',
      acceptTestNotice: false,
      testNoticeVersion: 'v1'
    });
    assert.strictEqual(result.success, false);
  });
});

describe('LoginRequestSchema', () => {
  it('accepts valid login', () => {
    const result = LoginRequestSchema.safeParse({
      username: 'TestUser',
      password: 'ValidPass123!'
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.username, 'testuser');
    }
  });
});

describe('SendMessageRequestSchema', () => {
  it('accepts valid text message', () => {
    const result = SendMessageRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello world',
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects empty content for text type', () => {
    const result = SendMessageRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, false);
  });

  it('accepts audio with audioUrl metadata', () => {
    const result = SendMessageRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      type: 'audio',
      metadata: { audioUrl: 'https://example.com/audio.mp3' },
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects audio without audioUrl', () => {
    const result = SendMessageRequestSchema.safeParse({
      chatId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      type: 'audio',
      metadata: {},
      clientMessageId: 'client-msg-123'
    });
    assert.strictEqual(result.success, false);
  });
});

describe('CreatePollRequestSchema', () => {
  it('accepts valid poll', () => {
    const result = CreatePollRequestSchema.safeParse({
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green']
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects duplicate options', () => {
    const result = CreatePollRequestSchema.safeParse({
      question: 'What is your favorite color?',
      options: ['Red', 'red', 'Blue']
    });
    assert.strictEqual(result.success, false);
  });

  it('rejects too few options', () => {
    const result = CreatePollRequestSchema.safeParse({
      question: 'What is your favorite color?',
      options: ['Red']
    });
    assert.strictEqual(result.success, false);
  });
});

describe('ChatSummarySchema', () => {
  it('accepts dm, group, and channel chat types', () => {
    for (const type of ['dm', 'group', 'channel'] as const) {
      const result = ChatSummarySchema.safeParse({
        id: `chat-${type}`,
        type,
        name: type,
        role: type === 'dm' ? 'member' : 'owner',
        updatedAt: new Date().toISOString(),
        archivedAt: null
      });
      assert.strictEqual(result.success, true);
    }
  });
});

describe('group management schemas', () => {
  it('validates group creation and rejects duplicate members', () => {
    const memberId = '550e8400-e29b-41d4-a716-446655440000';
    assert.strictEqual(CreateGroupChatRequestSchema.safeParse({
      name: 'Strategy',
      memberIds: [memberId]
    }).success, true);

    assert.strictEqual(CreateGroupChatRequestSchema.safeParse({
      name: 'Strategy',
      memberIds: [memberId, memberId]
    }).success, false);
  });

  it('validates rename, member mutation, archive, and delete payloads', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440001';
    const memberId = '550e8400-e29b-41d4-a716-446655440002';

    assert.strictEqual(UpdateChatRequestSchema.safeParse({ name: 'Ops' }).success, true);
    assert.strictEqual(AddChatMemberRequestSchema.safeParse({ memberId, role: 'admin' }).success, true);
    assert.strictEqual(AddChatMemberRequestSchema.parse({ memberId }).role, 'member');
    assert.strictEqual(ArchiveChatResponseSchema.safeParse({ chatId, archivedAt: null }).success, true);
    assert.strictEqual(DeleteChatResponseSchema.safeParse({ chatId, deletedAt: new Date().toISOString() }).success, true);
  });
});

describe('MessageSchema', () => {
  it('accepts minimal valid message', () => {
    const result = MessageSchema.safeParse({
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      content: 'Hello',
      type: 'text',
      createdAt: new Date().toISOString()
    });
    assert.strictEqual(result.success, true);
  });
});
