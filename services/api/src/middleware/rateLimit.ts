import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/error-responses.js';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(maxAttempts: number, windowMs = 15 * 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const forwarded = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] ?? request.ip;
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
