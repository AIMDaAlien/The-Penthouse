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
        <div class="chat-name">{{ chat.name }}</div>
        <div class="chat-meta small">
          <span class="badge" :class="chat.type">{{ chat.type }}</span>
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
}
.header {
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.small-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
}
.empty-state {
  text-align: center;
  padding: 20px 0;
  opacity: 0.5;
}
.chat-name {
  font-weight: 600;
  margin-bottom: 4px;
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
</style>
