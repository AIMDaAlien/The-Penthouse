<template>
  <div class="conn-status" :class="isOnline ? 'ok' : 'danger'">
    <div class="indicator"></div>
    <span class="small">
      {{ isOnline ? 'Connected' : 'Offline' }}
      <template v-if="queuedCount > 0">
        • {{ queuedCount }} queued
        <button v-if="isOnline" class="tiny-btn" @click="$emit('flush')">Retry</button>
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOnline: boolean;
  queuedCount: number;
}>();

defineEmits<{
  (e: 'flush'): void;
}>();
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
.danger { color: var(--danger); }
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
