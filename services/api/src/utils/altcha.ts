import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env, isProduction } from '../config/env.js';

type AltchaChallenge = {
  algorithm: 'SHA-256';
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
};

type AltchaPayload = Omit<AltchaChallenge, 'maxnumber'> & {
  maxnumber?: number;
  number: number;
};

const DEFAULT_MAX_NUMBER = 50_000;
const CHALLENGE_TTL_MS = 10 * 60_000;

export function createChallenge(maxnumber = DEFAULT_MAX_NUMBER): AltchaChallenge {
  if (!env.ALTCHA_HMAC_KEY) {
    if (isProduction) throw new Error('ALTCHA_HMAC_KEY is required in production');
    return {
      algorithm: 'SHA-256',
      challenge: 'development-challenge',
      maxnumber,
      salt: 'penthouse',
      signature: 'development-signature'
    };
  }

  const number = randomInt(0, maxnumber + 1);
  const salt = new URLSearchParams({
    expires: String(Date.now() + CHALLENGE_TTL_MS),
    nonce: randomBytes(16).toString('hex')
  }).toString();
  const challenge = hashChallenge(salt, number);

  return {
    algorithm: 'SHA-256',
    challenge,
    maxnumber,
    salt,
    signature: signChallenge(challenge, env.ALTCHA_HMAC_KEY)
  };
}

export function verifyChallenge(payload: string) {
  if (!env.ALTCHA_HMAC_KEY) return !isProduction && payload.length > 0;
  return verifyChallengePayload(payload, env.ALTCHA_HMAC_KEY);
}

export function verifyChallengePayload(payload: string, hmacKey: string) {
  const data = decodePayload(payload);
  if (!data) return false;
  if (data.algorithm !== 'SHA-256') return false;
  if (!Number.isInteger(data.number) || data.number < 0 || data.number > (data.maxnumber ?? DEFAULT_MAX_NUMBER)) return false;
  if (hashChallenge(data.salt, data.number) !== data.challenge) return false;
  if (!safeEqualHex(signChallenge(data.challenge, hmacKey), data.signature)) return false;

  const expires = new URLSearchParams(data.salt).get('expires');
  if (expires && Number(expires) < Date.now()) return false;

  return true;
}

function hashChallenge(salt: string, number: number) {
  return createHash('sha256').update(`${salt}${number}`).digest('hex');
}

function signChallenge(challenge: string, hmacKey: string) {
  return createHmac('sha256', hmacKey).update(challenge).digest('hex');
}

function decodePayload(payload: string): AltchaPayload | null {
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    const value = JSON.parse(decoded) as Partial<AltchaPayload>;
    if (
      value.algorithm !== 'SHA-256' ||
      typeof value.challenge !== 'string' ||
      typeof value.number !== 'number' ||
      typeof value.salt !== 'string' ||
      typeof value.signature !== 'string'
    ) {
      return null;
    }
    if (value.maxnumber !== undefined && typeof value.maxnumber !== 'number') return null;
    return value as AltchaPayload;
  } catch {
    return null;
  }
}

function safeEqualHex(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
