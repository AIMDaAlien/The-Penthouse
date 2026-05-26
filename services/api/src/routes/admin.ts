import { randomBytes } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { and, count, desc, eq, gte, sql, sum } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AdminModerateMessageRequestSchema,
  CreateInviteRequestSchema,
  UpdateRegistrationModeRequestSchema
} from '@penthouse/contracts';
import { env } from '../config/env.js';
import { db, pool } from '../db/pool.js';
import {
  chats,
  mediaUploads,
  messageModerationEvents,
  messages,
  pushNotifications,
  pushSubscriptions,
  serverSettings,
  signupInvites,
  users
} from '../db/schema.js';
import { badRequest, forbidden, notFound } from '../utils/error-responses.js';
import { toMemberDetail } from '../utils/users.js';

const startedAt = new Date();

function requireAdmin(request: FastifyRequest) {
  if (request.authUser?.role !== 'admin') {
    throw forbidden('Admin privileges required', 'ADMIN_REQUIRED');
  }
}

function inviteCode() {
  return randomBytes(9).toString('base64url').toUpperCase();
}

async function uploadDiagnostics() {
  const base = path.resolve(env.UPLOAD_DIR);
  try {
    const files = await readdir(base);
    let directoryBytes = 0;
    let latestUploadAt: string | null = null;
    for (const file of files.slice(0, 1000)) {
      const info = await stat(path.join(base, file));
      if (!info.isFile()) continue;
      directoryBytes += info.size;
      if (!latestUploadAt || info.mtime > new Date(latestUploadAt)) {
        latestUploadAt = info.mtime.toISOString();
      }
    }
    return {
      status: 'available' as const,
      directoryBytes,
      fileCount: files.length,
      latestUploadAt,
      scanLimited: files.length > 1000
    };
  } catch {
    return {
      status: 'unavailable' as const,
      directoryBytes: null,
      fileCount: null,
      latestUploadAt: null,
      scanLimited: false
    };
  }
}

async function hiddenMessageCount() {
  const rows = await db.select({
    messageId: messageModerationEvents.messageId,
    action: messageModerationEvents.action
  })
    .from(messageModerationEvents)
    .orderBy(desc(messageModerationEvents.createdAt));

  const latest = new Map<string, 'hide' | 'unhide'>();
  for (const row of rows) {
    if (!latest.has(row.messageId)) latest.set(row.messageId, row.action);
  }
  return [...latest.values()].filter((action) => action === 'hide').length;
}

export async function registerAdminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/admin')) return;
    await fastify.authenticate(request, reply);
    requireAdmin(request);
  });

  fastify.get('/api/v1/admin/summary', async () => {
    const [
      [{ total: memberTotal }],
      [{ total: activeMembers }],
      [{ total: bannedMembers }],
      [{ total: removedMembers }],
      [{ total: adminMembers }],
      [{ total: chatTotal }],
      [{ total: messageTotal }],
      [{ total: uploadTotal, bytes: uploadBytesTotal }],
      [{ total: successfulSends }],
      [{ total: failedSends }],
      [{ latest: lastFailureAt }],
      [latestInvite],
      uploads
    ] = await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(users).where(eq(users.status, 'active')),
      db.select({ total: count() }).from(users).where(eq(users.status, 'banned')),
      db.select({ total: count() }).from(users).where(eq(users.status, 'removed')),
      db.select({ total: count() }).from(users).where(eq(users.role, 'admin')),
      db.select({ total: count() }).from(chats),
      db.select({ total: count() }).from(messages),
      db.select({ total: count(), bytes: sum(mediaUploads.sizeBytes) }).from(mediaUploads),
      db.select({ total: count() }).from(pushNotifications).where(eq(pushNotifications.succeeded, true)),
      db.select({ total: count() }).from(pushNotifications).where(eq(pushNotifications.succeeded, false)),
      db.select({ latest: sql<Date | null>`max(${pushNotifications.sentAt})` }).from(pushNotifications).where(eq(pushNotifications.succeeded, false)),
      db.select().from(signupInvites).orderBy(desc(signupInvites.createdAt)).limit(1),
      uploadDiagnostics()
    ]);

    const recentModerationCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ total: recentActions24h }] = await db.select({ total: count() })
      .from(messageModerationEvents)
      .where(gte(messageModerationEvents.createdAt, recentModerationCutoff));

    const sockets = await fastify.io.fetchSockets();
    const connectedUsers = new Set(sockets.map((socket) => socket.data.userId).filter(Boolean));
    const activeChatRooms = [...fastify.io.sockets.adapter.rooms.keys()].filter((room) => room.startsWith('chat:')).length;

    return {
      app: {
        name: 'The Penthouse',
        checkedAt: new Date().toISOString(),
        databaseReachable: true,
        startedAt: startedAt.toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        version: '4.0.0-alpha.1',
        buildId: null,
        deployedAt: null
      },
      members: {
        total: memberTotal,
        active: activeMembers,
        banned: bannedMembers,
        removed: removedMembers,
        admins: adminMembers
      },
      content: {
        chats: chatTotal,
        messages: messageTotal,
        uploads: uploadTotal,
        uploadBytesTotal: Number(uploadBytesTotal ?? 0)
      },
      realtime: {
        sockets: sockets.length,
        connectedUsers: connectedUsers.size,
        activeChatRooms
      },
      moderation: {
        hiddenMessages: await hiddenMessageCount(),
        recentActions24h
      },
      invite: latestInvite ? {
        code: latestInvite.code,
        uses: latestInvite.uses,
        maxUses: latestInvite.maxUses,
        createdAt: latestInvite.createdAt.toISOString()
      } : {
        code: '',
        uses: 0,
        maxUses: 1,
        createdAt: startedAt.toISOString()
      },
      push: {
        configured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
        androidTokens: 0,
        iosTokens: 0,
        notificationsDisabled: 0,
        quietHoursEnabled: 0,
        previewsDisabled: 0,
        sinceStart: {
          successfulSends,
          failedSends,
          staleTokensRemoved: 0,
          lastFailureAt: lastFailureAt ? new Date(lastFailureAt).toISOString() : null
        }
      },
      uploads,
      errors: {
        sinceStart: {
          serverErrorCount: 0,
          lastServerErrorAt: null,
          routeGroups: []
        }
      },
      backup: {
        status: 'unconfigured',
        target: null,
        lastSuccessfulBackupAt: null
      }
    };
  });

  fastify.get('/api/v1/admin/members', async () => {
    const rows = await db.select().from(users).orderBy(users.createdAt);
    return {
      members: rows.map((user) => ({
        ...toMemberDetail(user),
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt.toISOString()
      })),
      total: rows.length
    };
  });

  fastify.get('/api/v1/admin/invites', async () => {
    const rows = await db.select().from(signupInvites).orderBy(desc(signupInvites.createdAt));
    return {
      invites: rows.map((invite) => ({
        id: invite.id,
        code: invite.code,
        label: invite.label,
        uses: invite.uses,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        revokedAt: invite.revokedAt?.toISOString() ?? null,
        createdAt: invite.createdAt.toISOString()
      }))
    };
  });

  fastify.post('/api/v1/admin/invites', async (request) => {
    const body = CreateInviteRequestSchema.parse(request.body);
    if (body.expiresAt && new Date(body.expiresAt).getTime() <= Date.now()) {
      throw badRequest('expiresAt must be in the future');
    }

    const [invite] = await db.insert(signupInvites).values({
      code: inviteCode(),
      label: body.label,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }).returning();

    return {
      id: invite.id,
      code: invite.code,
      label: invite.label,
      uses: invite.uses,
      maxUses: invite.maxUses,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      revokedAt: invite.revokedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString()
    };
  });

  fastify.post('/api/v1/admin/invites/:id/revoke', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [invite] = await db.update(signupInvites)
      .set({ revokedAt: new Date() })
      .where(eq(signupInvites.id, id))
      .returning({ id: signupInvites.id });

    if (!invite) throw notFound('Invite not found');
    return reply.status(204).send();
  });

  fastify.get('/api/v1/admin/registration-mode', async () => {
    const [setting] = await db.select().from(serverSettings).where(eq(serverSettings.key, 'registration_mode')).limit(1);
    return { registrationMode: normalizeRegistrationMode(setting?.value) };
  });

  fastify.put('/api/v1/admin/registration-mode', async (request) => {
    const body = UpdateRegistrationModeRequestSchema.parse(request.body);
    const [setting] = await db.insert(serverSettings)
      .values({ key: 'registration_mode', value: body.registrationMode, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: serverSettings.key,
        set: { value: body.registrationMode, updatedAt: new Date() }
      })
      .returning();

    return { registrationMode: normalizeRegistrationMode(setting.value) };
  });

  fastify.post('/api/v1/admin/moderate/:messageId', async (request) => {
    const params = request.params as { messageId: string };
    const query = request.query as { action?: 'hide' | 'unhide' };
    const body = AdminModerateMessageRequestSchema.parse(request.body);

    const action = query.action === 'unhide' ? 'unhide' : 'hide';
    return moderateMessage(fastify, params.messageId, request.authUser!.userId, action, body.reason);
  });

  fastify.post('/api/v1/admin/messages/:messageId/hide', async (request) => {
    const { messageId } = request.params as { messageId: string };
    const body = AdminModerateMessageRequestSchema.parse(request.body);
    return moderateMessage(fastify, messageId, request.authUser!.userId, 'hide', body.reason);
  });

  fastify.post('/api/v1/admin/messages/:messageId/unhide', async (request) => {
    const { messageId } = request.params as { messageId: string };
    const body = AdminModerateMessageRequestSchema.parse(request.body);
    return moderateMessage(fastify, messageId, request.authUser!.userId, 'unhide', body.reason);
  });

  fastify.get('/api/v1/admin/chats', async () => {
    const result = await pool.query(
      `SELECT c.id,
              c.type,
              CASE
                WHEN c.type = 'dm' THEN string_agg('@' || u.username, ' + ' ORDER BY u.username)
                ELSE c.name
              END AS name,
              c.created_at,
              c.updated_at
       FROM chats c
       LEFT JOIN chat_members cm ON cm.chat_id = c.id
       LEFT JOIN users u ON u.id = cm.user_id
       GROUP BY c.id, c.type, c.name, c.created_at, c.updated_at
       ORDER BY c.updated_at DESC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    }));
  });

  fastify.get('/api/v1/admin/chats/:chatId/messages', async (request) => {
    const { chatId } = request.params as { chatId: string };
    return listAdminMessages(chatId);
  });
}

function normalizeRegistrationMode(value?: string) {
  return value === 'closed' ? 'closed' : 'open';
}

async function moderateMessage(
  fastify: FastifyInstance,
  messageId: string,
  actorUserId: string,
  action: 'hide' | 'unhide',
  reason: string
) {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!message) throw notFound('Message not found');

  const [event] = await db.transaction(async (tx) => {
    await tx.update(messages)
      .set({
        hiddenByModeration: action === 'hide',
        moderationAction: action,
        moderationReason: reason,
        moderationActorUserId: actorUserId,
        moderationUpdatedAt: new Date()
      })
      .where(eq(messages.id, message.id));

    return tx.insert(messageModerationEvents).values({
      messageId: message.id,
      action,
      actorUserId,
      reason
    }).returning();
  });

  const moderated = await loadAdminMessage(message.id);
  fastify.io.to(`chat:${message.chatId}`).emit('message.moderated', {
    type: 'message.moderated',
    payload: {
      chatId: message.chatId,
      messageId: message.id,
      action,
      moderatedAt: event.createdAt.toISOString(),
      message: moderated
    }
  });

  return {
    ...moderated,
    messageId: message.id,
    action,
    moderatedAt: event.createdAt.toISOString()
  };
}

async function loadAdminMessage(messageId: string) {
  const [message] = await listAdminMessages(null, messageId);
  if (!message) throw notFound('Message not found');
  return message;
}

async function listAdminMessages(chatId: string | null, messageId?: string) {
  const resolvedChatId = chatId === '00000000-0000-0000-0000-000000000001'
    ? (await db.select({ id: chats.id }).from(chats).where(eq(chats.systemKey, 'general')).limit(1))[0]?.id ?? chatId
    : chatId;
  const result = await pool.query(
    `SELECT m.id,
            m.chat_id,
            m.sender_id,
            u.username AS sender_username,
            u.display_name AS sender_display_name,
            u.status AS sender_status,
            m.content,
            m.message_type,
            m.metadata,
            m.created_at,
            m.hidden_by_moderation,
            m.moderation_action,
            m.moderation_reason,
            m.moderation_updated_at,
            m.moderation_actor_user_id,
            actor.username AS moderation_actor_username,
            actor.display_name AS moderation_actor_display_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN users actor ON actor.id = m.moderation_actor_user_id
     WHERE ($1::uuid IS NULL OR m.chat_id = $1::uuid)
       AND ($2::uuid IS NULL OR m.id = $2::uuid)
     ORDER BY m.created_at ASC`,
    [resolvedChatId, messageId ?? null]
  );

  return result.rows.map((row) => ({
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    senderStatus: row.sender_status,
    content: row.content,
    type: row.message_type,
    metadata: row.metadata ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    hidden: Boolean(row.hidden_by_moderation),
    moderation: {
      hiddenByModeration: Boolean(row.hidden_by_moderation),
      latestAction: row.moderation_action ?? null,
      latestReason: row.moderation_reason ?? null,
      latestCreatedAt: row.moderation_updated_at ? new Date(row.moderation_updated_at).toISOString() : null,
      latestActorUserId: row.moderation_actor_user_id ?? null,
      latestActorUsername: row.moderation_actor_username ?? null,
      latestActorDisplayName: row.moderation_actor_display_name ?? null
    }
  }));
}
