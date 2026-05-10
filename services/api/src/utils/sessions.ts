import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/pool.js';
import { refreshTokens, sessionDevices, users } from '../db/schema.js';
import { env } from '../config/env.js';
import { randomToken, sha256 } from './crypto.js';
import { durationToDate } from './time.js';
import { unauthorized } from './error-responses.js';
import type { AuthContext } from '../types.js';

export async function createSession(fastify: FastifyInstance, user: typeof users.$inferSelect) {
  const [device] = await db.insert(sessionDevices).values({
    userId: user.id,
    deviceLabel: 'Web browser',
    appContext: 'pwa'
  }).returning();

  const refreshToken = randomToken(48);
  await db.insert(refreshTokens).values({
    userId: user.id,
    sessionDeviceId: device.id,
    tokenHash: sha256(refreshToken),
    expiresAt: durationToDate(env.JWT_REFRESH_EXPIRY)
  });

  const accessToken = await fastify.jwt.sign({
    userId: user.id,
    username: user.username,
    sessionDeviceId: device.id,
    role: user.role
  }, { expiresIn: env.JWT_ACCESS_EXPIRY });

  return { accessToken, refreshToken, sessionDeviceId: device.id };
}

export async function rotateRefreshToken(fastify: FastifyInstance, refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  const [candidate] = await db.select({
    refreshToken: refreshTokens,
    user: users
  })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!candidate) throw unauthorized('Refresh token was not found; saved login is stale', 'REFRESH_TOKEN_NOT_FOUND');
  if (candidate.refreshToken.revokedAt) throw unauthorized('Refresh token was revoked; sign in again', 'REFRESH_TOKEN_REVOKED');
  if (candidate.refreshToken.rotatedAt) throw unauthorized('Refresh token was already used; sign in again', 'REFRESH_TOKEN_ROTATED');
  if (candidate.refreshToken.expiresAt <= new Date()) throw unauthorized('Refresh token expired; sign in again', 'REFRESH_TOKEN_EXPIRED');
  if (candidate.user.status !== 'active') throw unauthorized('User account is not active', 'USER_INACTIVE');

  const [row] = await db.select({
    refreshToken: refreshTokens,
    user: users
  })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.revokedAt),
      isNull(refreshTokens.rotatedAt),
      gt(refreshTokens.expiresAt, new Date())
    ))
    .limit(1);

  if (!row) throw unauthorized('Refresh token is not usable; sign in again', 'REFRESH_TOKEN_INVALID');

  const nextRefreshToken = randomToken(48);
  const nextHash = sha256(nextRefreshToken);

  await db.transaction(async (tx) => {
    await tx.update(refreshTokens)
      .set({ rotatedAt: new Date(), rotatedToTokenHash: nextHash })
      .where(eq(refreshTokens.id, row.refreshToken.id));

    await tx.insert(refreshTokens).values({
      userId: row.user.id,
      sessionDeviceId: row.refreshToken.sessionDeviceId,
      tokenHash: nextHash,
      expiresAt: durationToDate(env.JWT_REFRESH_EXPIRY)
    });

    if (row.refreshToken.sessionDeviceId) {
      await tx.update(sessionDevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(sessionDevices.id, row.refreshToken.sessionDeviceId));
    }
  });

  const accessToken = await fastify.jwt.sign({
    userId: row.user.id,
    username: row.user.username,
    sessionDeviceId: row.refreshToken.sessionDeviceId,
    role: row.user.role
  }, { expiresIn: env.JWT_ACCESS_EXPIRY });

  return { user: row.user, accessToken, refreshToken: nextRefreshToken };
}

export async function revokeRefreshToken(refreshToken: string) {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, sha256(refreshToken)));
}

export async function revokeSessionDevice(sessionDeviceId: string) {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.sessionDeviceId, sessionDeviceId));
}

export async function assertActiveSession(context: AuthContext) {
  if (!context.sessionDeviceId) return;

  const [row] = await db.select({ id: sessionDevices.id, userId: users.id, status: users.status })
    .from(sessionDevices)
    .innerJoin(users, eq(sessionDevices.userId, users.id))
    .where(and(eq(sessionDevices.id, context.sessionDeviceId), eq(users.id, context.userId)))
    .limit(1);

  if (!row) throw unauthorized('Session device was not found; saved login is stale', 'SESSION_DEVICE_NOT_FOUND');
  if (row.status !== 'active') throw unauthorized('User account is not active', 'USER_INACTIVE');
}
