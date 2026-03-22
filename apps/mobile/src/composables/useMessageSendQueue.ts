import { ref, watch, type Ref } from 'vue';
import type { GifResult, MessageMetadata, MessageType, UploadResponse } from '@penthouse/contracts';
import type { Chat, ChatMessage, PendingMessage, Session } from '../types';
import type { ProvisionalDirectChat } from './useChatState';
import { sendMessage, uploadMedia } from '../services/http';
import {
  clearQueued,
  enqueueMessage,
  flushQueue,
  getQueued,
  removeQueued
} from '../services/offlineQueue';
import { withBackoff } from '../services/retry';

type MediaDimensions = {
  width: number | null;
  height: number | null;
};

type UseMessageSendQueueOptions = {
  session: Ref<Session | null>;
  selectedChatId: Ref<string>;
  provisionalDirectChat: Ref<ProvisionalDirectChat | null>;
  messages: Ref<ChatMessage[]>;
  chatActionError: Ref<string>;
  ensureDirectChatResolved: (memberId: string) => Promise<Chat | null>;
  markDirectChatUnavailable: (chatId: string) => void;
  cacheMessagesForActiveUser: (chatId: string, nextMessages: ChatMessage[]) => void;
};

const QUEUE_SCOPE_CHANGED_ERROR = 'queue_scope_changed';

export function useMessageSendQueue(options: UseMessageSendQueueOptions) {
  let queueSessionVersion = 0;

  function activeQueueScope(): string | null {
    return options.session.value?.user.id ?? null;
  }

  function invalidateQueueSession(): void {
    queueSessionVersion += 1;
  }

  function isQueueScopeCurrent(scopeKey: string | null, sessionVersion: number): scopeKey is string {
    return Boolean(scopeKey) && scopeKey === activeQueueScope() && sessionVersion === queueSessionVersion;
  }

  function isQueueScopeChangedError(error: unknown): boolean {
    return error instanceof Error && error.message === QUEUE_SCOPE_CHANGED_ERROR;
  }

  function readActiveQueue(): PendingMessage[] {
    const scopeKey = activeQueueScope();
    return scopeKey ? getQueued(scopeKey) : [];
  }

  const uploadingAttachment = ref(false);
  const queued = ref<PendingMessage[]>(readActiveQueue());
  const failedMessageIds = ref<Set<string>>(new Set(readActiveQueue().map((item) => item.clientMessageId)));
  const latencyByClientMessageId = ref<Record<string, number>>({});

  function syncQueuedState(resetLatency = false): void {
    const nextQueued = readActiveQueue();
    queued.value = nextQueued;
    failedMessageIds.value = new Set(nextQueued.map((item) => item.clientMessageId));
    if (resetLatency) {
      latencyByClientMessageId.value = {};
    }
  }

  async function deliverPendingItem(
    item: PendingMessage,
    scopeKey: string,
    sessionVersion: number,
    alreadyQueued: boolean
  ) {
    try {
      const response = await withBackoff(() => {
        if (!isQueueScopeCurrent(scopeKey, sessionVersion)) {
          throw new Error(QUEUE_SCOPE_CHANGED_ERROR);
        }
        return dispatchPendingMessage(item);
      });

      if (!isQueueScopeCurrent(scopeKey, sessionVersion)) {
        if (alreadyQueued) {
          removeQueued(item.clientMessageId, scopeKey);
        }
        return null;
      }

      return response;
    } catch (error) {
      if (isQueueScopeChangedError(error)) {
        // Scope changed (logout or user switch) while this send was in-flight.
        // Do NOT re-enqueue: the old scope's queue was intentionally cleared.
        return null;
      }

      throw error;
    }
  }

  function generateClientMessageId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function buildPendingMessage(
    chatId: string,
    content: string,
    type: MessageType,
    metadata: MessageMetadata | null,
    clientMessageId = generateClientMessageId()
  ): PendingMessage {
    return {
      chatId,
      content,
      type,
      metadata,
      clientMessageId,
      enqueuedAt: new Date().toISOString(),
      attempts: 0
    };
  }

  function addOptimisticMessage(item: PendingMessage): void {
    options.messages.value.unshift({
      id: item.clientMessageId,
      chatId: item.chatId,
      senderId: options.session.value?.user.id ?? 'me',
      senderUsername: options.session.value?.user.username ?? 'me',
      senderDisplayName:
        options.session.value?.user.displayName ?? options.session.value?.user.username ?? 'me',
      senderAvatarUrl: options.session.value?.user.avatarUrl ?? null,
      content: item.content,
      type: item.type,
      metadata: item.metadata ?? null,
      createdAt: item.enqueuedAt,
      clientMessageId: item.clientMessageId
    });
    options.cacheMessagesForActiveUser(item.chatId, options.messages.value);
  }

  function removeOptimisticMessage(chatId: string, clientMessageId: string): void {
    options.messages.value = options.messages.value.filter(
      (message) => !(message.chatId === chatId && message.clientMessageId === clientMessageId)
    );
    options.cacheMessagesForActiveUser(chatId, options.messages.value);
  }

  function isUnavailableDirectMessageError(error: any): boolean {
    return error?.response?.status === 409 && error?.response?.data?.error === 'Direct message is unavailable';
  }

  async function dispatchPendingMessage(item: PendingMessage) {
    return sendMessage(
      item.chatId,
      item.content,
      item.clientMessageId,
      item.type,
      item.metadata ?? null
    );
  }

  function markMessageDelivered(
    chatId: string,
    clientMessageId: string,
    messageId: string,
    latencyMs?: number
  ): void {
    const existingMsg = options.messages.value.find(
      (message) => message.clientMessageId === clientMessageId && message.chatId === chatId
    );
    if (existingMsg) {
      existingMsg.id = messageId;
      options.cacheMessagesForActiveUser(chatId, options.messages.value);
    }

    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs) && latencyMs >= 0) {
      latencyByClientMessageId.value = {
        ...latencyByClientMessageId.value,
        [clientMessageId]: Math.round(latencyMs)
      };
    }

    failedMessageIds.value.delete(clientMessageId);
    const scopeKey = activeQueueScope();
    if (scopeKey) {
      removeQueued(clientMessageId, scopeKey);
      queued.value = getQueued(scopeKey);
    } else {
      queued.value = [];
    }
  }

  function handleUnavailableDirectMessage(
    chatId: string,
    clientMessageId: string,
    error: any,
    scopeKey: string | null = activeQueueScope()
  ): void {
    if (scopeKey) {
      removeQueued(clientMessageId, scopeKey);
    }

    if (scopeKey === activeQueueScope()) {
      removeOptimisticMessage(chatId, clientMessageId);
      options.markDirectChatUnavailable(chatId);
      options.chatActionError.value = error?.response?.data?.error || 'Direct message is unavailable';
      queued.value = readActiveQueue();
      failedMessageIds.value.delete(clientMessageId);
    }
  }

  async function sendOrQueue(pendingItem: PendingMessage): Promise<void> {
    const scopeKey = activeQueueScope();
    if (!scopeKey) return;
    const sessionVersion = queueSessionVersion;

    try {
      const startedAt = Date.now();
      const response = await deliverPendingItem(pendingItem, scopeKey, sessionVersion, false);
      if (!response) {
        return;
      }

      markMessageDelivered(
        response.message.chatId,
        pendingItem.clientMessageId,
        response.message.id,
        Date.now() - startedAt
      );
    } catch (error: any) {
      if (isUnavailableDirectMessageError(error)) {
        handleUnavailableDirectMessage(pendingItem.chatId, pendingItem.clientMessageId, error, scopeKey);
        return;
      }

      enqueueMessage(pendingItem, scopeKey);
      if (isQueueScopeCurrent(scopeKey, sessionVersion)) {
        queued.value = readActiveQueue();
        failedMessageIds.value.add(pendingItem.clientMessageId);
      }
    }
  }

  async function retrySpecificMessage(clientMessageId: string): Promise<void> {
    const scopeKey = activeQueueScope();
    if (!scopeKey) return;
    const queuedItem = readActiveQueue().find((item) => item.clientMessageId === clientMessageId);
    if (!queuedItem) return;
    const sessionVersion = queueSessionVersion;

    failedMessageIds.value.delete(clientMessageId);
    try {
      const startedAt = Date.now();
      const response = await deliverPendingItem(queuedItem, scopeKey, sessionVersion, true);
      if (!response) {
        return;
      }

      markMessageDelivered(
        response.message.chatId,
        clientMessageId,
        response.message.id,
        Date.now() - startedAt
      );
    } catch (error: any) {
      if (isUnavailableDirectMessageError(error)) {
        handleUnavailableDirectMessage(queuedItem.chatId, clientMessageId, error, scopeKey);
        return;
      }

      if (isQueueScopeCurrent(scopeKey, sessionVersion)) {
        failedMessageIds.value.add(clientMessageId);
      }
    }
  }

  async function sendCurrent(content: string): Promise<void> {
    if (!options.selectedChatId.value && options.provisionalDirectChat.value) {
      const resolvedChat = await options.ensureDirectChatResolved(options.provisionalDirectChat.value.memberId);
      if (!resolvedChat) return;
    }

    if (!options.selectedChatId.value) return;
    options.chatActionError.value = '';

    const pendingItem = buildPendingMessage(options.selectedChatId.value, content, 'text', null);
    addOptimisticMessage(pendingItem);
    await sendOrQueue(pendingItem);
  }

  function mediaTypeFromUpload(upload: UploadResponse): MessageType {
    if (upload.mediaKind === 'image') return 'image';
    if (upload.mediaKind === 'video') return 'video';
    return 'file';
  }

  function metadataFromUpload(upload: UploadResponse, dimensions?: MediaDimensions): MessageMetadata {
    return {
      uploadId: upload.id,
      url: upload.url,
      originalFileName: upload.originalFileName,
      fileName: upload.fileName,
      contentType: upload.contentType ?? null,
      mediaKind: upload.mediaKind,
      size: upload.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null
    };
  }

  function metadataFromGif(gif: GifResult): MessageMetadata {
    return {
      provider: gif.provider,
      url: gif.url,
      previewUrl: gif.previewUrl,
      renderMode: gif.renderMode,
      title: gif.title ?? `${gif.provider.toUpperCase()} GIF`,
      width: gif.width ?? null,
      height: gif.height ?? null
    };
  }

  async function measureImageDimensions(file: File): Promise<MediaDimensions> {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        resolve({
          width: Number.isFinite(image.naturalWidth) ? image.naturalWidth : null,
          height: Number.isFinite(image.naturalHeight) ? image.naturalHeight : null
        });
        URL.revokeObjectURL(objectUrl);
      };

      image.onerror = () => {
        resolve({ width: null, height: null });
        URL.revokeObjectURL(objectUrl);
      };

      image.src = objectUrl;
    });
  }

  async function measureVideoDimensions(file: File): Promise<MediaDimensions> {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute('src');
        video.load();
      };

      video.onloadedmetadata = () => {
        resolve({
          width: Number.isFinite(video.videoWidth) ? video.videoWidth : null,
          height: Number.isFinite(video.videoHeight) ? video.videoHeight : null
        });
        cleanup();
      };

      video.onerror = () => {
        resolve({ width: null, height: null });
        cleanup();
      };

      video.src = objectUrl;
    });
  }

  async function deriveUploadDimensions(file: File, upload: UploadResponse): Promise<MediaDimensions> {
    try {
      if (upload.mediaKind === 'image') {
        return await measureImageDimensions(file);
      }

      if (upload.mediaKind === 'video') {
        return await measureVideoDimensions(file);
      }
    } catch {
      // Fall through to null dimensions when the browser/runtime cannot probe media metadata.
    }

    return { width: null, height: null };
  }

  async function handleMediaSelected(file: File): Promise<void> {
    options.chatActionError.value = '';
    uploadingAttachment.value = true;

    try {
      const upload = await withBackoff(() => uploadMedia(file));
      const dimensions = await deriveUploadDimensions(file, upload);

      if (!options.selectedChatId.value && options.provisionalDirectChat.value) {
        const resolvedChat = await options.ensureDirectChatResolved(
          options.provisionalDirectChat.value.memberId
        );
        if (!resolvedChat) return;
      }

      if (!options.selectedChatId.value) return;

      const pendingItem = buildPendingMessage(
        options.selectedChatId.value,
        upload.originalFileName,
        mediaTypeFromUpload(upload),
        metadataFromUpload(upload, dimensions)
      );
      addOptimisticMessage(pendingItem);
      await sendOrQueue(pendingItem);
    } catch (error: any) {
      options.chatActionError.value = error?.response?.data?.error || 'Failed to upload attachment';
    } finally {
      uploadingAttachment.value = false;
    }
  }

  async function handleGifSelected(gif: GifResult): Promise<void> {
    if (!options.selectedChatId.value && options.provisionalDirectChat.value) {
      const resolvedChat = await options.ensureDirectChatResolved(options.provisionalDirectChat.value.memberId);
      if (!resolvedChat) return;
    }

    if (!options.selectedChatId.value) return;
    options.chatActionError.value = '';

    const pendingItem = buildPendingMessage(
      options.selectedChatId.value,
      gif.title?.trim() || `${gif.provider.toUpperCase()} GIF`,
      'gif',
      metadataFromGif(gif)
    );
    addOptimisticMessage(pendingItem);
    await sendOrQueue(pendingItem);
  }

  async function flushPending(): Promise<void> {
    const scopeKey = activeQueueScope();
    if (!scopeKey) {
      syncQueuedState(true);
      return;
    }
    const sessionVersion = queueSessionVersion;

    await flushQueue(async (item) => {
      if (isQueueScopeCurrent(scopeKey, sessionVersion)) {
        failedMessageIds.value.delete(item.clientMessageId);
      }

      try {
        const startedAt = Date.now();
        const response = await deliverPendingItem(item, scopeKey, sessionVersion, true);
        if (!response) {
          return 'keep';
        }

        markMessageDelivered(
          response.message.chatId,
          item.clientMessageId,
          response.message.id,
          Date.now() - startedAt
        );
        return 'delivered';
      } catch (error: any) {
        if (isUnavailableDirectMessageError(error)) {
          handleUnavailableDirectMessage(item.chatId, item.clientMessageId, error, scopeKey);
          return 'keep';
        }

        if (isQueueScopeCurrent(scopeKey, sessionVersion)) {
          failedMessageIds.value.add(item.clientMessageId);
        }
        throw error;
      }
    }, scopeKey);

    if (isQueueScopeCurrent(scopeKey, sessionVersion)) {
      queued.value = getQueued(scopeKey);
    }
  }

  function resetForLogout(): void {
    invalidateQueueSession();
    const scopeKey = activeQueueScope();
    if (scopeKey) {
      clearQueued(scopeKey);
    }
    uploadingAttachment.value = false;
    latencyByClientMessageId.value = {};
    queued.value = [];
    failedMessageIds.value = new Set();
  }

  watch(
    () => options.session.value?.user.id ?? null,
    (nextUserId, previousUserId) => {
      if (nextUserId !== previousUserId) {
        if (previousUserId) {
          clearQueued(previousUserId);
        }
        invalidateQueueSession();
        syncQueuedState(true);
      }
    }
  );

  return {
    failedMessageIds,
    flushPending,
    handleGifSelected,
    handleMediaSelected,
    latencyByClientMessageId,
    markMessageDelivered,
    queued,
    resetForLogout,
    retrySpecificMessage,
    sendCurrent,
    uploadingAttachment
  };
}
