<template>
  <div class="messages-container" ref="scrollRef" @scroll="emitViewportBottomChange">
    <div v-if="messages.length === 0" class="empty-state">
      <p class="small">No messages here yet. Be the first to say hello!</p>
    </div>

    <div class="messages">
      <div
        v-for="m in sortedMessages"
        :key="m.id"
        class="msg-bubble"
        :class="{
          sent: m.senderId === currentUserId,
          received: m.senderId !== currentUserId,
          queued: isLocalId(m.id),
          'media-bubble': isMediaBubble(m)
        }"
      >
        <div class="msg-meta small">
          <span v-if="m.senderId !== currentUserId" class="sender-name">{{ getSenderLabel(m) }}</span>
          <span class="timestamp">{{ formatTime(m.createdAt) }}</span>
          <span v-if="m.senderId === currentUserId && getLatencyLabel(m)" class="latency">{{ getLatencyLabel(m) }}</span>

          <template v-if="m.senderId === currentUserId">
            <span v-if="getDeliveryState(m) === 'delivered' && m.seenAt" class="status-indicator seen" title="Seen"> ✓✓</span>
            <span v-else-if="getDeliveryState(m) === 'delivered'" class="status-indicator success" title="Sent"> ✓</span>
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

        <button
          v-if="getMessageType(m) === 'image' || getMessageType(m) === 'gif'"
          type="button"
          class="media-tile"
          :style="getMediaStyle(m)"
          @click="openViewer(m)"
        >
          <img
            class="media-image"
            :src="getPreviewUrl(m)"
            :alt="getAttachmentLabel(m)"
            loading="lazy"
          />
        </button>

        <div v-else-if="getMessageType(m) === 'video'" class="media-block">
          <video
            class="media-video"
            :style="getMediaStyle(m)"
            controls
            preload="metadata"
            :src="getAttachmentUrl(m)"
          ></video>
        </div>

        <a
          v-else-if="getMessageType(m) === 'file'"
          class="file-card"
          :href="getAttachmentUrl(m)"
          target="_blank"
          rel="noreferrer"
        >
          <span class="file-chip small">{{ getFileBadge(m) }}</span>
          <strong>{{ getAttachmentLabel(m) }}</strong>
          <span class="small">{{ getFileContentType(m) }}</span>
        </a>

        <div v-else class="msg-content">{{ m.content }}</div>
      </div>
    </div>

    <div v-if="typingMembers.length > 0" class="typing-indicator">
      <div class="typing-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="small">{{ typingText }}</span>
    </div>

    <div v-if="viewer" class="media-viewer" @click.self="closeViewer">
      <div class="viewer-chrome">
        <button type="button" class="viewer-btn" @click="zoomOut">-</button>
        <button type="button" class="viewer-btn" @click="zoomIn">+</button>
        <button type="button" class="viewer-btn close-btn" @click="closeViewer">Close</button>
      </div>
      <div class="viewer-stage">
        <img
          :src="viewer.url"
          :alt="viewer.label"
          class="viewer-image"
          :style="{ transform: `scale(${viewer.scale})` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Message, MessageType } from '@penthouse/contracts';
import type { TypingParticipant } from '../types';
import { resolveMediaUrl } from '../services/http';

const props = defineProps<{
  messages: Message[];
  currentUserId: string;
  queuedIds?: string[];
  failedIds?: string[];
  latencyByClientMessageId?: Record<string, number>;
  typingMembers?: TypingParticipant[];
}>();

const emit = defineEmits<{
  (e: 'retry', clientMessageId: string): void;
  (e: 'viewport-bottom-change', isAtBottom: boolean): void;
}>();

const scrollRef = ref<HTMLElement | null>(null);
const viewer = ref<{ url: string; label: string; scale: number } | null>(null);

const sortedMessages = computed(() => [...props.messages].reverse());
const typingMembers = computed(() => props.typingMembers ?? []);

const typingText = computed(() => {
  const labels = typingMembers.value.map((member) => member.displayName || 'Someone');
  if (labels.length === 1) return `${labels[0]} is typing...`;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} are typing...`;
  return `${labels.length} people are typing...`;
});

watch(
  () => props.messages.length,
  async () => {
    const shouldStickToBottom = isNearBottom();
    await nextTick();
    if (scrollRef.value && shouldStickToBottom) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
    emitViewportBottomChange();
  }
);

function isNearBottom(): boolean {
  if (!scrollRef.value) return true;
  const distance = scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight;
  return distance < 32;
}

function emitViewportBottomChange(): void {
  emit('viewport-bottom-change', isNearBottom());
}

function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

function getSenderLabel(m: Message): string {
  if (m.senderDisplayName) return m.senderDisplayName;
  return m.senderUsername || m.senderId.slice(0, 8);
}

function getMetadataRecord(m: Message): Record<string, unknown> | null {
  return m.metadata && typeof m.metadata === 'object' && !Array.isArray(m.metadata)
    ? (m.metadata as Record<string, unknown>)
    : null;
}

function getMessageType(m: Message): MessageType {
  return m.type ?? 'text';
}

function getAttachmentUrl(m: Message): string {
  const metadata = getMetadataRecord(m);
  const rawUrl = typeof metadata?.url === 'string' ? metadata.url : '';
  return resolveMediaUrl(rawUrl);
}

function getPreviewUrl(m: Message): string {
  const metadata = getMetadataRecord(m);
  const previewUrl = typeof metadata?.previewUrl === 'string'
    ? metadata.previewUrl
    : typeof metadata?.url === 'string'
      ? metadata.url
      : '';
  return resolveMediaUrl(previewUrl);
}

function getAttachmentLabel(m: Message): string {
  const metadata = getMetadataRecord(m);
  if (typeof metadata?.originalFileName === 'string' && metadata.originalFileName.trim()) {
    return metadata.originalFileName;
  }
  if (typeof metadata?.title === 'string' && metadata.title.trim()) {
    return metadata.title;
  }
  return m.content;
}

function getFileBadge(m: Message): string {
  const metadata = getMetadataRecord(m);
  const contentType = typeof metadata?.contentType === 'string' ? metadata.contentType : '';
  if (contentType.startsWith('text/')) return 'Text';
  if (contentType === 'application/json') return 'JSON';
  return 'File';
}

function getFileContentType(m: Message): string {
  const metadata = getMetadataRecord(m);
  return typeof metadata?.contentType === 'string' && metadata.contentType
    ? metadata.contentType
    : 'Attachment';
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

function getLatencyLabel(m: Message): string {
  if (!m.clientMessageId) return '';
  const ms = props.latencyByClientMessageId?.[m.clientMessageId];
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
  return `${Math.max(0, Math.round(ms))}ms`;
}

function getMediaDimensions(m: Message): { width: number; height: number } {
  const metadata = getMetadataRecord(m);
  const rawWidth = typeof metadata?.width === 'number' ? metadata.width : null;
  const rawHeight = typeof metadata?.height === 'number' ? metadata.height : null;
  const viewportWidth = Math.max(320, globalThis.innerWidth || 360);
  const maxWidth = Math.min(Math.round(viewportWidth * 0.62), 260);
  const maxHeight = 320;

  if (rawWidth && rawHeight && rawWidth > 0 && rawHeight > 0) {
    const aspectRatio = rawWidth / rawHeight;
    let width = maxWidth;
    let height = Math.round(width / aspectRatio);

    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }

    width = Math.max(140, width);
    height = Math.max(120, height);
    return { width, height };
  }

  return { width: maxWidth, height: Math.min(Math.round(maxWidth * 0.75), 220) };
}

function getMediaStyle(m: Message): Record<string, string> {
  const { width, height } = getMediaDimensions(m);
  return {
    width: `${width}px`,
    height: `${height}px`
  };
}

function isMediaBubble(m: Message): boolean {
  const type = getMessageType(m);
  return type === 'image' || type === 'video' || type === 'gif';
}

function openViewer(m: Message): void {
  const url = getAttachmentUrl(m);
  if (!url) return;
  viewer.value = {
    url,
    label: getAttachmentLabel(m),
    scale: 1
  };
}

function closeViewer(): void {
  viewer.value = null;
}

function zoomIn(): void {
  if (!viewer.value) return;
  viewer.value = {
    ...viewer.value,
    scale: Math.min(3, Number((viewer.value.scale + 0.25).toFixed(2)))
  };
}

function zoomOut(): void {
  if (!viewer.value) return;
  viewer.value = {
    ...viewer.value,
    scale: Math.max(0.75, Number((viewer.value.scale - 0.25).toFixed(2)))
  };
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && viewer.value) {
    closeViewer();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
    emitViewportBottomChange();
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.messages-container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
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
  margin-top: auto;
  min-height: 0;
  min-width: 0;
}

.empty-state {
  margin: auto;
  opacity: 0.6;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px 2px;
  opacity: 0.75;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing-bounce 1s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.msg-bubble {
  max-width: min(85%, 320px);
  min-width: 0;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.msg-bubble.media-bubble {
  padding: 4px;
}

.msg-bubble.sent {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(114, 214, 255, 0.15), rgba(121, 166, 255, 0.15));
  border: 1px solid rgba(135, 206, 250, 0.3);
  border-bottom-right-radius: 4px;
}

.msg-bubble.received {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 4px;
}

.msg-bubble.queued {
  opacity: 0.6;
  border-style: dashed;
}

.msg-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
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

.media-block {
  display: flex;
  flex-direction: column;
}

.media-tile {
  padding: 0;
  width: auto;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  overflow: hidden;
}

.media-image,
.media-video {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  display: block;
  background: rgba(0, 0, 0, 0.25);
  object-fit: cover;
}

.file-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.file-chip {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(114, 214, 255, 0.15);
  color: var(--accent);
}

.status-indicator {
  margin-left: 2px;
}

.latency {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.seen {
  color: var(--accent);
}

.retry-btn {
  background: none;
  border: none;
  width: auto;
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

.media-viewer {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(4, 8, 18, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 16px;
}

.viewer-chrome {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  z-index: 61;
}

.viewer-btn {
  width: auto;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.viewer-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  transform-origin: center center;
  transition: transform 0.12s ease-out;
}

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
