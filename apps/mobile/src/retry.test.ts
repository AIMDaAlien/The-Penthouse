import { test, expect } from 'vitest';
import { withBackoff } from './services/retry';

test('withBackoff retries and eventually resolves', async () => {
  let attempts = 0;

  const value = await withBackoff(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('transient');
    return 'ok';
  }, { maxAttempts: 4, baseMs: 1 });

  expect(value).toBe('ok');
  expect(attempts).toBe(3);
});
