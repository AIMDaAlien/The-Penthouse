import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Message } from '@penthouse/contracts';

const MESSAGES_CHANNEL_ID = 'messages';
const MESSAGE_NOTIFICATION_GROUP = 'chat-messages';
const RECENT_SEED_WINDOW_MS = 60_000;
const CHAT_NOTIFICATION_COOLDOWN_MS = 700;
const MAX_NOTIFICATION_BODY_LENGTH = 180;

let initialized = false;
let initializePromise: Promise<void> | null = null;
let notificationPermissionGranted = false;
let openChatHandler: ((chatId: string) => void) | null = null;
const recentlyScheduledSeeds = new Map<string, number>();
const lastChatNotificationAt = new Map<string, number>();

function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform();
}

function hashNotificationId(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || Date.now();
}

function describeMessageBody(message: Message): string {
  if (message.type === 'image') return 'Sent an image';
  if (message.type === 'video') return 'Sent a video';
  if (message.type === 'gif') return 'Sent a GIF';
  if (message.type === 'file') return 'Sent an attachment';

  const normalized = (message.content || 'New message').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New message';
  if (normalized.length <= MAX_NOTIFICATION_BODY_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_NOTIFICATION_BODY_LENGTH - 1)}...`;
}

function notificationSeed(message: Message): string {
  return message.id || message.clientMessageId || `${message.chatId}:${message.createdAt}`;
}

function pruneNotificationState(nowMs: number): void {
  for (const [seed, createdAt] of recentlyScheduledSeeds.entries()) {
    if (nowMs - createdAt > RECENT_SEED_WINDOW_MS) {
      recentlyScheduledSeeds.delete(seed);
    }
  }
}

function shouldSkipNotification(message: Message): boolean {
  const nowMs = Date.now();
  pruneNotificationState(nowMs);

  const seed = notificationSeed(message);
  const recentSeed = recentlyScheduledSeeds.get(seed);
  if (typeof recentSeed === 'number' && nowMs - recentSeed < RECENT_SEED_WINDOW_MS) {
    return true;
  }

  const lastChatAt = lastChatNotificationAt.get(message.chatId);
  if (typeof lastChatAt === 'number' && nowMs - lastChatAt < CHAT_NOTIFICATION_COOLDOWN_MS) {
    recentlyScheduledSeeds.set(seed, nowMs);
    return true;
  }

  recentlyScheduledSeeds.set(seed, nowMs);
  lastChatNotificationAt.set(message.chatId, nowMs);
  return false;
}

function messageNotificationId(message: Message): number {
  // Use one delivered notification per chat so rapid bursts collapse instead of stacking.
  return hashNotificationId(`chat:${message.chatId}`);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNativeRuntime()) return false;

  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') {
    notificationPermissionGranted = true;
    return true;
  }

  if (current.display === 'denied') {
    notificationPermissionGranted = false;
    return false;
  }

  const requested = await LocalNotifications.requestPermissions();
  notificationPermissionGranted = requested.display === 'granted';
  return notificationPermissionGranted;
}

export async function initializeNotifications(onOpenChat: (chatId: string) => void): Promise<void> {
  openChatHandler = onOpenChat;
  if (!isNativeRuntime()) return;
  if (initialized) return;
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    await LocalNotifications.createChannel({
      id: MESSAGES_CHANNEL_ID,
      name: 'Messages',
      description: 'Message alerts from The Penthouse',
      importance: 4,
      visibility: 1
    });

    await LocalNotifications.removeAllListeners();
    await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const chatId = typeof event.notification.extra?.chatId === 'string'
        ? event.notification.extra.chatId
        : null;
      if (chatId && openChatHandler) {
        openChatHandler(chatId);
      }
    });

    initialized = true;
  })();

  try {
    await initializePromise;
  } finally {
    initializePromise = null;
  }
}

export async function scheduleIncomingMessageNotification(message: Message, chatName: string | null): Promise<void> {
  if (!isNativeRuntime()) return;
  if (!message.chatId) return;
  if (shouldSkipNotification(message)) return;
  if (!notificationPermissionGranted && !(await ensureNotificationPermission())) return;

  const title = message.senderDisplayName || message.senderUsername || 'New message';
  const body = describeMessageBody(message);
  const notification: LocalNotificationSchema = {
    id: messageNotificationId(message),
    title,
    body,
    largeBody: body,
    summaryText: chatName ?? 'New message',
    channelId: MESSAGES_CHANNEL_ID,
    group: MESSAGE_NOTIFICATION_GROUP,
    groupSummary: false,
    extra: {
      chatId: message.chatId,
      messageId: message.id
    },
    schedule: {
      at: new Date(Date.now() + 50)
    }
  };

  await LocalNotifications.schedule({
    notifications: [notification]
  });
}

export async function clearDeliveredNotificationsForChat(chatId: string): Promise<void> {
  if (!isNativeRuntime()) return;

  const delivered = await LocalNotifications.getDeliveredNotifications();
  const notifications = delivered.notifications.filter(
    (notification) => notification.extra?.chatId === chatId
  );

  if (notifications.length === 0) return;

  await LocalNotifications.removeDeliveredNotifications({ notifications });
  lastChatNotificationAt.delete(chatId);
}

export async function clearAllDeliveredNotifications(): Promise<void> {
  if (!isNativeRuntime()) return;
  await LocalNotifications.removeAllDeliveredNotifications();
  recentlyScheduledSeeds.clear();
  lastChatNotificationAt.clear();
}
