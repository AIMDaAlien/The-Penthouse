import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeTestDatabase } from './safe-db.js';

process.env.DATABASE_URL ??= 'postgresql://penthouse:penthouse@localhost:5432/penthouse_test';
process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';

const { __testables } = await import('../src/routes/media.js');

test('[media] classifyUpload treats known image extensions as images even with generic mime types', () => {
  assert.equal(__testables.classifyUpload('IMG_20260309_224037.jpg', 'application/octet-stream'), 'image');
});

test('[media] classifyUpload treats known video extensions as videos even with generic mime types', () => {
  assert.equal(__testables.classifyUpload('clip.mp4', 'application/octet-stream'), 'video');
});

test('[media] classifyUpload stores voice-note audio as file media', () => {
  assert.equal(__testables.classifyUpload('voice-message.webm', 'audio/webm'), 'file');
  assert.equal(__testables.classifyUpload('voice-message.ogg', 'audio/ogg'), 'file');
  assert.equal(__testables.classifyUpload('voice-message.mp4', 'audio/mp4'), 'file');
  assert.equal(__testables.classifyUpload('voice-message.mp3', 'audio/mpeg'), 'file');
});

test('[helpers] destructive test helpers refuse non-test databases', () => {
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://penthouse:penthouse@localhost:5432/penthouse';

  try {
    assert.throws(() => assertSafeTestDatabase(), /Refusing to run destructive tests against non-test database/);
  } finally {
    process.env.DATABASE_URL = original;
  }
});
