import { computed, ref, type Ref } from 'vue';
import type { MemberDetail } from '@penthouse/contracts';
import type { Chat, ChatMessage, RealtimeState, Session } from '../types';
import { createDirectChat, getChats, getMember, getMessages, updateChatPreferences } from '../services/http';
import { withBackoff } from '../services/retry';
import { cacheChats, cacheMessages, readCachedChats, readCachedMessages } from '../services/cache';

export type ChatListState = 'loading' | 'ready' | 'error';

export type ProvisionalDirectChat = {
  memberId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  draftKey: string;
};

export type ActiveDirectChat = {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  notificationsMuted: boolean;
  provisional: boolean;
  unavailable: boolean;
  unavailableReason: string;
};

type UseChatStateOptions = {
  session: Ref<Session | null>;
  isViewingLatest: Ref<boolean>;
  chatActionError: Ref<string>;
  ensureSocketConnected: () => void;
  dismissInAppToast: (id: string) => void;
  clearDeliveredNotificationsForChat: (chatId: string) => Promise<void>;
  userHasFullAccess: (session: Session | null) => boolean;
};

const CHAT_BOOTSTRAP_MAX_ATTEMPTS = 3;
const CHAT_BOOTSTRAP_RETRY_DELAY_MS = 900;

export function useChatState(options: UseChatStateOptions) {
  const chats = ref<Chat[]>([]);
  const messages = ref<ChatMessage[]>([]);
  const selectedChatId = ref('');
  const provisionalDirectChat = ref<ProvisionalDirectChat | null>(null);
  const currentView = ref<'chats' | 'directory' | 'settings'>('chats');
  const settingsPanel = ref<'profile' | 'admin' | 'invites' | 'server' | 'moderation'>('profile');
  const selectedMemberId = ref<string | null>(null);
  const chatListState = ref<ChatListState>('loading');
  const chatListError = ref('');
  const dmAvailabilityByChatId = ref<Record<string, { unavailable: boolean; reason: string }>>({});
  const directChatMuteBusy = ref(false);

  let chatBootstrapRetryTimer: ReturnType<typeof setTimeout> | null = null;

  const totalUnreadCount = computed(() =>
    chats.value.reduce((sum, chat) => sum + Math.max(0, chat.unreadCount ?? 0), 0)
  );

  const selectedChatSummary = computed(() =>
    chats.value.find((chat) => chat.id === selectedChatId.value) ?? null
  );

  const activeConversationComposerKey = computed(() =>
    selectedChatId.value || provisionalDirectChat.value?.draftKey || ''
  );

  const isContentActive = computed(() => {
    if (currentView.value === 'chats') return !!selectedChatId.value || !!provisionalDirectChat.value;
    return true;
  });

  const activeDirectChat = computed<ActiveDirectChat | null>(() => {
    if (provisionalDirectChat.value) {
      return {
        memberId: provisionalDirectChat.value.memberId,
        name: provisionalDirectChat.value.name,
        avatarUrl: provisionalDirectChat.value.avatarUrl,
        notificationsMuted: false,
        provisional: true,
        unavailable: false,
        unavailableReason: ''
      };
    }

    if (selectedChatSummary.value?.type !== 'dm' || !selectedChatSummary.value.counterpartMemberId) {
      return null;
    }

    const availability = dmAvailabilityByChatId.value[selectedChatSummary.value.id] ?? {
      unavailable: false,
      reason: ''
    };

    return {
      memberId: selectedChatSummary.value.counterpartMemberId,
      name: selectedChatSummary.value.name,
      avatarUrl: selectedChatSummary.value.counterpartAvatarUrl ?? null,
      notificationsMuted: Boolean(selectedChatSummary.value.notificationsMuted),
      provisional: false,
      unavailable: availability.unavailable,
      unavailableReason: availability.reason
    };
  });

  const activeDirectChatInitial = computed(() => {
    const label = activeDirectChat.value?.name?.trim();
    return label ? label[0].toUpperCase() : '?';
  });

  function clearChatBootstrapRetryTimer(): void {
    if (!chatBootstrapRetryTimer) return;
    clearTimeout(chatBootstrapRetryTimer);
    chatBootstrapRetryTimer = null;
  }

  function resetChatListState(): void {
    clearChatBootstrapRetryTimer();
    chatListState.value = 'loading';
    chatListError.value = '';
  }

  function activeCacheUserId(): string | null {
    return options.session.value?.user.id ?? null;
  }

  function readScopedCachedChats(): Chat[] {
    const userId = activeCacheUserId();
    return userId ? readCachedChats(userId) : [];
  }

  function cacheChatsForActiveUser(nextChats: Chat[]): void {
    const userId = activeCacheUserId();
    if (!userId) return;
    cacheChats(userId, nextChats);
  }

  function readScopedCachedMessages(chatId: string): ChatMessage[] {
    const userId = activeCacheUserId();
    return userId ? readCachedMessages(userId, chatId) : [];
  }

  function cacheMessagesForActiveUser(chatId: string, nextMessages: ChatMessage[]): void {
    const userId = activeCacheUserId();
    if (!userId) return;
    cacheMessages(userId, chatId, nextMessages);
  }

  function sortChats(nextChats: Chat[]): Chat[] {
    return [...nextChats].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  function isChatMuted(chatId: string): boolean {
    return Boolean(chats.value.find((chat) => chat.id === chatId)?.notificationsMuted);
  }

  function upsertChat(nextChat: Chat): void {
    chats.value = sortChats([nextChat, ...chats.value.filter((chat) => chat.id !== nextChat.id)]);
    cacheChatsForActiveUser(chats.value);
  }

  function setChatNotificationsMuted(chatId: string, notificationsMuted: boolean): void {
    chats.value = sortChats(
      chats.value.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              notificationsMuted
            }
          : chat
      )
    );
    cacheChatsForActiveUser(chats.value);
  }

  function setChatUnreadCount(chatId: string, unreadCount: number): void {
    chats.value = sortChats(
      chats.value.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: Math.max(0, unreadCount) } : chat
      )
    );
    cacheChatsForActiveUser(chats.value);
  }

  function bumpChatUnreadCount(chatId: string): void {
    chats.value = sortChats(
      chats.value.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              unreadCount: Math.max(0, (chat.unreadCount ?? 0) + 1)
            }
          : chat
      )
    );
    cacheChatsForActiveUser(chats.value);
  }

  function touchChat(chatId: string, updatedAt: string): void {
    chats.value = sortChats(
      chats.value.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              updatedAt
            }
          : chat
      )
    );
    cacheChatsForActiveUser(chats.value);
  }

  async function refreshDirectChatAvailability(chat: Chat | null): Promise<void> {
    if (!chat || chat.type !== 'dm' || !chat.counterpartMemberId) return;

    try {
      await getMember(chat.counterpartMemberId);
      dmAvailabilityByChatId.value = {
        ...dmAvailabilityByChatId.value,
        [chat.id]: {
          unavailable: false,
          reason: ''
        }
      };
    } catch (error: any) {
      const status = typeof error?.response?.status === 'number' ? error.response.status : 0;
      if (status !== 404) return;

      dmAvailabilityByChatId.value = {
        ...dmAvailabilityByChatId.value,
        [chat.id]: {
          unavailable: true,
          reason: 'This member is no longer active. You can still read the thread, but you cannot send new messages.'
        }
      };
    }
  }

  function beginProvisionalDirectChat(member: MemberDetail): void {
    provisionalDirectChat.value = {
      memberId: member.id,
      name: member.displayName || member.username,
      username: member.username,
      avatarUrl: member.avatarUrl,
      draftKey: `draft-dm:${member.id}`
    };
    messages.value = [];
    selectedChatId.value = '';
    currentView.value = 'chats';
    options.chatActionError.value = '';
    selectedMemberId.value = null;
  }

  async function handleStartDirectMessage(member: MemberDetail): Promise<void> {
    const existingChat = chats.value.find(
      (chat) => chat.type === 'dm' && chat.counterpartMemberId === member.id
    );

    if (existingChat) {
      provisionalDirectChat.value = null;
      selectedMemberId.value = null;
      currentView.value = 'chats';
      await openChat(existingChat.id);
      return;
    }

    beginProvisionalDirectChat(member);
  }

  async function ensureDirectChatResolved(memberId: string): Promise<Chat | null> {
    const existingChat = chats.value.find(
      (chat) => chat.type === 'dm' && chat.counterpartMemberId === memberId
    );
    if (existingChat) {
      provisionalDirectChat.value = null;
      await openChat(existingChat.id);
      return existingChat;
    }

    try {
      const createdChat = await withBackoff(() => createDirectChat(memberId));
      upsertChat(createdChat);
      provisionalDirectChat.value = null;
      await openChat(createdChat.id);
      return createdChat;
    } catch (error: any) {
      options.chatActionError.value = error?.response?.data?.error || 'Failed to start direct message';
      return null;
    }
  }

  async function toggleActiveDirectChatMute(): Promise<void> {
    if (!selectedChatId.value || !activeDirectChat.value || activeDirectChat.value.provisional) return;

    directChatMuteBusy.value = true;
    options.chatActionError.value = '';
    try {
      const response = await updateChatPreferences(
        selectedChatId.value,
        !activeDirectChat.value.notificationsMuted
      );
      setChatNotificationsMuted(response.chatId, response.notificationsMuted);
    } catch (error: any) {
      options.chatActionError.value =
        error?.response?.data?.error || 'Failed to update conversation preferences';
    } finally {
      directChatMuteBusy.value = false;
    }
  }

  function markDirectChatUnavailable(chatId: string): void {
    dmAvailabilityByChatId.value = {
      ...dmAvailabilityByChatId.value,
      [chatId]: {
        unavailable: true,
        reason: 'This member is no longer active. You can still read the thread, but you cannot send new messages.'
      }
    };
  }

  async function loadChats(optionsArg: { bootstrap?: boolean; attempt?: number } = {}): Promise<void> {
    const { bootstrap = false, attempt = 1 } = optionsArg;
    const cachedChats = sortChats(readScopedCachedChats());

    if (bootstrap) {
      chatListState.value = 'loading';
      if (attempt === 1) {
        chatListError.value = '';
      }
    }

    try {
      const freshChats = sortChats(await withBackoff(() => getChats()));
      const shouldRetryEmptyBootstrap = bootstrap && freshChats.length === 0;
      if (shouldRetryEmptyBootstrap) {
        if (cachedChats.length > 0) {
          chats.value = cachedChats;
        }

        if (
          attempt < CHAT_BOOTSTRAP_MAX_ATTEMPTS &&
          options.session.value &&
          options.userHasFullAccess(options.session.value)
        ) {
          clearChatBootstrapRetryTimer();
          chatBootstrapRetryTimer = setTimeout(() => {
            void loadChats({ bootstrap: true, attempt: attempt + 1 });
          }, CHAT_BOOTSTRAP_RETRY_DELAY_MS);
          return;
        }

        throw new Error('initial chat bootstrap returned no chats');
      }

      chats.value = freshChats;
      cacheChatsForActiveUser(chats.value);
      clearChatBootstrapRetryTimer();
      chatListState.value = 'ready';
      chatListError.value = '';
      void refreshDirectChatAvailability(chats.value.find((chat) => chat.id === selectedChatId.value) ?? null);
    } catch {
      if (cachedChats.length > 0) {
        chats.value = cachedChats;
        chatListState.value = 'ready';
        chatListError.value = '';
        return;
      }

      chats.value = [];

      if (
        bootstrap &&
        attempt < CHAT_BOOTSTRAP_MAX_ATTEMPTS &&
        options.session.value &&
        options.userHasFullAccess(options.session.value)
      ) {
        clearChatBootstrapRetryTimer();
        chatBootstrapRetryTimer = setTimeout(() => {
          void loadChats({ bootstrap: true, attempt: attempt + 1 });
        }, CHAT_BOOTSTRAP_RETRY_DELAY_MS);
        return;
      }

      chatListState.value = 'error';
      chatListError.value = 'We are still syncing your chats. Retry in a moment.';
    }
  }

  async function handleChatListRetry(): Promise<void> {
    resetChatListState();
    await loadChats({ bootstrap: true });
  }

  async function openChat(chatId: string): Promise<void> {
    options.chatActionError.value = '';
    provisionalDirectChat.value = null;
    selectedChatId.value = chatId;
    options.isViewingLatest.value = false;
    options.dismissInAppToast(`chat:${chatId}`);
    void options.clearDeliveredNotificationsForChat(chatId);

    try {
      messages.value = await withBackoff(() => getMessages(chatId));
      cacheMessagesForActiveUser(chatId, messages.value);
    } catch {
      messages.value = readScopedCachedMessages(chatId);
    }

    options.ensureSocketConnected();
    await refreshDirectChatAvailability(chats.value.find((chat) => chat.id === chatId) ?? null);
  }

  function mergeServerMessages(chatId: string, fetched: ChatMessage[]): void {
    const pendingLocal = messages.value.filter(
      (message) => message.chatId === chatId && message.id.startsWith('local_')
    );
    const fetchedClientIds = new Set(
      fetched
        .map((message) => message.clientMessageId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    const unresolvedLocal = pendingLocal.filter(
      (message) => !message.clientMessageId || !fetchedClientIds.has(message.clientMessageId)
    );

    messages.value = [...unresolvedLocal, ...fetched];
    cacheMessagesForActiveUser(chatId, messages.value);
  }

  async function refreshSelectedChatFromApi(): Promise<void> {
    if (!selectedChatId.value) return;
    try {
      const latest = await getMessages(selectedChatId.value);
      mergeServerMessages(selectedChatId.value, latest);
    } catch {
      // Keep current local/cached state; refresh will retry on next interval.
    }
  }

  function handleMobileBack(): void {
    if (currentView.value === 'chats') {
      selectedChatId.value = '';
      provisionalDirectChat.value = null;
      messages.value = [];
    } else {
      currentView.value = 'chats';
      settingsPanel.value = 'profile';
      selectedMemberId.value = null;
    }
  }

  function resetState(): void {
    clearChatBootstrapRetryTimer();
    chatListState.value = 'loading';
    chatListError.value = '';
    chats.value = [];
    messages.value = [];
    selectedChatId.value = '';
    provisionalDirectChat.value = null;
    selectedMemberId.value = null;
    currentView.value = 'chats';
    settingsPanel.value = 'profile';
    directChatMuteBusy.value = false;
    dmAvailabilityByChatId.value = {};
  }

  return {
    activeConversationComposerKey,
    activeDirectChat,
    activeDirectChatInitial,
    beginProvisionalDirectChat,
    bumpChatUnreadCount,
    cacheChatsForActiveUser,
    cacheMessagesForActiveUser,
    chatListError,
    chatListState,
    chats,
    clearChatBootstrapRetryTimer,
    currentView,
    directChatMuteBusy,
    dmAvailabilityByChatId,
    ensureDirectChatResolved,
    handleChatListRetry,
    handleMobileBack,
    handleStartDirectMessage,
    isChatMuted,
    isContentActive,
    loadChats,
    markDirectChatUnavailable,
    mergeServerMessages,
    messages,
    openChat,
    provisionalDirectChat,
    refreshDirectChatAvailability,
    refreshSelectedChatFromApi,
    resetChatListState,
    resetState,
    selectedChatId,
    selectedChatSummary,
    selectedMemberId,
    setChatUnreadCount,
    settingsPanel,
    sortChats,
    toggleActiveDirectChatMute,
    totalUnreadCount,
    touchChat
  };
}
