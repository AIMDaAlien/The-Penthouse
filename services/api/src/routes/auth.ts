import { and, count, eq, gt, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  ChangePasswordRequestSchema,
  LoginRequestSchema,
  PasswordResetRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  UpdateProfileRequestSchema
} from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { chatMembers, chats, notificationPrefs, refreshTokens, serverSettings, signupInvites, users } from '../db/schema.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { badRequest, forbidden, notFound, unauthorized } from '../utils/error-responses.js';
import { recoveryCode, sha256 } from '../utils/crypto.js';
import { createSession, revokeRefreshToken, revokeSessionDevice, rotateRefreshToken } from '../utils/sessions.js';
import { hashPassword, toAuthUser, toMeResponse, toMemberDetail, verifyPassword } from '../utils/users.js';
import { isProduction } from '../config/env.js';
import { verifyChallenge } from '../utils/altcha.js';
import { appendSyncEvent } from '../features/sync/service.js';

export async function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/auth/config', async () => {
    const [setting] = await db.select().from(serverSettings).where(eq(serverSettings.key, 'registration_mode')).limit(1);
    return { registrationMode: setting?.value ?? 'invite_only' };
  });

  fastify.get('/api/v1/auth/challenge', async () => ({
    algorithm: 'SHA-256',
    challenge: 'development-challenge',
    maxnumber: 50000,
    salt: 'penthouse',
    signature: 'development-signature'
  }));

  fastify.post('/api/v1/auth/register', { preHandler: rateLimit(3) }, async (request) => {
    const body = RegisterRequestSchema.parse(request.body);
    if (isProduction && !verifyChallenge(body.captchaToken)) {
      throw badRequest('Invalid CAPTCHA token', 'CAPTCHA_INVALID');
    }

    const [mode] = await db.select().from(serverSettings).where(eq(serverSettings.key, 'registration_mode')).limit(1);
    if ((mode?.value ?? 'invite_only') === 'closed') throw forbidden('Registration is closed', 'REGISTRATION_CLOSED');

    const [invite] = await db.select()
      .from(signupInvites)
      .where(and(
        eq(signupInvites.code, body.inviteCode),
        isNull(signupInvites.revokedAt),
        or(isNull(signupInvites.expiresAt), gt(signupInvites.expiresAt, new Date()))
      ))
      .limit(1);
    if (!invite || invite.uses >= invite.maxUses) throw badRequest('Invalid invite code', 'INVITE_INVALID');

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).limit(1);
    if (existing) throw badRequest('Username is already taken', 'USERNAME_TAKEN');

    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    const code = recoveryCode();
    const passwordHash = await hashPassword(body.password);

    const [user] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({
        username: body.username,
        displayName: body.displayName ?? body.username,
        passwordHash,
        role: userCount === 0 ? 'admin' : 'member',
        recoveryCodeHash: sha256(code),
        testNoticeAcceptedVersion: body.testNoticeVersion,
        testNoticeAcceptedAt: new Date()
      }).returning();

      await tx.update(signupInvites)
        .set({ uses: sql`${signupInvites.uses} + 1` })
        .where(eq(signupInvites.id, invite.id));

      await tx.insert(notificationPrefs).values({ userId: created.id }).onConflictDoNothing();

      const [general] = await tx.select({ chatId: chats.id })
        .from(chats)
        .where(eq(chats.systemKey, 'general'))
        .limit(1);

      if (general) {
        await tx.insert(chatMembers).values({
          chatId: general.chatId,
          userId: created.id,
          role: userCount === 0 ? 'owner' : 'member'
        }).onConflictDoNothing();

        const childRows = await tx.select({ chatId: chats.id }).from(chats).where(eq(chats.parentChatId, general.chatId));
        for (const channel of childRows) {
          await tx.insert(chatMembers).values({ chatId: channel.chatId, userId: created.id }).onConflictDoNothing();
        }
      }

      return [created];
    });

    const session = await createSession(fastify, user);
    await appendUserProfileSyncEvents(user, user.id);
    return {
      user: toAuthUser(user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      recoveryCode: code
    };
  });

  fastify.post('/api/v1/auth/login', { preHandler: rateLimit(5) }, async (request) => {
    const body = LoginRequestSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
    if (!user || user.status !== 'active') throw unauthorized('Invalid username or password', 'AUTH_INVALID');
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      throw unauthorized('Invalid username or password', 'AUTH_INVALID');
    }

    const session = await createSession(fastify, user);
    return {
      user: toAuthUser(user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
  });

  fastify.post('/api/v1/auth/refresh', async (request) => {
    const body = RefreshRequestSchema.parse(request.body);
    const refreshed = await rotateRefreshToken(fastify, body.refreshToken);
    return {
      user: toAuthUser(refreshed.user),
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken
    };
  });

  fastify.post('/api/v1/auth/logout', { preHandler: fastify.authenticate }, async (request, reply) => {
    const maybeBody = request.body && typeof request.body === 'object' ? request.body as { refreshToken?: string } : {};
    if (maybeBody.refreshToken) await revokeRefreshToken(maybeBody.refreshToken);
    if (request.authUser?.sessionDeviceId) await revokeSessionDevice(request.authUser.sessionDeviceId);
    return reply.status(204).send();
  });

  fastify.get('/api/v1/auth/me', { preHandler: fastify.authenticate }, async (request) => {
    const [user] = await db.select().from(users).where(eq(users.id, request.authUser!.userId)).limit(1);
    if (!user) throw notFound('User not found');
    return toMeResponse(user);
  });

  fastify.patch('/api/v1/auth/me', { preHandler: fastify.authenticate }, async (request) => {
    const body = UpdateProfileRequestSchema.parse(request.body);
    const [user] = await db.update(users)
      .set({
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.avatarUploadId !== undefined ? { avatarMediaId: body.avatarUploadId } : {}),
        ...(body.bannerUploadId !== undefined ? { bannerMediaId: body.bannerUploadId } : {}),
        ...(body.profileStyle !== undefined ? { profileStyle: body.profileStyle } : {})
      })
      .where(eq(users.id, request.authUser!.userId))
      .returning();
    await appendUserProfileSyncEvents(user, request.authUser!.userId);
    return toMeResponse(user);
  });

  fastify.patch('/api/v1/auth/password', { preHandler: fastify.authenticate }, async (request, reply) => {
    const body = ChangePasswordRequestSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.id, request.authUser!.userId)).limit(1);
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw unauthorized('Current password is incorrect', 'AUTH_INVALID');
    }
    await db.update(users).set({
      passwordHash: await hashPassword(body.newPassword),
      mustChangePassword: false
    }).where(eq(users.id, user.id));
    return reply.status(204).send();
  });

  fastify.post('/api/v1/auth/reset-password', async (request, reply) => {
    const body = PasswordResetRequestSchema.parse(request.body);
    const [user] = await db.select().from(users).where(ilike(users.username, body.username)).limit(1);
    if (!user || user.recoveryCodeHash !== sha256(body.recoveryCode)) {
      throw unauthorized('Invalid recovery details', 'AUTH_INVALID');
    }
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword) }).where(eq(users.id, user.id));
    return reply.status(204).send();
  });
}

async function appendUserProfileSyncEvents(user: typeof users.$inferSelect, actorUserId: string) {
  const memberRows = await db.select({ chatId: chatMembers.chatId })
    .from(chatMembers)
    .where(eq(chatMembers.userId, user.id));
  const payload = toMemberDetail(user);

  if (memberRows.length === 0) {
    await appendSyncEvent({
      scope: 'user',
      userId: user.id,
      actorUserId,
      entityId: user.id,
      op: { type: 'user.upsert', payload }
    });
    return;
  }

  for (const member of memberRows) {
    await appendSyncEvent({
      scope: 'chat',
      chatId: member.chatId,
      actorUserId,
      entityId: user.id,
      op: { type: 'user.upsert', payload }
    });
  }
}
