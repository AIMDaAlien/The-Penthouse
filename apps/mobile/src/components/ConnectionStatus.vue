<template>
  <div class="conn-status" :class="statusClass">
    <div class="indicator" :class="{ pulsing: isReconnecting }"></div>
    <span class="small status-container">
      <span class="status-text">{{ statusText }}</span>
      <template v-if="queuedCount > 0">
        <span class="separator">•</span>
        <span class="queue-badge">{{ queuedCount }} queued</span>
        <button v-if="isOnline && !hasPermanentError && !isReconnecting" class="action-btn bg-retry" @click="$emit('flush')">Retry</button>
      </template>
      <template v-if="hasPermanentError && !isReconnecting">
        <span class="separator">•</span>
        <button class="action-btn bg-reconnect" @click="$emit('reconnect')">Try reconnect</button>
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isOnline: boolean;
  queuedCount: number;
  hasPermanentError: boolean;
  isReconnecting: boolean;
}>();

defineEmits<{
  (e: 'flush'): void;
  (e: 'reconnect'): void;
}>();

const statusClass = computed(() => {
  if (props.isReconnecting) return 'warning';
  if (props.hasPermanentError) return 'danger';
  return props.isOnline ? 'ok' : 'danger';
});

const statusText = computed(() => {
  if (props.isReconnecting) return 'Reconnecting...';
  if (props.hasPermanentError) return 'Reconnect failed';
  return props.isOnline ? 'Connected' : 'Offline';
});
</script>

<style scoped>
.conn-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--panel);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.ok { color: var(--ok); }
.warning { color: #ffd166; }
.danger { color: var(--danger); }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
.indicator.pulsing {
  animation: pulse 1s infinite ease-in-out;
}

.tiny-btn {
  padding: 2px 8px;
  font-size: 0.75rem;
  border-radius: 6px;
  margin-left: 8px;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.status-text {
  font-weight: 500;
}
.separator {
  opacity: 0.4;
}
.queue-badge {
  color: #ffd166;
  background: rgba(255, 209, 102, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}
.action-btn {
  padding: 3px 10px;
  font-size: 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.action-btn:active {
  opacity: 0.8;
}
.bg-retry {
  background: var(--accent);
  color: #041027;
}
.bg-reconnect {
  background: var(--danger);
  color: white;
}
</style>
