import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from './App.vue';
import { installLocalStorageMock } from './test/localStorageMock';
import * as http from './services/http';

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async () => ({
      remove: vi.fn()
    }))
  }
}));

vi.mock('./services/http', () => ({
  getChats: vi.fn(() => Promise.resolve([{ id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }])),
  getMessages: vi.fn(() => Promise.resolve([])),
  markChatRead: vi.fn(() => Promise.resolve({ chatId: 'chat-1', unreadCount: 0, lastReadAt: new Date().toISOString(), seenThroughMessageId: null })),
  hydrateStoredSession: vi.fn(() => Promise.resolve({
    user: {
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false
    },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh-token'
  })),
  getMe: vi.fn(() => Promise.resolve({
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    role: 'member',
    mustChangePassword: false,
    bio: null,
    avatarMediaId: null
  })),
  getMembers: vi.fn(() => Promise.resolve([])),
  getMember: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
  updateProfile: vi.fn(),
  rotateRecoveryCode: vi.fn(),
  uploadMedia: vi.fn(),
  getTrendingGifs: vi.fn(() => Promise.resolve({ provider: 'giphy', results: [] })),
  searchGifs: vi.fn(() => Promise.resolve({ provider: 'giphy', results: [] })),
  resolveMediaUrl: vi.fn((url: string) => `http://localhost:3000${url}`),
  sendMessage: vi.fn((chatId: string, content: string, clientMessageId: string) =>
    Promise.resolve({
      message: {
        id: `server-id-for-${clientMessageId}`,
        chatId,
        senderId: 'user-1',
        senderUsername: 'testuser',
        senderDisplayName: 'Test User',
        senderAvatarUrl: null,
        content,
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId
      },
      deduped: false
    })
  ),
  sendStructuredMessage: vi.fn((chatId: string, payload: { content: string; type: string; metadata: unknown; clientMessageId: string }) =>
    Promise.resolve({
      message: {
        id: `server-id-for-${payload.clientMessageId}`,
        chatId,
        senderId: 'user-1',
        senderUsername: 'testuser',
        senderDisplayName: 'Test User',
        senderAvatarUrl: null,
        content: payload.content,
        type: payload.type,
        metadata: payload.metadata,
        createdAt: new Date().toISOString(),
        clientMessageId: payload.clientMessageId
      },
      deduped: false
    })
  ),
  setStoredUser: vi.fn(),
  logout: vi.fn()
}));

const mockSocketHandlers: Record<string, Function> = {};

const mockManagerHandlers: Record<string, Function> = {};
const mockEngineHandlers: Record<string, Function> = {};

const mockSocket = {
  connected: false,
  on: vi.fn((event: string, handler: Function) => {
    mockSocketHandlers[event] = handler;
  }),
  off: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  io: {
    engine: {
      transport: { name: 'polling' },
      once: vi.fn((event: string, handler: Function) => {
        mockEngineHandlers[event] = handler;
      })
    },
    on: vi.fn((event: string, handler: Function) => {
      mockManagerHandlers[event] = handler;
    }),
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
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    mockSocket.io.engine.transport.name = 'polling';
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
    
    // 1 message should exist and contain the local tracking id.
    expect(messages.length).toBe(1);
    const localId = messages[0].clientMessageId;
    expect(localId).toContain('local_');
    expect(messages[0].id).toBe(`server-id-for-${localId}`); // send response already confirms delivery
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

  it('shows a typing indicator for the active chat when typing.update arrives', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocketHandlers['typing.update']({
      type: 'typing.update',
      payload: {
        chatId: 'chat-1',
        userId: 'user-2',
        status: 'start',
        displayName: 'Ryan'
      }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Ryan is typing...');
  });
});

describe('App.vue Connection State', () => {
  beforeEach(() => {
    installLocalStorageMock();
    mockSocket.connected = false;
    mockSocket.io.engine.transport.name = 'polling';
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    vi.clearAllMocks();
  });

  function getStatus(wrapper: ReturnType<typeof mount>) {
    return wrapper.findComponent({ name: 'ConnectionStatus' });
  }

  it('starts in connecting state before socket connects', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const status = getStatus(wrapper);
    expect(mockSocket.connect).toHaveBeenCalled();
    expect(status.props('realtimeState')).toBe('connecting');
    expect(status.props('hasNetwork')).toBe(true);
    expect(status.text()).toContain('Reconnecting...');
  });

  it('shows Connected after socket connect event fires', async () => {
    const wrapper = mount(App);
    await flushPromises();

    // Simulate successful socket connection
    mockSocket.connected = true;
    mockSocketHandlers['connect']();
    await flushPromises();

    const status = getStatus(wrapper);
    expect(status.props('realtimeState')).toBe('connected');
    expect(status.props('hasNetwork')).toBe(true);
    expect(status.props('diagnostics').transport).toBe('polling');
    expect(status.text()).toContain('Connected');
  });

  it('enters degraded mode after socket disconnect while network is still up', async () => {
    const wrapper = mount(App);
    await flushPromises();

    // Connect then disconnect
    mockSocket.connected = true;
    mockSocketHandlers['connect']();
    await flushPromises();

    mockSocket.connected = false;
    mockSocketHandlers['disconnect']('transport close');
    await flushPromises();

    const status = getStatus(wrapper);
    expect(status.props('realtimeState')).toBe('degraded');
    expect(status.props('hasNetwork')).toBe(true);
    expect(status.text()).toContain('Realtime offline');
    expect(status.props('diagnostics').lastDisconnectReason).toBe('transport close');
  });

  it('enters degraded mode on connect_error and enables fallback only for selected chat', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    const previousFetchCount = vi.mocked(http.getMessages).mock.calls.length;
    mockSocketHandlers['connect_error'](new Error('xhr poll error'));
    await flushPromises();

    const status = getStatus(wrapper);
    expect(status.props('realtimeState')).toBe('degraded');
    expect(status.props('hasNetwork')).toBe(true);
    expect(status.text()).toContain('Realtime offline');
    expect(status.props('diagnostics').lastError).toBe('xhr poll error');
    expect(status.props('diagnostics').fallbackActive).toBe(true);
    expect(vi.mocked(http.getMessages).mock.calls.length).toBeGreaterThan(previousFetchCount);
  });

  it('shows Offline after the browser offline event fires', async () => {
    const wrapper = mount(App);
    await flushPromises();

    window.dispatchEvent(new Event('offline'));
    await flushPromises();

    const status = getStatus(wrapper);
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(status.props('hasNetwork')).toBe(false);
    expect(status.props('realtimeState')).toBe('idle');
    expect(status.text()).toContain('Offline');
  });

  it('keeps the UI offline when reconnect events fire after the browser goes offline', async () => {
    const wrapper = mount(App);
    await flushPromises();

    window.dispatchEvent(new Event('offline'));
    await flushPromises();

    mockManagerHandlers['reconnect_attempt']?.();
    mockSocketHandlers['connect_error']?.(new Error('xhr poll error'));
    await flushPromises();

    const status = getStatus(wrapper);
    expect(status.props('hasNetwork')).toBe(false);
    expect(status.props('realtimeState')).toBe('idle');
    expect(status.text()).toContain('Offline');
  });

  it('moves from reconnecting to connected and rejoins the active chat', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockManagerHandlers['reconnect_attempt']();
    await flushPromises();
    expect(getStatus(wrapper).props('realtimeState')).toBe('connecting');

    mockSocket.connected = true;
    mockSocketHandlers['connect']();
    await flushPromises();
    expect(getStatus(wrapper).props('realtimeState')).toBe('connected');
    expect(mockSocket.emit).toHaveBeenCalledWith('chat.join', { chatId: 'chat-1' });
  });

  it('marks the socket as failed after reconnect exhaustion', async () => {
    const wrapper = mount(App);
    await flushPromises();

    mockManagerHandlers['reconnect_failed']();
    await flushPromises();

    const status = getStatus(wrapper);
    expect(status.props('realtimeState')).toBe('failed');
    expect(status.text()).toContain('Reconnect failed');
  });

  it('disables fallback polling outside the chat view', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocketHandlers['connect_error'](new Error('xhr poll error'));
    await flushPromises();
    expect(getStatus(wrapper).props('diagnostics').fallbackActive).toBe(true);

    const directoryTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Directory');
    expect(directoryTab).toBeTruthy();
    await directoryTab!.trigger('click');
    await flushPromises();

    expect(getStatus(wrapper).props('diagnostics').fallbackActive).toBe(false);
  });

  it('tracks online member count from presence.sync', async () => {
    const wrapper = mount(App);
    await flushPromises();

    mockSocketHandlers['presence.sync']({
      type: 'presence.sync',
      payload: {
        onlineUserIds: ['user-1', 'user-2', 'user-3']
      }
    });
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    expect(chatList.props('onlineCount')).toBe(3);
  });
});
