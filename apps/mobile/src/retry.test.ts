import test from 'node:test';
import assert from 'node:assert/strict';
import { withBackoff } from './services/retry';

test('withBackoff retries and eventually resolves', async () => {
  let attempts = 0;

  const value = await withBackoff(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('transient');
    return 'ok';
  }, { maxAttempts: 4, baseMs: 1 });

  assert.equal(value, 'ok');
  assert.equal(attempts, 3);
});
