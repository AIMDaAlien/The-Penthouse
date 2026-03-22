import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Message } from '@penthouse/contracts';

const MESSAGES_CHANNEL_ID = 'messages';
const MESSAGE_NOTIFICATION_GROUP = 'chat-messages';
const RECENT_SEED_WINDOW_MS = 60_000;
const MAX_NOTIFICATION_BODY_LENGTH = 180;
const MOBILE_DIAGNOSTICS_ENABLED = import.meta.env.DEV;

export type ForegroundPushNotification = {
  chatId: string | null;
  messageId: string | null;
  senderId: string | null;
  title: string | null;
  body: string | null;
  type: string | null;
};

let initialized = false;
let initializePromise: Promise<void> | null = null;
let notificationPermissionGranted = false;
let pushPermissionGranted = false;
let openChatHandler: ((chatId: string) => void) | null = null;
let foregroundPushHandler: ((notification: ForegroundPushNotification) => void) | null = null;
let tokenReceivedHandler: ((token: string, previousToken: string | null) => void | Promise<void>) | null = null;
let currentPushToken: string | null = null;
const recentlyScheduledSeeds = new Map<string, number>();

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

function markNotificationSeed(seed: string | null | undefined): void {
  if (!seed) return;
  const nowMs = Date.now();
  pruneNotificationState(nowMs);
  recentlyScheduledSeeds.set(seed, nowMs);
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
    if (MOBILE_DIAGNOSTICS_ENABLED) {
      console.debug('[mobile] notification.skip', {
        reason: 'recent-seed',
        seed,
        messageId: message.id || null,
        chatId: message.chatId
      });
    }
    return true;
  }

  recentlyScheduledSeeds.set(seed, nowMs);
  return false;
}

function messageNotificationId(message: Message): number {
  return hashNotificationId(notificationSeed(message));
}

function readNotificationString(source: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseForegroundPushNotification(event: {
  notification?: {
    title?: string | null;
    body?: string | null;
    data?: unknown;
  } | null;
}): ForegroundPushNotification {
  const data = event.notification?.data && typeof event.notification.data === 'object'
    ? event.notification.data as Record<string, unknown>
    : null;
  const messageId = readNotificationString(data, 'messageId');
  markNotificationSeed(messageId);

  return {
    chatId: readNotificationString(data, 'chatId'),
    messageId,
    senderId: readNotificationString(data, 'senderId'),
    title: typeof event.notification?.title === 'string' && event.notification.title.trim()
      ? event.notification.title
      : null,
    body: typeof event.notification?.body === 'string' && event.notification.body.trim()
      ? event.notification.body
      : null,
    type: readNotificationString(data, 'type')
  };
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

export async function ensurePushPermission(): Promise<boolean> {
  if (!isNativeRuntime()) return false;

  try {
    const current = await FirebaseMessaging.checkPermissions();
    if (current.receive === 'granted') {
      pushPermissionGranted = true;
      return true;
    }

    if (current.receive === 'denied') {
      pushPermissionGranted = false;
      return false;
    }

    const requested = await FirebaseMessaging.requestPermissions();
    pushPermissionGranted = requested.receive === 'granted';
    return pushPermissionGranted;
  } catch {
    pushPermissionGranted = false;
    return false;
  }
}

export async function getPushToken(): Promise<string | null> {
  if (!isNativeRuntime()) return null;
  if (!pushPermissionGranted && !(await ensurePushPermission())) return null;

  try {
    const result = await FirebaseMessaging.getToken();
    currentPushToken = result.token || null;
    return currentPushToken;
  } catch {
    currentPushToken = null;
    return null;
  }
}

export function getCachedPushToken(): string | null {
  return currentPushToken;
}

export async function deletePushToken(): Promise<void> {
  if (!isNativeRuntime()) return;

  try {
    await FirebaseMessaging.deleteToken();
  } catch {
    // Keep logout resilient even if native token deletion fails.
  } finally {
    currentPushToken = null;
  }
}

export async function initializeNotifications(
  onOpenChat: (chatId: string) => void,
  onForegroundPushNotification?: (notification: ForegroundPushNotification) => void,
  onTokenReceived?: (token: string, previousToken: string | null) => void | Promise<void>
): Promise<void> {
  openChatHandler = onOpenChat;
  foregroundPushHandler = onForegroundPushNotification ?? null;
  tokenReceivedHandler = onTokenReceived ?? null;

  if (!isNativeRuntime()) return;
  if (initialized) return;
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    await LocalNotifications.createChannel({
      id: MESSAGES_CHANNEL_ID,
      name: 'Messages',
      description: 'Message alerts from The Penthouse',
      importance: 5,
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

    await FirebaseMessaging.removeAllListeners();
    await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      const notification = parseForegroundPushNotification(event);
      if (notification.chatId && openChatHandler) {
        openChatHandler(notification.chatId);
      }
    });
    await FirebaseMessaging.addListener('notificationReceived', (event) => {
      const notification = parseForegroundPushNotification(event);
      foregroundPushHandler?.(notification);
    });
    await FirebaseMessaging.addListener('tokenReceived', (event) => {
      const previousToken = currentPushToken;
      currentPushToken = event.token || null;
      if (currentPushToken && tokenReceivedHandler) {
        void tokenReceivedHandler(currentPushToken, previousToken);
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
    }
  };

  await LocalNotifications.schedule({
    notifications: [notification]
  });

  if (MOBILE_DIAGNOSTICS_ENABLED) {
    console.debug('[mobile] notification.scheduled', {
      notificationId: notification.id,
      chatId: message.chatId,
      messageId: message.id || null,
      type: message.type,
      chatName: chatName ?? null
    });
  }
}

export async function clearDeliveredNotificationsForChat(chatId: string): Promise<void> {
  if (!isNativeRuntime()) return;

  const delivered = await LocalNotifications.getDeliveredNotifications();
  const notifications = delivered.notifications.filter(
    (notification) => notification.extra?.chatId === chatId
  );

  if (notifications.length > 0) {
    await LocalNotifications.removeDeliveredNotifications({ notifications });
  }

  try {
    const pushNotifications = await FirebaseMessaging.getDeliveredNotifications();
    const matchingPush = pushNotifications.notifications.filter((notification) => {
      const payloadChatId = readNotificationString((notification.data ?? null) as Record<string, unknown> | null, 'chatId');
      return payloadChatId === chatId;
    });

    if (matchingPush.length > 0) {
      await FirebaseMessaging.removeDeliveredNotifications({ notifications: matchingPush.map((notification) => ({ id: notification.id })) });
    }
  } catch {
    // Some runtimes will not expose delivered push notifications; local cleanup should still succeed.
  }
}

export async function clearAllDeliveredNotifications(): Promise<void> {
  if (!isNativeRuntime()) return;
  await LocalNotifications.removeAllDeliveredNotifications();
  try {
    await FirebaseMessaging.removeAllDeliveredNotifications();
  } catch {
    // Keep logout cleanup resilient if the push plugin cannot enumerate delivered notifications.
  }
  recentlyScheduledSeeds.clear();
}
