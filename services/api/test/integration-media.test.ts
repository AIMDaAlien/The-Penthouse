import test, { after, afterEach, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

describe('[integration] gif search', { skip: SKIP }, () => {
  let app: any;
  let helpers: typeof import('./helpers.js');
  let env: typeof import('../src/config/env.js').env;
  let clearGifProviderCache: typeof import('../src/routes/media.js').__testables.clearGifProviderCache;
  let originalFetch: typeof globalThis.fetch;
  let originalGiphyApiKey = '';

  before(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    helpers = await import('./helpers.js');
    ({ env } = await import('../src/config/env.js'));
    ({ __testables: { clearGifProviderCache } } = await import('../src/routes/media.js'));
    await helpers.migrate();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    ({ app } = await helpers.buildTestApp());
    clearGifProviderCache();
    originalFetch = globalThis.fetch;
    originalGiphyApiKey = env.GIPHY_API_KEY;
  });

  afterEach(async () => {
    clearGifProviderCache();
    globalThis.fetch = originalFetch;
    env.GIPHY_API_KEY = originalGiphyApiKey;
    await app?.close();
    app = null;
  });

  after(async () => {
    await helpers.cleanup();
  });

  test('GET /api/v1/gifs/search returns mapped gif results and caches identical queries', async () => {
    const user = await helpers.registerUser(app, 'gif_route_user');
    env.GIPHY_API_KEY = 'test-giphy-key';

    let fetchCalls = 0;
    globalThis.fetch = (async (input) => {
      fetchCalls++;
      assert.match(String(input), /api\.giphy\.com\/v1\/gifs\/search/);
      assert.match(String(input), /q=cat/);
      assert.match(String(input), /limit=1/);

      return new Response(JSON.stringify({
        data: [
          {
            id: 'gif-1',
            title: 'dancing cat',
            images: {
              original: {
                url: 'https://media.giphy.test/original.gif',
                width: '480',
                height: '480'
              },
              fixed_height_small: {
                url: 'https://media.giphy.test/preview.gif'
              }
            }
          }
        ]
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }) as typeof globalThis.fetch;

    const first = await app.inject({
      method: 'GET',
      url: '/api/v1/gifs/search?q=cat&provider=giphy&limit=1',
      headers: helpers.authHeaders(user.accessToken)
    });
    assert.equal(first.statusCode, 200);
    assert.deepEqual(JSON.parse(first.payload), {
      provider: 'giphy',
      results: [
        {
          id: 'gif-1',
          url: 'https://media.giphy.test/original.gif',
          previewUrl: 'https://media.giphy.test/preview.gif',
          renderMode: 'image',
          title: 'dancing cat',
          width: 480,
          height: 480,
          provider: 'giphy'
        }
      ]
    });

    const second = await app.inject({
      method: 'GET',
      url: '/api/v1/gifs/search?q=cat&provider=giphy&limit=1',
      headers: helpers.authHeaders(user.accessToken)
    });
    assert.equal(second.statusCode, 200);
    assert.equal(fetchCalls, 1);
  });
});
