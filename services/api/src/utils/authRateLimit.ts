import type { FastifyReply } from 'fastify';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type AuthRateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function createAuthRateLimiter(config: AuthRateLimitConfig) {
  const buckets = new Map<string, RateLimitBucket>();
  let operationsSincePrune = 0;
  let nextPruneAt = 0;

  function pruneExpired(now: number): void {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }

    operationsSincePrune = 0;
    nextPruneAt = now + config.windowMs;
  }

  function consume(key: string, now = Date.now()): RateLimitResult {
    operationsSincePrune += 1;
    if (now >= nextPruneAt || operationsSincePrune >= 32) {
      pruneExpired(now);
    }

    const bucketKey = key || 'unknown';
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        resetAt: now + config.windowMs
      });
      return {
        allowed: true,
        retryAfterSeconds: Math.max(1, Math.ceil(config.windowMs / 1000))
      };
    }

    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  return {
    consume,
    debugBucketCount(): number {
      return buckets.size;
    }
  };
}

export function replyIfRateLimited(reply: FastifyReply, result: RateLimitResult, error: string): boolean {
  if (result.allowed) return false;

  reply.header('Retry-After', String(result.retryAfterSeconds));
  reply.status(429).send({ error });
  return true;
}
