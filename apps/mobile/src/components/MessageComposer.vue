<template>
  <div class="composer-container">
    <textarea
      ref="textareaRef"
      :value="draft"
      rows="2"
      :placeholder="placeholderText"
      :disabled="disabled"
      enterkeyhint="send"
      @input="handleInput"
      @compositionstart="isComposing = true"
      @compositionend="handleCompositionEnd"
      @blur="stopTyping"
      @keydown.enter.exact.prevent="handleEnter"
    ></textarea>
    <div class="actions">
      <div class="media-actions">
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
      </div>
      <button type="button" class="send-btn" :disabled="disabled || !canSend" @click="send">
        Send
      </button>
    </div>
  </div>

  <GifPicker
    :visible="showGifPicker"
    :animate-gifs-automatically="props.animateGifsAutomatically"
    :reduced-data-mode="props.reducedDataMode"
    @close="showGifPicker = false"
    @select="handleGifSelect"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { GifResult } from '@penthouse/contracts';
import GifPicker from './GifPicker.vue';

const props = withDefaults(defineProps<{
  chatId?: string;
  disabled: boolean;
  placeholder?: string;
  animateGifsAutomatically?: boolean;
  reducedDataMode?: boolean;
}>(), {
  placeholder: 'Type a message...',
  animateGifsAutomatically: true,
  reducedDataMode: false
});

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
const TYPING_REFRESH_MS = 2000;
let typingStopTimer: ReturnType<typeof setTimeout> | null = null;
let lastTypingEmitAt = 0;
const canSend = computed(() => draft.value.trim().length > 0);
const placeholderText = computed(() => props.placeholder || 'Type a message...');

function clearTypingStopTimer() {
  if (!typingStopTimer) return;
  clearTimeout(typingStopTimer);
  typingStopTimer = null;
}

function stopTyping() {
  clearTypingStopTimer();
  if (!typingActive.value) return;
  typingActive.value = false;
  lastTypingEmitAt = 0;
  emit('typing-stop');
}

function scheduleTypingStop() {
  clearTypingStopTimer();
  typingStopTimer = setTimeout(() => {
    stopTyping();
  }, TYPING_IDLE_MS);
}

function noteTyping() {
  if (props.disabled || !canSend.value) {
    stopTyping();
    return;
  }

  const now = Date.now();
  if (!typingActive.value || now - lastTypingEmitAt >= TYPING_REFRESH_MS) {
    typingActive.value = true;
    lastTypingEmitAt = now;
    emit('typing-start');
  }

  scheduleTypingStop();
}

function clearDraft() {
  draft.value = '';
}

function resetComposerState() {
  clearTypingStopTimer();
  typingActive.value = false;
  lastTypingEmitAt = 0;
  isComposing.value = false;
  draft.value = '';
  showGifPicker.value = false;
}

function send() {
  if (isComposing.value) return;

  const content = draft.value.trim();
  if (!content) return;
  emit('send', content);
  stopTyping();
  clearDraft();
  void nextTick(() => {
    textareaRef.value?.focus();
  });
}

function handleInput(event: Event) {
  const nextValue = (event.target as HTMLTextAreaElement | null)?.value ?? '';
  draft.value = nextValue;
  noteTyping();
}

function handleCompositionEnd(event: CompositionEvent) {
  isComposing.value = false;
  const nextValue = (event.target as HTMLTextAreaElement | null)?.value ?? draft.value;
  draft.value = nextValue;
  noteTyping();
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
  // Template uses `@keydown.enter.exact`, so only plain Enter reaches here.
  if (!isComposing.value) {
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

watch(
  () => props.chatId,
  (nextChatId, previousChatId) => {
    if (nextChatId === previousChatId) return;
    resetComposerState();
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
  align-items: center;
  margin: 0 4px 16px;
  padding: 6px 10px;
  border-radius: 40px;
  background: rgba(48, 51, 88, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  width: auto;
  min-width: 0;
}

textarea {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  resize: none;
  background: transparent;
  border: none;
  padding: 12px 16px;
  font-family: inherit;
  color: #fff;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.4;
}

textarea:focus {
  outline: none;
}
textarea::placeholder {
  color: #888;
}

.send-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 22px;
  background: rgba(129, 140, 248, 0.8);
  border: 2px solid rgba(165, 180, 252, 0.5);
  color: #fff;
  font-size: 0; /* Hide 'Send' text */
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(129, 140, 248, 0.3);
  transition: transform 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn::after {
  content: '↑';
  font-size: 1.2rem;
  font-weight: bold;
}

.send-btn:active {
  transform: scale(0.9);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
  max-width: 100%;
}

.media-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}

.action-btn {
  height: 44px;
  min-width: 44px;
  width: auto;
  padding: 0 16px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn:active {
  transform: scale(0.95);
}

.hidden-file-input {
  display: none;
}

@media (max-width: 760px) {
  .composer-container {
    gap: 8px;
    padding: 6px 8px;
    margin: 0 0 12px;
  }
  .action-btn {
    height: 38px;
    min-width: 38px;
    padding: 0 8px;
    border-radius: 19px;
  }
  .send-btn {
    height: 38px;
    width: 38px;
    border-radius: 19px;
  }
  .send-btn::after {
    font-size: 1.1rem;
  }
  textarea {
    padding: 8px 10px;
    font-size: 0.95rem;
  }
}

.action-btn:disabled {
  opacity: 0.5;
}

@media (max-width: 400px) {
  .composer-container {
    gap: 6px;
    padding: 4px 6px;
  }
  textarea {
    padding: 6px 8px;
  }
  .action-btn {
    height: 34px;
    min-width: 34px;
    border-radius: 17px;
    padding: 0 6px;
  }
  .send-btn {
    height: 34px;
    width: 34px;
    border-radius: 17px;
  }
}
</style>
