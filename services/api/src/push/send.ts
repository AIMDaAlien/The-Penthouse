import webPush from 'web-push';
import { and, eq, sql } from 'drizzle-orm';
import type { Server } from 'socket.io';
import type { Message } from '@penthouse/contracts';
import { db } from '../db/pool.js';
import {
  chatMembers,
  chats,
  notificationPrefs,
  chatNotificationOverrides,
  pushSubscriptions,
  pushNotifications,
  users
} from '../db/schema.js';
import { unreadCount } from '../utils/messages.js';
import { configureWebPush } from './web.js';

export async function sendPushForMessage(
  io: Server,
  message: Message,
  senderId: string
) {
  if (!configureWebPush()) return;

  const memberRows = await db.select({ userId: chatMembers.userId })
    .from(chatMembers)
    .where(eq(chatMembers.chatId, message.chatId));

  const recipientIds = memberRows.map((m) => m.userId).filter((id) => id !== senderId);
  if (recipientIds.length === 0) return;

  // Skip users who are currently online in the chat room
  const sockets = await io.in(`chat:${message.chatId}`).fetchSockets();
  const onlineUserIds = new Set(sockets.map((s) => s.data.userId as string));

  for (const userId of recipientIds) {
    if (onlineUserIds.has(userId)) continue;
    await sendPushToUser(userId, message);
  }
}

async function sendPushToUser(userId: string, message: Message) {
  // Global notification prefs
  const [prefs] = await db.select().from(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId));

  if (!prefs || !prefs.enabled) return;

  // Per-chat mute
  const [member] = await db.select().from(chatMembers)
    .where(and(eq(chatMembers.chatId, message.chatId), eq(chatMembers.userId, userId)))
    .limit(1);

  if (member?.notificationsMuted) return;

  // Chat override
  const [override] = await db.select().from(chatNotificationOverrides)
    .where(and(
      eq(chatNotificationOverrides.chatId, message.chatId),
      eq(chatNotificationOverrides.userId, userId)
    ))
    .limit(1);

  // Determine effective scope
  const scope = override?.scope ?? prefs.scopeDefault;
  if (scope === 'off') return;

  // Chat type
  const [chat] = await db.select({ type: chats.type }).from(chats)
    .where(eq(chats.id, message.chatId))
    .limit(1);

  const chatType = chat?.type ?? 'group';

  if (!shouldNotifyByScope(scope, chatType, message, userId)) return;

  // Quiet hours
  if (prefs.quietHoursEnabled && !override?.dndOverride) {
    if (isInsideQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, prefs.quietHoursTz)) {
      return;
    }
  }

  // Build payload
  const unread = await unreadCount(message.chatId, userId);

  // Resolve chat name
  let chatName = 'Chat';
  if (chatType === 'dm') {
    const [other] = await db.select({ displayName: users.displayName })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(and(eq(chatMembers.chatId, message.chatId), sql`${chatMembers.userId} <> ${userId}`))
      .limit(1);
    if (other) chatName = other.displayName;
  } else {
    const [chatRow] = await db.select({ name: chats.name }).from(chats).where(eq(chats.id, message.chatId)).limit(1);
    if (chatRow) chatName = chatRow.name;
  }

  const payload = buildPayload(message, prefs.payloadPrivacy, unread, chatType, chatName);

  // Get subscriptions
  const subs = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        JSON.stringify(payload)
      );

      // Track successful send
      await db.insert(pushNotifications).values({
        subscriptionId: sub.id,
        messageId: message.id,
        succeeded: true
      }).catch(() => {
        // Non-critical: tracking insert failure should not break push
      });
    } catch (err: any) {
      // Track failed send
      await db.insert(pushNotifications).values({
        subscriptionId: sub.id,
        messageId: message.id,
        succeeded: false,
        errorCode: String(err.statusCode ?? err.code ?? 'UNKNOWN')
      }).catch(() => {
        // Non-critical
      });

      // Remove stale subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}

export function shouldNotifyByScope(
  scope: string,
  chatType: 'dm' | 'group' | 'channel',
  message: Message,
  userId: string
) {
  const metadata = message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
    ? message.metadata as Record<string, unknown>
    : {};
  const mentionedUserIds = Array.isArray(metadata.mentionedUserIds)
    ? metadata.mentionedUserIds.filter((id): id is string => typeof id === 'string')
    : [];
  const isMentioned = mentionedUserIds.includes(userId);

  if (scope === 'off') return false;
  if (scope === 'dm_only') return chatType === 'dm';
  if (scope === 'dm_and_mention') return chatType === 'dm' || isMentioned;
  if (scope === 'mentions_only') return isMentioned;
  return true;
}

export function isInsideQuietHours(
  start: string | null,
  end: string | null,
  tz: string | null
): boolean {
  if (!start || !end || !tz) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    // Overnight quiet hours (e.g., 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

function buildPayload(
  message: Message,
  privacy: string,
  unread: number,
  chatType: 'dm' | 'group' | 'channel',
  chatName: string
): Record<string, unknown> {
  const level = privacy as 'private' | 'metadata' | 'full';
  const pushChatType = chatType === 'dm' ? 'dm' : 'group';

  const base: Record<string, unknown> = {
    v: 1,
    type: 'message',
    chatId: message.chatId,
    messageId: message.id,
    chatType: pushChatType,
    chatName,
    badge: unread,
    scope: pushChatType === 'dm' ? 'dm_only' : 'all',
    privacyLevel: level
  };

  if (level === 'private') return base;

  base.senderName = message.senderDisplayName ?? message.senderUsername ?? 'Someone';
  base.senderAvatar = message.senderAvatarUrl ?? null;

  if (message.type !== 'text') {
    base.mediaType = message.type;
  }

  if (level === 'full') {
    base.body = message.content.slice(0, 180);
  }

  return base;
}
