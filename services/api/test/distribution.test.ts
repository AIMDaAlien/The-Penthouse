import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://penthouse:penthouse@127.0.0.1:5432/penthouse_test';
process.env.JWT_SECRET ??= 'distribution-test-jwt-secret-long-enough';
process.env.CORS_ORIGIN = 'https://penthouse.blog';
process.env.PUBLIC_APP_URL = 'https://penthouse.blog/';
process.env.LEGACY_APK_DOWNLOAD_PATH = '/downloads/legacy/the-penthouse.apk';
process.env.LEGACY_APK_STATUS = 'unavailable';
process.env.UPLOAD_DIR ??= '/tmp/penthouse-distribution-test-uploads';

async function loadApp() {
  const { createApp } = await import('../src/app.js');
  return createApp;
}

test('[unit] app distribution declares the PWA as the default source of truth', async () => {
  const createApp = await loadApp();
  const app = await createApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/app-distribution'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'public, max-age=60');

    const payload = JSON.parse(response.payload);
    assert.equal(payload.sourceOfTruth, 'pwa');
    assert.equal(payload.defaultPlatform, 'pwa');
    assert.deepEqual(payload.pwa, {
      status: 'live',
      url: 'https://penthouse.blog',
      installUrl: 'https://penthouse.blog'
    });
    assert.deepEqual(payload.legacyAndroid, {
      status: 'unavailable',
      deprecated: true,
      url: 'https://penthouse.blog/downloads/legacy/the-penthouse.apk',
      fileName: 'the-penthouse.apk',
      notes: 'Deprecated Android APK retained only for existing installs. Use the PWA for new installs.'
    });
  } finally {
    await app.close();
  }
});
