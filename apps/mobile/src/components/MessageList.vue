<template>
  <div class="messages-container" ref="scrollRef">
    <div v-if="messages.length === 0" class="empty-state">
      <p class="small">No messages yet. Say hello!</p>
    </div>
    
    <div class="messages">
      <div 
        v-for="m in sortedMessages" 
        :key="m.id" 
        class="msg-bubble"
        :class="{
          'sent': m.senderId === currentUserId,
          'received': m.senderId !== currentUserId,
          'queued': isLocalId(m.id)
        }"
      >
        <div class="msg-meta small">
          <span v-if="m.senderId !== currentUserId" class="sender-name">{{ m.senderId.slice(0, 8) }}</span>
          <span class="timestamp">{{ formatTime(m.createdAt) }}</span>
          
          <template v-if="m.senderId === currentUserId">
            <span v-if="getDeliveryState(m) === 'delivered'" class="status-indicator success" title="Delivered"> ✓</span>
            <span v-else-if="getDeliveryState(m) === 'queued'" class="status-indicator queued" title="Queued"> ⏸️</span>
            <span v-else-if="getDeliveryState(m) === 'sending'" class="status-indicator sending" title="Sending"> ⏳</span>
            <button 
              v-else-if="getDeliveryState(m) === 'failed-retryable'" 
              class="status-indicator failed retry-btn" 
              title="Failed, tap to retry"
              @click="m.clientMessageId && $emit('retry', m.clientMessageId)"
            >
              ❌
            </button>
          </template>
        </div>
        <div class="msg-content">{{ m.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type { Message } from '@penthouse/contracts';

const props = defineProps<{
  messages: Message[];
  currentUserId: string;
  queuedIds?: string[];
  failedIds?: string[];
}>();

const emit = defineEmits<{
  (e: 'retry', clientMessageId: string): void;
}>();

const scrollRef = ref<HTMLElement | null>(null);

// Messages come in descending order from API (newest first). 
// For chat UI, we want oldest at top, newest at bottom, so we reverse it.
const sortedMessages = computed(() => {
  return [...props.messages].reverse();
});

// Watch for changes and scroll to bottom
watch(() => props.messages.length, async () => {
  await nextTick();
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
});

function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

function getDeliveryState(m: Message): 'delivered' | 'failed-retryable' | 'queued' | 'sending' {
  if (!isLocalId(m.id)) return 'delivered';
  
  if (m.clientMessageId && props.failedIds?.includes(m.clientMessageId)) {
    return 'failed-retryable';
  }
  
  if (m.clientMessageId && props.queuedIds?.includes(m.clientMessageId)) {
    return 'queued';
  }
  
  return 'sending';
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
</script>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background: rgba(15, 18, 34, 0.4);
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto; /* Push messages to bottom if container is larger */
}

.empty-state {
  margin: auto;
  opacity: 0.6;
}

.msg-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
  word-wrap: break-word;
}

/* Sent messages (Right) */
.msg-bubble.sent {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(114, 214, 255, 0.15), rgba(121, 166, 255, 0.15));
  border: 1px solid rgba(135, 206, 250, 0.3);
  border-bottom-right-radius: 4px;
}

/* Received messages (Left) */
.msg-bubble.received {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 4px;
}

/* Queued messages (Faded pulse) */
.msg-bubble.queued {
  opacity: 0.6;
  border-style: dashed;
}

.msg-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 0.7rem;
  opacity: 0.7;
}

.msg-bubble.sent .msg-meta {
  justify-content: flex-end;
}

.sender-name {
  font-weight: 600;
  color: var(--accent);
}

.msg-content {
  line-height: 1.4;
  white-space: pre-wrap;
}

.status-indicator {
  margin-left: 2px;
}

.retry-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.7rem;
  transition: transform 0.15s ease;
}

.retry-btn:hover {
  transform: scale(1.2);
}
.retry-btn:active {
  transform: scale(0.9);
}

/* Custom Scrollbar */
.messages-container::-webkit-scrollbar {
  width: 6px;
}
.messages-container::-webkit-scrollbar-track {
  background: transparent;
}
.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
</style>
