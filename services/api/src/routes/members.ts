import type { FastifyInstance } from 'fastify';
import {
  ChangePasswordRequestSchema,
  DeviceNotificationSettingsSchema,
  GetDeviceNotificationSettingsQuerySchema,
  MeResponseSchema,
  MemberDetailSchema,
  MemberSummarySchema,
  RevokeOtherSessionsResponseSchema,
  RegisterDeviceTokenRequestSchema,
  RegisterDeviceTokenResponseSchema,
  SessionSummarySchema,
  RotateRecoveryCodeResponseSchema,
  TestNoticeAckRequestSchema,
  TestNoticeAckResponseSchema,
  UnregisterDeviceTokenRequestSchema,
  UpdateDeviceNotificationSettingsRequestSchema,
  UpdateProfileRequestSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword, createRecoveryCode } from '../utils/security.js';
import { createAuthResponse, getSessionMetadataFromRequest, issueRecoveryCode, listSessionsForUser, touchCurrentSessionPushState } from '../utils/sessions.js';
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

type DeviceNotificationSettingsRow = {
  token: string;
  notifications_enabled: boolean;
  previews_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start_minute: number | null;
  quiet_hours_end_minute: number | null;
  timezone: string | null;
};

function mapDeviceNotificationSettings(row: DeviceNotificationSettingsRow) {
  return DeviceNotificationSettingsSchema.parse({
    token: row.token,
    notificationsEnabled: row.notifications_enabled,
    previewsEnabled: row.previews_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStartMinute: row.quiet_hours_start_minute,
    quietHoursEndMinute: row.quiet_hours_end_minute,
    timezone: row.timezone
  });
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

      const response = await createAuthResponse(app, client, user.id, recoveryCode, getSessionMetadataFromRequest(request));
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

  app.get('/api/v1/me/sessions', { preHandler: [app.authenticate] }, async (request) => {
    const sessions = await listSessionsForUser(pool, request.user.userId, request.user.sessionId ?? null);
    return sessions.map((session) => SessionSummarySchema.parse(session));
  });

  app.delete('/api/v1/me/sessions/others', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!request.user.sessionId) {
      return reply.status(409).send({ error: 'Refresh this device before revoking other sessions' });
    }

    const result = await pool.query(
      `DELETE FROM refresh_tokens
       WHERE user_id = $1
         AND id <> $2`,
      [request.user.userId, request.user.sessionId]
    );

    return reply.send(
      RevokeOtherSessionsResponseSchema.parse({
        revokedCount: Number(result.rowCount ?? 0)
      })
    );
  });

  app.delete('/api/v1/me/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    if (request.user.sessionId && sessionId === request.user.sessionId) {
      return reply.status(409).send({ error: 'Use logout to end the current session' });
    }

    const result = await pool.query(
      `DELETE FROM refresh_tokens
       WHERE id = $1
         AND user_id = $2`,
      [sessionId, request.user.userId]
    );

    if (!result.rowCount) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.status(204).send();
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

  app.put('/api/v1/me/device-tokens', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = RegisterDeviceTokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');

      let previousSettings: DeviceNotificationSettingsRow | null = null;
      if (parsed.data.previousToken && parsed.data.previousToken !== parsed.data.token) {
        const previous = await client.query<DeviceNotificationSettingsRow>(
          `SELECT token, notifications_enabled, previews_enabled, quiet_hours_enabled,
                  quiet_hours_start_minute, quiet_hours_end_minute, timezone
           FROM device_tokens
           WHERE token = $1 AND user_id = $2`,
          [parsed.data.previousToken, request.user.userId]
        );
        previousSettings = previous.rows[0] ?? null;
      }

      await client.query(
        'DELETE FROM device_tokens WHERE token = $1 AND user_id <> $2',
        [parsed.data.token, request.user.userId]
      );

      if (previousSettings) {
        result = await client.query(
          `INSERT INTO device_tokens(
             user_id,
             platform,
             token,
             notifications_enabled,
             previews_enabled,
             quiet_hours_enabled,
             quiet_hours_start_minute,
             quiet_hours_end_minute,
             timezone
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (token) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               platform = EXCLUDED.platform,
               notifications_enabled = EXCLUDED.notifications_enabled,
               previews_enabled = EXCLUDED.previews_enabled,
               quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
               quiet_hours_start_minute = EXCLUDED.quiet_hours_start_minute,
               quiet_hours_end_minute = EXCLUDED.quiet_hours_end_minute,
               timezone = EXCLUDED.timezone,
               updated_at = NOW()
           RETURNING id`,
          [
            request.user.userId,
            parsed.data.platform,
            parsed.data.token,
            previousSettings.notifications_enabled,
            previousSettings.previews_enabled,
            previousSettings.quiet_hours_enabled,
            previousSettings.quiet_hours_start_minute,
            previousSettings.quiet_hours_end_minute,
            previousSettings.timezone
          ]
        );
      } else {
        result = await client.query(
          `INSERT INTO device_tokens(user_id, platform, token)
           VALUES ($1, $2, $3)
           ON CONFLICT (token) DO UPDATE
           SET user_id = EXCLUDED.user_id,
               platform = EXCLUDED.platform,
               updated_at = NOW()
           RETURNING id`,
          [request.user.userId, parsed.data.platform, parsed.data.token]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to register device token' });
    } finally {
      client.release();
    }

    await touchCurrentSessionPushState(pool, request.user.sessionId ?? null, true);

    return RegisterDeviceTokenResponseSchema.parse({
      id: String(result.rows[0].id)
    });
  });

  app.delete('/api/v1/me/device-tokens', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = UnregisterDeviceTokenRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await pool.query(
      'DELETE FROM device_tokens WHERE token = $1 AND user_id = $2',
      [parsed.data.token, request.user.userId]
    );

    await touchCurrentSessionPushState(pool, request.user.sessionId ?? null, false);

    return reply.status(204).send();
  });

  app.get('/api/v1/me/device-notification-settings', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = GetDeviceNotificationSettingsQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const result = await pool.query<DeviceNotificationSettingsRow>(
      `SELECT token, notifications_enabled, previews_enabled, quiet_hours_enabled,
              quiet_hours_start_minute, quiet_hours_end_minute, timezone
       FROM device_tokens
       WHERE token = $1 AND user_id = $2`,
      [parsed.data.token, request.user.userId]
    );

    if (!result.rowCount) {
      return reply.status(404).send({ error: 'Device token not found' });
    }

    return mapDeviceNotificationSettings(result.rows[0]);
  });

  app.put('/api/v1/me/device-notification-settings', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const parsed = UpdateDeviceNotificationSettingsRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const quietHoursStartMinute = parsed.data.quietHoursEnabled ? parsed.data.quietHoursStartMinute : null;
    const quietHoursEndMinute = parsed.data.quietHoursEnabled ? parsed.data.quietHoursEndMinute : null;
    const timezone = parsed.data.quietHoursEnabled ? parsed.data.timezone : null;

    const result = await pool.query<DeviceNotificationSettingsRow>(
      `UPDATE device_tokens
       SET notifications_enabled = $1,
           previews_enabled = $2,
           quiet_hours_enabled = $3,
           quiet_hours_start_minute = $4,
           quiet_hours_end_minute = $5,
           timezone = $6,
           updated_at = NOW()
       WHERE token = $7 AND user_id = $8
       RETURNING token, notifications_enabled, previews_enabled, quiet_hours_enabled,
                 quiet_hours_start_minute, quiet_hours_end_minute, timezone`,
      [
        parsed.data.notificationsEnabled,
        parsed.data.previewsEnabled,
        parsed.data.quietHoursEnabled,
        quietHoursStartMinute,
        quietHoursEndMinute,
        timezone,
        parsed.data.token,
        request.user.userId
      ]
    );

    if (!result.rowCount) {
      return reply.status(404).send({ error: 'Device token not found' });
    }

    return mapDeviceNotificationSettings(result.rows[0]);
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
