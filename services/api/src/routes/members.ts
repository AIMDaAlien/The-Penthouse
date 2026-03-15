import type { FastifyInstance } from 'fastify';
import {
  ChangePasswordRequestSchema,
  MeResponseSchema,
  MemberDetailSchema,
  MemberSummarySchema,
  RotateRecoveryCodeResponseSchema,
  TestNoticeAckRequestSchema,
  TestNoticeAckResponseSchema,
  UpdateProfileRequestSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword, createRecoveryCode } from '../utils/security.js';
import { createAuthResponse, issueRecoveryCode } from '../utils/sessions.js';
import { getUserById, listMembers, mapAuthUser, mapMeResponse, mapMemberDetail, mapMemberSummary } from '../utils/users.js';
import { env } from '../config/env.js';

async function validateAvatarOwnership(userId: string, avatarUploadId: string | null) {
  if (avatarUploadId === null) return null;

  const upload = await pool.query(
    `SELECT id, uploader_id, content_type
     FROM media_uploads
     WHERE id = $1`,
    [avatarUploadId]
  );

  if (!upload.rowCount) {
    return { ok: false as const, error: 'Avatar upload not found' };
  }

  const row = upload.rows[0] as { uploader_id: string; content_type: string | null };
  if (row.uploader_id !== userId) {
    return { ok: false as const, error: 'Avatar must be one of your own uploads' };
  }

  if (!row.content_type?.startsWith('image/')) {
    return { ok: false as const, error: 'Avatar upload must be an image' };
  }

  return { ok: true as const };
}

export async function registerMemberRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await getUserById(pool, request.user.userId);
    if (!user) return reply.status(401).send({ error: 'Invalid user session' });
    return MeResponseSchema.parse(mapMeResponse(user));
  });

  app.patch('/api/v1/me/profile', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = UpdateProfileRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'avatarUploadId')) {
      const avatarCheck = await validateAvatarOwnership(request.user.userId, parsed.data.avatarUploadId ?? null);
      if (avatarCheck && !avatarCheck.ok) {
        return reply.status(400).send({ error: avatarCheck.error });
      }
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'displayName')) {
      assignments.push(`display_name = $${values.length + 1}`);
      values.push(parsed.data.displayName);
    }

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'bio')) {
      assignments.push(`bio = $${values.length + 1}`);
      values.push(parsed.data.bio ?? null);
    }

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'avatarUploadId')) {
      assignments.push(`avatar_media_id = $${values.length + 1}`);
      values.push(parsed.data.avatarUploadId ?? null);
    }

    if (!assignments.length) {
      return reply.status(400).send({ error: 'No recognized profile fields were provided' });
    }

    values.push(request.user.userId);

    await pool.query(
      `UPDATE users
       SET ${assignments.join(', ')}
       WHERE id = $${values.length}`,
      values
    );

    const updated = await getUserById(pool, request.user.userId);
    if (!updated) return reply.status(401).send({ error: 'Invalid user session' });
    return MeResponseSchema.parse(mapMeResponse(updated));
  });

  app.post('/api/v1/me/password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = ChangePasswordRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const user = await getUserById(pool, request.user.userId);
    if (!user?.password_hash) return reply.status(401).send({ error: 'Invalid user session' });

    const ok = await verifyPassword(parsed.data.currentPassword, user.password_hash);
    if (!ok) return reply.status(401).send({ error: 'Current password is incorrect' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const recoveryCode = createRecoveryCode();
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = FALSE
         WHERE id = $2`,
        [await hashPassword(parsed.data.newPassword), user.id]
      );
      await issueRecoveryCode(client, user.id, recoveryCode);
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

      const response = await createAuthResponse(app, client, user.id, recoveryCode);
      await client.query('COMMIT');
      return reply.send(response);
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to change password' });
    } finally {
      client.release();
    }
  });

  app.post('/api/v1/me/recovery-code/rotate', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const recoveryCode = createRecoveryCode();
    await issueRecoveryCode(pool, request.user.userId, recoveryCode);
    return RotateRecoveryCodeResponseSchema.parse({ recoveryCode });
  });

  app.post('/api/v1/me/test-notice/ack', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = TestNoticeAckRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    if (parsed.data.version !== env.TEST_ACCOUNT_NOTICE_VERSION) {
      return reply.status(400).send({
        error: `Unsupported test notice version. Required: ${env.TEST_ACCOUNT_NOTICE_VERSION}`
      });
    }

    const update = await pool.query(
      `UPDATE users
       SET test_notice_accepted_version = $1,
           test_notice_accepted_at = NOW()
       WHERE id = $2
       RETURNING test_notice_accepted_at`,
      [env.TEST_ACCOUNT_NOTICE_VERSION, request.user.userId]
    );
    if (!update.rowCount) return reply.status(401).send({ error: 'Invalid user session' });

    const user = await getUserById(pool, request.user.userId);
    if (!user) return reply.status(401).send({ error: 'Invalid user session' });

    request.log.info(
      {
        userId: user.id,
        version: env.TEST_ACCOUNT_NOTICE_VERSION
      },
      'test notice acknowledged'
    );

    return TestNoticeAckResponseSchema.parse({
      user: mapAuthUser(user),
      acceptedAt: new Date(update.rows[0].test_notice_accepted_at as string).toISOString()
    });
  });

  app.get('/api/v1/members', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request) => {
    const q = String((request.query as { q?: string })?.q ?? '');
    const rows = await listMembers(pool, q, false);
    return rows.map((row) => MemberSummarySchema.parse(mapMemberSummary(row)));
  });

  app.get('/api/v1/members/:memberId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const user = await getUserById(pool, memberId);
    if (!user || user.status !== 'active') {
      return reply.status(404).send({ error: 'Member not found' });
    }

    return MemberDetailSchema.parse(mapMemberDetail(user));
  });
}
