import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, describe, it } from 'node:test';
import { env } from '../src/config/env.js';
import { createChallenge, verifyChallengePayload } from '../src/utils/altcha.js';

describe('ALTCHA proof-of-work', () => {
  const originalKey = env.ALTCHA_HMAC_KEY;

  after(() => {
    env.ALTCHA_HMAC_KEY = originalKey;
  });

  it('creates signed challenges and verifies only solved payloads', () => {
    env.ALTCHA_HMAC_KEY = 'test-altcha-secret';
    const challenge = createChallenge(250);
    const number = solveChallenge(challenge.salt, challenge.challenge, challenge.maxnumber);
    assert.notEqual(number, null);

    const payloadChallenge = {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      signature: challenge.signature
    };
    const payload = Buffer.from(JSON.stringify({ ...payloadChallenge, number })).toString('base64');
    assert.equal(verifyChallengePayload(payload, env.ALTCHA_HMAC_KEY), true);

    const tampered = Buffer.from(JSON.stringify({ ...payloadChallenge, number: number! + 1 })).toString('base64');
    assert.equal(verifyChallengePayload(tampered, env.ALTCHA_HMAC_KEY), false);
  });
});

function solveChallenge(salt: string, challenge: string, maxnumber: number) {
  for (let number = 0; number <= maxnumber; number += 1) {
    const hash = createHash('sha256').update(`${salt}${number}`).digest('hex');
    if (hash === challenge) return number;
  }
  return null;
}
