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
        :isOnline="isOnline"
        :hasNetwork="hasNetwork"
        :queuedCount="queued.length"
        :hasPermanentError="hasPermanentSocketError"
        :isReconnecting="isReconnecting"
        @flush="flushPending"
        @reconnect="forceSocketReconnect"
      />
    </header>

    <AuthPanel 
      v-if="!session"
      :error="authError"
      :loading="isAuthenticating"
      @login="handleLogin"
      @register="handleRegister"
      @reset-password="handlePasswordReset"
    />

    <section v-else-if="session.user.mustChangePassword" class="chat-shell forced-password-gate">
      <div class="card forced-password-card">
        <h2>Security Update Required</h2>
        <p class="small" style="margin-bottom: 24px;">Your account requires a password change before continuing.</p>
        <form @submit.prevent="handleForcedPasswordChange" class="list">
          <input v-model="forcedPwForm.currentPassword" type="password" placeholder="Current Password" required />
          <input v-model="forcedPwForm.newPassword" type="password" placeholder="New Password" required />
          <input v-model="forcedPwConfirm" type="password" placeholder="Confirm New Password" required />
          <button type="submit" :disabled="savingForcedPw">Update Password</button>
          <p v-if="forcedPwError" class="status-danger small">{{ forcedPwError }}</p>
        </form>
        <button class="danger small-btn" style="margin-top: 16px;" @click="doLogout">Logout</button>
      </div>
    </section>

    <section v-else class="chat-shell">
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
          <button class="small-btn" :class="{ secondary: currentView !== 'chats' }" @click="currentView = 'chats'">Chats</button>
          <button class="small-btn" :class="{ secondary: currentView !== 'directory' }" @click="currentView = 'directory'">Directory</button>
          <button class="small-btn" :class="{ secondary: currentView !== 'settings' }" @click="currentView = 'settings'">Settings</button>
        </div>

        <ChatListPanel 
          v-if="currentView === 'chats'"
          :currentUsername="session.user.username"
          :chats="chats"
          :activeChatId="selectedChatId"
          @select="openChat"
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
              @retry="retrySpecificMessage"
            />
            <MessageComposer 
              :disabled="!selectedChatId"
              @send="sendCurrent"
            />
          </template>
          <div class="empty-chat" style="display:flex; height:100%; justify-content:center; align-items:center;" v-else>
            <p class="small prompt-text">Select 'General' to join the shared test chat.</p>
          </div>
        </template>
        <template v-else-if="currentView === 'directory'">
          <MemberDirectory @select-member="selectedMemberId = $event" />
          <MemberProfileSheet 
            v-if="selectedMemberId" 
            :memberId="selectedMemberId" 
            @close="selectedMemberId = null" 
          />
        </template>
        <template v-else-if="currentView === 'settings'">
          <ProfileSettings />
        </template>
      </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { formatRecoveryCode } from '@penthouse/contracts';
import { ServerMessageAckEventSchema, ServerMessageNewEventSchema } from '@penthouse/contracts';
import type { Chat, ChatMessage, PendingMessage, Session } from './types';
import {
  getChats,
  getMessages,
  getStoredUser,
  login,
  register,
  resetPassword,
  sendMessage,
  setStoredUser,
  logout
} from './services/http';
import { describeAuthError } from './services/errors';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import { enqueueMessage, flushQueue, getQueued, removeQueued } from './services/offlineQueue';
import { withBackoff } from './services/retry';
import { cacheChats, cacheMessages, readCachedChats, readCachedMessages } from './services/cache';

// Components
import AuthPanel from './components/AuthPanel.vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
import ChatListPanel from './components/ChatListPanel.vue';
import MessageList from './components/MessageList.vue';
import MessageComposer from './components/MessageComposer.vue';
import ProfileSettings from './components/ProfileSettings.vue';
import MemberDirectory from './components/MemberDirectory.vue';
import MemberProfileSheet from './components/MemberProfileSheet.vue';

// State
const authError = ref('');
const isAuthenticating = ref(false);

const session = ref<Session | null>(null);
const chats = ref<Chat[]>([]);
const messages = ref<ChatMessage[]>([]);
const selectedChatId = ref<string>('');
const queued = ref<PendingMessage[]>(getQueued());
const failedMessageIds = ref<Set<string>>(new Set(getQueued().map(q => q.clientMessageId)));
const hasNetwork = ref(navigator.onLine);
const isOnline = ref(false);
const hasPermanentSocketError = ref(false);
const isReconnecting = ref(false);
const recoveryCodeNotice = ref('');

const currentView = ref<'chats' | 'directory' | 'settings'>('chats');
const selectedMemberId = ref<string | null>(null);

const forcedPwForm = ref({ currentPassword: '', newPassword: '' });
const forcedPwConfirm = ref('');
const savingForcedPw = ref(false);
const forcedPwError = ref('');

const formattedRecoveryCodeNotice = computed(() =>
  recoveryCodeNotice.value ? formatRecoveryCode(recoveryCodeNotice.value) : ''
);

const isContentActive = computed(() => {
  if (currentView.value === 'chats') return !!selectedChatId.value;
  return true; // Directory and Settings always show content area
});

function handleMobileBack() {
  if (currentView.value === 'chats') {
    selectedChatId.value = '';
  } else {
    currentView.value = 'chats';
    selectedMemberId.value = null;
  }
}

function generateClientMessageId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function loadChats(): Promise<void> {
  try {
    chats.value = await withBackoff(() => getChats());
    cacheChats(chats.value);
  } catch {
    chats.value = readCachedChats();
  }
}

async function openChat(chatId: string): Promise<void> {
  selectedChatId.value = chatId;
  try {
    messages.value = await withBackoff(() => getMessages(chatId));
    cacheMessages(chatId, messages.value);
  } catch {
    messages.value = readCachedMessages(chatId);
  }
  getSocket()?.emit('chat.join', { chatId });
}

async function sendOrQueue(chatId: string, content: string, clientMessageId: string): Promise<void> {
  const pendingItem: PendingMessage = {
    chatId,
    content,
    clientMessageId,
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  };

  try {
    const response = await withBackoff(() => sendMessage(chatId, content, clientMessageId));
    markMessageDelivered(response.message.chatId, clientMessageId, response.message.id);
  } catch {
    enqueueMessage(pendingItem);
    queued.value = getQueued();
    failedMessageIds.value.add(clientMessageId);
  }
}

function markMessageDelivered(chatId: string, clientMessageId: string, messageId: string): void {
  const existingMsg = messages.value.find((m) => m.clientMessageId === clientMessageId && m.chatId === chatId);
  if (existingMsg) {
    existingMsg.id = messageId;
    cacheMessages(chatId, messages.value);
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
    const response = await withBackoff(() => sendMessage(queuedItem.chatId, queuedItem.content, clientMessageId));
    markMessageDelivered(response.message.chatId, clientMessageId, response.message.id);
  } catch {
    failedMessageIds.value.add(clientMessageId);
  }
}

async function sendCurrent(content: string): Promise<void> {
  if (!selectedChatId.value) return;
  
  const clientMessageId = generateClientMessageId();

  // Optimistic UI update
  messages.value.unshift({
    id: clientMessageId, // Real UUID assigned by server later
    chatId: selectedChatId.value,
    senderId: session.value?.user.id ?? 'me',
    senderUsername: session.value?.user.username ?? 'me',
    content,
    createdAt: new Date().toISOString(),
    clientMessageId
  });
  cacheMessages(selectedChatId.value, messages.value);

  await sendOrQueue(selectedChatId.value, content, clientMessageId);
}

async function flushPending(): Promise<void> {
  await flushQueue(async (item) => {
    failedMessageIds.value.delete(item.clientMessageId);
    try {
      const response = await withBackoff(() => sendMessage(item.chatId, item.content, item.clientMessageId));
      markMessageDelivered(response.message.chatId, item.clientMessageId, response.message.id);
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
    completeAuth(res);
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
    completeAuth(res);
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
    completeAuth(res);
  } catch (error: unknown) {
    authError.value = describeAuthError(error);
  } finally {
    isAuthenticating.value = false;
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
    // We import changePassword dynamically or we already imported it below (wait, we didn't import changePassword in App.vue).
    // Let's import it at the top of the chunk by adding it to the imports if missing.
    // Actually I'll just rely on http's changePassword. Let's make sure it's imported!
    const { changePassword } = await import('./services/http');
    await changePassword({ ...forcedPwForm.value });
    
    // Clear the gate
    if (session.value) {
      session.value.user.mustChangePassword = false;
    }
    
    forcedPwForm.value = { currentPassword: '', newPassword: '' };
    forcedPwConfirm.value = '';
  } catch (err: any) {
    forcedPwError.value = err.response?.data?.error || 'Failed to update password';
  } finally {
    savingForcedPw.value = false;
  }
}

async function completeAuth(res: Session) {
  session.value = res;
  setStoredUser(res.user);
  recoveryCodeNotice.value = res.recoveryCode ?? '';
  wireSocketHandlers();
  await loadChats();
}

function wireSocketHandlers(): void {
  const socket = connectSocket();
  socket.removeAllListeners('message.new');
  socket.removeAllListeners('message.ack');
  socket.removeAllListeners('connect');
  socket.removeAllListeners('connect_error');
  socket.removeAllListeners('disconnect');
  socket.io.removeAllListeners('reconnect_attempt');
  socket.io.removeAllListeners('reconnect_failed');
  socket.io.removeAllListeners('reconnect');

  socket.on('message.new', (event: any) => {
    const parsed = ServerMessageNewEventSchema.safeParse(event);
    if (!parsed.success) return;
    const payload = parsed.data.payload;
    if (payload.chatId !== selectedChatId.value) return;

    // Check if we already optimistically rendered this (match by clientMessageId)
    // The server `id` is a UUID, local id starts with `local_`
    const existingIdx = messages.value.findIndex(m => m.clientMessageId === payload.clientMessageId);

    if (existingIdx >= 0) {
      // Replace optimistic message with actual server message
      messages.value[existingIdx] = payload;
    } else if (!messages.value.some((m) => m.id === payload.id)) {
      messages.value.unshift(payload);
    }

    cacheMessages(payload.chatId, messages.value);
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
      cacheMessages(payload.chatId, messages.value);
    }

    // We can also ensure it is removed from failed set
    markMessageDelivered(payload.chatId, payload.clientMessageId, payload.messageId);
  });

  socket.on('connect', () => {
    isOnline.value = true;
    isReconnecting.value = false;
    hasPermanentSocketError.value = false;
    if (selectedChatId.value) {
      socket.emit('chat.join', { chatId: selectedChatId.value });
    }
    flushPending().catch(() => undefined);
  });

  socket.on('connect_error', () => {
    isOnline.value = false;
  });

  socket.on('disconnect', () => {
    isOnline.value = false;
  });

  socket.io.on('reconnect_attempt', () => {
    hasPermanentSocketError.value = false;
    isReconnecting.value = true;
  });

  socket.io.on('reconnect_failed', () => {
    isOnline.value = false;
    isReconnecting.value = false;
    hasPermanentSocketError.value = true;
  });

  socket.io.on('reconnect', () => {
    isReconnecting.value = false;
  });
}

function forceSocketReconnect() {
  const socket = getSocket();
  if (!socket) return;
  isReconnecting.value = true;
  hasPermanentSocketError.value = false;
  socket.connect();
}

async function doLogout(): Promise<void> {
  await logout();
  disconnectSocket();
  session.value = null;
  chats.value = [];
  messages.value = [];
  selectedChatId.value = '';
  recoveryCodeNotice.value = '';
  setStoredUser(null);
}

function onOnline(): void {
  hasNetwork.value = true;
  // Network is back — kick the socket to reconnect if it isn't already connected.
  // Do NOT set isOnline here; let the socket 'connect' event be the single source of truth.
  const sock = getSocket();
  if (sock && !sock.connected) {
    hasPermanentSocketError.value = false;
    sock.connect();
  }
  flushPending().catch(() => undefined);
}

function onOffline(): void {
  hasNetwork.value = false;
  // Immediately reflect network loss. The socket will also fire 'disconnect'
  // once the transport times out, but this gives instant visual feedback.
  isOnline.value = false;
}

onMounted(() => {
  const user = getStoredUser();
  if (user) {
    session.value = {
      user,
      accessToken: localStorage.getItem('accessToken') || '',
      refreshToken: localStorage.getItem('refreshToken') || ''
    };
    wireSocketHandlers();
    loadChats().catch(() => undefined);
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  disconnectSocket();
});
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
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
  grid-template-columns: 260px 1fr;
  gap: 16px;
  height: calc(100vh - 100px);
  min-height: 500px;
}

.forced-password-gate {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
}

.forced-password-card {
  width: 100%;
  max-width: 400px;
  padding: 24px;
}

.chat-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: rgba(23, 27, 50, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  position: relative;
}

.empty-chat {
  justify-content: center;
  align-items: center;
}

.prompt-text {
  opacity: 0.7;
  font-size: 1.1rem;
}

/* Mobile Responsive Adjustments */
@media (max-width: 760px) {
  .chat-layout {
    grid-template-columns: 1fr;
    height: calc(100vh - 80px); /* Tighter top spacing on mobile */
  }

  .recovery-banner {
    flex-direction: column;
    align-items: stretch;
  }

  /* When content is active, hide sidebar on mobile */
  .chat-layout.content-active .sidebar {
    display: none;
  }

  /* When NO content is active, hide main area on mobile */
  .chat-layout:not(.content-active) .chat-main {
    display: none;
  }

  /* Show back button on mobile */
  .mobile-back-btn {
    display: flex;
  }
}
</style>
