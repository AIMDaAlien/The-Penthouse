import { createHash } from 'node:crypto';
import { createChallenge, verifySolution } from 'altcha-lib';
import { env } from '../config/env.js';

const usedCaptchaPayloads = new Map<string, number>();

function pruneUsedCaptchaPayloads(now = Date.now()): void {
  for (const [payloadHash, expiresAt] of usedCaptchaPayloads.entries()) {
    if (expiresAt <= now) {
      usedCaptchaPayloads.delete(payloadHash);
    }
  }
}

function hashCaptchaPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

export async function createAltchaChallenge(): Promise<Awaited<ReturnType<typeof createChallenge>>> {
  return createChallenge({
    hmacKey: env.ALTCHA_HMAC_KEY,
    expires: new Date(Date.now() + env.ALTCHA_CHALLENGE_EXPIRE_MS),
    maxNumber: env.ALTCHA_MAX_NUMBER
  });
}

export async function verifyAltchaPayloadOnce(payload: string): Promise<boolean> {
  const trimmedPayload = payload.trim();
  if (!trimmedPayload) {
    return false;
  }

  const now = Date.now();
  pruneUsedCaptchaPayloads(now);

  const payloadHash = hashCaptchaPayload(trimmedPayload);
  if (usedCaptchaPayloads.has(payloadHash)) {
    return false;
  }

  const verified = await verifySolution(trimmedPayload, env.ALTCHA_HMAC_KEY);
  if (!verified) {
    return false;
  }

  usedCaptchaPayloads.set(payloadHash, now + env.ALTCHA_CHALLENGE_EXPIRE_MS);
  return true;
}

export function resetAltchaReplayState(): void {
  usedCaptchaPayloads.clear();
}
