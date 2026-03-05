import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from './App.vue';
import { installLocalStorageMock } from './test/localStorageMock';
import * as http from './services/http';

vi.mock('./services/http', () => ({
  getChats: vi.fn(() => Promise.resolve([{ id: 'chat-1', name: 'General', type: 'channel' }])),
  getMessages: vi.fn(() => Promise.resolve([])),
  getStoredUser: vi.fn(() => ({ id: 'user-1', username: 'testuser' })),
  login: vi.fn(),
  register: vi.fn(),
  sendMessage: vi.fn(() => Promise.resolve()),
  setStoredUser: vi.fn(),
  logout: vi.fn()
}));

const mockSocketHandlers: Record<string, Function> = {};

const mockSocket = {
  on: vi.fn((event, handler) => {
    mockSocketHandlers[event] = handler;
  }),
  off: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  io: {
    on: vi.fn(),
    removeAllListeners: vi.fn()
  }
};

vi.mock('./services/socket', () => ({
  connectSocket: vi.fn(() => mockSocket),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => mockSocket)
}));

describe('App.vue Optimistic Flow', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.setItem('accessToken', 'mock-token');
    vi.clearAllMocks();
  });

  it('optimistically displays message, then replaces id on message.ack', async () => {
    const wrapper = mount(App);
    await flushPromises();

    // User is signed in (mock loads from localStorage), so ChatListPanel is visible
    // Click chat to select it
    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    // Send a message via Composer
    const composer = wrapper.findComponent({ name: 'MessageComposer' });
    await composer.vm.$emit('send', 'Hello optimistic');
    await flushPromises();

    const messageList = wrapper.findComponent({ name: 'MessageList' });
    const messages = messageList.props('messages');
    
    // 1 message should be optimistic local message
    expect(messages.length).toBe(1);
    const localId = messages[0].clientMessageId;
    expect(localId).toContain('local_');
    expect(messages[0].id).toBe(localId); // The unconfirmed id equals clientMessageId
    expect(messages[0].content).toBe('Hello optimistic');

    // Simulate backend sending message.ack
    expect(mockSocketHandlers['message.ack']).toBeDefined();
    mockSocketHandlers['message.ack']({
      type: 'message.ack',
      payload: {
        clientMessageId: localId,
        messageId: 'server-uuid-999',
        chatId: 'chat-1',
        deliveredAt: new Date().toISOString()
      }
    });
    
    await flushPromises();

    // Check replacement: ID should change to server uuid
    const updatedMessages = wrapper.findComponent({ name: 'MessageList' }).props('messages');
    expect(updatedMessages[0].id).toBe('server-uuid-999');
    expect(updatedMessages[0].clientMessageId).toBe(localId); // Keeps reference
  });

  it('drops optimistic message when message.new provides the true server message', async () => {
    const wrapper = mount(App);
    await flushPromises();

    // Select chat
    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    // Send optimistic message
    const composer = wrapper.findComponent({ name: 'MessageComposer' });
    await composer.vm.$emit('send', 'Race condition text');
    await flushPromises();

    const messageList = wrapper.findComponent({ name: 'MessageList' });
    const localId = messageList.props('messages')[0].clientMessageId;

    // Simulate message.new arriving BEFORE message.ack (race condition)
    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'new-server-uuid',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Race condition text',
        createdAt: new Date().toISOString(),
        clientMessageId: localId
      }
    });

    await flushPromises();

    const updatedMessages = wrapper.findComponent({ name: 'MessageList' }).props('messages');
    expect(updatedMessages.length).toBe(1); // Didn't duplicate
    expect(updatedMessages[0].id).toBe('new-server-uuid');
    expect(updatedMessages[0].content).toBe('Race condition text');
  });
});
