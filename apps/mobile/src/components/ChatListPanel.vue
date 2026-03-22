<template>
  <aside class="chat-list-panel card">
    <div class="header row">
      <strong>{{ currentUsername }}</strong>
      <button class="danger small-btn" @click="$emit('logout')">Logout</button>
    </div>
    
    <div class="list">
      <div v-if="chats.length === 0 && loadState !== 'ready'" class="empty-state small">
        <p>{{ loadState === 'error' ? loadError || 'We are still syncing your chats.' : 'Loading chats...' }}</p>
        <button v-if="loadState === 'error'" type="button" class="secondary small-btn retry-btn" @click="$emit('retry-load')">
          Retry
        </button>
      </div>

      <div v-else-if="chats.length === 0" class="empty-state small">No chats available</div>
      
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="list-item"
        :class="[{ active: activeChatId === chat.id }, chat.type === 'dm' ? 'dm-item' : 'channel-item']"
        @click="$emit('select', chat.id)"
      >
        <div v-if="chat.type === 'dm'" class="dm-avatar-shell">
          <img
            v-if="chat.counterpartAvatarUrl"
            class="dm-avatar"
            :src="chat.counterpartAvatarUrl"
            :alt="`${chat.name} avatar`"
          />
          <div v-else class="dm-avatar dm-avatar-fallback">{{ avatarLetter(chat) }}</div>
        </div>

        <div class="chat-row-copy">
          <div class="chat-name">
            <span class="chat-prefix" v-if="chat.type === 'channel'">#</span>
            {{ chat.name }}
            <span v-if="chat.unreadCount > 0" class="unread-pill">{{ chat.unreadCount }}</span>
          </div>
          <div class="chat-meta small">
            <span class="badge" :class="chat.type">{{ chat.type }}</span>
            <span v-if="chat.type === 'dm' && chat.notificationsMuted" class="muted-chip">Muted</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ChatSummary } from '@penthouse/contracts'; // Use directly from contracts

function avatarLetter(chat: ChatSummary): string {
  const label = chat.name?.trim();
  return label ? label[0].toUpperCase() : '?';
}

defineProps<{
  currentUsername: string;
  chats: ChatSummary[];
  activeChatId: string | null;
  loadState?: 'loading' | 'ready' | 'error';
  loadError?: string;
}>();

defineEmits<{
  (e: 'logout'): void;
  (e: 'retry-load'): void;
  (e: 'select', chatId: string): void;
}>();
</script>

<style scoped>
.chat-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.header {
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  min-width: 0;
}

.header strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.small-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
  width: auto;
}
.empty-state {
  text-align: center;
  padding: 20px 0;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
}

.retry-btn {
  margin-top: 12px;
}
.chat-name {
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-row-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.dm-item {
  background: rgba(140, 216, 255, 0.06);
  border-color: rgba(140, 216, 255, 0.14);
}

.dm-avatar-shell {
  flex: 0 0 auto;
}

.dm-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.dm-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(140, 216, 255, 0.16);
  color: var(--accent);
  font-weight: 700;
}
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.70rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.1);
}
.badge.dm { background: rgba(140, 216, 255, 0.15); color: var(--accent); }
.badge.channel { background: rgba(255, 255, 255, 0.2); font-weight: bold; color: white; }
.chat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.chat-prefix {
  opacity: 0.5;
  margin-right: 2px;
  font-weight: normal;
}

.muted-chip {
  color: var(--muted);
}
.unread-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 140, 166, 0.18);
  color: var(--danger);
  font-size: 0.72rem;
  line-height: 1;
}
</style>
