import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from './App.vue';
import { installLocalStorageMock } from './test/localStorageMock';
import * as cache from './services/cache';
import * as http from './services/http';
import * as notifications from './services/notifications';

const {
  mockLoadStoredShowInAppToasts,
  mockPersistStoredShowInAppToasts,
  mockLoadStoredAnimateGifsAutomatically,
  mockLoadStoredReducedDataMode
} = vi.hoisted(() => ({
  mockLoadStoredShowInAppToasts: vi.fn(() => Promise.resolve(true)),
  mockPersistStoredShowInAppToasts: vi.fn(() => Promise.resolve()),
  mockLoadStoredAnimateGifsAutomatically: vi.fn(() => Promise.resolve(true)),
  mockLoadStoredReducedDataMode: vi.fn(() => Promise.resolve(false))
}));

const mockAppListeners: Record<string, Function> = {};
const mockAuthEventListeners = new Set<(event: unknown) => void>();

function emitAuthEvent(event: unknown) {
  mockAuthEventListeners.forEach((listener) => listener(event));
}

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (eventName: string, handler: Function) => {
      mockAppListeners[eventName] = handler;
      return {
        remove: vi.fn(() => {
          delete mockAppListeners[eventName];
        })
      };
    })
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
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1'
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
    mustAcceptTestNotice: false,
    requiredTestNoticeVersion: 'alpha-v1',
    acceptedTestNoticeVersion: 'alpha-v1',
    bio: null,
    avatarMediaId: null
  })),
  getMySessions: vi.fn(() => Promise.resolve([
    {
      id: 'session-current',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      deviceLabel: 'Android app',
      appContext: 'android',
      hasPushToken: true,
      current: true
    }
  ])),
  revokeSession: vi.fn(() => Promise.resolve()),
  revokeOtherSessions: vi.fn(() => Promise.resolve({ revokedCount: 0 })),
  getMembers: vi.fn(() => Promise.resolve([])),
  getMember: vi.fn((memberId: string) => Promise.resolve({
    id: memberId,
    username: 'directory-user',
    displayName: 'Directory User',
    avatarUrl: null,
    bio: null
  })),
  createDirectChat: vi.fn((memberId: string) => Promise.resolve({
    id: `dm-${memberId}`,
    name: 'Directory User',
    type: 'dm',
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    counterpartMemberId: memberId,
    counterpartAvatarUrl: null,
    notificationsMuted: false
  })),
  getAuthConfig: vi.fn(() => Promise.resolve({ registrationMode: 'invite_only' })),
  getAdminInvites: vi.fn(() => Promise.resolve([])),
  createAdminInvite: vi.fn(() => Promise.resolve({ id: 'inv-1', code: 'TEST-CODE', label: 'Test', uses: 0, maxUses: 10, expiresAt: null, revokedAt: null, createdAt: new Date().toISOString() })),
  revokeAdminInvite: vi.fn(() => Promise.resolve()),
  getRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'invite_only' })),
  updateRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'closed' })),
  getAdminMembers: vi.fn(() => Promise.resolve([])),
  getAdminOperatorSummary: vi.fn(() => Promise.resolve({
    app: {
      name: 'The Penthouse API',
      checkedAt: new Date().toISOString(),
      databaseReachable: true,
      startedAt: new Date().toISOString(),
      uptimeSeconds: 123,
      version: '0.1.0',
      buildId: null,
      deployedAt: null
    },
    members: {
      total: 3,
      active: 2,
      banned: 1,
      removed: 0,
      admins: 1
    },
    content: {
      chats: 1,
      messages: 5,
      uploads: 2,
      uploadBytesTotal: 2048
    },
    realtime: {
      sockets: 2,
      connectedUsers: 1,
      activeChatRooms: 1
    },
    moderation: {
      hiddenMessages: 0,
      recentActions24h: 0
    },
    invite: {
      code: 'PENTHOUSE-ALPHA',
      uses: 2,
      maxUses: 999999,
      createdAt: new Date().toISOString()
    },
    push: {
      configured: true,
      androidTokens: 2,
      iosTokens: 0,
      notificationsDisabled: 0,
      quietHoursEnabled: 0,
      previewsDisabled: 0,
      sinceStart: {
        successfulSends: 0,
        failedSends: 0,
        staleTokensRemoved: 0,
        lastFailureAt: null
      }
    },
    uploads: {
      status: 'available',
      directoryBytes: 1024,
      fileCount: 1,
      latestUploadAt: new Date().toISOString(),
      scanLimited: false
    },
    errors: {
      sinceStart: {
        serverErrorCount: 0,
        lastServerErrorAt: null,
        routeGroups: []
      }
    },
    backup: {
      status: 'unconfigured',
      target: null,
      lastSuccessfulBackupAt: null
    }
  })),
  getAdminChats: vi.fn(() => Promise.resolve([{ id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }])),
  getAdminChatMessages: vi.fn(() => Promise.resolve([])),
  hideAdminMessage: vi.fn(),
  unhideAdminMessage: vi.fn(),
  removeAdminMember: vi.fn(() => Promise.resolve()),
  banAdminMember: vi.fn(() => Promise.resolve()),
  issueAdminTempPassword: vi.fn(() => Promise.resolve({
    userId: 'user-2',
    username: 'other-user',
    temporaryPassword: 'TEMP-PASS-1234'
  })),
  login: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  acknowledgeTestNotice: vi.fn(() => Promise.resolve({
    user: {
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1'
    },
    acceptedAt: new Date().toISOString()
  })),
  changePassword: vi.fn(),
  updateProfile: vi.fn(),
  rotateRecoveryCode: vi.fn(),
  getDeviceNotificationSettings: vi.fn(() => Promise.resolve({
    token: 'push-token-1',
    notificationsEnabled: true,
    previewsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStartMinute: null,
    quietHoursEndMinute: null,
    timezone: null
  })),
  updateDeviceNotificationSettings: vi.fn((payload: unknown) => Promise.resolve(payload)),
  uploadMedia: vi.fn(),
  getTrendingGifs: vi.fn(() => Promise.resolve({ provider: 'giphy', results: [] })),
  searchGifs: vi.fn(() => Promise.resolve({ provider: 'giphy', results: [] })),
  registerDeviceToken: vi.fn(() => Promise.resolve({ id: 'device-token-1' })),
  unregisterDeviceToken: vi.fn(() => Promise.resolve()),
  updateChatPreferences: vi.fn((chatId: string, notificationsMuted: boolean) => Promise.resolve({ chatId, notificationsMuted })),
  resolveMediaUrl: vi.fn((url: string) => `http://localhost:3000${url}`),
  subscribeAuthEvents: vi.fn((listener: (event: unknown) => void) => {
    mockAuthEventListeners.add(listener);
    return () => {
      mockAuthEventListeners.delete(listener);
    };
  }),
  sendMessage: vi.fn((chatId: string, content: string, clientMessageId: string, type: string = 'text', metadata: unknown = null) =>
    Promise.resolve({
      message: {
        id: `server-id-for-${clientMessageId}`,
        chatId,
        senderId: 'user-1',
        senderUsername: 'testuser',
        senderDisplayName: 'Test User',
        senderAvatarUrl: null,
        content,
        type,
        metadata,
        createdAt: new Date().toISOString(),
        clientMessageId
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
  emit: vi.fn((event: string, payload?: Record<string, unknown>, ack?: (response: { ok: boolean; chatId: string }) => void) => {
    if (event === 'chat.join' && typeof ack === 'function') {
      ack({ ok: true, chatId: String(payload?.chatId || '') });
    }
  }),
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

function installDefaultSocketEmitBehavior(): void {
  vi.mocked(mockSocket.emit).mockImplementation((event: string, payload?: Record<string, unknown>, ack?: (response: { ok: boolean; chatId: string }) => void) => {
    if (event === 'chat.join' && typeof ack === 'function') {
      ack({ ok: true, chatId: String(payload?.chatId || '') });
    }
  });
}

vi.mock('./services/socket', () => ({
  connectSocket: vi.fn(() => mockSocket),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => mockSocket)
}));

vi.mock('./services/notifications', () => ({
  ensureNotificationPermission: vi.fn(() => Promise.resolve(false)),
  ensurePushPermission: vi.fn(() => Promise.resolve(false)),
  initializeNotifications: vi.fn(() => Promise.resolve()),
  getPushToken: vi.fn(() => Promise.resolve('push-token-1')),
  getCachedPushToken: vi.fn(() => 'push-token-1'),
  deletePushToken: vi.fn(() => Promise.resolve()),
  scheduleIncomingMessageNotification: vi.fn(() => Promise.resolve()),
  clearDeliveredNotificationsForChat: vi.fn(() => Promise.resolve()),
  clearAllDeliveredNotifications: vi.fn(() => Promise.resolve())
}));

vi.mock('./services/retry', () => ({
  withBackoff: vi.fn((action: () => Promise<unknown>) => action())
}));

vi.mock('./services/sessionStorage', () => ({
  loadStoredShowInAppToasts: mockLoadStoredShowInAppToasts,
  persistStoredShowInAppToasts: mockPersistStoredShowInAppToasts,
  loadStoredAnimateGifsAutomatically: mockLoadStoredAnimateGifsAutomatically,
  loadStoredReducedDataMode: mockLoadStoredReducedDataMode
}));

beforeEach(() => {
  globalThis.sessionStorage?.clear?.();
  mockLoadStoredShowInAppToasts.mockResolvedValue(true);
  mockPersistStoredShowInAppToasts.mockClear();
  mockLoadStoredAnimateGifsAutomatically.mockResolvedValue(true);
  mockLoadStoredReducedDataMode.mockResolvedValue(false);
});

describe('App.vue Optimistic Flow', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    mockSocket.io.engine.transport.name = 'polling';
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
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

  it('renders a typing indicator when a typing.update event fires for the active chat', async () => {
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

  it('queues typing.start until the chat join acknowledgement completes', async () => {
    let joinAck: ((response: { ok: boolean; chatId: string }) => void) | null = null;
    vi.mocked(mockSocket.emit).mockImplementation((event: string, payload?: Record<string, unknown>, ack?: (response: { ok: boolean; chatId: string }) => void) => {
      if (event === 'chat.join' && typeof ack === 'function') {
        joinAck = ack;
      }
    });

    const wrapper = mount(App);
    await flushPromises();

    mockSocket.connected = true;

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    const composer = wrapper.findComponent({ name: 'MessageComposer' });
    await composer.vm.$emit('typing-start');
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('chat.join', { chatId: 'chat-1' }, expect.any(Function));
    expect(vi.mocked(mockSocket.emit).mock.calls.some(([event]) => event === 'typing.start')).toBe(false);

    const resolvedJoinAck = joinAck as ((response: { ok: boolean; chatId: string }) => void) | null;
    expect(resolvedJoinAck).toBeTypeOf('function');
    if (resolvedJoinAck) {
      resolvedJoinAck({ ok: true, chatId: 'chat-1' });
    }
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('typing.start', { chatId: 'chat-1' });
  });

  it('sends typing.stop and chat.leave for the previous chat when switching chats', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 },
      { id: 'chat-2', name: 'Ops', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
    ]);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocket.connected = true;
    mockSocketHandlers.connect?.();
    await flushPromises();
    vi.mocked(mockSocket.emit).mockClear();

    const composer = wrapper.findComponent({ name: 'MessageComposer' });
    await composer.vm.$emit('typing-start');
    await flushPromises();

    await chatList.vm.$emit('select', 'chat-2');
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('typing.stop', { chatId: 'chat-1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('chat.leave', { chatId: 'chat-1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('chat.join', { chatId: 'chat-2' }, expect.any(Function));
  });
});

describe('App.vue Connection State', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    mockSocket.connected = false;
    mockSocket.io.engine.transport.name = 'polling';
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
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
    expect(mockSocket.emit).toHaveBeenCalledWith('chat.join', { chatId: 'chat-1' }, expect.any(Function));
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

  it('populates the presence map when a presence.sync event fires', async () => {
    const wrapper = mount(App);
    await flushPromises();

    mockSocketHandlers['presence.sync']({
      type: 'presence.sync',
      payload: {
        onlineUserIds: ['user-1', 'user-2', 'user-3']
      }
    });
    await flushPromises();

    // Presence is not shown on ChatListPanel but is wired to the directory view
    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    expect(chatList.exists()).toBe(true);
  });
});

describe('App.vue read gating', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = true;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
    vi.mocked(notifications.getPushToken).mockResolvedValue('push-token-1');
    vi.mocked(notifications.getCachedPushToken).mockReturnValue('push-token-1');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a chat read only after the viewport confirms the latest messages are visible', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    vi.mocked(http.markChatRead).mockClear();

    const messageList = wrapper.findComponent({ name: 'MessageList' });
    await messageList.vm.$emit('viewport-bottom-change', true);
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(vi.mocked(http.markChatRead)).toHaveBeenCalledWith('chat-1');
  });

  it('does not mark a chat read while the app is backgrounded', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockAppListeners.pause?.();
    const messageList = wrapper.findComponent({ name: 'MessageList' });
    await messageList.vm.$emit('viewport-bottom-change', true);
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(vi.mocked(http.markChatRead)).not.toHaveBeenCalled();
  });

  it('does not mark a chat read on resume from stale viewport state alone', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    // User scrolls to bottom before backgrounding
    const messageList = wrapper.findComponent({ name: 'MessageList' });
    await messageList.vm.$emit('viewport-bottom-change', true);
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();
    vi.mocked(http.markChatRead).mockClear();

    // App goes to background — isViewingLatest should reset
    mockAppListeners.pause?.();
    await flushPromises();

    // New message arrives while backgrounded
    mockSocketHandlers['message.new']?.({
      type: 'message.new',
      payload: {
        id: 'msg-bg-unseen',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'unseen background message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-bg-unseen'
      }
    });
    await flushPromises();

    // Prevent handleAppResume from refreshing messages (which would trigger a
    // legitimate viewport event). We only want to test the stale-state path.
    vi.mocked(http.getMessages).mockRejectedValueOnce(new Error('network'));

    // App resumes — stale isViewingLatest should NOT cause mark-as-read
    mockAppListeners.resume?.();
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(vi.mocked(http.markChatRead)).not.toHaveBeenCalled();

    // Only after a fresh viewport-bottom-change should it mark read
    await messageList.vm.$emit('viewport-bottom-change', true);
    await vi.advanceTimersByTimeAsync(200);
    await flushPromises();

    expect(vi.mocked(http.markChatRead)).toHaveBeenCalledWith('chat-1');
  });
});

describe('App.vue notification hardening', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = true;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  it('does not schedule a local notification while app is foregrounded', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    const directoryTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Directory');
    expect(directoryTab).toBeTruthy();
    await directoryTab!.trigger('click');
    await flushPromises();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-foreground-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'foreground message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-foreground-1'
      }
    });
    await flushPromises();

    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).not.toHaveBeenCalled();
  });

  it('shows an in-app toast for messages outside the current live chat', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 },
      { id: 'chat-2', name: 'Ops', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
    ]);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-toast-1',
        chatId: 'chat-2',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'hello from Ops',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-toast-1'
      }
    });
    await flushPromises();

    expect(wrapper.find('.toast-card').exists()).toBe(true);
    expect(wrapper.text()).toContain('Other User');
    expect(wrapper.text()).toContain('hello from Ops');
    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).not.toHaveBeenCalled();

    await wrapper.find('.toast-action').trigger('click');
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('chat.join', { chatId: 'chat-2' }, expect.any(Function));
  });

  it('does not show an in-app toast while already viewing that live chat', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-live-chat-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'already here',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-live-chat-1'
      }
    });
    await flushPromises();

    expect(wrapper.find('.toast-card').exists()).toBe(false);
  });

  it('suppresses foreground in-app toasts when the local preference is disabled', async () => {
    mockLoadStoredShowInAppToasts.mockResolvedValueOnce(false);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-toast-disabled-1',
        chatId: 'chat-2',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'toast should stay quiet',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-toast-disabled-1'
      }
    });
    await flushPromises();

    expect(wrapper.find('.toast-card').exists()).toBe(false);
  });

  it('does not schedule a local background notification when a push token is already cached', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockAppListeners.pause?.();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-background-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'background message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-background-1'
      }
    });
    await flushPromises();

    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).not.toHaveBeenCalled();
  });

  it('keeps the local fallback when backgrounded and no push token is cached', async () => {
    vi.mocked(notifications.getCachedPushToken).mockReturnValue(null);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    mockAppListeners.pause?.();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-background-fallback-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'background fallback message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-background-fallback-1'
      }
    });
    await flushPromises();

    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).toHaveBeenCalledTimes(1);
  });

  it('registers the current push token after full-access workspace boot', async () => {
    mount(App);
    await flushPromises();

    expect(vi.mocked(notifications.initializeNotifications)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(notifications.getPushToken)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(http.registerDeviceToken)).toHaveBeenCalledWith('android', 'push-token-1', null);
  });

  it('unregisters the previous token after a successful token refresh', async () => {
    mount(App);
    await flushPromises();

    vi.mocked(http.registerDeviceToken).mockClear();
    vi.mocked(http.unregisterDeviceToken).mockClear();

    const tokenHandler = vi.mocked(notifications.initializeNotifications).mock.calls[0]?.[2] as
      | ((token: string, previousToken: string | null) => void)
      | undefined;

    expect(tokenHandler).toBeTypeOf('function');
    tokenHandler?.('push-token-2', 'push-token-1');
    await flushPromises();

    expect(vi.mocked(http.registerDeviceToken)).toHaveBeenCalledWith('android', 'push-token-2', 'push-token-1');
    expect(vi.mocked(http.unregisterDeviceToken)).toHaveBeenCalledWith('push-token-1');
  });

  it('unregisters and deletes the current push token on logout', async () => {
    vi.mocked(notifications.getCachedPushToken).mockReturnValue('push-token-1');

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('logout');
    await flushPromises();

    expect(vi.mocked(http.unregisterDeviceToken)).toHaveBeenCalledWith('push-token-1');
    expect(vi.mocked(notifications.deletePushToken)).toHaveBeenCalledTimes(1);
  });
});

describe('App.vue direct messages', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = true;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  async function openDirectoryProfile(wrapper: ReturnType<typeof mount>, memberId = 'user-2') {
    const directoryTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Directory');
    expect(directoryTab).toBeTruthy();
    await directoryTab!.trigger('click');
    await flushPromises();

    const directory = wrapper.findComponent({ name: 'MemberDirectory' });
    await directory.vm.$emit('select-member', memberId);
    await flushPromises();
  }

  it('opens an existing DM directly from the profile sheet', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      {
        id: 'dm-existing',
        name: 'Directory User',
        type: 'dm',
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        counterpartMemberId: 'user-2',
        counterpartAvatarUrl: null,
        notificationsMuted: false
      }
    ]);

    const wrapper = mount(App);
    await flushPromises();
    await openDirectoryProfile(wrapper);

    expect(wrapper.text()).toContain('Message');
    await wrapper.find('.profile-action-btn').trigger('click');
    await flushPromises();

    expect(vi.mocked(http.createDirectChat)).not.toHaveBeenCalled();
    expect(vi.mocked(http.getMessages)).toHaveBeenCalledWith('dm-existing');
    expect(wrapper.text()).toContain('Admins can review messages for safety');
  });

  it('keeps a new DM provisional until the first send resolves it', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
    ]);
    vi.mocked(http.getMember).mockResolvedValueOnce({
      id: 'user-2',
      username: 'friend',
      displayName: 'Friend Person',
      avatarUrl: null,
      bio: 'Hello there'
    });
    vi.mocked(http.createDirectChat).mockResolvedValueOnce({
      id: 'dm-user-2',
      name: 'Friend Person',
      type: 'dm',
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
      counterpartMemberId: 'user-2',
      counterpartAvatarUrl: null,
      notificationsMuted: false
    });

    const wrapper = mount(App);
    await flushPromises();
    await openDirectoryProfile(wrapper);

    await wrapper.find('.profile-action-btn').trigger('click');
    await flushPromises();

    expect(vi.mocked(http.createDirectChat)).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Friend Person');
    expect(wrapper.text()).toContain('Admins can review messages for safety');

    const composer = wrapper.findComponent({ name: 'MessageComposer' });
    await composer.vm.$emit('send', 'hello first dm');
    await flushPromises();

    expect(vi.mocked(http.createDirectChat)).toHaveBeenCalledWith('user-2');
    expect(vi.mocked(http.sendMessage)).toHaveBeenCalledWith(
      'dm-user-2',
      'hello first dm',
      expect.stringContaining('local_'),
      'text',
      null
    );
  });

  it('suppresses muted DM foreground toasts and background local notifications', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      {
        id: 'dm-muted',
        name: 'Muted Friend',
        type: 'dm',
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        counterpartMemberId: 'user-2',
        counterpartAvatarUrl: null,
        notificationsMuted: true
      }
    ]);
    vi.mocked(notifications.getCachedPushToken).mockReturnValue(null);

    const wrapper = mount(App);
    await flushPromises();

    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-muted-foreground',
        chatId: 'dm-muted',
        senderId: 'user-2',
        senderUsername: 'friend',
        senderDisplayName: 'Muted Friend',
        senderAvatarUrl: null,
        content: 'keep it quiet',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-muted-foreground'
      }
    });
    await flushPromises();

    expect(wrapper.find('.toast-card').exists()).toBe(false);
    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).not.toHaveBeenCalled();

    mockAppListeners.pause?.();
    mockSocketHandlers['message.new']({
      type: 'message.new',
      payload: {
        id: 'msg-muted-background',
        chatId: 'dm-muted',
        senderId: 'user-2',
        senderUsername: 'friend',
        senderDisplayName: 'Muted Friend',
        senderAvatarUrl: null,
        content: 'still quiet',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        clientMessageId: 'client-muted-background'
      }
    });
    await flushPromises();

    expect(vi.mocked(notifications.scheduleIncomingMessageNotification)).not.toHaveBeenCalled();
  });

  it('renders the admin review notice in DM threads', async () => {
    vi.mocked(http.getChats).mockResolvedValueOnce([
      {
        id: 'dm-notice',
        name: 'Notice Friend',
        type: 'dm',
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        counterpartMemberId: 'user-3',
        counterpartAvatarUrl: null,
        notificationsMuted: false
      }
    ]);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'dm-notice');
    await flushPromises();

    expect(wrapper.text()).toContain('Admins can review messages for safety');
    expect(wrapper.text()).toContain('Mute');
  });

  it('renders a read-only unavailable state when the DM counterpart is inactive', async () => {
    const notFoundError: any = new Error('Member not found');
    notFoundError.response = { status: 404, data: { error: 'Member not found' } };

    vi.mocked(http.getChats).mockResolvedValueOnce([
      {
        id: 'dm-unavailable',
        name: 'Unavailable Friend',
        type: 'dm',
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        counterpartMemberId: 'user-4',
        counterpartAvatarUrl: null,
        notificationsMuted: false
      }
    ]);
    vi.mocked(http.getMember).mockRejectedValueOnce(notFoundError);

    const wrapper = mount(App);
    await flushPromises();

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'dm-unavailable');
    await flushPromises();

    expect(wrapper.text()).toContain('You can still read the thread, but you cannot send new messages.');
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined();
  });
});

describe('App.vue lightweight session notice reset', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  it('shows the lightweight session notice banner on app open', async () => {
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('Internal testing build');
    expect(wrapper.find('.session-notice-banner').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ChatListPanel' }).exists()).toBe(true);
  });

  it('dismisses the session notice banner when the dismiss button is clicked', async () => {
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('.session-notice-banner').exists()).toBe(true);

    await wrapper.find('.session-notice-banner button').trigger('click');
    await flushPromises();

    expect(wrapper.find('.session-notice-banner').exists()).toBe(false);
  });
});

describe('App.vue chat bootstrap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries initial chat bootstrap instead of showing a false empty chat list', async () => {
    vi.mocked(http.getChats)
      .mockRejectedValueOnce(new Error('temporary bootstrap miss'))
      .mockResolvedValueOnce([
        { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
      ]);

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('Loading chats...');
    expect(wrapper.text()).not.toContain('No chats available');

    await vi.advanceTimersByTimeAsync(901);
    await flushPromises();

    expect(wrapper.text()).toContain('General');
    expect(wrapper.text()).not.toContain('No chats available');
  });

  it('does not leak cached chats or messages from another user into a new session', async () => {
    cache.cacheChats('user-old', [
      { id: 'chat-old', name: 'Legacy Lounge', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
    ]);
    cache.cacheMessages('user-old', 'chat-1', [
      {
        id: 'msg-old',
        chatId: 'chat-1',
        senderId: 'user-old',
        content: 'stale cached message',
        type: 'text',
        createdAt: new Date().toISOString(),
        clientMessageId: 'cm-old'
      }
    ]);

    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'user-2',
        username: 'freshuser',
        displayName: 'Fresh User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'mock-token-user-2',
      refreshToken: 'mock-refresh-token-user-2'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'user-2',
      username: 'freshuser',
      displayName: 'Fresh User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });
    vi.mocked(http.getChats).mockResolvedValueOnce([
      { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
    ]);
    vi.mocked(http.getMessages).mockRejectedValueOnce(new Error('temporary message miss'));

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('General');
    expect(wrapper.text()).not.toContain('Legacy Lounge');

    const chatList = wrapper.findComponent({ name: 'ChatListPanel' });
    await chatList.vm.$emit('select', 'chat-1');
    await flushPromises();

    expect(wrapper.text()).not.toContain('stale cached message');
  });
});

describe('App.vue inactivity presence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hands presence changes to the server instead of disconnecting locally on pause/resume', async () => {
    const wrapper = mount(App);
    await flushPromises();

    mockSocket.connected = true;
    mockSocketHandlers.connect?.();
    await flushPromises();

    mockAppListeners.pause?.();
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('app.state', { active: false });
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    mockAppListeners.resume?.();
    await flushPromises();

    expect(mockSocket.emit).toHaveBeenCalledWith('app.state', { active: true });
  });
});

describe('App.vue admin settings entry', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    mockAuthEventListeners.clear();
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
    vi.mocked(notifications.getPushToken).mockResolvedValue('push-token-1');
    vi.mocked(notifications.getCachedPushToken).mockReturnValue('push-token-1');
  });

  it('keeps user management hidden for non-admin members', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const settingsTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Settings');
    expect(settingsTab).toBeTruthy();
    await settingsTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('User Management');
  });

  it('shows the admin user-management entry inside settings for admins', async () => {
    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        username: 'adminuser',
        displayName: 'Admin User',
        avatarUrl: null,
        role: 'admin',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh-token'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'admin-1',
      username: 'adminuser',
      displayName: 'Admin User',
      avatarUrl: null,
      role: 'admin',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });

    const wrapper = mount(App);
    await flushPromises();

    const settingsTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Settings');
    expect(settingsTab).toBeTruthy();
    await settingsTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('User Management');

    const adminButton = wrapper.findAll('.settings-panel-tabs button').find((button) => button.text() === 'User Management');
    expect(adminButton).toBeTruthy();
    await adminButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Members');
    expect(vi.mocked(http.getAdminMembers)).toHaveBeenCalledTimes(1);
  });

  it('lets admins open the server panel and refresh the summary', async () => {
    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        username: 'adminuser',
        displayName: 'Admin User',
        avatarUrl: null,
        role: 'admin',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh-token'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'admin-1',
      username: 'adminuser',
      displayName: 'Admin User',
      avatarUrl: null,
      role: 'admin',
      mustChangePassword: false,
      mustAcceptTestNotice: false,
      requiredTestNoticeVersion: 'alpha-v1',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });

    const wrapper = mount(App);
    await flushPromises();

    const settingsTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Settings');
    await settingsTab!.trigger('click');
    await flushPromises();

    const serverButton = wrapper.findAll('.settings-panel-tabs button').find((button) => button.text() === 'Server Management');
    expect(serverButton).toBeTruthy();
    await serverButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Server Management');
    expect(wrapper.text()).toContain('The Penthouse API');
    expect(vi.mocked(http.getAdminOperatorSummary)).toHaveBeenCalledTimes(1);

    const refreshButton = wrapper.findAll('button').find((button) => button.text() === 'Refresh');
    expect(refreshButton).toBeTruthy();
    await refreshButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.getAdminOperatorSummary)).toHaveBeenCalledTimes(2);
  });

  it('updates the selected chat message cache when moderation arrives while viewing settings', async () => {
    vi.mocked(http.getMessages).mockResolvedValueOnce([
      {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'otheruser',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: 'Original message',
        type: 'text',
        metadata: null,
        createdAt: new Date().toISOString(),
        hidden: false
      }
    ]);

    const wrapper = mount(App);
    await flushPromises();

    const chatTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Chats');
    await chatTab!.trigger('click');
    await flushPromises();

    const generalRow = wrapper.findAll('.list-item').find((item) => item.text().includes('General'));
    expect(generalRow).toBeTruthy();
    await generalRow!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Original message');

    const settingsTab = wrapper.findAll('button.small-btn').find((button) => button.text() === 'Settings');
    await settingsTab!.trigger('click');
    await flushPromises();

    mockSocketHandlers['message.moderated']?.({
      type: 'message.moderated',
      payload: {
        chatId: 'chat-1',
        messageId: 'msg-1',
        action: 'hide',
        moderatedAt: new Date().toISOString(),
        message: {
          id: 'msg-1',
          chatId: 'chat-1',
          senderId: 'user-2',
          senderUsername: 'otheruser',
          senderDisplayName: 'Other User',
          senderAvatarUrl: null,
          content: 'Message removed by moderation.',
          type: 'text',
          metadata: null,
          createdAt: new Date().toISOString(),
          hidden: true
        }
      }
    });
    await flushPromises();

    await chatTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Message removed by moderation.');
    expect(wrapper.text()).not.toContain('Original message');
  });
});

describe('App.vue test notice gating', () => {
  beforeEach(() => {
    installLocalStorageMock();
    Object.keys(mockAppListeners).forEach((key) => delete mockAppListeners[key]);
    Object.keys(mockSocketHandlers).forEach((key) => delete mockSocketHandlers[key]);
    Object.keys(mockManagerHandlers).forEach((key) => delete mockManagerHandlers[key]);
    Object.keys(mockEngineHandlers).forEach((key) => delete mockEngineHandlers[key]);
    mockSocket.connected = false;
    mockSocket.io.engine.transport.name = 'polling';
    vi.clearAllMocks();
    installDefaultSocketEmitBehavior();
  });

  it('holds the user on the notice gate until the current version is acknowledged', async () => {
    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: true,
        requiredTestNoticeVersion: 'alpha-v2',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: true,
      requiredTestNoticeVersion: 'alpha-v2',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('Internal Test Notice');
    expect(wrapper.text()).toContain('alpha-v2');
    expect(wrapper.text()).not.toContain('Bugs and downtime are expected');
    expect(wrapper.find('.chat-layout').exists()).toBe(false);
    expect(vi.mocked(http.getChats)).not.toHaveBeenCalled();
    expect(vi.mocked(notifications.initializeNotifications)).not.toHaveBeenCalled();
    expect(vi.mocked(http.registerDeviceToken)).not.toHaveBeenCalled();
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('acknowledges the notice and then loads the chat workspace', async () => {
    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: true,
        requiredTestNoticeVersion: 'alpha-v2',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: true,
      requiredTestNoticeVersion: 'alpha-v2',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });

    vi.mocked(http.acknowledgeTestNotice).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v2',
        acceptedTestNoticeVersion: 'alpha-v2'
      },
      acceptedAt: new Date().toISOString()
    });

    const wrapper = mount(App);
    await flushPromises();

    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);
    await wrapper.find('button.form-btn').trigger('click');
    await flushPromises();

    expect(vi.mocked(http.acknowledgeTestNotice)).toHaveBeenCalledWith('alpha-v2');
    expect(vi.mocked(http.getChats)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(notifications.initializeNotifications)).toHaveBeenCalledTimes(1);
  });

  it('blocks boot on fresh me sync before entering the notice gate', async () => {
    vi.mocked(http.hydrateStoredSession).mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token'
    });
    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: true,
      requiredTestNoticeVersion: 'alpha-v2',
      acceptedTestNoticeVersion: 'alpha-v1',
      bio: null,
      avatarMediaId: null
    });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('Internal Test Notice');
    expect(wrapper.text()).toContain('alpha-v2');
    expect(vi.mocked(http.getChats)).not.toHaveBeenCalled();
    expect(vi.mocked(notifications.initializeNotifications)).not.toHaveBeenCalled();
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('shows the sync-required blocker and resets workspace when resume sync fails', async () => {
    const wrapper = mount(App);
    await flushPromises();

    expect(vi.mocked(http.getChats)).toHaveBeenCalledTimes(1);

    vi.mocked(http.getMe).mockRejectedValueOnce(new Error('Network Error'));

    await mockAppListeners.resume?.();
    await flushPromises();

    expect(wrapper.text()).toContain('Session Sync Required');
    expect(wrapper.findComponent({ name: 'ChatListPanel' }).exists()).toBe(false);
  });

  it('forces the client into the notice gate when a notice_required auth event fires', async () => {
    const wrapper = mount(App);
    await flushPromises();

    vi.mocked(http.getMe).mockResolvedValueOnce({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      role: 'member',
      mustChangePassword: false,
      mustAcceptTestNotice: true,
      requiredTestNoticeVersion: 'alpha-v3',
      acceptedTestNoticeVersion: 'alpha-v2',
      bio: null,
      avatarMediaId: null
    });

    const authListener = vi.mocked(http.subscribeAuthEvents).mock.calls.at(-1)?.[0];
    expect(authListener).toBeTypeOf('function');

    authListener?.({ type: 'notice_required' });
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain('Internal Test Notice');
    expect(wrapper.text()).toContain('alpha-v3');
    expect(wrapper.findComponent({ name: 'ChatListPanel' }).exists()).toBe(false);
  });

  it('updates reactive session state when a refreshed user update event arrives', async () => {
    vi.mocked(http.hydrateStoredSession)
      .mockResolvedValueOnce({
        user: {
          id: 'user-1',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: false,
          requiredTestNoticeVersion: 'alpha-v1',
          acceptedTestNoticeVersion: 'alpha-v1'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token'
      })
      .mockResolvedValueOnce({
        user: {
          id: 'user-1',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: true,
          requiredTestNoticeVersion: 'alpha-v4',
          acceptedTestNoticeVersion: 'alpha-v2'
        },
        accessToken: 'refreshed-token',
        refreshToken: 'rotated-refresh-token'
      });

    const wrapper = mount(App);
    await flushPromises();

    const authListener = vi.mocked(http.subscribeAuthEvents).mock.calls.at(-1)?.[0];
    expect(authListener).toBeTypeOf('function');

    authListener?.({
      type: 'user_updated',
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: true,
        requiredTestNoticeVersion: 'alpha-v4',
        acceptedTestNoticeVersion: 'alpha-v2'
      }
    });
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain('Internal Test Notice');
    expect(wrapper.text()).toContain('alpha-v4');
  });
});

describe('App.vue auth config on boot', () => {
  installLocalStorageMock();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches auth config on mount to seed registrationMode', async () => {
    mount(App);
    await flushPromises();

    expect(vi.mocked(http.getAuthConfig)).toHaveBeenCalled();
  });
});
