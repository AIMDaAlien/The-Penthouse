<template>
  <div v-if="toasts.length > 0" class="toast-host" aria-live="polite" aria-atomic="false">
    <article
      v-for="toast in toasts"
      :key="toast.id"
      class="toast-card"
      :class="toast.tone ? `tone-${toast.tone}` : 'tone-neutral'"
      role="status"
    >
      <div class="toast-copy">
        <p v-if="toast.eyebrow" class="toast-eyebrow">{{ toast.eyebrow }}</p>
        <strong class="toast-title">{{ toast.title }}</strong>
        <p v-if="toast.message" class="toast-message">{{ toast.message }}</p>
      </div>
      <div class="toast-actions">
        <button
          v-if="toast.actionLabel"
          type="button"
          class="toast-action"
          @click="$emit('action', toast.id)"
        >
          {{ toast.actionLabel }}
        </button>
        <button type="button" class="toast-dismiss" aria-label="Dismiss notice" @click="$emit('dismiss', toast.id)">
          x
        </button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  toasts: Array<{
    id: string;
    title: string;
    message?: string;
    eyebrow?: string;
    actionLabel?: string;
    tone?: 'neutral' | 'accent';
  }>;
}>();

defineEmits<{
  (e: 'dismiss', id: string): void;
  (e: 'action', id: string): void;
}>();
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: max(16px, calc(env(safe-area-inset-top) + 10px));
  left: 50%;
  z-index: 55;
  width: min(calc(100vw - 24px), 420px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transform: translateX(-50%);
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(8, 12, 26, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.tone-accent {
  border-color: rgba(140, 216, 255, 0.26);
  box-shadow: 0 18px 40px rgba(7, 20, 42, 0.34);
}

.toast-copy {
  flex: 1;
  min-width: 0;
}

.toast-eyebrow,
.toast-title,
.toast-message {
  margin: 0;
}

.toast-eyebrow {
  margin-bottom: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.toast-title {
  display: block;
  line-height: 1.3;
}

.toast-message {
  margin-top: 4px;
  color: var(--muted);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.toast-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.toast-action,
.toast-dismiss {
  width: auto;
  min-width: 40px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
}

.toast-action {
  background: rgba(140, 216, 255, 0.14);
  border-color: rgba(140, 216, 255, 0.18);
  color: var(--accent);
}

.toast-dismiss {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

@media (max-width: 760px) {
  .toast-host {
    width: min(calc(100vw - 20px), 420px);
  }

  .toast-card {
    padding: 12px;
  }

  .toast-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .toast-action,
  .toast-dismiss {
    min-height: 38px;
  }
}
</style>
