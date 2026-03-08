<template>
  <div class="composer-container">
    <textarea 
      ref="textareaRef"
      v-model="draft" 
      rows="2" 
      placeholder="Type a message..."
      :disabled="disabled"
      enterkeyhint="send"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
      @keydown.enter.exact.prevent="handleEnter"
    ></textarea>
    <div class="actions">
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
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';

defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', content: string): void;
}>();

const draft = ref('');
const isComposing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

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
  clearDraft();
  void nextTick(() => {
    clearDraft();
  });
}

function handleEnter(e: KeyboardEvent) {
  // Shift+Enter for newline, Enter to send
  if (!e.shiftKey && !isComposing.value) {
    send();
  }
}
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
}

textarea {
  flex: 1;
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
</style>
