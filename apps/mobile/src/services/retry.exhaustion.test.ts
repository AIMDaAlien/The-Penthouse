import { test, expect } from 'vitest';
import { withBackoff } from './retry';

test('withBackoff throws after maxAttempts is exhausted', async () => {
  let attempts = 0;

  await expect(
    withBackoff(async () => {
      attempts += 1;
      throw new Error('always fails');
    }, { maxAttempts: 3, baseMs: 1 })
  ).rejects.toThrow(/always fails/);

  expect(attempts).toBe(3);
});
