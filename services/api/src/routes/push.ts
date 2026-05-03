import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ChatNotificationOverrideSchema,
  NotificationPrefsSchema,
  PatchChatNotificationOverrideRequestSchema,
  PatchNotificationPrefsRequestSchema,
  PushSubscribeRequestSchema,
  PushSubscriptionSchema,
  PushUnsubscribeRequestSchema,
  type ChatNotificationOverrideScope,
  type NotificationScopeDefault,
  type PushPayloadPrivacy
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { formatValidationError } from '../utils/error-responses.js';
import { touchCurrentSessionPushState } from '../utils/sessions.js';

const ChatIdParamsSchema = z.object({
  chatId: z.string().uuid()
});

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string | Date;
  last_seen_at: string | Date;
};

type NotificationPrefsRow = {
  enabled: boolean;
  scope_default: NotificationScopeDefault;
  payload_privacy: PushPayloadPrivacy;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_tz: string | null;
  updated_at: string | Date;
};

type ChatNotificationOverrideRow = {
  chat_id: string;
  scope: ChatNotificationOverrideScope;
  dnd_override: boolean;
  updated_at: string | Date;
};

function mapPushSubscription(row: PushSubscriptionRow) {
  return PushSubscriptionSchema.parse({
    id: row.id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    },
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString()
  });
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}

function normalizeUserAgent(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapNotificationPrefs(row: NotificationPrefsRow) {
  return NotificationPrefsSchema.parse({
    enabled: row.enabled,
    scopeDefault: row.scope_default,
    payloadPrivacy: row.payload_privacy,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: normalizeTime(row.quiet_hours_start),
    quietHoursEnd: normalizeTime(row.quiet_hours_end),
    quietHoursTz: row.quiet_hours_tz,
    updatedAt: new Date(row.updated_at).toISOString()
  });
}

function mapChatOverride(chatId: string, row?: ChatNotificationOverrideRow) {
  return ChatNotificationOverrideSchema.parse({
    chatId,
    scope: row?.scope ?? null,
    dndOverride: Boolean(row?.dnd_override ?? false),
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null
  });
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function ensureNotificationPrefs(userId: string): Promise<NotificationPrefsRow> {
  await pool.query(
    `INSERT INTO notification_prefs(user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const result = await pool.query<NotificationPrefsRow>(
    `SELECT enabled, scope_default, payload_privacy, quiet_hours_enabled,
            quiet_hours_start::text, quiet_hours_end::text, quiet_hours_tz, updated_at
     FROM notification_prefs
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

async function isChatMember(userId: string, chatId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM chat_members WHERE user_id = $1 AND chat_id = $2',
    [userId, chatId]
  );
  return Boolean(result.rowCount);
}

async function updateCurrentSessionPushState(userId: string, sessionId: string | null): Promise<void> {
  const remaining = await pool.query(
    'SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  await touchCurrentSessionPushState(pool, sessionId, Boolean(remaining.rowCount));
}

export async function registerPushRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/push/subscribe', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = PushSubscribeRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const client = await pool.connect();
    let subscription: PushSubscriptionRow;
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id <> $2',
        [parsed.data.endpoint, request.user.userId]
      );
      const result = await client.query<PushSubscriptionRow>(
        `INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent,
             last_seen_at = NOW()
         RETURNING id, endpoint, p256dh, auth, user_agent, created_at, last_seen_at`,
        [
          request.user.userId,
          parsed.data.endpoint,
          parsed.data.keys.p256dh,
          parsed.data.keys.auth,
          parsed.data.userAgent ?? normalizeUserAgent(request.headers['user-agent'])
        ]
      );
      subscription = result.rows[0];
      await touchCurrentSessionPushState(client, request.user.sessionId ?? null, true);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to register push subscription' });
    } finally {
      client.release();
    }

    return reply.status(201).send(mapPushSubscription(subscription));
  });

  app.delete('/api/v1/push/subscribe', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = PushUnsubscribeRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    await pool.query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [parsed.data.endpoint, request.user.userId]
    );
    await updateCurrentSessionPushState(request.user.userId, request.user.sessionId ?? null);

    return reply.status(204).send();
  });

  app.get('/api/v1/push/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request) => {
    const prefs = await ensureNotificationPrefs(request.user.userId);
    return mapNotificationPrefs(prefs);
  });

  app.patch('/api/v1/push/preferences', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = PatchNotificationPrefsRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const current = await ensureNotificationPrefs(request.user.userId);
    const quietHoursEnabled = parsed.data.quietHoursEnabled ?? current.quiet_hours_enabled;
    const quietHoursStart = quietHoursEnabled
      ? normalizeTime(parsed.data.quietHoursStart ?? current.quiet_hours_start)
      : null;
    const quietHoursEnd = quietHoursEnabled
      ? normalizeTime(parsed.data.quietHoursEnd ?? current.quiet_hours_end)
      : null;
    const quietHoursTz = quietHoursEnabled
      ? (parsed.data.quietHoursTz ?? current.quiet_hours_tz)
      : null;

    if (quietHoursEnabled && (!quietHoursStart || !quietHoursEnd || !quietHoursTz)) {
      return reply.status(400).send({ error: 'Quiet hours require start, end, and timezone' });
    }
    if (quietHoursTz && !isValidTimeZone(quietHoursTz)) {
      return reply.status(400).send({ error: 'Quiet hours timezone is invalid' });
    }

    const result = await pool.query<NotificationPrefsRow>(
      `UPDATE notification_prefs
       SET enabled = $1,
           scope_default = $2,
           payload_privacy = $3,
           quiet_hours_enabled = $4,
           quiet_hours_start = $5,
           quiet_hours_end = $6,
           quiet_hours_tz = $7,
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING enabled, scope_default, payload_privacy, quiet_hours_enabled,
                 quiet_hours_start::text, quiet_hours_end::text, quiet_hours_tz, updated_at`,
      [
        parsed.data.enabled ?? current.enabled,
        parsed.data.scopeDefault ?? current.scope_default,
        parsed.data.payloadPrivacy ?? current.payload_privacy,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        quietHoursTz,
        request.user.userId
      ]
    );

    return mapNotificationPrefs(result.rows[0]);
  });

  app.get('/api/v1/push/chats/:chatId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const params = ChatIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: formatValidationError(params.error) });
    if (!(await isChatMember(request.user.userId, params.data.chatId))) {
      return reply.status(403).send({ error: 'You are not a member of this chat' });
    }

    const result = await pool.query<ChatNotificationOverrideRow>(
      `SELECT chat_id, scope, dnd_override, updated_at
       FROM chat_notification_overrides
       WHERE user_id = $1 AND chat_id = $2`,
      [request.user.userId, params.data.chatId]
    );

    return mapChatOverride(params.data.chatId, result.rows[0]);
  });

  app.patch('/api/v1/push/chats/:chatId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const params = ChatIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: formatValidationError(params.error) });
    const parsed = PatchChatNotificationOverrideRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });
    if (!(await isChatMember(request.user.userId, params.data.chatId))) {
      return reply.status(403).send({ error: 'You are not a member of this chat' });
    }

    const existing = await pool.query<ChatNotificationOverrideRow>(
      `SELECT chat_id, scope, dnd_override, updated_at
       FROM chat_notification_overrides
       WHERE user_id = $1 AND chat_id = $2`,
      [request.user.userId, params.data.chatId]
    );
    const current = existing.rows[0];
    const scope = parsed.data.scope ?? current?.scope;
    if (!scope) {
      return reply.status(400).send({ error: 'Scope is required before creating a chat notification override' });
    }

    const result = await pool.query<ChatNotificationOverrideRow>(
      `INSERT INTO chat_notification_overrides(user_id, chat_id, scope, dnd_override)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, chat_id) DO UPDATE
       SET scope = EXCLUDED.scope,
           dnd_override = EXCLUDED.dnd_override,
           updated_at = NOW()
       RETURNING chat_id, scope, dnd_override, updated_at`,
      [
        request.user.userId,
        params.data.chatId,
        scope,
        parsed.data.dndOverride ?? current?.dnd_override ?? false
      ]
    );

    return mapChatOverride(params.data.chatId, result.rows[0]);
  });

  app.delete('/api/v1/push/chats/:chatId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const params = ChatIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: formatValidationError(params.error) });
    if (!(await isChatMember(request.user.userId, params.data.chatId))) {
      return reply.status(403).send({ error: 'You are not a member of this chat' });
    }

    await pool.query(
      'DELETE FROM chat_notification_overrides WHERE user_id = $1 AND chat_id = $2',
      [request.user.userId, params.data.chatId]
    );

    return reply.status(204).send();
  });
}
