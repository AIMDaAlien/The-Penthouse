import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createOpaqueToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRecoveryCode(): string {
  const bytes = crypto.randomBytes(16);
  let result = '';

  for (let index = 0; index < 16; index += 1) {
    result += RECOVERY_CODE_ALPHABET[bytes[index] % RECOVERY_CODE_ALPHABET.length];
  }

  return result.match(/.{1,4}/g)?.join('-') ?? result;
}

export function createInviteCode(): string {
  const body = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `PENTHOUSE-${body}`;
}

export function createTemporaryPassword(): string {
  return `Temp${crypto.randomBytes(8).toString('base64url')}`;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function safeEqualHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function refreshExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + env.REFRESH_TOKEN_DAYS);
  return expires;
}

export async function signAccessToken(app: FastifyInstance, userId: string, username: string): Promise<string> {
  return app.jwt.sign({ userId, username }, { expiresIn: env.ACCESS_TOKEN_TTL });
}
