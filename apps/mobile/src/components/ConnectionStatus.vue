<template>
  <div class="conn-status" :class="statusClass">
    <div class="conn-status-header">
      <div class="indicator" :class="{ pulsing: isReconnecting }"></div>
      <span class="small status-container">
        <span class="status-text">{{ statusText }}</span>
        <template v-if="queuedCount > 0">
          <span class="separator">•</span>
          <span class="queue-badge">{{ queuedCount }} queued</span>
          <button v-if="hasNetwork && !isConnected" class="action-btn bg-retry" @click="$emit('flush')">Retry sends</button>
        </template>
        <template v-if="realtimeState === 'failed' && !isReconnecting">
          <span class="separator">•</span>
          <button class="action-btn bg-reconnect" @click="$emit('reconnect')">Try reconnect</button>
        </template>
        
        <button v-if="debugEnabled" class="debug-toggle" :class="{ active: showDiagnostics }" type="button" @click="showDiagnostics = !showDiagnostics">
          Debug
        </button>
      </span>
    </div>

    <div v-if="debugEnabled && showDiagnostics" class="diagnostic-panel">
      <div class="diag-content">
        <div class="diag-row">
          <span class="diag-label">State</span>
          <span class="diag-value highlight-val">{{ realtimeState }}</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">Transport</span>
          <span class="diag-value">{{ diagnostics.transport }}</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">Fallback</span>
          <span class="diag-value" :class="{'warn-val': diagnostics.fallbackActive}">{{ diagnostics.fallbackActive ? 'Active' : 'No' }}</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">Last Error</span>
          <span class="diag-value" :class="{'error-val': diagnostics.lastError}">{{ diagnostics.lastError || 'None' }}</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">Disconnect</span>
          <span class="diag-value" :class="{'error-val': diagnostics.lastDisconnectReason}">{{ diagnostics.lastDisconnectReason || 'None' }}</span>
        </div>
        <div class="diag-row">
          <span class="diag-label">Connected</span>
          <span class="diag-value time-val">{{ formatTime(diagnostics.lastConnectedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { RealtimeDiagnostics, RealtimeState } from '../types';

const props = defineProps<{
  realtimeState: RealtimeState;
  hasNetwork: boolean;
  queuedCount: number;
  diagnostics: RealtimeDiagnostics;
  debugEnabled?: boolean;
}>();

defineEmits<{
  (e: 'flush'): void;
  (e: 'reconnect'): void;
}>();

const showDiagnostics = ref(false);
const isConnected = computed(() => props.realtimeState === 'connected');
const isReconnecting = computed(() => props.realtimeState === 'connecting');

const statusClass = computed(() => {
  if (!props.hasNetwork) return 'danger';
  if (props.realtimeState === 'connecting' || props.realtimeState === 'degraded') return 'warning';
  if (props.realtimeState === 'failed') return 'danger';
  if (props.realtimeState === 'connected') return 'ok';
  return 'warning';
});

const statusText = computed(() => {
  if (!props.hasNetwork) return 'Offline';
  if (props.realtimeState === 'connecting') return 'Reconnecting...';
  if (props.realtimeState === 'failed') return 'Reconnect failed';
  if (props.realtimeState === 'connected') return 'Connected';
  return 'Realtime offline';
});

const formatTime = (ts: string | number | null | undefined) => {
  if (!ts) return 'Never';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch (err) {
    return String(ts);
  }
};
</script>

<style scoped>
.conn-status {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
  max-width: min(100%, 320px);
  min-width: 0;
  flex-shrink: 1;
}

.conn-status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
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

.status-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.status-text {
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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
  width: auto;
  min-width: 0;
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

.debug-toggle {
  margin-left: auto;
  padding: 3px 8px;
  font-size: 0.7rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  width: auto;
}
.debug-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}
.debug-toggle.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.diagnostic-panel {
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.diag-content {
  display: grid;
  grid-template-columns: max-content 1fr;
  row-gap: 6px;
  column-gap: 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  line-height: 1.4;
}

.diag-row {
  display: contents;
}

.diag-label, .diag-value {
  align-self: start;
}

.diag-label {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.diag-value {
  color: rgba(255, 255, 255, 0.8);
  word-break: break-word;
  overflow-wrap: anywhere;
  text-align: right;
  display: flex;
  justify-content: flex-end;
}

.warn-val { color: #ffd166; font-weight: 600; }
.error-val { color: var(--danger); }
.highlight-val { color: #fff; font-weight: 600; }
.time-val { color: rgba(255, 255, 255, 0.5); }

@media (max-width: 760px) {
  .conn-status {
    width: auto;
    max-width: min(46vw, 220px);
  }

  .conn-status-header {
    padding: 8px 10px;
  }

  .status-container {
    gap: 4px;
    flex-wrap: nowrap;
  }

  .status-text {
    min-width: 0;
    max-width: 100%;
  }
}
</style>
