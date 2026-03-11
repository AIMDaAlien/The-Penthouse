<template>
  <aside class="chat-list-panel card">
    <div class="header row">
      <strong>{{ currentUsername }}</strong>
      <button class="danger small-btn" @click="$emit('logout')">Logout</button>
    </div>
    
    <div class="list">
      <div v-if="chats.length === 0" class="empty-state small">No chats available</div>
      
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="list-item"
        :class="{ active: activeChatId === chat.id }"
        @click="$emit('select', chat.id)"
      >
        <div class="chat-name">
          <span class="chat-prefix" v-if="chat.type === 'channel'">#</span>
          <span class="chat-prefix" v-if="chat.type === 'dm'">@</span>
          {{ chat.name }}
          <span v-if="chat.unreadCount > 0" class="unread-pill">{{ chat.unreadCount }}</span>
        </div>
        <div class="chat-meta small">
          <span class="badge" :class="chat.type">{{ chat.type }}</span>
          <span v-if="chat.type === 'channel' && onlineCount > 0" class="online-pill">
            {{ onlineCount }} online
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ChatSummary } from '@penthouse/contracts'; // Use directly from contracts

defineProps<{
  currentUsername: string;
  chats: ChatSummary[];
  activeChatId: string | null;
  onlineCount?: number;
}>();

defineEmits<{
  (e: 'logout'): void;
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
}
.list {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
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
.chat-name {
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
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
.online-pill {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(114, 214, 255, 0.14);
  color: var(--accent);
  font-weight: 600;
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
