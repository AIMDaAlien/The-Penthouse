import bcrypt from 'bcryptjs';
import type { AuthUser, MeResponse } from '@penthouse/contracts';
import type { users } from '../db/schema.js';

type UserRow = typeof users.$inferSelect;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function avatarUrlFromMediaId(mediaId: string | null) {
  return mediaId ? `/api/v1/media/public/${mediaId}` : null;
}

export function bannerUrlFromMediaId(mediaId: string | null, legacyBannerUrl?: string | null) {
  return mediaId ? `/api/v1/media/public/${mediaId}` : legacyBannerUrl ?? null;
}

export function toAuthUser(user: UserRow): AuthUser {
  const requiredVersion = process.env.TEST_NOTICE_VERSION ?? 'alpha-v1';
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: avatarUrlFromMediaId(user.avatarMediaId),
    bannerUrl: bannerUrlFromMediaId(user.bannerMediaId, user.bannerUrl),
    timezone: user.timezone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    mustAcceptTestNotice: user.testNoticeAcceptedVersion !== requiredVersion,
    requiredTestNoticeVersion: requiredVersion,
    acceptedTestNoticeVersion: user.testNoticeAcceptedVersion,
    profileStyle: user.profileStyle as 'editorial' | 'vogue' | 'wallpaper'
  };
}

export function toMeResponse(user: UserRow): MeResponse {
  return {
    ...toAuthUser(user),
    bio: user.bio,
    avatarMediaId: user.avatarMediaId,
    bannerMediaId: user.bannerMediaId,
    bannerUrl: bannerUrlFromMediaId(user.bannerMediaId, user.bannerUrl)
  };
}

export function toMemberDetail(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: avatarUrlFromMediaId(user.avatarMediaId),
    bio: user.bio,
    timezone: user.timezone,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    profileStyle: user.profileStyle as 'editorial' | 'vogue' | 'wallpaper',
    bannerMediaId: user.bannerMediaId,
    bannerUrl: bannerUrlFromMediaId(user.bannerMediaId, user.bannerUrl)
  };
}
