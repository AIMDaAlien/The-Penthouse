import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  AuthResponseSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  verifyPassword
} from '../utils/security.js';

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
         FOR UPDATE`,
        [inviteCode]
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

      await client.query(
        'INSERT INTO users(id, username, password_hash) VALUES($1, $2, $3)',
        [id, username.toLowerCase(), passwordHash]
      );

      await client.query(
        'UPDATE signup_invites SET uses = uses + 1 WHERE code = $1',
        [inviteCode]
      );

      const defaultChatId = randomUUID();
      await client.query(
        "INSERT INTO chats(id, type, name) VALUES($1, 'channel', $2)",
        [defaultChatId, 'General']
      );
      await client.query(
        'INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2)',
        [defaultChatId, id]
      );

      const accessToken = await signAccessToken(app, id, username.toLowerCase());
      const refreshToken = createOpaqueToken();
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = refreshExpiryDate();

      await client.query(
        'INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at) VALUES($1, $2, $3, $4)',
        [randomUUID(), id, refreshTokenHash, expiresAt.toISOString()]
      );

      await client.query('COMMIT');

      const response = AuthResponseSchema.parse({
        user: { id, username: username.toLowerCase() },
        accessToken,
        refreshToken
      });

      return reply.status(201).send(response);
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (String(error?.message || '').includes('users_username_key')) {
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
    const userRes = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [
      username.toLowerCase()
    ]);

    if (!userRes.rowCount) return reply.status(401).send({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return reply.status(401).send({ error: 'Invalid credentials' });

    const accessToken = await signAccessToken(app, user.id, user.username);
    const refreshToken = createOpaqueToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = refreshExpiryDate();

    await pool.query('INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at) VALUES($1, $2, $3, $4)', [
      randomUUID(),
      user.id,
      refreshTokenHash,
      expiresAt.toISOString()
    ]);

    const response = AuthResponseSchema.parse({
      user: { id: user.id, username: user.username },
      accessToken,
      refreshToken
    });

    return reply.send(response);
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const parsed = RefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const oldHash = hashToken(parsed.data.refreshToken);
    const tokenRes = await pool.query(
      'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
      [oldHash]
    );

    if (!tokenRes.rowCount) return reply.status(401).send({ error: 'Invalid or expired refresh token' });

    const tokenRow = tokenRes.rows[0];
    if (new Date(tokenRow.expires_at) < new Date()) {
      await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [oldHash]);
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    const userRes = await pool.query('SELECT id, username FROM users WHERE id = $1', [tokenRow.user_id]);
    if (!userRes.rowCount) return reply.status(401).send({ error: 'Invalid user session' });
    const user = userRes.rows[0];

    const newRefreshToken = createOpaqueToken();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = refreshExpiryDate();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [oldHash]);
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

    const accessToken = await signAccessToken(app, user.id, user.username);

    const response = AuthResponseSchema.parse({
      user,
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
