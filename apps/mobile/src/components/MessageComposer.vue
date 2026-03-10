<template>
  <div class="composer-container">
    <textarea
      ref="textareaRef"
      v-model="draft"
      rows="2"
      placeholder="Type a message..."
      :disabled="disabled"
      enterkeyhint="send"
      @input="noteTyping"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false; noteTyping()"
      @blur="stopTyping"
      @keydown.enter.exact.prevent="handleEnter"
    ></textarea>
    <div class="actions">
      <input
        ref="fileInputRef"
        class="hidden-file-input"
        type="file"
        :disabled="disabled"
        accept="image/*,video/*,.txt,.md,.json,.log,.csv,.yaml,.yml,.xml,text/plain,text/markdown,application/json,application/xml,text/csv,text/xml"
        @change="handleFileSelection"
      />
      <button
        type="button"
        class="action-btn"
        :disabled="disabled"
        @click="openFilePicker"
      >
        +
      </button>
      <button
        type="button"
        class="action-btn"
        :disabled="disabled"
        @click="showGifPicker = true"
      >
        GIF
      </button>
      <button
        type="button"
        class="send-btn"
        :disabled="disabled || !draft.trim()"
        @click="send"
      >
        Send
      </button>
    </div>
  </div>

  <GifPicker
    :visible="showGifPicker"
    @close="showGifPicker = false"
    @select="handleGifSelect"
  />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { GifResult } from '@penthouse/contracts';
import GifPicker from './GifPicker.vue';

const props = defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', content: string): void;
  (e: 'send-media', file: File): void;
  (e: 'send-gif', gif: GifResult): void;
  (e: 'typing-start'): void;
  (e: 'typing-stop'): void;
}>();

const draft = ref('');
const isComposing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const typingActive = ref(false);
const showGifPicker = ref(false);
const TYPING_IDLE_MS = 5000;
let typingStopTimer: ReturnType<typeof setTimeout> | null = null;

function clearTypingStopTimer() {
  if (!typingStopTimer) return;
  clearTimeout(typingStopTimer);
  typingStopTimer = null;
}

function stopTyping() {
  clearTypingStopTimer();
  if (!typingActive.value) return;
  typingActive.value = false;
  emit('typing-stop');
}

function scheduleTypingStop() {
  clearTypingStopTimer();
  typingStopTimer = setTimeout(() => {
    stopTyping();
  }, TYPING_IDLE_MS);
}

function noteTyping() {
  if (props.disabled || !draft.value.trim()) {
    stopTyping();
    return;
  }

  if (!typingActive.value) {
    typingActive.value = true;
    emit('typing-start');
  }

  scheduleTypingStop();
}

function clearDraft() {
  draft.value = '';
  if (textareaRef.value) {
    textareaRef.value.value = '';
  }
}

function send() {
  if (isComposing.value) return;

  const content = draft.value.trim();
  if (!content) return;
  emit('send', content);
  stopTyping();
  clearDraft();
  void nextTick(() => {
    clearDraft();
  });
}

function openFilePicker(): void {
  if (props.disabled) return;
  fileInputRef.value?.click();
}

function handleFileSelection(event: Event): void {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  emit('send-media', file);
  if (input) {
    input.value = '';
  }
}

function handleGifSelect(gif: GifResult): void {
  showGifPicker.value = false;
  emit('send-gif', gif);
}

function handleEnter(e: KeyboardEvent) {
  // Shift+Enter for newline, Enter to send
  if (!e.shiftKey && !isComposing.value) {
    send();
  }
}

watch(draft, () => {
  if (!draft.value.trim()) {
    stopTyping();
  }
});

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      stopTyping();
    }
  }
);

onBeforeUnmount(() => {
  stopTyping();
});
</script>

<style scoped>
.composer-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: var(--panel-2);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

textarea {
  flex: 1;
  min-width: 0;
  width: auto;
  resize: none;
  background: rgba(15, 18, 34, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 14px;
  border-radius: 16px;
  font-family: inherit;
  color: var(--text);
  line-height: 1.4;
}

textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.send-btn {
  height: 44px;
  padding: 0 20px;
  width: auto;
  flex-shrink: 0;
  border-radius: 16px;
  background: var(--accent);
  color: #041027;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
}

.action-btn {
  height: 44px;
  min-width: 44px;
  width: auto;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-weight: 700;
}

.action-btn:disabled {
  opacity: 0.5;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 760px) {
  .composer-container {
    gap: 8px;
    padding: 10px;
  }

  .actions {
    gap: 6px;
  }

  .action-btn {
    min-width: 40px;
    padding: 0 10px;
  }

  .send-btn {
    padding: 0 14px;
  }
}

@media (max-width: 400px) {
  .composer-container {
    gap: 8px;
    padding: 8px;
  }
  textarea {
    padding: 8px 10px;
  }
  .actions {
    gap: 4px;
  }
  .action-btn {
    height: 40px;
    min-width: 40px;
    padding: 0 8px;
  }
  .send-btn {
    height: 40px;
    padding: 0 16px;
  }
}
</style>
