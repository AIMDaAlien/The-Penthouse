import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeTestDatabase } from './safe-db.js';

process.env.DATABASE_URL ??= 'postgresql://penthouse:penthouse@localhost:5432/penthouse_test';
process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';

const { __testables } = await import('../src/routes/media.js');
const { env } = await import('../src/config/env.js');

test('[media] classifyUpload treats known image extensions as images even with generic mime types', () => {
  assert.equal(__testables.classifyUpload('IMG_20260309_224037.jpg', 'application/octet-stream'), 'image');
});

test('[media] classifyUpload treats known video extensions as videos even with generic mime types', () => {
  assert.equal(__testables.classifyUpload('clip.mp4', 'application/octet-stream'), 'video');
});

test('[media] extractKlipyResults supports current file-based response shape', () => {
  const results = __testables.extractKlipyResults({
    result: true,
    data: {
      data: [
        {
          id: 'gif-1',
          title: 'Test GIF',
          file: {
            url: 'https://cdn.klipy.test/gif-1.gif',
            width: 200,
            height: 112
          },
          blur_preview: 'https://cdn.klipy.test/gif-1-preview.gif'
        }
      ]
    }
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].provider, 'klipy');
  assert.equal(results[0].url, 'https://cdn.klipy.test/gif-1.gif');
  assert.equal(results[0].previewUrl, 'https://cdn.klipy.test/gif-1-preview.gif');
  assert.equal(results[0].renderMode, 'image');
  assert.equal(results[0].width, 200);
  assert.equal(results[0].height, 112);
});

test('[media] extractKlipyResults supports Klipy v2 media_formats payloads', () => {
  const results = __testables.extractKlipyResults({
    results: [
      {
        id: 'gif-v2',
        title: 'Modern GIF',
        media_formats: {
          mediumgif: {
            url: 'https://cdn.klipy.test/v2-medium.gif',
            dims: [320, 180]
          },
          preview: {
            url: 'https://cdn.klipy.test/v2-preview.jpg',
            dims: [320, 180]
          }
        }
      }
    ]
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].url, 'https://cdn.klipy.test/v2-medium.gif');
  assert.equal(results[0].previewUrl, 'https://cdn.klipy.test/v2-preview.jpg');
  assert.equal(results[0].renderMode, 'image');
  assert.equal(results[0].width, 320);
  assert.equal(results[0].height, 180);
});

test('[media] extractKlipyResults throws on unsupported provider shape instead of faking empty results', () => {
  assert.throws(
    () => __testables.extractKlipyResults({ result: true, data: { unexpected: true } }),
    /Klipy provider parse failure/
  );
});

test('[media] fetchJsonWithCache caches the same provider URL for one hour', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  __testables.clearGifProviderCache();

  globalThis.fetch = (async () => {
    fetchCalls++;
    return new Response(JSON.stringify({ ok: true, fetchCalls }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof globalThis.fetch;

  try {
    const first = await __testables.fetchJsonWithCache('https://gif-provider.test/search?q=cat');
    const second = await __testables.fetchJsonWithCache('https://gif-provider.test/search?q=cat');
    assert.deepEqual(second, first);
    assert.equal(fetchCalls, 1);
  } finally {
    __testables.clearGifProviderCache();
    globalThis.fetch = originalFetch;
  }
});

test('[media] fetchJsonWithCache prunes old entries so the provider cache stays bounded', async () => {
  const originalFetch = globalThis.fetch;
  __testables.clearGifProviderCache();

  globalThis.fetch = (async (url: string | URL | Request) => (
    new Response(JSON.stringify({ ok: true, url: String(url) }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  )) as typeof globalThis.fetch;

  try {
    for (let index = 0; index < 205; index += 1) {
      await __testables.fetchJsonWithCache(`https://gif-provider.test/search?q=query-${index}`);
    }

    assert.ok(__testables.gifProviderCacheSize() <= 200, 'cache should evict old entries past the cap');
  } finally {
    __testables.clearGifProviderCache();
    globalThis.fetch = originalFetch;
  }
});

test('[media] upload rate limit allows users below the rolling window cap', async () => {
  const originalMaxFiles = env.UPLOAD_RATE_LIMIT_MAX_FILES;
  const originalWindowMinutes = env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES;

  env.UPLOAD_RATE_LIMIT_MAX_FILES = 3;
  env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES = 15;

  try {
    const state = await __testables.getUploadRateLimitState({
      query: async () => ({
        rows: [{ upload_count: 2, retry_after_seconds: 60 }]
      })
    } as any, 'user-id');

    assert.deepEqual(state, {
      allowed: true,
      retryAfterSeconds: 0
    });
  } finally {
    env.UPLOAD_RATE_LIMIT_MAX_FILES = originalMaxFiles;
    env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES = originalWindowMinutes;
  }
});

test('[media] upload rate limit blocks users at the rolling window cap', async () => {
  const originalMaxFiles = env.UPLOAD_RATE_LIMIT_MAX_FILES;
  const originalWindowMinutes = env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES;

  env.UPLOAD_RATE_LIMIT_MAX_FILES = 3;
  env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES = 15;

  try {
    const state = await __testables.getUploadRateLimitState({
      query: async () => ({
        rows: [{ upload_count: 3, retry_after_seconds: 120 }]
      })
    } as any, 'user-id');

    assert.deepEqual(state, {
      allowed: false,
      retryAfterSeconds: 120
    });
  } finally {
    env.UPLOAD_RATE_LIMIT_MAX_FILES = originalMaxFiles;
    env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES = originalWindowMinutes;
  }
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
