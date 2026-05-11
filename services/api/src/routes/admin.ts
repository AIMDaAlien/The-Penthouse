import { randomBytes } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { and, count, desc, eq, gte, sql, sum } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AdminModerateMessageRequestSchema,
  CreateInviteRequestSchema
} from '@penthouse/contracts';
import { env } from '../config/env.js';
import { db } from '../db/pool.js';
import {
  chats,
  mediaUploads,
  messageModerationEvents,
  messages,
  pushNotifications,
  pushSubscriptions,
  signupInvites,
  users
} from '../db/schema.js';
import { forbidden, notFound } from '../utils/error-responses.js';
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
  fastify.addHook('onRoute', (route) => {
    if (route.url.startsWith('/api/v1/admin')) {
      const existing = Array.isArray(route.preHandler) ? route.preHandler : route.preHandler ? [route.preHandler] : [];
      route.preHandler = [...existing, fastify.authenticate, async (request) => requireAdmin(request)];
    }
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
    const [invite] = await db.insert(signupInvites).values({
      code: inviteCode(),
      label: body.label,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }).returning();

    return {
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses,
      createdAt: invite.createdAt.toISOString()
    };
  });

  fastify.post('/api/v1/admin/moderate/:messageId', async (request) => {
    const params = request.params as { messageId: string };
    const query = request.query as { action?: 'hide' | 'unhide' };
    const body = AdminModerateMessageRequestSchema.parse(request.body);

    const [message] = await db.select().from(messages).where(eq(messages.id, params.messageId)).limit(1);
    if (!message) throw notFound('Message not found');

    const action = query.action === 'unhide' ? 'unhide' : 'hide';
    const [event] = await db.insert(messageModerationEvents).values({
      messageId: message.id,
      action,
      actorUserId: request.authUser!.userId,
      reason: body.reason
    }).returning();

    fastify.io.to(`chat:${message.chatId}`).emit('message.moderated', {
      type: 'message.moderated',
      payload: {
        chatId: message.chatId,
        messageId: message.id,
        action,
        moderatedAt: event.createdAt.toISOString()
      }
    });

    return {
      messageId: message.id,
      action,
      moderatedAt: event.createdAt.toISOString()
    };
  });
}
