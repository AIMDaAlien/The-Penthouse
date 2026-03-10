import type { FastifyInstance } from 'fastify';
import {
  AdminInviteResponseSchema,
  AdminMemberSummarySchema,
  AdminMessageSchema,
  AdminTempPasswordResponseSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { createInviteCode, createTemporaryPassword, hashPassword } from '../utils/security.js';
import {
  avatarUrlFromFileName,
  getUserById,
  listMembers,
  mapAdminMemberSummary
} from '../utils/users.js';

const MASTER_INVITE_SYSTEM_KEY = 'master';

function ensureAdmin(request: any, reply: any) {
  if (request.user.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin only' });
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

async function getMasterInvite() {
  const result = await pool.query(
    `SELECT code, uses, max_uses, created_at
     FROM signup_invites
     WHERE system_key = $1`,
    [MASTER_INVITE_SYSTEM_KEY]
  );
  return result.rows[0] as { code: string; uses: number; max_uses: number; created_at: string } | undefined;
}

async function loadTargetMember(memberId: string) {
  return getUserById(pool, memberId);
}

function forbidSelfOrAdminAction(request: any, reply: any, target: Awaited<ReturnType<typeof loadTargetMember>>) {
  if (!target) return reply.status(404).send({ error: 'Member not found' });
  if (target.id === request.user.userId) return reply.status(409).send({ error: 'Cannot modify your own account' });
  if (target.role === 'admin') return reply.status(409).send({ error: 'Cannot modify another admin account' });
  return null;
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/admin/invite', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const invite = await getMasterInvite();
    if (!invite) return reply.status(404).send({ error: 'Master invite not found' });

    return AdminInviteResponseSchema.parse({
      code: invite.code,
      uses: Number(invite.uses),
      maxUses: Number(invite.max_uses),
      createdAt: new Date(invite.created_at).toISOString()
    });
  });

  app.post('/api/v1/admin/invite/rotate', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nextCode = createInviteCode();
      const existing = await client.query(
        `SELECT code
         FROM signup_invites
         WHERE system_key = $1
         FOR UPDATE`,
        [MASTER_INVITE_SYSTEM_KEY]
      );

      if (existing.rowCount) {
        await client.query(
          `UPDATE signup_invites
           SET code = $1,
               uses = 0
           WHERE system_key = $2`,
          [nextCode, MASTER_INVITE_SYSTEM_KEY]
        );
      } else {
        await client.query(
          `INSERT INTO signup_invites(code, max_uses, uses, system_key)
           VALUES($1, 999999, 0, $2)`,
          [nextCode, MASTER_INVITE_SYSTEM_KEY]
        );
      }

      const updated = await client.query(
        `SELECT code, uses, max_uses, created_at
         FROM signup_invites
         WHERE system_key = $1`,
        [MASTER_INVITE_SYSTEM_KEY]
      );

      await client.query('COMMIT');
      const invite = updated.rows[0] as { code: string; uses: number; max_uses: number; created_at: string };
      return AdminInviteResponseSchema.parse({
        code: invite.code,
        uses: Number(invite.uses),
        maxUses: Number(invite.max_uses),
        createdAt: new Date(invite.created_at).toISOString()
      });
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to rotate invite' });
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE users SET status = 'removed' WHERE id = $1`, [memberId]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [memberId]);
      await client.query('DELETE FROM chat_members WHERE user_id = $1', [memberId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove member' });
    } finally {
      client.release();
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE users SET status = 'banned' WHERE id = $1`, [memberId]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [memberId]);
      await client.query('DELETE FROM chat_members WHERE user_id = $1', [memberId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to ban member' });
    } finally {
      client.release();
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

  app.get('/api/v1/admin/chats/:chatId/messages', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const forbidden = ensureAdmin(request, reply);
    if (forbidden) return forbidden;

    const { chatId } = request.params as { chatId: string };
    const { cursor, limit = '30' } = request.query as { cursor?: string; limit?: string };
    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 30));

    const query = cursor
      ? `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status, media.storage_key AS avatar_storage_key,
                m.content, m.created_at, m.client_message_id
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY m.created_at DESC
         LIMIT $3`
      : `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
                u.status AS sender_status, media.storage_key AS avatar_storage_key,
                m.content, m.created_at, m.client_message_id
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
         WHERE m.chat_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`;

    const values = cursor ? [chatId, cursor, safeLimit] : [chatId, safeLimit];
    const rows = await pool.query(query, values);

    return rows.rows.map((row: any) => AdminMessageSchema.parse({
      id: row.id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      senderDisplayName: row.sender_display_name,
      senderAvatarUrl: avatarUrlFromFileName(row.avatar_storage_key),
      senderStatus: row.sender_status,
      hidden: row.sender_status !== 'active',
      content: row.content,
      createdAt: new Date(row.created_at).toISOString(),
      clientMessageId: row.client_message_id ?? undefined
    }));
  });
}
