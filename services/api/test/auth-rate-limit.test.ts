import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthRateLimiter } from '../src/utils/authRateLimit.js';

test('[unit] auth rate limiter lazily evicts expired buckets', () => {
  const limiter = createAuthRateLimiter({ windowMs: 1_000, maxRequests: 2 }) as any;

  limiter.consume('ip-1', 0);
  limiter.consume('ip-2', 0);
  limiter.consume('ip-3', 0);
  limiter.consume('fresh-ip', 2_500);

  assert.equal(limiter.debugBucketCount(), 1);
});
