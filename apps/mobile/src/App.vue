<template>
  <main class="shell">
    <header class="app-header">
      <div class="header-title">
        <button 
          v-if="session && selectedChatId" 
          class="mobile-back-btn" 
          @click="selectedChatId = ''"
        >
          ←
        </button>
        <h1>The Penthouse</h1>
      </div>
      <ConnectionStatus 
        v-if="session"
        :isOnline="isOnline"
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
    />

    <section v-else class="chat-layout" :class="{ 'chat-active': !!selectedChatId }">
      <!-- Sidebar / Chat List -->
      <div class="sidebar">
        <ChatListPanel 
          :currentUsername="session.user.username"
          :chats="chats"
          :activeChatId="selectedChatId"
          @select="openChat"
          @logout="doLogout"
        />
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main" v-if="selectedChatId">
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
      </div>
      <div class="chat-main empty-chat" v-else>
        <p class="small">Select a chat to start messaging.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ServerMessageAckEventSchema, ServerMessageNewEventSchema } from '@penthouse/contracts';
import type { Chat, ChatMessage, PendingMessage, Session } from './types';
import {
  getChats,
  getMessages,
  getStoredUser,
  login,
  register,
  sendMessage,
  setStoredUser,
  logout
} from './services/http';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import { enqueueMessage, flushQueue, getQueued } from './services/offlineQueue';
import { withBackoff } from './services/retry';
import { cacheChats, cacheMessages, readCachedChats, readCachedMessages } from './services/cache';

// Components
import AuthPanel from './components/AuthPanel.vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
import ChatListPanel from './components/ChatListPanel.vue';
import MessageList from './components/MessageList.vue';
import MessageComposer from './components/MessageComposer.vue';

// State
const authError = ref('');
const isAuthenticating = ref(false);

const session = ref<Session | null>(null);
const chats = ref<Chat[]>([]);
const messages = ref<ChatMessage[]>([]);
const selectedChatId = ref<string>('');
const queued = ref<PendingMessage[]>(getQueued());
const failedMessageIds = ref<Set<string>>(new Set(getQueued().map(q => q.clientMessageId)));
const isOnline = ref(navigator.onLine);
const hasPermanentSocketError = ref(false);
const isReconnecting = ref(false);



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
    await withBackoff(() => sendMessage(chatId, content, clientMessageId));
  } catch {
    enqueueMessage(pendingItem);
    queued.value = getQueued();
    failedMessageIds.value.add(clientMessageId);
  }
}

async function retrySpecificMessage(clientMessageId: string): Promise<void> {
  const queuedItem = queued.value.find(q => q.clientMessageId === clientMessageId);
  if (!queuedItem) return;

  failedMessageIds.value.delete(clientMessageId);
  try {
    await withBackoff(() => sendMessage(queuedItem.chatId, queuedItem.content, clientMessageId));
    // The socket ack will eventually handle removing it from queue, but we can optimistically clean up
    // However, existing socket ack logic requires it to be delivered. The `flushQueue` implementation removes it upon success:
    import('./services/offlineQueue').then(module => {
      module.removeQueued(clientMessageId);
      queued.value = module.getQueued();
    });
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
      await withBackoff(() => sendMessage(item.chatId, item.content, item.clientMessageId));
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
  } catch (error: any) {
    authError.value = error?.response?.data?.error || 'Authentication failed';
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
  } catch (error: any) {
    authError.value = error?.response?.data?.error || 'Authentication failed';
  } finally {
    isAuthenticating.value = false;
  }
}

async function completeAuth(res: Session) {
  session.value = res;
  setStoredUser(res.user);
  wireSocketHandlers();
  await loadChats();
}

function wireSocketHandlers(): void {
  const socket = connectSocket();
  socket.removeAllListeners('message.new');
  socket.removeAllListeners('message.ack');
  socket.removeAllListeners('connect');
  socket.removeAllListeners('disconnect');
  socket.io.removeAllListeners('reconnect_attempt');
  socket.io.removeAllListeners('reconnect_failed');

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
    failedMessageIds.value.delete(payload.clientMessageId);
    import('./services/offlineQueue').then(module => {
      module.removeQueued(payload.clientMessageId);
      queued.value = module.getQueued();
    });
  });

  socket.on('connect', () => {
    isOnline.value = true;
    hasPermanentSocketError.value = false;
    if (selectedChatId.value) {
      socket.emit('chat.join', { chatId: selectedChatId.value });
    }
    flushPending().catch(() => undefined);
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
  setStoredUser(null);
}

function onOnline(): void {
  isOnline.value = true;
  hasPermanentSocketError.value = false;
  flushPending().catch(() => undefined);
}

function onOffline(): void {
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

/* Mobile Responsive Adjustments */
@media (max-width: 760px) {
  .chat-layout {
    grid-template-columns: 1fr;
    height: calc(100vh - 80px); /* Tighter top spacing on mobile */
  }

  /* When a chat is active, hide sidebar on mobile */
  .chat-layout.chat-active .sidebar {
    display: none;
  }

  /* When NO chat is active, hide main area on mobile */
  .chat-layout:not(.chat-active) .chat-main {
    display: none;
  }

  /* Show back button on mobile */
  .mobile-back-btn {
    display: flex;
  }
}
</style>
