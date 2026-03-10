import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { AuthResponseSchema } from '@penthouse/contracts';
import { createOpaqueToken, hashToken, refreshExpiryDate, signAccessToken } from './security.js';
import { getUserById, mapAuthUser, type Queryable } from './users.js';

export async function issueRecoveryCode(client: Queryable, userId: string, recoveryCode: string): Promise<void> {
  await client.query('UPDATE users SET recovery_code_hash = $1 WHERE id = $2', [
    hashToken(recoveryCode.replaceAll('-', '')),
    userId
  ]);
}

export async function createAuthResponse(
  app: FastifyInstance,
  client: Queryable,
  userId: string,
  recoveryCode?: string
) {
  const user = await getUserById(client, userId);
  if (!user) {
    throw new Error(`Missing user ${userId} while issuing auth response`);
  }

  const accessToken = await signAccessToken(app, user.id, user.username);
  const refreshToken = createOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = refreshExpiryDate();

  await client.query('INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at) VALUES($1, $2, $3, $4)', [
    randomUUID(),
    user.id,
    refreshTokenHash,
    expiresAt.toISOString()
  ]);

  return AuthResponseSchema.parse({
    user: mapAuthUser(user),
    accessToken,
    refreshToken,
    ...(recoveryCode ? { recoveryCode } : {})
  });
}
