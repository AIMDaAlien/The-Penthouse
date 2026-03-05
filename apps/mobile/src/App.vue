<template>
  <main class="shell">
    <h1>The Penthouse</h1>
    <p class="small">Rebuild MVP: invite auth + core chat + light offline reliability</p>

    <section v-if="!session" class="card">
      <div class="row" style="margin-bottom: 10px;">
        <button :class="mode === 'login' ? '' : 'secondary'" @click="mode = 'login'">Login</button>
        <button :class="mode === 'register' ? '' : 'secondary'" @click="mode = 'register'">Register</button>
      </div>

      <div class="list">
        <input v-model="username" placeholder="username" />
        <input v-model="password" type="password" placeholder="password" />
        <input v-if="mode === 'register'" v-model="inviteCode" placeholder="invite code" />
        <button @click="submitAuth">{{ mode === 'login' ? 'Login' : 'Create account' }}</button>
        <p v-if="authError" class="status-danger small">{{ authError }}</p>
      </div>
    </section>

    <section v-else class="chat-layout">
      <aside class="card">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <strong>{{ session.user.username }}</strong>
          <button class="danger" @click="doLogout">Logout</button>
        </div>
        <p class="small">Queued messages: {{ queued.length }}</p>
        <div class="list">
          <div
            v-for="chat in chats"
            :key="chat.id"
            class="list-item"
            :class="{ active: selectedChatId === chat.id }"
            @click="openChat(chat.id)"
          >
            <div>{{ chat.name }}</div>
            <div class="small">{{ chat.type }}</div>
          </div>
        </div>
      </aside>

      <section class="card">
        <h3 v-if="selectedChat">{{ selectedChat.name }}</h3>
        <p v-else class="small">Select a chat to start messaging.</p>

        <div v-if="selectedChat" class="messages">
          <div v-for="m in messages" :key="m.id" class="msg">
            <div class="small">{{ m.senderId }} • {{ m.createdAt }}</div>
            <div>{{ m.content }}</div>
          </div>
        </div>

        <div v-if="selectedChat" class="list">
          <textarea v-model="draft" rows="3" placeholder="type message"></textarea>
          <div class="row">
            <button @click="sendCurrent">Send</button>
            <button class="secondary" @click="flushPending">Flush queued</button>
          </div>
        </div>

        <p class="small" :class="isOnline ? 'status-ok' : 'status-danger'">
          {{ isOnline ? 'Online' : 'Offline - queueing enabled' }}
        </p>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
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

const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const inviteCode = ref('PENTHOUSE-ALPHA');
const authError = ref('');

const session = ref<Session | null>(null);
const chats = ref<Chat[]>([]);
const messages = ref<ChatMessage[]>([]);
const selectedChatId = ref<string>('');
const draft = ref('');
const queued = ref<PendingMessage[]>(getQueued());
const isOnline = ref(navigator.onLine);

const selectedChat = computed(() => chats.value.find((c) => c.id === selectedChatId.value));

function generateClientMessageId(): string {
  return `cm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function loadChats(): Promise<void> {
  try {
    chats.value = await withBackoff(() => getChats());
    cacheChats(chats.value);
  } catch {
    chats.value = readCachedChats();
  }
  if (!selectedChatId.value && chats.value.length > 0) {
    await openChat(chats.value[0].id);
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
  }
}

async function sendCurrent(): Promise<void> {
  if (!selectedChatId.value || !draft.value.trim()) return;
  const content = draft.value.trim();
  const clientMessageId = generateClientMessageId();

  messages.value.unshift({
    id: `local_${clientMessageId}`,
    chatId: selectedChatId.value,
    senderId: session.value?.user.id ?? 'me',
    content,
    createdAt: new Date().toISOString(),
    clientMessageId
  });
  cacheMessages(selectedChatId.value, messages.value);

  draft.value = '';
  await sendOrQueue(selectedChatId.value, content, clientMessageId);
}

async function flushPending(): Promise<void> {
  await flushQueue(async (item) => {
    await withBackoff(() => sendMessage(item.chatId, item.content, item.clientMessageId));
  });
  queued.value = getQueued();
}

async function submitAuth(): Promise<void> {
  authError.value = '';

  try {
    const res = mode.value === 'login'
      ? await login(username.value, password.value)
      : await register(username.value, password.value, inviteCode.value);

    session.value = res;
    setStoredUser(res.user);

    wireSocketHandlers();

    await loadChats();
  } catch (error: any) {
    authError.value = error?.response?.data?.error || 'Authentication failed';
  }
}

function wireSocketHandlers(): void {
  const socket = connectSocket();
  socket.removeAllListeners('message.new');
  socket.removeAllListeners('message.ack');
  socket.removeAllListeners('connect');
  socket.removeAllListeners('disconnect');

  socket.on('message.new', (event: any) => {
    const payload = event?.payload;
    if (!payload || payload.chatId !== selectedChatId.value) return;
    if (messages.value.some((m) => m.id === payload.id)) return;
    messages.value.unshift(payload);
    cacheMessages(payload.chatId, messages.value);
  });

  socket.on('message.ack', () => {
    queued.value = getQueued();
  });

  socket.on('connect', () => {
    isOnline.value = true;
    flushPending().catch(() => undefined);
  });

  socket.on('disconnect', () => {
    isOnline.value = false;
  });
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
    loadChats().catch(() => {
      doLogout().catch(() => undefined);
    });
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
