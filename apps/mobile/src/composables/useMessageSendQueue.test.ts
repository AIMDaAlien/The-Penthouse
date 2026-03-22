import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';
import type { Session } from '../types';
import { installLocalStorageMock } from '../test/localStorageMock';
import { enqueueMessage, getQueued } from '../services/offlineQueue';
import { useMessageSendQueue } from './useMessageSendQueue';

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn()
}));

vi.mock('../services/http', () => ({
  sendMessage: mockSendMessage,
  uploadMedia: vi.fn()
}));

function makeSession(userId: string): Session {
  return {
    user: {
      id: userId,
      username: `${userId}-name`,
      displayName: `${userId} display`,
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1'
    },
    accessToken: `${userId}-access`,
    refreshToken: `${userId}-refresh`
  };
}

function makePendingMessage(clientMessageId: string) {
  return {
    chatId: 'chat-1',
    content: `pending ${clientMessageId}`,
    type: 'text' as const,
    metadata: null,
    clientMessageId,
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  };
}

describe('useMessageSendQueue session isolation', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('clears queued and failed state when the active session changes', async () => {
    enqueueMessage(makePendingMessage('stale-user-1-message'), 'user-1');

    const session = ref<Session | null>(makeSession('user-1'));
    const queue = useMessageSendQueue({
      session,
      selectedChatId: ref('chat-1'),
      provisionalDirectChat: ref(null),
      messages: ref([]),
      chatActionError: ref(''),
      ensureDirectChatResolved: vi.fn(),
      markDirectChatUnavailable: vi.fn(),
      cacheMessagesForActiveUser: vi.fn()
    });

    expect(queue.queued.value).toHaveLength(1);
    expect(Array.from(queue.failedMessageIds.value)).toEqual(['stale-user-1-message']);

    session.value = makeSession('user-2');
    await nextTick();

    expect(queue.queued.value).toHaveLength(0);
    expect(Array.from(queue.failedMessageIds.value)).toEqual([]);
  });

  it('does not flush a previous user queue for the next logged-in user', async () => {
    enqueueMessage(makePendingMessage('stale-user-1-message'), 'user-1');
    mockSendMessage.mockResolvedValue({
      message: {
        id: 'server-message-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'user-2-name',
        senderDisplayName: 'user-2 display',
        senderAvatarUrl: null,
        content: 'pending stale-user-1-message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'stale-user-1-message'
      },
      deduped: false
    });

    const queue = useMessageSendQueue({
      session: ref<Session | null>(makeSession('user-2')),
      selectedChatId: ref('chat-1'),
      provisionalDirectChat: ref(null),
      messages: ref([]),
      chatActionError: ref(''),
      ensureDirectChatResolved: vi.fn(),
      markDirectChatUnavailable: vi.fn(),
      cacheMessagesForActiveUser: vi.fn()
    });

    await queue.flushPending();

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('clears persisted and in-memory failed state on logout', () => {
    enqueueMessage(makePendingMessage('logout-user-1-message'), 'user-1');

    const queue = useMessageSendQueue({
      session: ref<Session | null>(makeSession('user-1')),
      selectedChatId: ref('chat-1'),
      provisionalDirectChat: ref(null),
      messages: ref([]),
      chatActionError: ref(''),
      ensureDirectChatResolved: vi.fn(),
      markDirectChatUnavailable: vi.fn(),
      cacheMessagesForActiveUser: vi.fn()
    });

    expect(queue.queued.value).toHaveLength(1);
    expect(Array.from(queue.failedMessageIds.value)).toEqual(['logout-user-1-message']);

    queue.resetForLogout();

    expect(queue.queued.value).toEqual([]);
    expect(Array.from(queue.failedMessageIds.value)).toEqual([]);
    expect(getQueued('user-1')).toEqual([]);
  });

  it('does not retry a queued send after the active session changes mid-flush', async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      enqueueMessage(makePendingMessage('retry-user-1-message'), 'user-1');

      const session = ref<Session | null>(makeSession('user-1'));
      mockSendMessage
        .mockImplementationOnce(() => {
          session.value = makeSession('user-2');
          return Promise.reject(new Error('transient send failure'));
        })
        .mockResolvedValue({
          message: {
            id: 'server-message-2',
            chatId: 'chat-1',
            senderId: 'user-2',
            senderUsername: 'user-2-name',
            senderDisplayName: 'user-2 display',
            senderAvatarUrl: null,
            content: 'pending retry-user-1-message',
            type: 'text',
            metadata: null,
            createdAt: new Date().toISOString(),
            clientMessageId: 'retry-user-1-message'
          },
          deduped: false
        });

      const queue = useMessageSendQueue({
        session,
        selectedChatId: ref('chat-1'),
        provisionalDirectChat: ref(null),
        messages: ref([]),
        chatActionError: ref(''),
        ensureDirectChatResolved: vi.fn(),
        markDirectChatUnavailable: vi.fn(),
        cacheMessagesForActiveUser: vi.fn()
      });

      const flushPromise = queue.flushPending();
      await Promise.resolve();
      await nextTick();
      await vi.advanceTimersByTimeAsync(5_000);
      await flushPromise;

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(getQueued('user-1')).toEqual([]);
    } finally {
      randomSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
