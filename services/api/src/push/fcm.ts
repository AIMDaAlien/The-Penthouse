import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Message as FirebaseMessage, type Messaging } from 'firebase-admin/messaging';
import type { FastifyBaseLogger } from 'fastify';
import type { Message } from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import {
  getPushRuntimeDiagnostics,
  recordPushSendFailure,
  recordPushSendSuccess,
  recordPushStaleTokenRemoval
} from '../utils/operatorDiagnostics.js';

const MAX_NOTIFICATION_BODY_LENGTH = 180;

type PushLogger = Pick<FastifyBaseLogger, 'info' | 'warn'>;
type MessagingClient = Pick<Messaging, 'send'>;

type DeviceTokenRow = {
  user_id: string;
  token: string;
  notifications_muted: boolean;
  notifications_enabled: boolean;
  previews_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start_minute: number | null;
  quiet_hours_end_minute: number | null;
  timezone: string | null;
};

let messagingClientPromise: Promise<MessagingClient | null> | null = null;
let messagingClientOverride: MessagingClient | null = null;

function tokenLogShape(token: string): { tokenLength: number } {
  return {
    tokenLength: token.length
  };
}

function describePushBody(message: Message, previewsEnabled: boolean): string {
  if (!previewsEnabled) return 'Open the app to view this message';
  if (message.type === 'image') return 'Sent an image';
  if (message.type === 'video') return 'Sent a video';
  if (message.type === 'gif') return 'Sent a GIF';
  if (message.type === 'file') return 'Sent an attachment';

  const normalized = (message.content || 'New message').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New message';
  if (normalized.length <= MAX_NOTIFICATION_BODY_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_NOTIFICATION_BODY_LENGTH - 1)}...`;
}

function buildFirebaseMessage(chatId: string, token: string, message: Message, previewsEnabled: boolean): FirebaseMessage {
  const title = message.senderDisplayName || message.senderUsername || 'New message';
  const body = describePushBody(message, previewsEnabled);

  return {
    token,
    notification: {
      title,
      body
    },
    data: {
      type: 'message.new',
      chatId,
      messageId: message.id,
      senderId: message.senderId
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'messages',
        tag: `chat:${chatId}`
      }
    }
  };
}

async function getMessagingClient(logger: PushLogger): Promise<MessagingClient | null> {
  if (messagingClientOverride) return messagingClientOverride;

  const serviceAccountPath = env.FCM_SERVICE_ACCOUNT_PATH.trim();
  if (!serviceAccountPath) return null;

  if (!messagingClientPromise) {
    messagingClientPromise = (async () => {
      const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8')) as Record<string, unknown>;
      const app = getApps()[0] ?? initializeApp({
        credential: cert(serviceAccount)
      });

      logger.info({ serviceAccountPath }, 'fcm messaging initialized');
      return getMessaging(app);
    })().catch((error) => {
      messagingClientPromise = null;
      logger.warn({ error, serviceAccountPath }, 'fcm messaging initialization failed');
      return null;
    });
  }

  return messagingClientPromise;
}

async function listRecipientDeviceTokens(chatId: string, senderId: string): Promise<DeviceTokenRow[]> {
  const result = await pool.query(
    `SELECT dt.user_id, dt.token, cm.notifications_muted, dt.notifications_enabled, dt.previews_enabled,
            dt.quiet_hours_enabled, dt.quiet_hours_start_minute,
            dt.quiet_hours_end_minute, dt.timezone
      FROM device_tokens dt
     JOIN chat_members cm ON cm.user_id = dt.user_id
     JOIN users u ON u.id = dt.user_id
     WHERE cm.chat_id = $1
       AND dt.user_id <> $2
       AND dt.platform = 'android'
       AND u.status = 'active'
       AND NOT u.must_change_password`,
    [chatId, senderId]
  );

  return result.rows as DeviceTokenRow[];
}

function currentMinuteForTimezone(timezone: string): number | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '');
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function isWithinQuietHours(row: DeviceTokenRow): boolean {
  if (!row.quiet_hours_enabled) return false;
  if (row.quiet_hours_start_minute === null || row.quiet_hours_end_minute === null || !row.timezone) {
    return false;
  }

  const currentMinute = currentMinuteForTimezone(row.timezone);
  if (currentMinute === null) return false;

  if (row.quiet_hours_start_minute < row.quiet_hours_end_minute) {
    return currentMinute >= row.quiet_hours_start_minute && currentMinute < row.quiet_hours_end_minute;
  }

  return currentMinute >= row.quiet_hours_start_minute || currentMinute < row.quiet_hours_end_minute;
}

async function deleteStaleToken(token: string): Promise<void> {
  await pool.query('DELETE FROM device_tokens WHERE token = $1', [token]);
}

export async function sendPushForNewMessage(
  logger: PushLogger,
  chatId: string,
  senderId: string,
  message: Message
): Promise<void> {
  const messaging = await getMessagingClient(logger);
  if (!messaging) return;

  const recipients = await listRecipientDeviceTokens(chatId, senderId);
  if (recipients.length === 0) return;

  for (const recipient of recipients) {
    if (recipient.notifications_muted) {
      continue;
    }

    if (!recipient.notifications_enabled) {
      continue;
    }

    if (isWithinQuietHours(recipient)) {
      continue;
    }

    try {
      await messaging.send(buildFirebaseMessage(chatId, recipient.token, message, recipient.previews_enabled));
      recordPushSendSuccess();
    } catch (error: any) {
      if (error?.code === 'messaging/registration-token-not-registered') {
        await deleteStaleToken(recipient.token);
        recordPushStaleTokenRemoval();
        recordPushSendFailure();
        logger.warn(
          {
            chatId,
            userId: recipient.user_id,
            ...tokenLogShape(recipient.token),
            messageId: message.id,
            errorCode: error.code
          },
          'fcm token removed after registration-token-not-registered'
        );
        continue;
      }

      logger.warn(
        {
          chatId,
          userId: recipient.user_id,
          ...tokenLogShape(recipient.token),
          messageId: message.id,
          error
        },
        'fcm push send failed'
      );
      recordPushSendFailure();
    }
  }
}

export { getPushRuntimeDiagnostics };

export function setMessagingClientForTests(client: MessagingClient | null): void {
  messagingClientOverride = client;
  messagingClientPromise = null;
}
