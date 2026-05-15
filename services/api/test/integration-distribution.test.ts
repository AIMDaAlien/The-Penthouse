import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { resetDb, testApp } from './helpers.js';

describe('app distribution integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('returns the deployment-facing PWA distribution contract', async () => {
    const app = await testApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/app-distribution'
      });

      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.headers['cache-control'], 'public, max-age=60');

      const body = response.json() as {
        sourceOfTruth: string;
        defaultPlatform: string;
        pwa: { status: string; url: string; installUrl: string };
        legacyAndroid: { status: string; deprecated: boolean; url: string; fileName: string };
      };

      assert.equal(body.sourceOfTruth, 'pwa');
      assert.equal(body.defaultPlatform, 'pwa');
      assert.equal(body.pwa.status, 'live');
      assert.match(body.pwa.url, /^https?:\/\//);
      assert.equal(body.pwa.installUrl, body.pwa.url);
      assert.equal(body.legacyAndroid.status, 'unavailable');
      assert.equal(body.legacyAndroid.deprecated, true);
      assert.equal(body.legacyAndroid.fileName, 'the-penthouse.apk');
    } finally {
      await app.close();
    }
  });
});
