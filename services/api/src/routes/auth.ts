import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  AuthResponseSchema,
  LoginRequestSchema,
  PasswordResetRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import {
  createRecoveryCode,
  createOpaqueToken,
  hashPassword,
  hashToken,
  refreshExpiryDate,
  safeEqualHash,
  signAccessToken,
  verifyPassword
} from '../utils/security.js';
import type { PoolClient } from 'pg';
import {
  getUserById,
  getUserByUsername,
  mapAuthUser,
  maybeBootstrapAdmin,
  type UserRow
} from '../utils/users.js';
import { createAuthResponse, issueRecoveryCode } from '../utils/sessions.js';

const SHARED_GENERAL_CHAT_ID = '00000000-0000-0000-0000-000000000001';
const SHARED_GENERAL_SYSTEM_KEY = 'general';
const MASTER_INVITE_SYSTEM_KEY = 'master';

async function ensureSharedGeneralChannel(client: PoolClient): Promise<string> {
  await client.query(
    `INSERT INTO chats(id, type, name, system_key)
     VALUES($1, 'channel', 'General', $2)
     ON CONFLICT (system_key) DO NOTHING`,
    [SHARED_GENERAL_CHAT_ID, SHARED_GENERAL_SYSTEM_KEY]
  );

  const channel = await client.query('SELECT id FROM chats WHERE system_key = $1', [SHARED_GENERAL_SYSTEM_KEY]);
  if (!channel.rowCount) {
    throw new Error('Shared General channel is missing');
  }

  return channel.rows[0].id as string;
}

function blockInactiveUser(reply: any, user: Pick<UserRow, 'status'>) {
  if (user.status !== 'active') {
    return reply.status(403).send({ error: 'Account unavailable' });
  }
  return null;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = RegisterRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { username, password, inviteCode } = parsed.data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const invite = await client.query(
        `SELECT code, max_uses, uses, expires_at, revoked_at
         FROM signup_invites
         WHERE code = $1
           AND system_key = $2
         FOR UPDATE`,
        [inviteCode, MASTER_INVITE_SYSTEM_KEY]
      );

      if (!invite.rowCount) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: 'Invalid or expired invite code' });
      }

      const inv = invite.rows[0];
      const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
      const exhausted = Number(inv.uses) >= Number(inv.max_uses);
      const revoked = Boolean(inv.revoked_at);

      if (expired || exhausted || revoked) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: 'Invalid or expired invite code' });
      }

      const id = randomUUID();
      const passwordHash = await hashPassword(password);
      const recoveryCode = createRecoveryCode();

      await client.query(
        `INSERT INTO users(id, username, display_name, password_hash, recovery_code_hash)
         VALUES($1, $2, $3, $4, $5)`,
        [id, username, username, passwordHash, hashToken(recoveryCode.replaceAll('-', ''))]
      );

      await client.query(
        'UPDATE signup_invites SET uses = uses + 1 WHERE code = $1',
        [inviteCode]
      );

      const generalChatId = await ensureSharedGeneralChannel(client);
      await client.query(
        'INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2) ON CONFLICT (chat_id, user_id) DO NOTHING',
        [generalChatId, id]
      );

      await maybeBootstrapAdmin(client, username);
      const response = await createAuthResponse(app, client, id, recoveryCode);

      await client.query('COMMIT');
      return reply.status(201).send(response);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error?.code === '23505' && error?.constraint === 'users_username_key') {
        return reply.status(409).send({ error: 'Username already exists' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to register' });
    } finally {
      client.release();
    }
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { username, password } = parsed.data;
    const user = await getUserByUsername(pool, username);

    if (!user || !user.password_hash) return reply.status(401).send({ error: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return reply.status(401).send({ error: 'Invalid credentials' });

    const inactive = blockInactiveUser(reply, user);
    if (inactive) return inactive;

    await maybeBootstrapAdmin(pool, username);

    let recoveryCode: string | undefined;
    if (!user.recovery_code_hash) {
      recoveryCode = createRecoveryCode();
      await issueRecoveryCode(pool, user.id, recoveryCode);
    }

    const response = await createAuthResponse(app, pool, user.id, recoveryCode);
    return reply.send(response);
  });

  app.post('/api/v1/auth/password-reset', async (request, reply) => {
    const parsed = PasswordResetRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { username, recoveryCode, newPassword } = parsed.data;
    const user = await getUserByUsername(pool, username);
    if (!user || !user.recovery_code_hash) {
      return reply.status(401).send({ error: 'Invalid recovery code or username' });
    }

    const inactive = blockInactiveUser(reply, user);
    if (inactive) return inactive;

    if (!safeEqualHash(hashToken(recoveryCode), user.recovery_code_hash)) {
      return reply.status(401).send({ error: 'Invalid recovery code or username' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nextRecoveryCode = createRecoveryCode();
      await issueRecoveryCode(client, user.id, nextRecoveryCode);
      await client.query(
        'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
        [await hashPassword(newPassword), user.id]
      );
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

      const response = await createAuthResponse(app, client, user.id, nextRecoveryCode);

      await client.query('COMMIT');
      return reply.send(response);
    } catch (error) {
      await client.query('ROLLBACK');
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to reset password' });
    } finally {
      client.release();
    }
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const parsed = RefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const oldHash = hashToken(parsed.data.refreshToken);
    const client = await pool.connect();
    let userId = '';
    let newRefreshToken = '';

    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `DELETE FROM refresh_tokens
         WHERE token_hash = $1
           AND expires_at > NOW()
         RETURNING user_id`,
        [oldHash]
      );
      if (!tokenRes.rowCount) {
        await client.query('ROLLBACK');
        return reply.status(401).send({ error: 'Invalid or expired refresh token' });
      }

      userId = tokenRes.rows[0].user_id as string;
      const user = await getUserById(client, userId);
      if (!user) {
        await client.query('ROLLBACK');
        return reply.status(401).send({ error: 'Invalid user session' });
      }
      if (user.status !== 'active') {
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
        await client.query('COMMIT');
        return reply.status(403).send({ error: 'Account unavailable' });
      }

      newRefreshToken = createOpaqueToken();
      const newHash = hashToken(newRefreshToken);
      const expiresAt = refreshExpiryDate();
      await client.query('INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at) VALUES($1, $2, $3, $4)', [
        randomUUID(),
        user.id,
        newHash,
        expiresAt.toISOString()
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const user = await getUserById(pool, userId);
    if (!user) return reply.status(401).send({ error: 'Invalid user session' });

    const accessToken = await signAccessToken(app, user.id, user.username);

    const response = AuthResponseSchema.parse({
      user: mapAuthUser(user),
      accessToken,
      refreshToken: newRefreshToken
    });

    return reply.send(response);
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const parsed = RefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(parsed.data.refreshToken)]);
    return reply.status(204).send();
  });
}
