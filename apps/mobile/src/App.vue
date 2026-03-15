<template>
  <main class="shell">
    <header class="app-header">
      <div class="header-title">
        <button 
          v-if="session && isContentActive" 
          class="mobile-back-btn" 
          @click="handleMobileBack"
        >
          ←
        </button>
        <h1>The Penthouse</h1>
      </div>
      <ConnectionStatus 
        v-if="session"
        :realtimeState="realtimeState"
        :hasNetwork="hasNetwork"
        :queuedCount="queued.length"
        :diagnostics="realtimeDiagnostics"
        :debugEnabled="debugRealtimeEnabled"
        @flush="flushPending"
        @reconnect="forceSocketReconnect"
      />
    </header>

    <InAppToastHost
      v-if="toastHostVisible"
      :toasts="inAppToasts"
      @dismiss="dismissInAppToast"
      @action="handleInAppToastAction"
    />

    <section v-if="isBooting" class="chat-shell loading-shell">
      <div class="card loading-card">
        <h2>Restoring session...</h2>
        <p class="small">Checking stored credentials before showing the auth screen.</p>
      </div>
    </section>

    <section v-else-if="!session" class="chat-shell auth-shell">
      <div v-if="sessionNoticeVisible" class="session-notice card" role="status">
        <div>
          <p class="session-notice-eyebrow">Internal testing</p>
          <strong>Internal testing build</strong>
          <p class="small session-notice-copy">
            Bugs and downtime are expected during this internal test phase. Please report issues when they happen.
          </p>
        </div>
        <button type="button" class="secondary small-btn session-notice-dismiss" @click="dismissSessionNotice">
          Got it
        </button>
      </div>

      <AuthPanel
        :error="authError"
        :loading="isAuthenticating"
        @login="handleLogin"
        @register="handleRegister"
        @reset-password="handlePasswordReset"
      />
    </section>

    <section v-else-if="sessionSyncRequired" class="chat-shell session-sync-gate">
      <div class="card session-sync-card">
        <h2>Session Sync Required</h2>
        <p class="small" style="margin-bottom: 24px;">
          We could not verify your current account state with the server. Retry before continuing.
        </p>
        <div class="row gate-actions">
          <button type="button" class="form-btn" :disabled="syncingSessionState" @click="handleSessionSyncRetry">
            {{ syncingSessionState ? 'Retrying...' : 'Retry session sync' }}
          </button>
          <button type="button" class="secondary small-btn" @click="doLogout">Logout</button>
        </div>
        <p v-if="sessionSyncError" class="status-danger small">{{ sessionSyncError }}</p>
      </div>
    </section>

    <section v-else-if="session.user.mustChangePassword" class="chat-shell forced-password-gate">
      <div class="card forced-password-card">
        <h2>Security Update Required</h2>
        <p class="small" style="margin-bottom: 24px;">Your account requires a password change before continuing.</p>
        <form @submit.prevent="handleForcedPasswordChange" class="list">
          <input v-model="forcedPwForm.currentPassword" type="password" placeholder="Current Password" required />
          <input v-model="forcedPwForm.newPassword" type="password" placeholder="New Password" required />
          <input v-model="forcedPwConfirm" type="password" placeholder="Confirm New Password" required />
          <button type="submit" class="form-btn" :disabled="savingForcedPw">Update Password</button>
          <p v-if="forcedPwError" class="status-danger small">{{ forcedPwError }}</p>
        </form>
        <button class="danger small-btn" style="margin-top: 16px;" @click="doLogout">Logout</button>
      </div>
    </section>

    <section v-else-if="noticeGateForced || session.user.mustAcceptTestNotice" class="chat-shell test-notice-gate">
      <div class="card test-notice-card">
        <p class="notice-eyebrow">Internal-only build</p>
        <h2>{{ TEST_NOTICE_TITLE }}</h2>
        <p class="small notice-summary">{{ TEST_NOTICE_SUMMARY }}</p>
        <div class="test-notice-version-pill">
          Required version: {{ requiredTestNoticeVersion }}
        </div>
        <p v-if="session.user.acceptedTestNoticeVersion" class="small notice-summary">
          Previously accepted: {{ session.user.acceptedTestNoticeVersion }}
        </p>
        <label class="test-notice-check">
          <input v-model="testNoticeConfirmed" type="checkbox" />
          <span>
            I understand this build is still in internal testing and I want to continue under notice version
            <strong>{{ requiredTestNoticeVersion }}</strong>.
          </span>
        </label>
        <div class="row gate-actions">
          <button
            type="button"
            class="form-btn"
            :disabled="acknowledgingTestNotice || !testNoticeConfirmed"
            @click="handleTestNoticeAck"
          >
            {{ acknowledgingTestNotice ? 'Confirming...' : 'Continue to the app' }}
          </button>
          <button type="button" class="secondary small-btn" @click="doLogout">Logout</button>
        </div>
        <p v-if="testNoticeError" class="status-danger small">{{ testNoticeError }}</p>
      </div>
    </section>

    <section v-else class="chat-shell" :class="{'content-active': currentView === 'chats' && selectedChatId}">
      <div v-if="sessionNoticeVisible" class="session-notice card" role="status">
        <div>
          <p class="session-notice-eyebrow">Internal testing</p>
          <strong>Internal testing build</strong>
          <p class="small session-notice-copy">
            Bugs and downtime are expected during this internal test phase. Please report issues when they happen.
          </p>
        </div>
        <button type="button" class="secondary small-btn session-notice-dismiss" @click="dismissSessionNotice">
          Dismiss
        </button>
      </div>

      <div v-if="recoveryCodeNotice" class="recovery-banner">
        <div>
          <strong>Save your recovery code</strong>
          <p class="small">
            {{ formattedRecoveryCodeNotice }}
          </p>
          <p class="small recovery-copy">
            You need this code to reset a lost password. It is only shown after signup, reset, or first login on older accounts.
          </p>
        </div>
        <button class="secondary" @click="recoveryCodeNotice = ''">I saved it</button>
      </div>

      <section class="chat-layout" :class="{ 'content-active': isContentActive }">
      <!-- Sidebar / Chat List -->
      <div class="sidebar">
        <div class="nav-tabs row" style="margin-bottom: 12px; gap: 8px;">
          <button class="small-btn" :class="{ secondary: currentView !== 'chats' }" @click="currentView = 'chats'">
            Chats
            <span v-if="totalUnreadCount > 0" class="nav-unread-badge">{{ totalUnreadCount }}</span>
          </button>
          <button class="small-btn" :class="{ secondary: currentView !== 'directory' }" @click="currentView = 'directory'">Directory</button>
          <button class="small-btn" :class="{ secondary: currentView !== 'settings' }" @click="currentView = 'settings'">Settings</button>
        </div>

        <ChatListPanel 
          v-if="currentView === 'chats'"
          :currentUsername="session.user.username"
          :chats="chats"
          :activeChatId="selectedChatId"
          :loadState="chatListState"
          :loadError="chatListError"
          :onlineCount="onlineCount"
          @select="openChat"
          @retry-load="handleChatListRetry"
          @logout="doLogout"
        />
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main">
        <template v-if="currentView === 'chats'">
        <template v-if="selectedChatId">
            <MessageList 
              :messages="messages"
              :currentUserId="session.user.id"
              :queuedIds="queued.map(q => q.clientMessageId)"
              :failedIds="Array.from(failedMessageIds)"
              :latencyByClientMessageId="latencyByClientMessageId"
              :typingMembers="typingMembers"
              @viewport-bottom-change="handleViewportBottomChange"
              @retry="retrySpecificMessage"
            />
            <p v-if="chatActionError" class="small status-danger chat-action-error">{{ chatActionError }}</p>
            <MessageComposer 
              :chat-id="selectedChatId"
              :disabled="!selectedChatId || uploadingAttachment"
              @send="sendCurrent"
              @send-media="handleMediaSelected"
              @send-gif="handleGifSelected"
              @typing-start="handleTypingStart"
              @typing-stop="handleTypingStop"
            />
          </template>
          <div class="empty-chat" style="display:flex; height:100%; justify-content:center; align-items:center;" v-else>
            <p class="small prompt-text">Select 'General' to join the shared test chat.</p>
          </div>
        </template>
        <template v-else-if="currentView === 'directory'">
          <MemberDirectory :presenceByUserId="presenceByUserId" @select-member="selectedMemberId = $event" />
          <MemberProfileSheet 
            v-if="selectedMemberId" 
            :memberId="selectedMemberId" 
            :presenceByUserId="presenceByUserId"
            @close="selectedMemberId = null" 
          />
        </template>
        <template v-else-if="currentView === 'settings'">
          <ProfileSettings
            @profile-updated="handleProfileUpdated"
            @auth-updated="completeAuth"
          />
        </template>
      </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { App as CapacitorApp } from '@capacitor/app';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  formatRecoveryCode,
  type GifResult,
  type MessageMetadata,
  type MessageType,
  type UploadResponse
} from '@penthouse/contracts';
import {
  ServerMessageAckEventSchema,
  ServerMessageNewEventSchema,
  ServerMessageReadEventSchema,
  ServerPresenceSyncEventSchema,
  ServerPresenceUpdateEventSchema,
  ServerTypingUpdateEventSchema
} from '@penthouse/contracts';
import type {
  Chat,
  ChatMessage,
  PendingMessage,
  PresenceStatus,
  RealtimeDiagnostics,
  RealtimeState,
  Session,
  TypingParticipant
} from './types';
import {
  type AuthEvent,
  getMe,
  changePassword,
  getChats,
  getMessages,
  hydrateStoredSession,
  login,
  markChatRead,
  register,
  resetPassword,
  sendMessage,
  sendStructuredMessage,
  acknowledgeTestNotice,
  subscribeAuthEvents,
  setStoredUser,
  uploadMedia,
  logout
} from './services/http';
import { describeAuthError } from './services/errors';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import { enqueueMessage, flushQueue, getQueued, removeQueued } from './services/offlineQueue';
import { withBackoff } from './services/retry';
import { cacheChats, cacheMessages, readCachedChats, readCachedMessages } from './services/cache';
import {
  clearAllDeliveredNotifications,
  clearDeliveredNotificationsForChat,
  ensureNotificationPermission,
  initializeNotifications,
  scheduleIncomingMessageNotification
} from './services/notifications';

// Components
import AuthPanel from './components/AuthPanel.vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
import ChatListPanel from './components/ChatListPanel.vue';
import MessageList from './components/MessageList.vue';
import MessageComposer from './components/MessageComposer.vue';
import ProfileSettings from './components/ProfileSettings.vue';
import MemberDirectory from './components/MemberDirectory.vue';
import MemberProfileSheet from './components/MemberProfileSheet.vue';
import InAppToastHost from './components/InAppToastHost.vue';
import { TEST_NOTICE_SUMMARY, TEST_NOTICE_TITLE, TEST_NOTICE_VERSION } from './testNotice';

type InAppToast = {
  id: string;
  chatId: string;
  title: string;
  message?: string;
  eyebrow?: string;
  actionLabel?: string;
  tone?: 'neutral' | 'accent';
};

type ChatListState = 'loading' | 'ready' | 'error';

const CHAT_BOOTSTRAP_MAX_ATTEMPTS = 3;
const CHAT_BOOTSTRAP_RETRY_DELAY_MS = 900;
const IN_APP_TOAST_DURATION_MS = 5_000;

// State
const authError = ref('');
const isAuthenticating = ref(false);
const chatActionError = ref('');
const uploadingAttachment = ref(false);
const isBooting = ref(true);
const sessionNoticeVisible = ref(false);

const session = ref<Session | null>(null);
const chats = ref<Chat[]>([]);
const messages = ref<ChatMessage[]>([]);
const selectedChatId = ref<string>('');
const queued = ref<PendingMessage[]>(getQueued());
const failedMessageIds = ref<Set<string>>(new Set(getQueued().map(q => q.clientMessageId)));
const latencyByClientMessageId = ref<Record<string, number>>({});
const hasNetwork = ref(navigator.onLine);
const realtimeState = ref<RealtimeState>('idle');
const realtimeDiagnostics = ref<RealtimeDiagnostics>({
  transport: 'unknown',
  lastError: null,
  lastDisconnectReason: null,
  lastConnectedAt: null,
  fallbackActive: false
});
const recoveryCodeNotice = ref('');
const presenceByUserId = ref<Record<string, PresenceStatus>>({});
const typingByChat = ref<Record<string, Record<string, TypingParticipant>>>({});

const currentView = ref<'chats' | 'directory' | 'settings'>('chats');
const selectedMemberId = ref<string | null>(null);
const debugRealtimeEnabled = import.meta.env.DEV;
let fallbackRefreshTimer: ReturnType<typeof setInterval> | null = null;
let lastFallbackSignature = '';
let appStateListener: any = null;
let appPauseListener: any = null;
let appResumeListener: any = null;
let suppressNextDisconnectTransition = false;
let markReadTimer: ReturnType<typeof setTimeout> | null = null;
const appIsActive = ref(typeof document === 'undefined' ? true : !document.hidden);
const isViewingLatest = ref(true);
const inAppToasts = ref<InAppToast[]>([]);
const chatListState = ref<ChatListState>('loading');
const chatListError = ref('');

const forcedPwForm = ref({ currentPassword: '', newPassword: '' });
const forcedPwConfirm = ref('');
const savingForcedPw = ref(false);
const forcedPwError = ref('');
const sessionSyncRequired = ref(false);
const syncingSessionState = ref(false);
const sessionSyncError = ref('');
const noticeGateForced = ref(false);
const testNoticeConfirmed = ref(false);
const acknowledgingTestNotice = ref(false);
const testNoticeError = ref('');
const joinedChatId = ref('');
const pendingTypingChatId = ref<string | null>(null);
let removeAuthEventListener: (() => void) | null = null;
let workspaceInitialized = false;
let initializingWorkspacePromise: Promise<void> | null = null;
let chatBootstrapRetryTimer: ReturnType<typeof setTimeout> | null = null;
let joiningChatId = '';
let joiningChatRequestId = 0;
let joiningChatPromise: Promise<boolean> | null = null;
const inAppToastTimers = new Map<string, ReturnType<typeof setTimeout>>();

const formattedRecoveryCodeNotice = computed(() =>
  recoveryCodeNotice.value ? formatRecoveryCode(recoveryCodeNotice.value) : ''
);
const onlineCount = computed(() =>
  Object.values(presenceByUserId.value).filter((status) => status === 'online').length
);
const totalUnreadCount = computed(() =>
  chats.value.reduce((sum, chat) => sum + Math.max(0, chat.unreadCount ?? 0), 0)
);
const typingMembers = computed(() =>
  selectedChatId.value ? Object.values(typingByChat.value[selectedChatId.value] ?? {}) : []
);
const isOnline = computed(() => realtimeState.value === 'connected');
const requiredTestNoticeVersion = computed(() =>
  session.value?.user.requiredTestNoticeVersion?.trim() || TEST_NOTICE_VERSION
);
const toastHostVisible = computed(() =>
  !isBooting.value &&
  !sessionSyncRequired.value &&
  !noticeGateForced.value &&
  !session.value?.user.mustChangePassword &&
  !session.value?.user.mustAcceptTestNotice
);

const isContentActive = computed(() => {
  if (currentView.value === 'chats') return !!selectedChatId.value;
  return true; // Directory and Settings always show content area
});

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

function handleMobileBack() {
  if (currentView.value === 'chats') {
    selectedChatId.value = '';
  } else {
    currentView.value = 'chats';
    selectedMemberId.value = null;
  }
}

function showSessionNoticeForForeground(): void {
  sessionNoticeVisible.value = true;
}

function dismissSessionNotice(): void {
  sessionNoticeVisible.value = false;
}

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

function clearInAppToastTimer(id: string): void {
  const timer = inAppToastTimers.get(id);
  if (!timer) return;
  clearTimeout(timer);
  inAppToastTimers.delete(id);
}

function clearAllInAppToastTimers(): void {
  inAppToastTimers.forEach((timer) => clearTimeout(timer));
  inAppToastTimers.clear();
}

function clearInAppToasts(): void {
  clearAllInAppToastTimers();
  inAppToasts.value = [];
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

function dismissInAppToast(id: string): void {
  clearInAppToastTimer(id);
  inAppToasts.value = inAppToasts.value.filter((toast) => toast.id !== id);
}

function handleInAppToastAction(id: string): void {
  const toast = inAppToasts.value.find((entry) => entry.id === id);
  dismissInAppToast(id);
  if (!toast?.chatId) return;
  currentView.value = 'chats';
  void openChat(toast.chatId);
}

function describeIncomingActivity(message: ChatMessage): string {
  if (message.type === 'image') return 'Sent an image';
  if (message.type === 'video') return 'Sent a video';
  if (message.type === 'gif') return 'Sent a GIF';
  if (message.type === 'file') return 'Sent an attachment';

  const normalized = (message.content || '').replace(/\s+/g, ' ').trim();
  return normalized || 'New message';
}

function queueInAppToast(message: ChatMessage, chatName: string | null): void {
  const id = `chat:${message.chatId}`;
  const title = message.senderDisplayName || message.senderUsername || 'New message';

  clearInAppToastTimer(id);
  inAppToasts.value = [
    {
      id,
      chatId: message.chatId,
      eyebrow: chatName ?? 'Incoming message',
      title,
      message: describeIncomingActivity(message),
      actionLabel: 'Open',
      tone: 'accent' as const
    },
    ...inAppToasts.value.filter((toast) => toast.id !== id)
  ].slice(0, 3);

  inAppToastTimers.set(id, setTimeout(() => {
    dismissInAppToast(id);
  }, IN_APP_TOAST_DURATION_MS));
}

function activeCacheUserId(): string | null {
  return session.value?.user.id ?? null;
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

function userHasFullAccess(nextSession: Session | null): boolean {
  if (!nextSession) return false;
  return !nextSession.user.mustChangePassword && !nextSession.user.mustAcceptTestNotice;
}

function setSessionState(nextSession: Session): void {
  session.value = nextSession;
  presenceByUserId.value = {
    ...presenceByUserId.value,
    [nextSession.user.id]: presenceByUserId.value[nextSession.user.id] ?? 'offline'
  };
  setStoredUser(nextSession.user);
  if ('recoveryCode' in nextSession) {
    recoveryCodeNotice.value = nextSession.recoveryCode ?? '';
  }
}

function clearSessionSyncBlocker(): void {
  sessionSyncRequired.value = false;
  sessionSyncError.value = '';
}

function enterSessionSyncRequiredState(nextSession: Session | null, message = 'Session sync required before continuing.'): void {
  if (nextSession) {
    setSessionState(nextSession);
  }

  clearSessionSyncBlocker();
  sessionSyncRequired.value = true;
  sessionSyncError.value = message;
  noticeGateForced.value = false;
  resetWorkspaceState();
}

function forceNoticeGate(): void {
  clearSessionSyncBlocker();
  noticeGateForced.value = true;
  resetWorkspaceState();
}

function resetWorkspaceState(): void {
  disconnectSocket();
  clearMarkReadTimer();
  clearFallbackRefreshTimer();
  resetChatListState();
  clearInAppToasts();
  resetActiveChatRoomState();
  workspaceInitialized = false;
  initializingWorkspacePromise = null;
  chats.value = [];
  messages.value = [];
  selectedChatId.value = '';
  selectedMemberId.value = null;
  currentView.value = 'chats';
  chatActionError.value = '';
  uploadingAttachment.value = false;
  clearTypingState();
  presenceByUserId.value = session.value?.user ? { [session.value.user.id]: 'offline' } : {};
  realtimeDiagnostics.value = {
    transport: 'unknown',
    lastError: null,
    lastDisconnectReason: null,
    lastConnectedAt: null,
    fallbackActive: false
  };
  realtimeState.value = 'idle';
}

async function fetchFreshSession(baseSession: Session): Promise<Session> {
  const me = await getMe();
  return {
    ...baseSession,
    user: {
      ...baseSession.user,
      ...me
    }
  };
}

async function syncSessionUser(): Promise<Session> {
  if (!session.value) {
    throw new Error('No active session available for sync');
  }

  const nextSession = await fetchFreshSession(session.value);
  setSessionState(nextSession);
  return nextSession;
}

async function initializeWorkspace(): Promise<void> {
  if (workspaceInitialized) return;
  if (initializingWorkspacePromise) {
    await initializingWorkspacePromise;
    return;
  }

  initializingWorkspacePromise = (async () => {
    await ensureNotificationPermission();
    await initializeNotifications((chatId) => {
      currentView.value = 'chats';
      void openChat(chatId);
    });
    wireSocketHandlers();
    resetChatListState();
    await loadChats({ bootstrap: true });
    workspaceInitialized = true;
  })();

  try {
    await initializingWorkspacePromise;
  } finally {
    initializingWorkspacePromise = null;
  }
}

async function handleAuthEvent(event: AuthEvent): Promise<void> {
  if (event.type === 'user_updated') {
    if (!session.value) return;
    const nextSession = await hydrateStoredSession();
    if (!nextSession) return;
    await completeAuth(nextSession);
    return;
  }

  if (event.type === 'notice_required') {
    if (!session.value || noticeGateForced.value || sessionSyncRequired.value) return;

    forceNoticeGate();

    try {
      const nextSession = await syncSessionUser();
      await completeAuth(nextSession);
    } catch {
      enterSessionSyncRequiredState(session.value);
    }
  }
}

function generateClientMessageId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildPendingMessage(
  chatId: string,
  content: string,
  type: MessageType,
  metadata: MessageMetadata | null,
  clientMessageId = generateClientMessageId()
): PendingMessage {
  return {
    chatId,
    content,
    type,
    metadata,
    clientMessageId,
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  };
}

function addOptimisticMessage(item: PendingMessage): void {
  messages.value.unshift({
    id: item.clientMessageId,
    chatId: item.chatId,
    senderId: session.value?.user.id ?? 'me',
    senderUsername: session.value?.user.username ?? 'me',
    senderDisplayName: session.value?.user.displayName ?? session.value?.user.username ?? 'me',
    senderAvatarUrl: session.value?.user.avatarUrl ?? null,
    content: item.content,
    type: item.type,
    metadata: item.metadata ?? null,
    createdAt: item.enqueuedAt,
    clientMessageId: item.clientMessageId
  });
  cacheMessagesForActiveUser(item.chatId, messages.value);
}

async function dispatchPendingMessage(item: PendingMessage) {
  if (item.type === 'text' && !item.metadata) {
    return sendMessage(item.chatId, item.content, item.clientMessageId);
  }

  return sendStructuredMessage(item.chatId, {
    content: item.content,
    type: item.type,
    metadata: item.metadata ?? null,
    clientMessageId: item.clientMessageId
  });
}

function mediaTypeFromUpload(upload: UploadResponse): MessageType {
  if (upload.mediaKind === 'image') return 'image';
  if (upload.mediaKind === 'video') return 'video';
  return 'file';
}

type MediaDimensions = {
  width: number | null;
  height: number | null;
};

function metadataFromUpload(upload: UploadResponse, dimensions?: MediaDimensions): MessageMetadata {
  return {
    uploadId: upload.id,
    url: upload.url,
    originalFileName: upload.originalFileName,
    fileName: upload.fileName,
    contentType: upload.contentType ?? null,
    mediaKind: upload.mediaKind,
    size: upload.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null
  };
}

function metadataFromGif(gif: GifResult): MessageMetadata {
  return {
    provider: gif.provider,
    url: gif.url,
    previewUrl: gif.previewUrl,
    title: gif.title ?? `${gif.provider.toUpperCase()} GIF`,
    width: gif.width ?? null,
    height: gif.height ?? null
  };
}

async function measureImageDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        width: Number.isFinite(image.naturalWidth) ? image.naturalWidth : null,
        height: Number.isFinite(image.naturalHeight) ? image.naturalHeight : null
      });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

async function measureVideoDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      resolve({
        width: Number.isFinite(video.videoWidth) ? video.videoWidth : null,
        height: Number.isFinite(video.videoHeight) ? video.videoHeight : null
      });
      cleanup();
    };

    video.onerror = () => {
      resolve({ width: null, height: null });
      cleanup();
    };

    video.src = objectUrl;
  });
}

async function deriveUploadDimensions(file: File, upload: UploadResponse): Promise<MediaDimensions> {
  try {
    if (upload.mediaKind === 'image') {
      return await measureImageDimensions(file);
    }

    if (upload.mediaKind === 'video') {
      return await measureVideoDimensions(file);
    }
  } catch {
    // Fall through to null dimensions when the browser/runtime cannot probe media metadata.
  }

  return { width: null, height: null };
}

async function loadChats(options: { bootstrap?: boolean; attempt?: number } = {}): Promise<void> {
  const { bootstrap = false, attempt = 1 } = options;
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

      if (attempt < CHAT_BOOTSTRAP_MAX_ATTEMPTS && session.value && userHasFullAccess(session.value)) {
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
  } catch {
    if (cachedChats.length > 0) {
      chats.value = cachedChats;
      chatListState.value = 'ready';
      chatListError.value = '';
      return;
    }

    chats.value = [];

    if (bootstrap && attempt < CHAT_BOOTSTRAP_MAX_ATTEMPTS && session.value && userHasFullAccess(session.value)) {
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

function sortChats(nextChats: Chat[]): Chat[] {
  return [...nextChats].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
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

function clearMarkReadTimer(): void {
  if (!markReadTimer) return;
  clearTimeout(markReadTimer);
  markReadTimer = null;
}

function canMarkSelectedChatRead(): boolean {
  return Boolean(
    session.value &&
    hasNetwork.value &&
    appIsActive.value &&
    currentView.value === 'chats' &&
    selectedChatId.value &&
    isViewingLatest.value
  );
}

async function executeMarkSelectedChatRead(): Promise<void> {
  if (!canMarkSelectedChatRead()) return;
  try {
    const result = await markChatRead(selectedChatId.value);
    setChatUnreadCount(result.chatId, result.unreadCount);
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
  if (!session.value || readerUserId === session.value.user.id) return;
  const seenAtMs = Date.parse(seenAt);
  if (!Number.isFinite(seenAtMs)) return;

  let changed = false;
  messages.value = messages.value.map((message) => {
    if (message.chatId !== chatId || message.senderId !== session.value?.user.id) {
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

  if (changed && selectedChatId.value) {
    cacheMessagesForActiveUser(selectedChatId.value, messages.value);
  }
}

async function openChat(chatId: string): Promise<void> {
  chatActionError.value = '';
  selectedChatId.value = chatId;
  isViewingLatest.value = false;
  try {
    messages.value = await withBackoff(() => getMessages(chatId));
    cacheMessagesForActiveUser(chatId, messages.value);
  } catch {
    messages.value = readScopedCachedMessages(chatId);
  }
  const socket = getSocket();
  if (socket && !socket.connected && hasNetwork.value) {
    setRealtimeState('connecting');
    socket.connect();
  }
}

function clearFallbackRefreshTimer(): void {
  if (!fallbackRefreshTimer) return;
  clearInterval(fallbackRefreshTimer);
  fallbackRefreshTimer = null;
}

function mergeServerMessages(chatId: string, fetched: ChatMessage[]): void {
  const pendingLocal = messages.value.filter((message) => message.chatId === chatId && message.id.startsWith('local_'));
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

function syncFallbackRefreshState(): void {
  const fallbackActive = Boolean(
    currentView.value === 'chats' &&
    selectedChatId.value &&
    session.value &&
    hasNetwork.value &&
    (realtimeState.value === 'degraded' || realtimeState.value === 'failed')
  );
  const signature = JSON.stringify({
    fallbackActive,
    currentView: currentView.value,
    selectedChatId: selectedChatId.value,
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
  void refreshSelectedChatFromApi();
  fallbackRefreshTimer = setInterval(() => {
    void refreshSelectedChatFromApi();
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

function emitTypingStartForChat(chatId: string): void {
  if (!chatId) return;
  const socket = getSocket();
  if (!socket?.connected) return;
  socket.emit('typing.start', { chatId });
}

function emitTypingStopForChat(chatId: string): void {
  if (!chatId) return;
  const socket = getSocket();
  if (!socket?.connected) return;
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
  if (!chatId || currentView.value !== 'chats' || selectedChatId.value !== chatId) {
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

  joiningChatPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (joined: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (requestId === joiningChatRequestId) {
        joiningChatPromise = null;
        joiningChatId = '';
        if (joined && currentView.value === 'chats' && selectedChatId.value === chatId) {
          joinedChatId.value = chatId;
          if (pendingTypingChatId.value === chatId) {
            emitTypingStartForChat(chatId);
          }
        } else {
          joinedChatId.value = '';
        }
      } else if (joined) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('chat.leave', { chatId });
        }
      }
      resolve(joined);
    };

    const timeoutId = setTimeout(() => {
      finish(false);
    }, 1500);

    socket.emit('chat.join', { chatId }, (response?: { ok?: boolean; chatId?: string }) => {
      const joined = Boolean(response?.ok) && response?.chatId === chatId;
      if (!joined && pendingTypingChatId.value === chatId) {
        pendingTypingChatId.value = null;
      }
      finish(joined);
    });
  });

  return joiningChatPromise;
}

function handleTypingStart(): void {
  const chatId = selectedChatId.value;
  if (!chatId || currentView.value !== 'chats') return;
  pendingTypingChatId.value = chatId;
  if (joinedChatId.value === chatId) {
    emitTypingStartForChat(chatId);
    return;
  }
  void ensureChatJoined(chatId);
}

function handleTypingStop(): void {
  const chatId = selectedChatId.value;
  if (!chatId) return;
  if (pendingTypingChatId.value === chatId) {
    pendingTypingChatId.value = null;
  }
  if (joinedChatId.value === chatId) {
    emitTypingStopForChat(chatId);
  }
}

function handleViewportBottomChange(isAtBottom: boolean): void {
  isViewingLatest.value = isAtBottom;
  if (isAtBottom) {
    scheduleMarkSelectedChatRead();
  }
}

async function sendOrQueue(pendingItem: PendingMessage): Promise<void> {
  try {
    const startedAt = Date.now();
    const response = await withBackoff(() => dispatchPendingMessage(pendingItem));
    markMessageDelivered(response.message.chatId, pendingItem.clientMessageId, response.message.id, Date.now() - startedAt);
  } catch {
    enqueueMessage(pendingItem);
    queued.value = getQueued();
    failedMessageIds.value.add(pendingItem.clientMessageId);
  }
}

function markMessageDelivered(chatId: string, clientMessageId: string, messageId: string, latencyMs?: number): void {
  const existingMsg = messages.value.find((m) => m.clientMessageId === clientMessageId && m.chatId === chatId);
  if (existingMsg) {
    existingMsg.id = messageId;
    cacheMessagesForActiveUser(chatId, messages.value);
  }

  if (typeof latencyMs === 'number' && Number.isFinite(latencyMs) && latencyMs >= 0) {
    latencyByClientMessageId.value = {
      ...latencyByClientMessageId.value,
      [clientMessageId]: Math.round(latencyMs)
    };
  }

  failedMessageIds.value.delete(clientMessageId);
  removeQueued(clientMessageId);
  queued.value = getQueued();
}

async function retrySpecificMessage(clientMessageId: string): Promise<void> {
  const queuedItem = queued.value.find(q => q.clientMessageId === clientMessageId);
  if (!queuedItem) return;

  failedMessageIds.value.delete(clientMessageId);
  try {
    const startedAt = Date.now();
    const response = await withBackoff(() => dispatchPendingMessage(queuedItem));
    markMessageDelivered(response.message.chatId, clientMessageId, response.message.id, Date.now() - startedAt);
  } catch {
    failedMessageIds.value.add(clientMessageId);
  }
}

async function sendCurrent(content: string): Promise<void> {
  if (!selectedChatId.value) return;
  chatActionError.value = '';

  const pendingItem = buildPendingMessage(selectedChatId.value, content, 'text', null);
  addOptimisticMessage(pendingItem);
  await sendOrQueue(pendingItem);
}

async function handleMediaSelected(file: File): Promise<void> {
  if (!selectedChatId.value) return;
  chatActionError.value = '';
  uploadingAttachment.value = true;

  try {
    const upload = await withBackoff(() => uploadMedia(file));
    const dimensions = await deriveUploadDimensions(file, upload);
    const pendingItem = buildPendingMessage(
      selectedChatId.value,
      upload.originalFileName,
      mediaTypeFromUpload(upload),
      metadataFromUpload(upload, dimensions)
    );
    addOptimisticMessage(pendingItem);
    await sendOrQueue(pendingItem);
  } catch (error: any) {
    chatActionError.value = error?.response?.data?.error || 'Failed to upload attachment';
  } finally {
    uploadingAttachment.value = false;
  }
}

async function handleGifSelected(gif: GifResult): Promise<void> {
  if (!selectedChatId.value) return;
  chatActionError.value = '';

  const pendingItem = buildPendingMessage(
    selectedChatId.value,
    gif.title?.trim() || `${gif.provider.toUpperCase()} GIF`,
    'gif',
    metadataFromGif(gif)
  );
  addOptimisticMessage(pendingItem);
  await sendOrQueue(pendingItem);
}

async function flushPending(): Promise<void> {
  await flushQueue(async (item) => {
    failedMessageIds.value.delete(item.clientMessageId);
    try {
      const startedAt = Date.now();
      const response = await withBackoff(() => dispatchPendingMessage(item));
      markMessageDelivered(response.message.chatId, item.clientMessageId, response.message.id, Date.now() - startedAt);
    } catch (e) {
      failedMessageIds.value.add(item.clientMessageId);
      throw e;
    }
  });
  queued.value = getQueued();
}

async function handleLogin(username: string, pass: string) {
  isAuthenticating.value = true;
  authError.value = '';
  try {
    const res = await login(username, pass);
    await completeAuth(res);
  } catch (error: unknown) {
    authError.value = describeAuthError(error);
  } finally {
    isAuthenticating.value = false;
  }
}

async function handleRegister(username: string, pass: string, invite: string) {
  isAuthenticating.value = true;
  authError.value = '';
  try {
    const res = await register(username, pass, invite);
    await completeAuth(res);
  } catch (error: unknown) {
    authError.value = describeAuthError(error);
  } finally {
    isAuthenticating.value = false;
  }
}

async function handlePasswordReset(username: string, recoveryCode: string, nextPassword: string) {
  isAuthenticating.value = true;
  authError.value = '';
  try {
    const res = await resetPassword(username, recoveryCode, nextPassword);
    await completeAuth(res);
  } catch (error: unknown) {
    authError.value = describeAuthError(error);
  } finally {
    isAuthenticating.value = false;
  }
}

async function handleTestNoticeAck(): Promise<void> {
  if (!session.value) return;
  if (!testNoticeConfirmed.value) {
    testNoticeError.value = 'Please confirm the current test notice before continuing';
    return;
  }

  acknowledgingTestNotice.value = true;
  testNoticeError.value = '';

  try {
    const result = await acknowledgeTestNotice(requiredTestNoticeVersion.value);
    await completeAuth({
      ...session.value,
      user: result.user
    });
  } catch (error: any) {
    testNoticeError.value = error?.response?.data?.error || 'Failed to confirm the current test notice';
  } finally {
    acknowledgingTestNotice.value = false;
  }
}

async function handleForcedPasswordChange() {
  if (forcedPwForm.value.newPassword !== forcedPwConfirm.value) {
    forcedPwError.value = 'New passwords do not match';
    return;
  }
  savingForcedPw.value = true;
  forcedPwError.value = '';
  try {
    const updatedSession = await changePassword({ ...forcedPwForm.value });
    await completeAuth(updatedSession);
    forcedPwForm.value = { currentPassword: '', newPassword: '' };
    forcedPwConfirm.value = '';
  } catch (err: any) {
    forcedPwError.value = err.response?.data?.error || 'Failed to update password';
  } finally {
    savingForcedPw.value = false;
  }
}

async function completeAuth(res: Session) {
  const previousUserId = session.value?.user.id ?? null;
  if (previousUserId && previousUserId !== res.user.id) {
    resetWorkspaceState();
  }

  setSessionState(res);
  clearSessionSyncBlocker();
  noticeGateForced.value = false;
  syncingSessionState.value = false;
  testNoticeConfirmed.value = false;
  testNoticeError.value = '';

  if (!userHasFullAccess(res)) {
    resetWorkspaceState();
    return;
  }

  await initializeWorkspace();
}

function handleProfileUpdated(profile: { displayName: string; avatarUrl: string | null }): void {
  if (!session.value) return;
  session.value = {
    ...session.value,
    user: {
      ...session.value.user,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl
    }
  };
  setStoredUser(session.value.user);
  setPresenceStatus(session.value.user.id, presenceByUserId.value[session.value.user.id] ?? 'offline');
}

function wireSocketHandlers(): void {
  const socket = connectSocket();
  socket.removeAllListeners('message.new');
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

  socket.on('message.new', (event: any) => {
    const parsed = ServerMessageNewEventSchema.safeParse(event);
    if (!parsed.success) return;
    const payload = parsed.data.payload;
    const chatName = chats.value.find((chat) => chat.id === payload.chatId)?.name ?? null;
    touchChat(payload.chatId, payload.createdAt);

    const isSelectedChat = currentView.value === 'chats' && payload.chatId === selectedChatId.value;
    const canTreatIncomingAsRead = isSelectedChat && appIsActive.value && isViewingLatest.value;

    // Check if we already optimistically rendered this (match by clientMessageId)
    // The server `id` is a UUID, local id starts with `local_`
    const existingIdx = messages.value.findIndex(m => m.clientMessageId === payload.clientMessageId);

    if (isSelectedChat && existingIdx >= 0) {
      // Replace optimistic message with actual server message
      messages.value[existingIdx] = payload;
    } else if (isSelectedChat && !messages.value.some((m) => m.id === payload.id)) {
      messages.value.unshift(payload);
    }
    removeTypingParticipant(payload.chatId, payload.senderId);

    if (payload.senderId !== session.value?.user.id) {
      if (!canTreatIncomingAsRead) {
        bumpChatUnreadCount(payload.chatId);
        if (!appIsActive.value) {
          void scheduleIncomingMessageNotification(payload, chatName);
        } else if (!isSelectedChat) {
          queueInAppToast(payload, chatName);
        }
      } else {
        setChatUnreadCount(payload.chatId, 0);
        scheduleMarkSelectedChatRead();
      }
    }

    if (!isSelectedChat) {
      cacheChatsForActiveUser(chats.value);
      return;
    }

    cacheMessagesForActiveUser(payload.chatId, messages.value);
  });

  socket.on('message.ack', (event: any) => {
    const parsed = ServerMessageAckEventSchema.safeParse(event);
    if (!parsed.success) return;
    // Acknowledgment means server got our queued/sent message.
    const payload = parsed.data.payload;
    const existingMsg = messages.value.find(m => m.clientMessageId === payload.clientMessageId);
    if (existingMsg) {
      // Replace optimistic/local id with server id to reflect final delivery state.
      existingMsg.id = payload.messageId;
      cacheMessagesForActiveUser(payload.chatId, messages.value);
    }

    // We can also ensure it is removed from failed set
    const existingLatency = latencyByClientMessageId.value[payload.clientMessageId];
    if (typeof existingLatency === 'number') {
      markMessageDelivered(payload.chatId, payload.clientMessageId, payload.messageId, existingLatency);
      return;
    }

    const deliveryMs = existingMsg
      ? Date.parse(payload.deliveredAt) - Date.parse(existingMsg.createdAt)
      : undefined;
    markMessageDelivered(payload.chatId, payload.clientMessageId, payload.messageId, deliveryMs);
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
    if (session.value?.user.id) {
      setPresenceStatus(session.value.user.id, 'online');
    }
    if (selectedChatId.value && currentView.value === 'chats') {
      void ensureChatJoined(selectedChatId.value);
    }
    flushPending().catch(() => undefined);
  });

  socket.on('typing.update', (event: unknown) => {
    const parsed = ServerTypingUpdateEventSchema.safeParse(event);
    if (!parsed.success) return;

    const { chatId, userId, status, displayName, avatarUrl } = parsed.data.payload;
    if (userId === session.value?.user.id) return;

    if (status === 'start') {
      upsertTypingParticipant(chatId, { userId, displayName, avatarUrl });
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
      transport: socket.io.engine?.transport?.name === 'polling' || socket.io.engine?.transport?.name === 'websocket'
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
    if (selectedChatId.value && currentView.value === 'chats') {
      void ensureChatJoined(selectedChatId.value);
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

function forceSocketReconnect() {
  restartSocketConnection('manual reconnect');
}

async function doLogout(): Promise<void> {
  await logout();
  await clearAllDeliveredNotifications();
  disconnectSocket();
  clearMarkReadTimer();
  resetChatListState();
  clearInAppToasts();
  resetActiveChatRoomState();
  workspaceInitialized = false;
  initializingWorkspacePromise = null;
  session.value = null;
  chats.value = [];
  messages.value = [];
  selectedChatId.value = '';
  recoveryCodeNotice.value = '';
  presenceByUserId.value = {};
  typingByChat.value = {};
  latencyByClientMessageId.value = {};
  chatActionError.value = '';
  uploadingAttachment.value = false;
  clearSessionSyncBlocker();
  syncingSessionState.value = false;
  noticeGateForced.value = false;
  testNoticeConfirmed.value = false;
  testNoticeError.value = '';
  acknowledgingTestNotice.value = false;
  realtimeDiagnostics.value = {
    transport: 'unknown',
    lastError: null,
    lastDisconnectReason: null,
    lastConnectedAt: null,
    fallbackActive: false
  };
  realtimeState.value = 'idle';
  setStoredUser(null);
}

function onOnline(): void {
  hasNetwork.value = true;
  const socket = getSocket();
  if (socket && appIsActive.value) {
    restartSocketConnection('network restored');
  }
  if (appIsActive.value) {
    flushPending().catch(() => undefined);
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

async function handleAppResume(): Promise<void> {
  if (!session.value) return;

  try {
    const nextSession = await syncSessionUser();
    if (!userHasFullAccess(nextSession)) {
      resetWorkspaceState();
      return;
    }
  } catch {
    enterSessionSyncRequiredState(session.value);
    return;
  }

  await loadChats({ bootstrap: chats.value.length === 0 || chatListState.value !== 'ready' });
  if (selectedChatId.value) {
    await refreshSelectedChatFromApi();
    if (currentView.value === 'chats' && isViewingLatest.value) {
      scheduleMarkSelectedChatRead();
    }
  }

  if (hasNetwork.value && getSocket()) {
    restartSocketConnection('app resume');
  } else if (selectedChatId.value && currentView.value === 'chats') {
    void ensureChatJoined(selectedChatId.value);
  }
}

async function handleSessionSyncRetry(): Promise<void> {
  if (!session.value) return;

  syncingSessionState.value = true;
  sessionSyncError.value = '';

  try {
    const nextSession = await syncSessionUser();
    await completeAuth(nextSession);
  } catch {
    enterSessionSyncRequiredState(session.value);
  } finally {
    syncingSessionState.value = false;
  }
}

function setAppActive(nextValue: boolean): void {
  const wasActive = appIsActive.value;
  appIsActive.value = nextValue;
  if (!nextValue) {
    if (pendingTypingChatId.value === selectedChatId.value) {
      pendingTypingChatId.value = null;
    }
    if (joinedChatId.value === selectedChatId.value) {
      emitTypingStopForChat(selectedChatId.value);
    }
    getSocket()?.emit('app.state', { active: false });
    clearMarkReadTimer();
    return;
  }

  if (!wasActive) {
    showSessionNoticeForForeground();
  }

  getSocket()?.emit('app.state', { active: true });

  if (selectedChatId.value && currentView.value === 'chats') {
    scheduleMarkSelectedChatRead();
  }
}

function handleDocumentVisibilityChange(): void {
  const nextActive = !document.hidden;
  setAppActive(nextActive);
  if (nextActive) {
    void handleAppResume();
  }
}

onMounted(() => {
  showSessionNoticeForForeground();
  removeAuthEventListener = subscribeAuthEvents((event) => {
    void handleAuthEvent(event);
  });
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', handleDocumentVisibilityChange);
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    setAppActive(isActive);
    if (isActive) {
      void handleAppResume();
    }
  }).then((listener) => {
    appStateListener = listener;
  });
  void CapacitorApp.addListener('pause', () => {
    setAppActive(false);
  }).then((listener) => {
    appPauseListener = listener;
  });
  void CapacitorApp.addListener('resume', () => {
    setAppActive(true);
    void handleAppResume();
  }).then((listener) => {
    appResumeListener = listener;
  });

  void (async () => {
    try {
      const restoredSession = await hydrateStoredSession();
      if (!restoredSession) return;
      try {
        const freshSession = await fetchFreshSession(restoredSession);
        await completeAuth(freshSession);
      } catch {
        enterSessionSyncRequiredState(restoredSession);
      }
    } finally {
      isBooting.value = false;
    }
  })();
});

watch([selectedChatId, currentView, realtimeState, hasNetwork], () => {
  syncFallbackRefreshState();
});

watch(selectedChatId, (nextChatId, previousChatId) => {
  if (previousChatId && previousChatId !== nextChatId) {
    if (joinedChatId.value === previousChatId) {
      emitTypingStopForChat(previousChatId);
    }
    emitChatLeaveForChat(previousChatId);
  }

  if (nextChatId && currentView.value === 'chats') {
    void ensureChatJoined(nextChatId);
    scheduleMarkSelectedChatRead();
    return;
  }

  isViewingLatest.value = false;
});

watch(currentView, (nextView, previousView) => {
  if (previousView === 'chats' && nextView !== 'chats' && selectedChatId.value) {
    if (joinedChatId.value === selectedChatId.value) {
      emitTypingStopForChat(selectedChatId.value);
    }
    emitChatLeaveForChat(selectedChatId.value);
  }

  if (selectedChatId.value && nextView === 'chats') {
    void ensureChatJoined(selectedChatId.value);
    scheduleMarkSelectedChatRead();
    return;
  }

  isViewingLatest.value = false;
});

onUnmounted(() => {
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  document.removeEventListener('visibilitychange', handleDocumentVisibilityChange);
  clearMarkReadTimer();
  clearChatBootstrapRetryTimer();
  clearFallbackRefreshTimer();
  clearInAppToasts();
  void appStateListener?.remove();
  void appPauseListener?.remove();
  void appResumeListener?.remove();
  removeAuthEventListener?.();
  disconnectSocket();
});
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-back-btn {
  display: none;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  padding: 0;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
}

.chat-layout {
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.auth-shell {
  justify-content: center;
}

.session-notice {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  flex-shrink: 0;
}

.session-notice-eyebrow {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-notice-copy {
  margin: 6px 0 0;
  line-height: 1.45;
}

.session-notice-dismiss {
  flex: 0 0 auto;
}

.forced-password-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
}

.session-sync-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
}

.test-notice-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
}

.session-sync-card {
  width: 100%;
  max-width: 420px;
  padding: 24px;
}

.forced-password-card {
  width: 100%;
  max-width: 400px;
  padding: 24px;
}

.test-notice-card {
  width: 100%;
  max-width: 480px;
  padding: 24px;
}

.notice-eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.notice-summary {
  line-height: 1.5;
}

.test-notice-version-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(140, 216, 255, 0.12);
  border: 1px solid rgba(140, 216, 255, 0.24);
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 700;
}

.test-notice-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(140, 216, 255, 0.16);
  background: rgba(15, 18, 34, 0.72);
  line-height: 1.45;
}

.test-notice-check input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  padding: 0;
  border-radius: 6px;
  accent-color: var(--accent);
  flex: 0 0 auto;
}

.gate-actions {
  flex-wrap: wrap;
  align-items: center;
}

.gate-actions .form-btn {
  width: auto;
  flex: 1 1 220px;
}

.gate-actions .small-btn {
  flex: 0 0 auto;
}

.chat-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.loading-shell {
  align-items: center;
  justify-content: center;
}

.loading-card {
  width: 100%;
  max-width: 420px;
}

.recovery-banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(16, 24, 64, 0.82);
  border: 1px solid rgba(111, 211, 255, 0.25);
  border-radius: 14px;
  flex-shrink: 0;
}

.recovery-banner p {
  margin: 4px 0 0;
}

.recovery-copy {
  opacity: 0.72;
  max-width: 580px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: rgba(23, 27, 50, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  position: relative;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.nav-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  border-radius: 999px;
  background: rgba(255, 140, 166, 0.18);
  color: var(--danger);
  font-size: 0.72rem;
  line-height: 1;
}

.nav-tabs {
  flex-wrap: wrap;
}

.nav-tabs .small-btn {
  width: auto;
  min-width: 0;
  padding: 8px 14px;
}

.chat-action-error {
  margin: 0 0 10px;
}

.empty-chat {
  justify-content: center;
  align-items: center;
}

.prompt-text {
  opacity: 0.7;
  font-size: 1.1rem;
}

@media (max-width: 980px), (orientation: portrait) and (max-width: 1100px) {
  .app-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .app-header :deep(.conn-status) {
    width: 100%;
    max-width: 100%;
    flex: 1 1 100%;
  }

  .chat-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }
}

/* Mobile Responsive Adjustments */
@media (max-width: 960px) {
  .app-header {
    gap: 10px;
    align-items: center;
  }

  .chat-main {
    padding: 8px;
  }

  .header-title {
    gap: 10px;
  }

  .header-title h1 {
    font-size: 1.35rem;
  }

  .mobile-back-btn {
    display: flex;
    flex: 0 0 auto;
  }

  .recovery-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .session-notice {
    flex-direction: column;
    align-items: stretch;
  }

  .test-notice-card {
    padding: 20px;
  }

  .session-sync-card {
    padding: 20px;
  }

  .gate-actions .form-btn,
  .gate-actions .small-btn {
    width: 100%;
  }

  /* When content is active, hide sidebar on mobile */
  .chat-layout.content-active .sidebar {
    display: none;
  }

  /* When NO content is active, hide main area on mobile */
  .chat-layout:not(.content-active) .chat-main {
    display: none;
  }

}
</style>
