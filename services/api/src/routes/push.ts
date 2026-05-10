import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  PatchChatNotificationOverrideRequestSchema,
  PatchNotificationPrefsRequestSchema,
  PushSubscribeRequestSchema,
  PushUnsubscribeRequestSchema
} from '@penthouse/contracts';
import { env } from '../config/env.js';
import { db } from '../db/pool.js';
import { chatNotificationOverrides, chats, notificationPrefs, pushSubscriptions, sessionDevices } from '../db/schema.js';
import { badRequest, notFound } from '../utils/error-responses.js';

export async function registerPushRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/push/vapid-key', async () => ({
    publicKey: env.VAPID_PUBLIC_KEY ?? ''
  }));

  fastify.post('/api/v1/push/subscribe', { preHandler: fastify.authenticate }, async (request, reply) => {
    const body = PushSubscribeRequestSchema.parse(request.body);
    const sessionDeviceId = request.authUser!.sessionDeviceId;
    await db.insert(pushSubscriptions).values({
      userId: request.authUser!.userId,
      sessionDeviceId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent ?? request.headers['user-agent'] ?? null
    }).onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: {
        sessionDeviceId,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? request.headers['user-agent'] ?? null,
        lastSeenAt: new Date()
      }
    });

    if (sessionDeviceId) {
      await db.update(sessionDevices).set({ hasPushToken: true }).where(eq(sessionDevices.id, sessionDeviceId));
    }
    return reply.status(204).send();
  });

  async function unsubscribe(request: FastifyRequest, reply: FastifyReply) {
    const body = PushUnsubscribeRequestSchema.parse(request.body);
    await db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, request.authUser!.userId), eq(pushSubscriptions.endpoint, body.endpoint)));
    return reply.status(204).send();
  }

  fastify.post('/api/v1/push/unsubscribe', { preHandler: fastify.authenticate }, unsubscribe);
  fastify.delete('/api/v1/push/subscribe', { preHandler: fastify.authenticate }, unsubscribe);

  // Global notification preferences
  fastify.get('/api/v1/notifications/preferences', { preHandler: fastify.authenticate }, async (request) => {
    const userId = request.authUser!.userId;
    const [row] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1);
    if (!row) {
      return {
        enabled: true,
        scopeDefault: 'dm_and_mention',
        payloadPrivacy: 'metadata',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        quietHoursTz: null,
        updatedAt: new Date().toISOString()
      };
    }
    return {
      enabled: row.enabled,
      scopeDefault: row.scopeDefault,
      payloadPrivacy: row.payloadPrivacy,
      quietHoursEnabled: row.quietHoursEnabled,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      quietHoursTz: row.quietHoursTz,
      updatedAt: row.updatedAt.toISOString()
    };
  });

  fastify.patch('/api/v1/notifications/preferences', { preHandler: fastify.authenticate }, async (request) => {
    const userId = request.authUser!.userId;
    const body = PatchNotificationPrefsRequestSchema.parse(request.body);

    const [existing] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1);

    if (!existing) {
      const [created] = await db.insert(notificationPrefs).values({
        userId,
        enabled: body.enabled ?? true,
        scopeDefault: body.scopeDefault ?? 'dm_and_mention',
        payloadPrivacy: body.payloadPrivacy ?? 'metadata',
        quietHoursEnabled: body.quietHoursEnabled ?? false,
        quietHoursStart: body.quietHoursStart ?? null,
        quietHoursEnd: body.quietHoursEnd ?? null,
        quietHoursTz: body.quietHoursTz ?? null
      }).returning();
      return {
        enabled: created.enabled,
        scopeDefault: created.scopeDefault,
        payloadPrivacy: created.payloadPrivacy,
        quietHoursEnabled: created.quietHoursEnabled,
        quietHoursStart: created.quietHoursStart,
        quietHoursEnd: created.quietHoursEnd,
        quietHoursTz: created.quietHoursTz,
        updatedAt: created.updatedAt.toISOString()
      };
    }

    const [updated] = await db.update(notificationPrefs)
      .set({
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.scopeDefault !== undefined ? { scopeDefault: body.scopeDefault } : {}),
        ...(body.payloadPrivacy !== undefined ? { payloadPrivacy: body.payloadPrivacy } : {}),
        ...(body.quietHoursEnabled !== undefined ? { quietHoursEnabled: body.quietHoursEnabled } : {}),
        ...(body.quietHoursStart !== undefined ? { quietHoursStart: body.quietHoursStart } : {}),
        ...(body.quietHoursEnd !== undefined ? { quietHoursEnd: body.quietHoursEnd } : {}),
        ...(body.quietHoursTz !== undefined ? { quietHoursTz: body.quietHoursTz } : {}),
        updatedAt: new Date()
      })
      .where(eq(notificationPrefs.userId, userId))
      .returning();

    return {
      enabled: updated.enabled,
      scopeDefault: updated.scopeDefault,
      payloadPrivacy: updated.payloadPrivacy,
      quietHoursEnabled: updated.quietHoursEnabled,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
      quietHoursTz: updated.quietHoursTz,
      updatedAt: updated.updatedAt.toISOString()
    };
  });

  // Per-chat notification overrides
  fastify.get('/api/v1/notifications/overrides/:chatId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { chatId: string };
    const userId = request.authUser!.userId;

    const [chat] = await db.select().from(chats).where(eq(chats.id, params.chatId)).limit(1);
    if (!chat) throw notFound('Chat not found');

    const [row] = await db.select().from(chatNotificationOverrides)
      .where(and(eq(chatNotificationOverrides.chatId, params.chatId), eq(chatNotificationOverrides.userId, userId)))
      .limit(1);

    if (!row) {
      return {
        chatId: params.chatId,
        scope: null,
        dndOverride: false,
        updatedAt: null
      };
    }

    return {
      chatId: row.chatId,
      scope: row.scope,
      dndOverride: row.dndOverride,
      updatedAt: row.updatedAt.toISOString()
    };
  });

  fastify.patch('/api/v1/notifications/overrides/:chatId', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { chatId: string };
    const userId = request.authUser!.userId;
    const body = PatchChatNotificationOverrideRequestSchema.parse(request.body);

    const [chat] = await db.select().from(chats).where(eq(chats.id, params.chatId)).limit(1);
    if (!chat) throw notFound('Chat not found');

    if (Object.keys(body).length === 0) throw badRequest('At least one field must be provided');

    const [existing] = await db.select().from(chatNotificationOverrides)
      .where(and(eq(chatNotificationOverrides.chatId, params.chatId), eq(chatNotificationOverrides.userId, userId)))
      .limit(1);

    if (!existing) {
      const [created] = await db.insert(chatNotificationOverrides).values({
        userId,
        chatId: params.chatId,
        scope: body.scope ?? 'all',
        dndOverride: body.dndOverride ?? false
      }).returning();
      return {
        chatId: created.chatId,
        scope: created.scope,
        dndOverride: created.dndOverride,
        updatedAt: created.updatedAt.toISOString()
      };
    }

    const [updated] = await db.update(chatNotificationOverrides)
      .set({
        ...(body.scope !== undefined ? { scope: body.scope } : {}),
        ...(body.dndOverride !== undefined ? { dndOverride: body.dndOverride } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(chatNotificationOverrides.chatId, params.chatId), eq(chatNotificationOverrides.userId, userId)))
      .returning();

    return {
      chatId: updated.chatId,
      scope: updated.scope,
      dndOverride: updated.dndOverride,
      updatedAt: updated.updatedAt.toISOString()
    };
  });
}
