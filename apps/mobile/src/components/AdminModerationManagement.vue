<template>
  <div class="admin-moderation-page">
    <div class="moderation-heading">
      <div>
        <h2>Moderation</h2>
        <p class="small">Hide or restore messages with a recorded reason. Member chat views receive tombstones while the audit panel keeps original content visible here.</p>
      </div>
      <button type="button" class="secondary small-btn" :disabled="loading || loadingChats" @click="handleRefresh">
        {{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <section class="card moderation-toolbar list">
      <label class="small section-label" for="moderation-chat-select">Chat audit view</label>
      <select
        id="moderation-chat-select"
        v-model="selectedChatId"
        class="moderation-chat-select"
        :disabled="loadingChats || loading || chats.length === 0"
      >
        <option v-if="loadingChats" value="">Loading chats...</option>
        <option v-else-if="chats.length === 0" value="">No chats available</option>
        <option v-for="chat in chats" :key="chat.id" :value="chat.id">{{ chat.name }}</option>
      </select>
      <p class="small">Admins can browse all chats here, including direct messages. Realtime members still see tombstones immediately after moderation.</p>
    </section>

    <div v-if="loading && !messages.length" class="card moderation-empty small">Loading moderation history...</div>
    <p v-else-if="error && !messages.length" class="status-danger small">{{ error }}</p>

    <section v-else class="card moderation-list list">
      <div class="moderation-summary">
        <div>
          <p class="small section-label">Loaded messages</p>
          <strong>{{ messages.length }}</strong>
        </div>
        <p v-if="selectedChatName" class="small">Audit view for {{ selectedChatName }}</p>
      </div>

      <p v-if="error" class="status-danger small">{{ error }}</p>
      <p v-if="success" class="status-success small">{{ success }}</p>
      <p v-if="!selectedChatId" class="small">Select a chat to inspect message history.</p>
      <p v-else-if="!loading && messages.length === 0" class="small">No messages found in this chat yet.</p>

      <article v-for="message in messages" :key="message.id" class="moderation-message-row">
        <div class="moderation-message-head">
          <div>
            <div class="moderation-primary-line">
              <strong>{{ message.senderDisplayName || message.senderUsername || message.senderId.slice(0, 8) }}</strong>
              <span class="status-chip" :class="statusChipClass(message.senderStatus)">{{ message.senderStatus }}</span>
              <span v-if="message.hidden" class="status-chip hidden-chip">hidden from members</span>
              <span v-if="message.moderation.hiddenByModeration" class="status-chip moderated-chip">moderated</span>
            </div>
            <p class="small moderation-meta-line">
              {{ formatDateTime(message.createdAt) }}
              <span v-if="message.senderUsername">- @{{ message.senderUsername }}</span>
            </p>
          </div>

          <button
            type="button"
            class="small-btn"
            :class="message.moderation.hiddenByModeration ? 'secondary' : 'danger'"
            :disabled="busyMessageId === message.id"
            @click="beginAction(message.id, message.moderation.hiddenByModeration ? 'unhide' : 'hide')"
          >
            {{
              busyMessageId === message.id
                ? 'Saving...'
                : message.moderation.hiddenByModeration
                  ? 'Restore'
                  : 'Hide'
            }}
          </button>
        </div>

        <div class="moderation-message-body" :class="{ tombstone: message.hidden }">
          {{ message.content }}
        </div>

        <p v-if="message.moderation.latestAction" class="small moderation-latest-line">
          Latest {{ message.moderation.latestAction }}
          by {{ formatActorLabel(message) }}
          on {{ formatDateTime(message.moderation.latestCreatedAt || message.createdAt) }}
          <span v-if="message.moderation.latestReason">- {{ message.moderation.latestReason }}</span>
        </p>

        <form
          v-if="draft.messageId === message.id"
          class="moderation-action-form"
          @submit.prevent="submitAction(message.id)"
        >
          <label class="small" :for="`moderation-reason-${message.id}`">
            {{ draft.action === 'hide' ? 'Reason for hiding' : 'Reason for restoring' }}
          </label>
          <textarea
            :id="`moderation-reason-${message.id}`"
            v-model="draft.reason"
            rows="3"
            maxlength="500"
            placeholder="Enter a moderator reason"
          ></textarea>
          <div class="moderation-action-buttons">
            <button
              type="submit"
              class="form-btn"
              :disabled="busyMessageId === message.id || !draft.reason.trim()"
            >
              {{ draft.action === 'hide' ? 'Confirm hide' : 'Confirm restore' }}
            </button>
            <button type="button" class="secondary small-btn" :disabled="busyMessageId === message.id" @click="cancelAction">
              Cancel
            </button>
          </div>
        </form>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { AdminMessage, ChatSummary, ModerationAction } from '@penthouse/contracts';
import { getAdminChatMessages, getAdminChats, hideAdminMessage, unhideAdminMessage } from '../services/http';

const selectedChatId = ref('');
const chats = ref<ChatSummary[]>([]);
const loadingChats = ref(false);
const messages = ref<AdminMessage[]>([]);
const loading = ref(false);
const error = ref('');
const success = ref('');
const busyMessageId = ref<string | null>(null);
const draft = ref<{
  messageId: string | null;
  action: ModerationAction;
  reason: string;
}>({
  messageId: null,
  action: 'hide',
  reason: ''
});

const selectedChatName = computed(() =>
  chats.value.find((chat) => chat.id === selectedChatId.value)?.name ?? ''
);

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function statusChipClass(status: AdminMessage['senderStatus']): string {
  return `status-${status}`;
}

function formatActorLabel(message: AdminMessage): string {
  if (message.moderation.latestActorDisplayName) return message.moderation.latestActorDisplayName;
  if (message.moderation.latestActorUsername) return `@${message.moderation.latestActorUsername}`;
  if (message.moderation.latestActorUserId) return message.moderation.latestActorUserId.slice(0, 8);
  return 'unknown moderator';
}

function beginAction(messageId: string, action: ModerationAction): void {
  error.value = '';
  success.value = '';
  draft.value = {
    messageId,
    action,
    reason: ''
  };
}

function cancelAction(): void {
  draft.value = {
    messageId: null,
    action: 'hide',
    reason: ''
  };
}

async function loadMessages(): Promise<void> {
  if (!selectedChatId.value) {
    messages.value = [];
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    messages.value = await getAdminChatMessages(selectedChatId.value);
  } catch (nextError: any) {
    error.value = nextError?.response?.data?.error || 'Failed to load moderation history';
  } finally {
    loading.value = false;
  }
}

async function loadChats(): Promise<void> {
  loadingChats.value = true;
  error.value = '';
  try {
    chats.value = await getAdminChats();
    if (!chats.value.some((chat) => chat.id === selectedChatId.value)) {
      selectedChatId.value = chats.value[0]?.id ?? '';
    }
  } catch (nextError: any) {
    error.value = nextError?.response?.data?.error || 'Failed to load admin chat list';
    chats.value = [];
    selectedChatId.value = '';
  } finally {
    loadingChats.value = false;
  }
}

async function handleRefresh(): Promise<void> {
  await loadChats();
  await loadMessages();
}

async function submitAction(messageId: string): Promise<void> {
  const reason = draft.value.reason.trim();
  if (!reason) {
    error.value = 'Reason is required.';
    return;
  }

  busyMessageId.value = messageId;
  error.value = '';
  success.value = '';
  try {
    const nextSuccess = draft.value.action === 'hide' ? 'Message hidden.' : 'Message restored.';
    if (draft.value.action === 'hide') {
      await hideAdminMessage(messageId, reason);
    } else {
      await unhideAdminMessage(messageId, reason);
    }
    cancelAction();
    await loadMessages();
    success.value = nextSuccess;
  } catch (nextError: any) {
    error.value = nextError?.response?.data?.error || 'Failed to update moderation state';
  } finally {
    busyMessageId.value = null;
  }
}

watch(selectedChatId, () => {
  cancelAction();
  void loadMessages();
}, { immediate: true });

onMounted(() => {
  void loadChats();
});
</script>

<style scoped>
.admin-moderation-page {
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.moderation-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.moderation-heading h2,
.moderation-heading p {
  margin: 0;
}

.moderation-heading p {
  margin-top: 6px;
  max-width: 640px;
}

.section-label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.moderation-chat-select {
  width: 100%;
}

.moderation-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.moderation-summary p,
.moderation-summary strong {
  margin: 0;
}

.moderation-message-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.moderation-message-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.moderation-primary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.moderation-meta-line,
.moderation-latest-line {
  margin: 4px 0 0;
}

.moderation-message-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.moderation-message-body.tombstone {
  color: var(--muted);
  font-style: italic;
}

.moderation-action-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.moderation-action-buttons {
  display: flex;
  gap: 8px;
}

.hidden-chip {
  background: rgba(255, 184, 108, 0.12);
  color: #ffc078;
}

.moderated-chip {
  background: rgba(255, 140, 166, 0.12);
  color: var(--danger);
}

@media (max-width: 760px) {
  .admin-moderation-page {
    padding: 12px;
  }

  .moderation-heading,
  .moderation-message-head,
  .moderation-summary,
  .moderation-action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
