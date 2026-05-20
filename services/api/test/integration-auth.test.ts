import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { resetDb, testApp } from './helpers.js';

describe('auth integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('registers, reads me, refreshes, and logs out without a body', async () => {
    const app = await testApp();
    try {
      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'alfred',
          displayName: 'Alfred',
          password: 'password-1234',
          inviteCode: 'PENTHOUSE-ALPHA',
          captchaToken: 'dev-token',
          acceptTestNotice: true,
          testNoticeVersion: 'alpha-v1'
        }
      });
      assert.equal(register.statusCode, 200, register.body);
      const session = register.json() as { accessToken: string; refreshToken: string; user: { username: string; role: string } };
      assert.equal(session.user.username, 'alfred');
      assert.equal(session.user.role, 'admin');

      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${session.accessToken}` }
      });
      assert.equal(me.statusCode, 200, me.body);

      const refresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: session.refreshToken }
      });
      assert.equal(refresh.statusCode, 200, refresh.body);
      const refreshed = refresh.json() as { accessToken: string; refreshToken: string };
      assert.notEqual(refreshed.refreshToken, session.refreshToken);

      const logout = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${refreshed.accessToken}` }
      });
      assert.equal(logout.statusCode, 204, logout.body);

      const afterLogout = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${refreshed.accessToken}` }
      });
      assert.equal(afterLogout.statusCode, 401, afterLogout.body);
      assert.equal(afterLogout.json().code, 'SESSION_REVOKED');
    } finally {
      await app.close();
    }
  });

  it('returns specific auth diagnostics for stale sessions and missing refresh tokens', async () => {
    const app = await testApp();
    try {
      const staleAccessToken = await app.jwt.sign({
        userId: '00000000-0000-0000-0000-000000000001',
        username: 'stale',
        sessionDeviceId: '00000000-0000-0000-0000-000000000002',
        role: 'member'
      });

      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${staleAccessToken}` }
      });
      assert.equal(me.statusCode, 401, me.body);
      assert.equal(me.json().code, 'SESSION_DEVICE_NOT_FOUND');

      const refresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'definitely-long-enough-but-not-real' }
      });
      assert.equal(refresh.statusCode, 401, refresh.body);
      assert.equal(refresh.json().code, 'REFRESH_TOKEN_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});
