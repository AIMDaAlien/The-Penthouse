import webpush from 'web-push';
import type { FastifyBaseLogger } from 'fastify';
import type { Message, WebPushMessagePayload, PushPayloadPrivacy } from '@penthouse/contracts';
import { WebPushMessagePayloadSchema } from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import {
  recordPushSendFailure,
  recordPushSendSuccess,
  recordPushStaleTokenRemoval
} from '../utils/operatorDiagnostics.js';
import { isMentionForUsername, shouldSendWebPush } from './scope.js';

const MAX_PUSH_BODY_LENGTH = 180;

type PushLogger = Pick<FastifyBaseLogger, 'info' | 'warn'>;
type WebPushSender = typeof webpush.sendNotification;

type WebPushRecipientRow = {
  user_id: string;
  username: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  chat_name: string;
  is_dm: boolean;
  notifications_muted: boolean;
  notifications_enabled: boolean;
  scope_default: 'off' | 'dm_only' | 'dm_and_mention' | 'all';
  payload_privacy: PushPayloadPrivacy;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_tz: string | null;
  override_scope: 'off' | 'mentions_only' | 'all' | null;
  dnd_override: boolean;
};

let webPushConfigured = false;
let webPushSenderOverride: WebPushSender | null = null;

function configureWebPush(): boolean {
  if (webPushConfigured) return true;

  const publicKey = env.VAPID_PUBLIC_KEY.trim();
  const privateKey = env.VAPID_PRIVATE_KEY.trim();
  const subject = env.VAPID_SUBJECT.trim();
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
  return true;
}

function describePushBody(message: Message): string {
  if (message.type === 'image') return 'Sent an image';
  if (message.type === 'video') return 'Sent a video';
  if (message.type === 'gif') return 'Sent a GIF';
  if (message.type === 'file') return 'Sent an attachment';
  if (message.type === 'audio') return 'Sent a voice message';
  if (message.type === 'poll') return 'Started a poll';

  const normalized = (message.content || 'New message').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New message';
  if (normalized.length <= MAX_PUSH_BODY_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PUSH_BODY_LENGTH - 1)}...`;
}

function buildPayload(chatId: string, chatName: string, message: Message, payloadPrivacy: PushPayloadPrivacy): WebPushMessagePayload {
  const payload = {
    v: 1,
    type: 'message',
    chatId,
    messageId: message.id,
    senderName: message.senderDisplayName || message.senderUsername || 'New message',
    chatName,
    ...(payloadPrivacy === 'full'
      ? {
          body: describePushBody(message),
          senderAvatar: message.senderAvatarUrl ?? null
        }
      : {})
  } satisfies WebPushMessagePayload;

  return WebPushMessagePayloadSchema.parse(payload);
}

async function listWebPushRecipients(chatId: string, senderId: string): Promise<WebPushRecipientRow[]> {
  const result = await pool.query<WebPushRecipientRow>(
    `SELECT ps.user_id,
            u.username,
            ps.endpoint,
            ps.p256dh,
            ps.auth,
            c.name AS chat_name,
            dc.chat_id IS NOT NULL AS is_dm,
            cm.notifications_muted,
            COALESCE(np.enabled, TRUE) AS notifications_enabled,
            COALESCE(np.scope_default, 'dm_and_mention') AS scope_default,
            COALESCE(np.payload_privacy, 'metadata') AS payload_privacy,
            COALESCE(np.quiet_hours_enabled, FALSE) AS quiet_hours_enabled,
            np.quiet_hours_start::text,
            np.quiet_hours_end::text,
            np.quiet_hours_tz,
            cno.scope AS override_scope,
            COALESCE(cno.dnd_override, FALSE) AS dnd_override
       FROM push_subscriptions ps
       JOIN chat_members cm ON cm.user_id = ps.user_id AND cm.chat_id = $1
       JOIN users u ON u.id = ps.user_id
       JOIN chats c ON c.id = cm.chat_id
       LEFT JOIN direct_chats dc ON dc.chat_id = cm.chat_id
       LEFT JOIN notification_prefs np ON np.user_id = ps.user_id
       LEFT JOIN chat_notification_overrides cno ON cno.user_id = ps.user_id AND cno.chat_id = cm.chat_id
      WHERE ps.user_id <> $2
        AND u.status = 'active'
        AND NOT u.must_change_password`,
    [chatId, senderId]
  );

  return result.rows;
}

async function deleteStaleSubscription(endpoint: string): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

function isStaleSubscriptionStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

function isRetryableFailureStatus(statusCode: number | undefined): boolean {
  return statusCode === 429 || Boolean(statusCode && statusCode >= 500);
}

export async function sendWebPushForNewMessage(
  logger: PushLogger,
  chatId: string,
  senderId: string,
  message: Message
): Promise<void> {
  if (!webPushSenderOverride && !configureWebPush()) return;

  const recipients = await listWebPushRecipients(chatId, senderId);
  if (recipients.length === 0) return;

  const sender = webPushSenderOverride ?? webpush.sendNotification;
  for (const recipient of recipients) {
    const isMention = isMentionForUsername(message.content, recipient.username);
    if (!shouldSendWebPush({
      notificationsEnabled: recipient.notifications_enabled,
      scopeDefault: recipient.scope_default,
      overrideScope: recipient.override_scope,
      dndOverride: recipient.dnd_override,
      notificationsMuted: recipient.notifications_muted,
      quietHoursEnabled: recipient.quiet_hours_enabled,
      quietHoursStart: recipient.quiet_hours_start,
      quietHoursEnd: recipient.quiet_hours_end,
      quietHoursTz: recipient.quiet_hours_tz,
      isMention,
      isDm: recipient.is_dm
    })) {
      continue;
    }

    const payload = buildPayload(chatId, recipient.chat_name, message, recipient.payload_privacy);
    try {
      await sender(
        {
          endpoint: recipient.endpoint,
          keys: {
            p256dh: recipient.p256dh,
            auth: recipient.auth
          }
        },
        JSON.stringify(payload),
        {
          TTL: 60 * 60,
          urgency: 'high',
          topic: `chat-${chatId.replace(/-/g, '').slice(0, 27)}`
        }
      );
      recordPushSendSuccess();
    } catch (error: any) {
      const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
      if (isStaleSubscriptionStatus(statusCode)) {
        await deleteStaleSubscription(recipient.endpoint);
        recordPushStaleTokenRemoval();
        recordPushSendFailure();
        logger.warn(
          {
            chatId,
            userId: recipient.user_id,
            messageId: message.id,
            statusCode
          },
          'web push subscription removed after stale push endpoint response'
        );
        continue;
      }

      logger.warn(
        {
          chatId,
          userId: recipient.user_id,
          messageId: message.id,
          statusCode,
          retryable: isRetryableFailureStatus(statusCode),
          error
        },
        'web push send failed'
      );
      recordPushSendFailure();
    }
  }
}

export function setWebPushSenderForTests(sender: WebPushSender | null): void {
  webPushSenderOverride = sender;
}
