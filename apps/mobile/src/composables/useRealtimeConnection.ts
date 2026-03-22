import { computed, ref, watch, type Ref } from 'vue';
import {
  ServerMessageAckEventSchema,
  ServerMessageModeratedEventSchema,
  ServerMessageNewEventSchema,
  ServerMessageReadEventSchema,
  ServerPresenceSyncEventSchema,
  ServerPresenceUpdateEventSchema,
  ServerTypingUpdateEventSchema
} from '@penthouse/contracts';
import type {
  Chat,
  ChatMessage,
  PresenceStatus,
  RealtimeDiagnostics,
  RealtimeState,
  Session,
  TypingParticipant
} from '../types';
import { clearDeliveredNotificationsForChat, getCachedPushToken } from '../services/notifications';
import { connectSocket, getSocket } from '../services/socket';
import { markChatRead } from '../services/http';

type DiagnosticOptions = {
  level?: 'debug' | 'warn';
  verbose?: boolean;
};

type UseRealtimeConnectionOptions = {
  session: Ref<Session | null>;
  chats: Ref<Chat[]>;
  messages: Ref<ChatMessage[]>;
  currentView: Ref<'chats' | 'directory' | 'settings'>;
  selectedChatId: Ref<string>;
  isViewingLatest: Ref<boolean>;
  cacheChatsForActiveUser: (nextChats: Chat[]) => void;
  cacheMessagesForActiveUser: (chatId: string, nextMessages: ChatMessage[]) => void;
  loadChats: (options?: { bootstrap?: boolean; attempt?: number }) => Promise<void>;
  refreshSelectedChatFromApi: () => Promise<void>;
  touchChat: (chatId: string, updatedAt: string) => void;
  setChatUnreadCount: (chatId: string, unreadCount: number) => void;
  bumpChatUnreadCount: (chatId: string) => void;
  isChatMuted: (chatId: string) => boolean;
  queueInAppToast: (message: ChatMessage, chatName: string | null) => void;
  scheduleIncomingMessageNotification: (message: ChatMessage, chatName: string | null) => Promise<void>;
  markMessageDelivered: (
    chatId: string,
    clientMessageId: string,
    messageId: string,
    latencyMs?: number
  ) => void;
  flushPending: () => Promise<void>;
  logMobileDiagnostic: (
    topic: string,
    details?: Record<string, unknown>,
    options?: DiagnosticOptions
  ) => void;
};

function defaultRealtimeDiagnostics(): RealtimeDiagnostics {
  return {
    transport: 'unknown',
    lastError: null,
    lastDisconnectReason: null,
    lastConnectedAt: null,
    fallbackActive: false
  };
}

export function useRealtimeConnection(options: UseRealtimeConnectionOptions) {
  const hasNetwork = ref(navigator.onLine);
  const realtimeState = ref<RealtimeState>('idle');
  const realtimeDiagnostics = ref<RealtimeDiagnostics>(defaultRealtimeDiagnostics());
  const presenceByUserId = ref<Record<string, PresenceStatus>>({});
  const typingByChat = ref<Record<string, Record<string, TypingParticipant>>>({});
  const appIsActive = ref(typeof document === 'undefined' ? true : !document.hidden);

  const activeTypingMembers = computed((): TypingParticipant[] => {
    if (!options.selectedChatId.value) return [];
    const chatTyping = typingByChat.value[options.selectedChatId.value];
    if (!chatTyping) return [];
    return Object.values(chatTyping).filter((participant) => participant.userId !== options.session.value?.user.id);
  });

  let fallbackRefreshTimer: ReturnType<typeof setInterval> | null = null;
  let lastFallbackSignature = '';
  let suppressNextDisconnectTransition = false;
  let markReadTimer: ReturnType<typeof setTimeout> | null = null;
  const joinedChatId = ref('');
  const pendingTypingChatId = ref<string | null>(null);
  let joiningChatId = '';
  let joiningChatRequestId = 0;
  let joiningChatPromise: Promise<boolean> | null = null;

  function setRealtimeState(nextState: RealtimeState): void {
    realtimeState.value = nextState;
  }

  function patchRealtimeDiagnostics(patch: Partial<RealtimeDiagnostics>): void {
    realtimeDiagnostics.value = {
      ...realtimeDiagnostics.value,
      ...patch
    };
  }

  function markRealtimeConnected(transport: string): void {
    setRealtimeState('connected');
    patchRealtimeDiagnostics({
      transport: transport === 'polling' || transport === 'websocket' ? transport : 'unknown',
      lastError: null,
      lastDisconnectReason: null,
      lastConnectedAt: new Date().toISOString()
    });
  }

  function markRealtimeDegraded(errorMessage: string | null = null): void {
    setRealtimeState('degraded');
    patchRealtimeDiagnostics({
      lastError: errorMessage ?? realtimeDiagnostics.value.lastError
    });
  }

  function markRealtimeFailed(errorMessage: string | null = null): void {
    setRealtimeState('failed');
    patchRealtimeDiagnostics({
      lastError: errorMessage ?? realtimeDiagnostics.value.lastError
    });
  }

  function clearFallbackRefreshTimer(): void {
    if (!fallbackRefreshTimer) return;
    clearInterval(fallbackRefreshTimer);
    fallbackRefreshTimer = null;
  }

  function clearMarkReadTimer(): void {
    if (!markReadTimer) return;
    clearTimeout(markReadTimer);
    markReadTimer = null;
  }

  function canMarkSelectedChatRead(): boolean {
    return Boolean(
      options.session.value &&
        hasNetwork.value &&
        appIsActive.value &&
        options.currentView.value === 'chats' &&
        options.selectedChatId.value &&
        options.isViewingLatest.value
    );
  }

  async function executeMarkSelectedChatRead(): Promise<void> {
    if (!canMarkSelectedChatRead()) return;
    try {
      const result = await markChatRead(options.selectedChatId.value);
      options.setChatUnreadCount(result.chatId, result.unreadCount);
      await clearDeliveredNotificationsForChat(result.chatId);
    } catch {
      // Keep local unread state; another read attempt will happen on the next open/message event.
    }
  }

  function scheduleMarkSelectedChatRead(): void {
    if (!canMarkSelectedChatRead()) {
      clearMarkReadTimer();
      return;
    }
    clearMarkReadTimer();
    markReadTimer = setTimeout(() => {
      void executeMarkSelectedChatRead();
    }, 150);
  }

  function applySeenReceipt(chatId: string, readerUserId: string, seenAt: string): void {
    if (!options.session.value || readerUserId === options.session.value.user.id) return;
    const seenAtMs = Date.parse(seenAt);
    if (!Number.isFinite(seenAtMs)) return;

    let changed = false;
    options.messages.value = options.messages.value.map((message) => {
      if (message.chatId !== chatId || message.senderId !== options.session.value?.user.id) {
        return message;
      }

      const createdAtMs = Date.parse(message.createdAt);
      if (!Number.isFinite(createdAtMs) || createdAtMs > seenAtMs) {
        return message;
      }

      const nextSeenAt = !message.seenAt || Date.parse(message.seenAt) < seenAtMs ? seenAt : message.seenAt;
      if (nextSeenAt === message.seenAt) return message;
      changed = true;
      return {
        ...message,
        seenAt: nextSeenAt
      };
    });

    if (changed && options.selectedChatId.value) {
      options.cacheMessagesForActiveUser(options.selectedChatId.value, options.messages.value);
    }
  }

  function syncFallbackRefreshState(): void {
    const fallbackActive = Boolean(
      options.currentView.value === 'chats' &&
        options.selectedChatId.value &&
        options.session.value &&
        hasNetwork.value &&
        (realtimeState.value === 'degraded' || realtimeState.value === 'failed')
    );
    const signature = JSON.stringify({
      fallbackActive,
      currentView: options.currentView.value,
      selectedChatId: options.selectedChatId.value,
      realtimeState: realtimeState.value,
      hasNetwork: hasNetwork.value
    });
    if (signature === lastFallbackSignature && Boolean(fallbackRefreshTimer) === fallbackActive) {
      patchRealtimeDiagnostics({ fallbackActive });
      return;
    }
    lastFallbackSignature = signature;
    clearFallbackRefreshTimer();
    patchRealtimeDiagnostics({ fallbackActive });
    if (!fallbackActive) return;
    void options.refreshSelectedChatFromApi();
    fallbackRefreshTimer = setInterval(() => {
      void options.refreshSelectedChatFromApi();
    }, 2500);
  }

  function setPresenceStatus(userId: string, status: PresenceStatus): void {
    presenceByUserId.value = {
      ...presenceByUserId.value,
      [userId]: status
    };
  }

  function applyPresenceSync(onlineUserIds: string[]): void {
    const next: Record<string, PresenceStatus> = {};
    Object.keys(presenceByUserId.value).forEach((userId) => {
      next[userId] = 'offline';
    });
    onlineUserIds.forEach((userId) => {
      next[userId] = 'online';
    });
    presenceByUserId.value = next;
  }

  function markAllPresenceOffline(): void {
    const next: Record<string, PresenceStatus> = {};
    Object.keys(presenceByUserId.value).forEach((userId) => {
      next[userId] = 'offline';
    });
    presenceByUserId.value = next;
  }

  function upsertTypingParticipant(chatId: string, participant: TypingParticipant): void {
    typingByChat.value = {
      ...typingByChat.value,
      [chatId]: {
        ...(typingByChat.value[chatId] ?? {}),
        [participant.userId]: participant
      }
    };
  }

  function removeTypingParticipant(chatId: string, userId: string): void {
    const chatTyping = { ...(typingByChat.value[chatId] ?? {}) };
    if (!chatTyping[userId]) return;
    delete chatTyping[userId];

    const next = { ...typingByChat.value };
    if (Object.keys(chatTyping).length > 0) {
      next[chatId] = chatTyping;
    } else {
      delete next[chatId];
    }
    typingByChat.value = next;
  }

  function clearTypingForUser(userId: string): void {
    const next: Record<string, Record<string, TypingParticipant>> = {};
    Object.entries(typingByChat.value).forEach(([chatId, participants]) => {
      const chatParticipants = { ...participants };
      delete chatParticipants[userId];
      if (Object.keys(chatParticipants).length > 0) {
        next[chatId] = chatParticipants;
      }
    });
    typingByChat.value = next;
  }

  function clearTypingState(): void {
    typingByChat.value = {};
  }

  function resetJoinedChatState(): void {
    joinedChatId.value = '';
    joiningChatId = '';
    joiningChatPromise = null;
    joiningChatRequestId += 1;
  }

  function resetActiveChatRoomState(): void {
    pendingTypingChatId.value = null;
    resetJoinedChatState();
  }

  function emitTypingStartForChat(chatId: string): void {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    options.logMobileDiagnostic(
      'typing.start.emit',
      { chatId, joinedChatId: joinedChatId.value || null },
      { verbose: true }
    );
    socket.emit('typing.start', { chatId });
  }

  function emitTypingStopForChat(chatId: string): void {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    options.logMobileDiagnostic(
      'typing.stop.emit',
      { chatId, joinedChatId: joinedChatId.value || null },
      { verbose: true }
    );
    socket.emit('typing.stop', { chatId });
  }

  function emitChatLeaveForChat(chatId: string): void {
    if (!chatId) return;

    if (pendingTypingChatId.value === chatId) {
      pendingTypingChatId.value = null;
    }

    if (joinedChatId.value === chatId) {
      joinedChatId.value = '';
    }

    if (joiningChatId === chatId) {
      joiningChatId = '';
      joiningChatPromise = null;
      joiningChatRequestId += 1;
    }

    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit('chat.leave', { chatId });
  }

  async function ensureChatJoined(chatId: string): Promise<boolean> {
    if (!chatId || options.currentView.value !== 'chats' || options.selectedChatId.value !== chatId) {
      return false;
    }

    if (joinedChatId.value === chatId) {
      return true;
    }

    if (joiningChatPromise && joiningChatId === chatId) {
      return joiningChatPromise;
    }

    const socket = getSocket();
    if (!socket?.connected) {
      return false;
    }

    const requestId = ++joiningChatRequestId;
    joiningChatId = chatId;
    options.logMobileDiagnostic('chat.join.requested', {
      chatId,
      requestId,
      selectedChatId: options.selectedChatId.value || null,
      currentView: options.currentView.value
    });

    joiningChatPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (joined: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (requestId === joiningChatRequestId) {
          joiningChatPromise = null;
          joiningChatId = '';
          if (joined && options.currentView.value === 'chats' && options.selectedChatId.value === chatId) {
            joinedChatId.value = chatId;
            if (pendingTypingChatId.value === chatId) {
              emitTypingStartForChat(chatId);
            }
          } else {
            joinedChatId.value = '';
          }
        } else if (joined) {
          const nextSocket = getSocket();
          if (nextSocket?.connected) {
            nextSocket.emit('chat.leave', { chatId });
          }
        }
        resolve(joined);
      };

      const timeoutId = setTimeout(() => {
        finish(false);
      }, 1500);

      socket.emit('chat.join', { chatId }, (response?: { ok?: boolean; chatId?: string }) => {
        const joined = Boolean(response?.ok) && response?.chatId === chatId;
        options.logMobileDiagnostic('chat.join.ack', {
          chatId,
          requestId,
          joined,
          responseChatId: response?.chatId ?? null
        });
        if (!joined && pendingTypingChatId.value === chatId) {
          pendingTypingChatId.value = null;
        }
        finish(joined);
      });
    });

    return joiningChatPromise;
  }

  function handleTypingStart(): void {
    const chatId = options.selectedChatId.value;
    if (!chatId || options.currentView.value !== 'chats') return;
    pendingTypingChatId.value = chatId;
    options.logMobileDiagnostic(
      'typing.start.requested',
      {
        chatId,
        joinedChatId: joinedChatId.value || null
      },
      { verbose: true }
    );
    if (joinedChatId.value === chatId) {
      emitTypingStartForChat(chatId);
      return;
    }
    void ensureChatJoined(chatId);
  }

  function handleTypingStop(): void {
    const chatId = options.selectedChatId.value;
    if (!chatId) return;
    options.logMobileDiagnostic(
      'typing.stop.requested',
      {
        chatId,
        joinedChatId: joinedChatId.value || null
      },
      { verbose: true }
    );
    if (pendingTypingChatId.value === chatId) {
      pendingTypingChatId.value = null;
    }
    if (joinedChatId.value === chatId) {
      emitTypingStopForChat(chatId);
    }
  }

  function handleViewportBottomChange(isAtBottom: boolean): void {
    if (!appIsActive.value) return;
    options.isViewingLatest.value = isAtBottom;
    if (isAtBottom) {
      scheduleMarkSelectedChatRead();
    }
  }

  function ensureSocketConnected(): void {
    const socket = getSocket();
    if (socket && !socket.connected && hasNetwork.value) {
      setRealtimeState('connecting');
      socket.connect();
    }
  }

  function wireSocketHandlers(): void {
    const socket = connectSocket();
    socket.removeAllListeners('message.new');
    socket.removeAllListeners('message.moderated');
    socket.removeAllListeners('message.ack');
    socket.removeAllListeners('message.read');
    socket.removeAllListeners('typing.update');
    socket.removeAllListeners('presence.update');
    socket.removeAllListeners('presence.sync');
    socket.removeAllListeners('connect');
    socket.removeAllListeners('connect_error');
    socket.removeAllListeners('disconnect');
    socket.io.removeAllListeners('reconnect_attempt');
    socket.io.removeAllListeners('reconnect_failed');
    socket.io.removeAllListeners('reconnect');

    const syncTransport = () => {
      const transportName = socket.io.engine?.transport?.name;
      patchRealtimeDiagnostics({
        transport: transportName === 'polling' || transportName === 'websocket' ? transportName : 'unknown'
      });
    };

    const bindEngineUpgradeListener = () => {
      const engine = socket.io.engine as
        | { once?: (event: string, handler: (transport: { name?: string }) => void) => void }
        | undefined;
      if (!engine?.once) return;
      engine.once('upgrade', (transport) => {
        patchRealtimeDiagnostics({
          transport: transport?.name === 'polling' || transport?.name === 'websocket' ? transport.name : 'unknown'
        });
      });
    };

    socket.on('message.new', (event: unknown) => {
      const parsed = ServerMessageNewEventSchema.safeParse(event);
      if (!parsed.success) return;
      const payload = parsed.data.payload;
      const knownChat = options.chats.value.find((chat) => chat.id === payload.chatId) ?? null;
      const chatName = knownChat?.name ?? null;
      if (!knownChat) {
        void options.loadChats().catch(() => undefined);
      }
      options.touchChat(payload.chatId, payload.createdAt);

      const isSelectedChat =
        options.currentView.value === 'chats' && payload.chatId === options.selectedChatId.value;
      const canTreatIncomingAsRead = isSelectedChat && appIsActive.value && options.isViewingLatest.value;

      const existingIdx = options.messages.value.findIndex(
        (message) => message.clientMessageId === payload.clientMessageId
      );

      if (isSelectedChat && existingIdx >= 0) {
        options.messages.value[existingIdx] = payload;
      } else if (isSelectedChat && !options.messages.value.some((message) => message.id === payload.id)) {
        options.messages.value.unshift(payload);
      }
      removeTypingParticipant(payload.chatId, payload.senderId);

      if (payload.senderId !== options.session.value?.user.id) {
        if (!canTreatIncomingAsRead) {
          options.bumpChatUnreadCount(payload.chatId);
          if (!appIsActive.value) {
            if (!getCachedPushToken() && !options.isChatMuted(payload.chatId)) {
              void options.scheduleIncomingMessageNotification(payload, chatName);
            }
          } else if (!isSelectedChat && !options.isChatMuted(payload.chatId)) {
            options.queueInAppToast(payload, chatName);
          }
        } else {
          options.setChatUnreadCount(payload.chatId, 0);
          scheduleMarkSelectedChatRead();
        }
      }

      if (!isSelectedChat) {
        options.cacheChatsForActiveUser(options.chats.value);
        return;
      }

      options.cacheMessagesForActiveUser(payload.chatId, options.messages.value);
    });

    socket.on('message.moderated', (event: unknown) => {
      const parsed = ServerMessageModeratedEventSchema.safeParse(event);
      if (!parsed.success) return;

      const { chatId, message } = parsed.data.payload;
      const isTrackedChat = chatId === options.selectedChatId.value;

      if (isTrackedChat) {
        const existingIdx = options.messages.value.findIndex((entry) => entry.id === message.id);
        if (existingIdx >= 0) {
          options.messages.value[existingIdx] = {
            ...options.messages.value[existingIdx],
            ...message
          };
          options.cacheMessagesForActiveUser(chatId, options.messages.value);
        } else {
          void options.refreshSelectedChatFromApi();
        }
        if (
          options.currentView.value === 'chats' &&
          !message.hidden &&
          appIsActive.value &&
          options.isViewingLatest.value
        ) {
          scheduleMarkSelectedChatRead();
        }
      }

      void options.loadChats().catch(() => undefined);
    });

    socket.on('message.ack', (event: unknown) => {
      const parsed = ServerMessageAckEventSchema.safeParse(event);
      if (!parsed.success) return;
      const payload = parsed.data.payload;
      const existingMsg = options.messages.value.find(
        (message) => message.clientMessageId === payload.clientMessageId
      );
      if (existingMsg) {
        existingMsg.id = payload.messageId;
        options.cacheMessagesForActiveUser(payload.chatId, options.messages.value);
      }

      const deliveryMs = existingMsg
        ? Date.parse(payload.deliveredAt) - Date.parse(existingMsg.createdAt)
        : undefined;
      options.markMessageDelivered(payload.chatId, payload.clientMessageId, payload.messageId, deliveryMs);
    });

    socket.on('message.read', (event: unknown) => {
      const parsed = ServerMessageReadEventSchema.safeParse(event);
      if (!parsed.success) return;
      const { chatId, readerUserId, seenAt } = parsed.data.payload;
      applySeenReceipt(chatId, readerUserId, seenAt);
    });

    socket.on('connect', () => {
      resetJoinedChatState();
      syncTransport();
      bindEngineUpgradeListener();
      markRealtimeConnected(socket.io.engine?.transport?.name ?? 'unknown');
      socket.emit('app.state', { active: appIsActive.value });
      if (options.session.value?.user.id) {
        setPresenceStatus(options.session.value.user.id, 'online');
      }
      if (options.selectedChatId.value && options.currentView.value === 'chats') {
        void ensureChatJoined(options.selectedChatId.value);
      }
      void options.flushPending().catch(() => undefined);
    });

    socket.on('typing.update', (event: unknown) => {
      const parsed = ServerTypingUpdateEventSchema.safeParse(event);
      if (!parsed.success) return;

      const { chatId, userId, status, displayName, avatarUrl } = parsed.data.payload;
      if (userId === options.session.value?.user.id) return;

      if (status === 'start') {
        upsertTypingParticipant(chatId, {
          userId,
          displayName: displayName ?? undefined,
          avatarUrl: avatarUrl ?? null
        });
        return;
      }

      removeTypingParticipant(chatId, userId);
    });

    socket.on('presence.update', (event: unknown) => {
      const parsed = ServerPresenceUpdateEventSchema.safeParse(event);
      if (!parsed.success) return;
      const { userId, status } = parsed.data.payload;
      setPresenceStatus(userId, status);
      if (status === 'offline') {
        clearTypingForUser(userId);
      }
    });

    socket.on('presence.sync', (event: unknown) => {
      const parsed = ServerPresenceSyncEventSchema.safeParse(event);
      if (!parsed.success) return;
      applyPresenceSync(parsed.data.payload.onlineUserIds);
    });

    socket.on('connect_error', (error: Error) => {
      if (!hasNetwork.value) {
        setRealtimeState('idle');
        patchRealtimeDiagnostics({
          lastError: null,
          lastDisconnectReason: 'network offline'
        });
        return;
      }

      clearTypingState();
      resetJoinedChatState();
      markAllPresenceOffline();
      patchRealtimeDiagnostics({
        lastError: error?.message ?? 'connect_error',
        lastDisconnectReason: null
      });
      markRealtimeDegraded(error?.message ?? 'connect_error');
    });

    socket.on('disconnect', (reason: string) => {
      if (suppressNextDisconnectTransition) {
        suppressNextDisconnectTransition = false;
        return;
      }

      clearTypingState();
      resetJoinedChatState();
      markAllPresenceOffline();
      patchRealtimeDiagnostics({
        lastDisconnectReason: reason,
        transport:
          socket.io.engine?.transport?.name === 'polling' || socket.io.engine?.transport?.name === 'websocket'
            ? socket.io.engine.transport.name
            : realtimeDiagnostics.value.transport
      });
      if (hasNetwork.value) {
        markRealtimeDegraded(reason);
      } else {
        setRealtimeState('idle');
      }
    });

    socket.io.on('reconnect_attempt', () => {
      if (!hasNetwork.value) return;
      patchRealtimeDiagnostics({ lastError: null });
      if (realtimeState.value === 'idle') {
        setRealtimeState('connecting');
      }
    });

    socket.io.on('reconnect_failed', () => {
      clearTypingState();
      resetJoinedChatState();
      markAllPresenceOffline();
      markRealtimeFailed(realtimeDiagnostics.value.lastError ?? 'reconnect_failed');
    });

    socket.io.on('reconnect', syncTransport);

    if (socket.connected) {
      resetJoinedChatState();
      syncTransport();
      bindEngineUpgradeListener();
      markRealtimeConnected(socket.io.engine?.transport?.name ?? 'unknown');
      if (options.selectedChatId.value && options.currentView.value === 'chats') {
        void ensureChatJoined(options.selectedChatId.value);
      }
    } else if (hasNetwork.value) {
      setRealtimeState('connecting');
      socket.connect();
    } else {
      setRealtimeState('idle');
    }
  }

  function restartSocketConnection(reason: string): void {
    const socket = getSocket();
    if (!socket || !hasNetwork.value) return;

    clearTypingState();
    resetJoinedChatState();
    markAllPresenceOffline();
    patchRealtimeDiagnostics({
      lastError: null,
      lastDisconnectReason: reason
    });
    setRealtimeState('connecting');

    if (socket.connected) {
      suppressNextDisconnectTransition = true;
      socket.disconnect();
    }

    socket.connect();
  }

  function forceSocketReconnect(): void {
    restartSocketConnection('manual reconnect');
  }

  function onOnline(): void {
    hasNetwork.value = true;
    const socket = getSocket();
    if (socket && appIsActive.value) {
      restartSocketConnection('network restored');
    }
    if (appIsActive.value) {
      void options.flushPending().catch(() => undefined);
    }
  }

  function onOffline(): void {
    hasNetwork.value = false;
    getSocket()?.disconnect();
    resetJoinedChatState();
    setRealtimeState('idle');
    patchRealtimeDiagnostics({
      lastError: null,
      lastDisconnectReason: 'network offline',
      fallbackActive: false
    });
    clearTypingState();
    markAllPresenceOffline();
  }

  function setAppActive(nextValue: boolean): void {
    const wasActive = appIsActive.value;
    appIsActive.value = nextValue;
    options.logMobileDiagnostic(
      'app.active',
      {
        nextValue,
        wasActive,
        selectedChatId: options.selectedChatId.value || null,
        currentView: options.currentView.value
      },
      { verbose: true }
    );
    if (!nextValue) {
      if (pendingTypingChatId.value === options.selectedChatId.value) {
        pendingTypingChatId.value = null;
      }
      if (joinedChatId.value === options.selectedChatId.value) {
        emitTypingStopForChat(options.selectedChatId.value);
      }
      getSocket()?.emit('app.state', { active: false });
      clearMarkReadTimer();
      options.isViewingLatest.value = false;
      return;
    }

    getSocket()?.emit('app.state', { active: true });

    if (options.selectedChatId.value && options.currentView.value === 'chats') {
      scheduleMarkSelectedChatRead();
    }
  }

  function resetState(seedUserId: string | null): void {
    clearMarkReadTimer();
    clearFallbackRefreshTimer();
    resetActiveChatRoomState();
    clearTypingState();
    lastFallbackSignature = '';
    suppressNextDisconnectTransition = false;
    presenceByUserId.value = seedUserId ? { [seedUserId]: 'offline' } : {};
    realtimeDiagnostics.value = defaultRealtimeDiagnostics();
    realtimeState.value = 'idle';
  }

  watch([options.selectedChatId, options.currentView, realtimeState, hasNetwork], () => {
    syncFallbackRefreshState();
  });

  watch(options.selectedChatId, (nextChatId, previousChatId) => {
    if (previousChatId && previousChatId !== nextChatId) {
      if (joinedChatId.value === previousChatId) {
        emitTypingStopForChat(previousChatId);
      }
      emitChatLeaveForChat(previousChatId);
    }

    if (nextChatId && options.currentView.value === 'chats') {
      void ensureChatJoined(nextChatId);
      scheduleMarkSelectedChatRead();
      return;
    }

    options.isViewingLatest.value = false;
  });

  watch(options.currentView, (nextView, previousView) => {
    if (previousView === 'chats' && nextView !== 'chats' && options.selectedChatId.value) {
      if (joinedChatId.value === options.selectedChatId.value) {
        emitTypingStopForChat(options.selectedChatId.value);
      }
      emitChatLeaveForChat(options.selectedChatId.value);
    }

    if (options.selectedChatId.value && nextView === 'chats') {
      void ensureChatJoined(options.selectedChatId.value);
      scheduleMarkSelectedChatRead();
      return;
    }

    options.isViewingLatest.value = false;
  });

  return {
    activeTypingMembers,
    appIsActive,
    clearTypingState,
    ensureChatJoined,
    ensureSocketConnected,
    forceSocketReconnect,
    handleTypingStart,
    handleTypingStop,
    handleViewportBottomChange,
    hasNetwork,
    onOffline,
    onOnline,
    patchRealtimeDiagnostics,
    presenceByUserId,
    realtimeDiagnostics,
    realtimeState,
    resetActiveChatRoomState,
    resetJoinedChatState,
    resetState,
    restartSocketConnection,
    scheduleMarkSelectedChatRead,
    setAppActive,
    setPresenceStatus,
    setRealtimeState,
    syncFallbackRefreshState,
    typingByChat,
    wireSocketHandlers
  };
}
