<template>
  <div class="conn-status" :class="statusClass">
    <div class="indicator" :class="{ pulsing: isReconnecting }"></div>
    <span class="small">
      {{ statusText }}
      <template v-if="queuedCount > 0">
        • {{ queuedCount }} queued
        <button v-if="isOnline && !hasPermanentError && !isReconnecting" class="tiny-btn" @click="$emit('flush')">Retry</button>
      </template>
      <template v-if="hasPermanentError && !isReconnecting">
        • <button class="tiny-btn" @click="$emit('reconnect')">Try reconnect</button>
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
</style>
