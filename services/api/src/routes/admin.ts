import type { FastifyInstance } from 'fastify';
import { access } from 'node:fs/promises';
import {
  AdminModerateMessageRequestSchema,
  AdminInviteResponseSchema,
  AdminInviteDetailSchema,
  CreateInviteRequestSchema,
  RegistrationModeResponseSchema,
  UpdateRegistrationModeRequestSchema,
  AdminMemberSummarySchema,
  AdminMessageSchema,
  AdminOperatorSummarySchema,
  AdminTempPasswordResponseSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { createInviteCode, createTemporaryPassword, hashPassword } from '../utils/security.js';
import { getRegistrationMode, setRegistrationMode } from '../utils/settings.js';
import {
  getUserById,
  listMembers,
  mapAdminMemberSummary
} from '../utils/users.js';
import { toAdminMessage } from '../utils/messages.js';
import { listAdminChatSummaries } from '../utils/chats.js';
import { formatValidationError } from '../utils/error-responses.js';
import {
  getBackupDiagnostics,
  getBuildRuntimeDiagnostics,
  getErrorRuntimeDiagnostics,
  getPushRuntimeDiagnostics,
  getUploadDiagnostics
} from '../utils/operatorDiagnostics.js';
import { loadGroupedReactionsForMessageIds } from '../utils/messageHydration.js';
import {
  loadAdminMessageById,
  loadMemberMessageById,
  setMessageModerationState
} from '../utils/messageModeration.js';

function ensureAdmin(request: any, reply: any) {
  if (request.user.role !== 'admin') {
    return reply.status(403).send({ error: `You don't have permission to perform this action` });
  }
  return null;
}

async function disconnectUserSockets(app: FastifyInstance, userId: string): Promise<void> {
  const server = app.io as any;
  if (!server || typeof server.in !== 'function') return;

  const sockets = await server.in(`user:${userId}`).fetchSockets();
  for (const socket of sockets) {
    socket.disconnect(true);
  }
}

async function isPushConfigured(): Promise<boolean> {
  const serviceAccountPath = env.FCM_SERVICE_ACCOUNT_PATH.trim();
  if (!serviceAccountPath) return false;

  try {
    await access(serviceAccountPath);
    return true;
  } catch {
    return false;
  }
}

async function loadTargetMember(memberId: string) {
  return getUserById(pool, memberId);
}

async function deactivateMember(memberId: string, status: 'removed' | 'banned'): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET status = $1 WHERE id = $2`, [status, memberId]);
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [memberId]);
    await client.query('DELETE FROM chat_members WHERE user_id = $1', [memberId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getRealtimeDiagnostics(app: FastifyInstance) {
  const sockets = (app.io as any)?.sockets?.sockets;
  const rooms = (app.io as any)?.sockets?.adapter?.rooms;
  const socketCount = typeof sockets?.size === 'number' ? sockets.size : 0;
  const connectedUsers = new Set<string>();

  if (sockets?.values) {
    for (const socket of sockets.values()) {
      const userId = socket?.data?.userId;
      if (typeof userId === 'string' && userId) {
        connectedUsers.add(userId);
      }
    }
  }

  let activeChatRooms = 0;
  if (rooms?.keys) {
    for (const roomName of rooms.keys()) {
      if (typeof roomName === 'string' && roomName.startsWith('active-chat:')) {
        activeChatRooms++;
      }
    }
  }

  return {
    sockets: socketCount,
    connectedUsers: connectedUsers.size,
    activeChatRooms
  };
}

function forbidSelfOrAdminAction(request: any, reply: any, target: Awaited<ReturnType<typeof loadTargetMember>>) {
  if (!target) return reply.status(404).send({ error: 'Member not found' });
  if (target.id === request.user.userId) return reply.status(409).send({ error: 'Cannot modify your own account' });
  if (target.role === 'admin') return reply.status(409).send({ error: 'Cannot modify another admin account' });
  return null;
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/invites — list all invites
  app.get('/api/v1/admin/invites', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const result = await pool.query(
      `SELECT id, code, label, max_uses, uses, expires_at, revoked_at, created_at
       FROM signup_invites
       ORDER BY created_at DESC`
    );

    return result.rows.map((row: any) => AdminInviteDetailSchema.parse({
      id: row.id,
      code: row.code,
      label: row.label,
      uses: Number(row.uses),
      maxUses: Number(row.max_uses),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString()
    }));
  });

  // POST /api/v1/admin/invites — create new invite
  app.post('/api/v1/admin/invites', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const parsed = CreateInviteRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const code = createInviteCode();
    const { label, maxUses, expiresAt } = parsed.data;

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return reply.status(400).send({ error: 'expiresAt must be in the future' });
    }

    const result = await pool.query(
      `INSERT INTO signup_invites (id, code, label, max_uses, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, code, label, max_uses, uses, expires_at, revoked_at, created_at`,
      [code, label, maxUses, expiresAt ?? null]
    );

    const row = result.rows[0];
    return reply.status(201).send(AdminInviteDetailSchema.parse({
      id: row.id,
      code: row.code,
      label: row.label,
      uses: Number(row.uses),
      maxUses: Number(row.max_uses),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString()
    }));
  });

  // POST /api/v1/admin/invites/:inviteId/revoke — revoke an invite
  app.post('/api/v1/admin/invites/:inviteId/revoke', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { inviteId } = request.params as { inviteId: string };
    const result = await pool.query(
      `UPDATE signup_invites
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id`,
      [inviteId]
    );

    if (!result.rowCount) {
      return reply.status(404).send({ error: 'Invite not found or already revoked' });
    }

    return reply.status(204).send();
  });

  // GET /api/v1/admin/registration-mode
  app.get('/api/v1/admin/registration-mode', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const registrationMode = await getRegistrationMode(pool);
    return RegistrationModeResponseSchema.parse({ registrationMode });
  });

  // PUT /api/v1/admin/registration-mode
  app.put('/api/v1/admin/registration-mode', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const parsed = UpdateRegistrationModeRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    await setRegistrationMode(pool, parsed.data.registrationMode);
    return RegistrationModeResponseSchema.parse({ registrationMode: parsed.data.registrationMode });
  });

  app.get('/api/v1/admin/operator/summary', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const checkedAt = new Date().toISOString();
    const realtime = getRealtimeDiagnostics(app);
    const errorRuntime = getErrorRuntimeDiagnostics();
    const pushRuntime = getPushRuntimeDiagnostics();
    const [memberCounts, contentCounts, moderationCounts, pushCounts, firstActiveInviteResult, pushConfigured, buildRuntime, uploadDiagnostics, backupDiagnostics] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'banned')::int AS banned,
           COUNT(*) FILTER (WHERE status = 'removed')::int AS removed,
           COUNT(*) FILTER (WHERE role = 'admin')::int AS admins
         FROM users`
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM chats) AS chats,
           (SELECT COUNT(*)::int FROM messages) AS messages,
           (SELECT COUNT(*)::int FROM media_uploads) AS uploads,
           COALESCE((SELECT SUM(size_bytes)::bigint FROM media_uploads), 0) AS upload_bytes_total`
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM messages WHERE hidden_by_moderation = TRUE) AS hidden_messages,
           (SELECT COUNT(*)::int FROM message_moderation_events WHERE created_at >= NOW() - INTERVAL '24 hours') AS recent_actions_24h`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE platform = 'android')::int AS android_tokens,
           COUNT(*) FILTER (WHERE platform = 'ios')::int AS ios_tokens,
           COUNT(*) FILTER (WHERE notifications_enabled = FALSE)::int AS notifications_disabled,
           COUNT(*) FILTER (WHERE quiet_hours_enabled = TRUE)::int AS quiet_hours_enabled,
           COUNT(*) FILTER (WHERE previews_enabled = FALSE)::int AS previews_disabled
         FROM device_tokens`
      ),
      pool.query(
        `SELECT code, uses, max_uses, created_at
         FROM signup_invites
         WHERE revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at ASC
         LIMIT 1`
      ),
      isPushConfigured(),
      getBuildRuntimeDiagnostics(),
      getUploadDiagnostics(),
      getBackupDiagnostics()
    ]);

    const memberRow = memberCounts.rows[0] as {
      total: number;
      active: number;
      banned: number;
      removed: number;
      admins: number;
    };
    const contentRow = contentCounts.rows[0] as {
      chats: number;
      messages: number;
      uploads: number;
      upload_bytes_total: string | number;
    };
    const moderationRow = moderationCounts.rows[0] as {
      hidden_messages: number;
      recent_actions_24h: number;
    };
    const pushRow = pushCounts.rows[0] as {
      android_tokens: number;
      ios_tokens: number;
      notifications_disabled: number;
      quiet_hours_enabled: number;
      previews_disabled: number;
    };
    const inviteRow = firstActiveInviteResult.rows[0] as { code: string; uses: number; max_uses: number; created_at: string } | undefined;

    return AdminOperatorSummarySchema.parse({
      app: {
        name: 'The Penthouse API',
        checkedAt,
        databaseReachable: true,
        startedAt: buildRuntime.startedAt,
        uptimeSeconds: buildRuntime.uptimeSeconds,
        version: buildRuntime.version,
        buildId: buildRuntime.buildId,
        deployedAt: buildRuntime.deployedAt
      },
      members: {
        total: Number(memberRow.total),
        active: Number(memberRow.active),
        banned: Number(memberRow.banned),
        removed: Number(memberRow.removed),
        admins: Number(memberRow.admins)
      },
      content: {
        chats: Number(contentRow.chats),
        messages: Number(contentRow.messages),
        uploads: Number(contentRow.uploads),
        uploadBytesTotal: Number(contentRow.upload_bytes_total)
      },
      realtime,
      moderation: {
        hiddenMessages: Number(moderationRow.hidden_messages),
        recentActions24h: Number(moderationRow.recent_actions_24h)
      },
      invite: {
        code: inviteRow?.code ?? '',
        uses: Number(inviteRow?.uses ?? 0),
        maxUses: Number(inviteRow?.max_uses ?? 1),
        createdAt: inviteRow?.created_at ? new Date(inviteRow.created_at).toISOString() : checkedAt
      },
      push: {
        configured: pushConfigured,
        androidTokens: Number(pushRow.android_tokens),
        iosTokens: Number(pushRow.ios_tokens),
        notificationsDisabled: Number(pushRow.notifications_disabled),
        quietHoursEnabled: Number(pushRow.quiet_hours_enabled),
        previewsDisabled: Number(pushRow.previews_disabled),
        sinceStart: pushRuntime
      },
      uploads: {
        status: uploadDiagnostics.status,
        directoryBytes: uploadDiagnostics.directoryBytes,
        fileCount: uploadDiagnostics.fileCount,
        latestUploadAt: uploadDiagnostics.latestUploadAt,
        scanLimited: uploadDiagnostics.scanLimited
      },
      errors: {
        sinceStart: errorRuntime
      },
      backup: {
        status: backupDiagnostics.status,
        target: backupDiagnostics.target,
        lastSuccessfulBackupAt: backupDiagnostics.lastSuccessfulBackupAt
      }
    });
  });

  app.get('/api/v1/admin/members', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const q = String((request.query as { q?: string })?.q ?? '');
    const rows = await listMembers(pool, q, true);
    return rows.map((row) => AdminMemberSummarySchema.parse(mapAdminMemberSummary(row)));
  });

  app.post('/api/v1/admin/members/:memberId/remove', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { memberId } = request.params as { memberId: string };
    const target = await loadTargetMember(memberId);
    const blocked = forbidSelfOrAdminAction(request, reply, target);
    if (blocked) return blocked;

    try {
      await deactivateMember(memberId, 'removed');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove member' });
    }

    await disconnectUserSockets(app, memberId);
    return reply.status(204).send();
  });

  app.post('/api/v1/admin/members/:memberId/ban', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { memberId } = request.params as { memberId: string };
    const target = await loadTargetMember(memberId);
    const blocked = forbidSelfOrAdminAction(request, reply, target);
    if (blocked) return blocked;

    try {
      await deactivateMember(memberId, 'banned');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to ban member' });
    }

    await disconnectUserSockets(app, memberId);
    return reply.status(204).send();
  });

  app.post('/api/v1/admin/members/:memberId/temp-password', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { memberId } = request.params as { memberId: string };
    const target = await loadTargetMember(memberId);
    const blocked = forbidSelfOrAdminAction(request, reply, target);
    if (blocked) return blocked;
    if (!target) return reply.status(404).send({ error: 'Member not found' });
    if (target.status !== 'active') return reply.status(409).send({ error: 'Member account is not active' });

    const temporaryPassword = createTemporaryPassword();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = TRUE
         WHERE id = $2`,
        [await hashPassword(temporaryPassword), memberId]
      );
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [memberId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to issue temporary password' });
    } finally {
      client.release();
    }

    await disconnectUserSockets(app, memberId);

    return AdminTempPasswordResponseSchema.parse({
      userId: target.id,
      username: target.username,
      temporaryPassword
    });
  });

  app.get('/api/v1/admin/chats', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    return listAdminChatSummaries(pool);
  });

  app.get('/api/v1/admin/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { chatId } = request.params as { chatId: string };
    const { cursor, limit = '30' } = request.query as { cursor?: string; limit?: string };
    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 30));

    const query = cursor
      ? `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status, media.storage_key AS avatar_storage_key,
                m.content, m.message_type, m.metadata, m.reply_to_snapshot, m.created_at,
                m.edited_at, m.edit_count, m.deleted_at, m.deleted_by_user_id, m.client_message_id,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at,
                m.moderation_actor_user_id, actor.username AS moderation_actor_username,
                actor.display_name AS moderation_actor_display_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN users actor ON actor.id = m.moderation_actor_user_id
         WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status, media.storage_key AS avatar_storage_key,
                m.content, m.message_type, m.metadata, m.reply_to_snapshot, m.created_at,
                m.edited_at, m.edit_count, m.deleted_at, m.deleted_by_user_id, m.client_message_id,
                m.hidden_by_moderation, m.moderation_action, m.moderation_reason, m.moderation_updated_at,
                m.moderation_actor_user_id, actor.username AS moderation_actor_username,
                actor.display_name AS moderation_actor_display_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         LEFT JOIN users actor ON actor.id = m.moderation_actor_user_id
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`;

    const values = cursor ? [chatId, cursor, safeLimit] : [chatId, safeLimit];
    const rows = await pool.query(query, values);
    const messages = rows.rows.map((row: any) => AdminMessageSchema.parse(toAdminMessage(row)));
    const groupedReactions = await loadGroupedReactionsForMessageIds(pool, messages.map((message) => message.id));

    return messages.map((message) =>
      AdminMessageSchema.parse({
        ...message,
        ...(groupedReactions.has(message.id) ? { reactions: groupedReactions.get(message.id) } : {})
      })
    );
  });

  app.post('/api/v1/admin/messages/:messageId/hide', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { messageId } = request.params as { messageId: string };
    const parsed = AdminModerateMessageRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const result = await setMessageModerationState(messageId, request.user.userId, 'hide', parsed.data.reason);
    if ('error' in result) {
      return reply.status(result.error === 'Message not found' ? 404 : 409).send({ error: result.error });
    }

    const [memberMessage, adminMessage] = await Promise.all([
      loadMemberMessageById(messageId),
      loadAdminMessageById(messageId)
    ]);

    if (memberMessage) {
      app.io.to(`chat:${result.chatId}`).emit('message.moderated', {
        type: 'message.moderated',
        payload: {
          chatId: result.chatId,
          messageId,
          action: 'hide',
          moderatedAt: new Date().toISOString(),
          message: memberMessage
        }
      });
    }

    if (!adminMessage) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    return AdminMessageSchema.parse(adminMessage);
  });

  app.post('/api/v1/admin/messages/:messageId/unhide', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { messageId } = request.params as { messageId: string };
    const parsed = AdminModerateMessageRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const result = await setMessageModerationState(messageId, request.user.userId, 'unhide', parsed.data.reason);
    if ('error' in result) {
      return reply.status(result.error === 'Message not found' ? 404 : 409).send({ error: result.error });
    }

    const [memberMessage, adminMessage] = await Promise.all([
      loadMemberMessageById(messageId),
      loadAdminMessageById(messageId)
    ]);

    if (memberMessage) {
      app.io.to(`chat:${result.chatId}`).emit('message.moderated', {
        type: 'message.moderated',
        payload: {
          chatId: result.chatId,
          messageId,
          action: 'unhide',
          moderatedAt: new Date().toISOString(),
          message: memberMessage
        }
      });
    }

    if (!adminMessage) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    return AdminMessageSchema.parse(adminMessage);
  });
}
