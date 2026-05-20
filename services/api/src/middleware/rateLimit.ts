import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/error-responses.js';
import { env } from '../config/env.js';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(maxAttempts: number, windowMs = 15 * 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (env.DISABLE_RATE_LIMIT) return;
    const ip = request.ip;
    const key = `${request.method}:${request.url}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    bucket.count += 1;
    if (bucket.count > maxAttempts) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      reply.header('Retry-After', String(retryAfter));
      throw new AppError('RATE_LIMITED', 429, 'Too many attempts');
    }
  };
}
