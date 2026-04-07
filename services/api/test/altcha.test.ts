import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAltchaChallenge, resetAltchaReplayState, verifyAltchaPayloadOnce } from '../src/utils/altcha.js';
import { createCaptchaToken } from './helpers.js';

beforeEach(() => {
  resetAltchaReplayState();
});

test('altcha challenge returns the expected public shape', async () => {
  const challenge = await createAltchaChallenge();

  assert.equal(typeof challenge.algorithm, 'string');
  assert.equal(typeof challenge.challenge, 'string');
  assert.equal(typeof challenge.salt, 'string');
  assert.equal(typeof challenge.signature, 'string');
  assert.equal(typeof challenge.maxnumber, 'number');
});

test('altcha payload can only be used once', async () => {
  const captchaToken = await createCaptchaToken();

  const first = await verifyAltchaPayloadOnce(captchaToken);
  const second = await verifyAltchaPayloadOnce(captchaToken);

  assert.equal(first, true);
  assert.equal(second, false);
});
