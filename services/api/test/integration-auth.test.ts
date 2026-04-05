/**
 * Integration tests for auth token rotation.
 *
 * Requires a running PostgreSQL instance with DATABASE_URL set.
 * Skips gracefully when DATABASE_URL is not available.
 */
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

async function withBootstrapUsername(username: string, run: () => Promise<void>) {
  const { env } = await import('../src/config/env.js');
  const original = env.ADMIN_BOOTSTRAP_USERNAME;
  env.ADMIN_BOOTSTRAP_USERNAME = username;
  try {
    await run();
  } finally {
    env.ADMIN_BOOTSTRAP_USERNAME = original;
  }
}

async function withTestNoticeVersion(version: string, run: () => Promise<void>) {
  const { env } = await import('../src/config/env.js');
  const original = env.TEST_ACCOUNT_NOTICE_VERSION;
  env.TEST_ACCOUNT_NOTICE_VERSION = version;
  try {
    await run();
  } finally {
    env.TEST_ACCOUNT_NOTICE_VERSION = original;
  }
}

async function promoteAdmin(username: string) {
  const { pool } = await import('./helpers.js');
  await pool.query(`UPDATE users SET role = 'admin' WHERE username = $1`, [username]);
}

describe('[integration] auth suites (serialized file-level)', { skip: SKIP, concurrency: false }, () => {

describe('[integration] refresh token rotation', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('old refresh token is rejected after the grace window expires', async () => {
    const { pool, registerUser } = await import('./helpers.js');
    const user = await registerUser(app, 'rotate_user');

    // Use the original refresh token to get a rotated pair
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: user.refreshToken }
    });
    assert.equal(refreshRes.statusCode, 200);
    const rotated = JSON.parse(refreshRes.payload);
    assert.notEqual(rotated.refreshToken, user.refreshToken, 'server must issue a new token');

    await pool.query(
      `UPDATE refresh_tokens
       SET rotated_at = NOW() - INTERVAL '10 seconds'
       WHERE user_id = $1`,
      [user.user.id]
    );

    // Replay the OLD token — must fail
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: user.refreshToken }
    });
    assert.equal(replayRes.statusCode, 401, 'old refresh token must be rejected after rotation');

    // The NEW token should still work
    const secondRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: rotated.refreshToken }
    });
    assert.equal(secondRes.statusCode, 200, 'rotated token must remain valid');
  });

  test('register normalizes username and invite code, then login accepts trimmed mixed-case username', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: '  Aim.Test  ',
        password: 'supersecurepassword',
        inviteCode: ' penthouse-alpha ',
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });

    assert.equal(registerRes.statusCode, 201);
    const registered = JSON.parse(registerRes.payload);
    assert.equal(registered.user.username, 'aim.test');
    assert.match(registered.recoveryCode, /^[A-Z0-9-]{19}$/);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: '  AIM.TEST ',
        password: 'supersecurepassword'
      }
    });

    assert.equal(loginRes.statusCode, 200);
    const loggedIn = JSON.parse(loginRes.payload);
    assert.equal(loggedIn.user.username, 'aim.test');
  });

  test('password reset changes password, rotates recovery code, and invalidates old sessions', async () => {
    const { registerUser } = await import('./helpers.js');
    const original = await registerUser(app, 'reset_user');
    assert.ok(original.recoveryCode, 'register should issue a recovery code');

    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: {
        username: 'reset_user',
        recoveryCode: original.recoveryCode,
        newPassword: 'brandnewpassword'
      }
    });

    assert.equal(resetRes.statusCode, 200);
    const reset = JSON.parse(resetRes.payload);
    assert.notEqual(reset.recoveryCode, original.recoveryCode, 'reset must rotate recovery code');

    const oldPasswordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'reset_user',
        password: 'supersecurepassword'
      }
    });
    assert.equal(oldPasswordLogin.statusCode, 401, 'old password must stop working');

    const newPasswordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'reset_user',
        password: 'brandnewpassword'
      }
    });
    assert.equal(newPasswordLogin.statusCode, 200, 'new password must work');

    const oldRefreshReplay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: original.refreshToken }
    });
    assert.equal(oldRefreshReplay.statusCode, 401, 'old sessions must be invalidated after reset');
  });

  test('concurrent refresh replay returns the same rotated token during the grace window', async () => {
    const { registerUser } = await import('./helpers.js');
    const user = await registerUser(app, 'rotate_race');

    const [first, second] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: user.refreshToken }
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: user.refreshToken }
      })
    ]);

    assert.equal(first.statusCode, 200, 'first concurrent refresh should succeed');
    assert.equal(second.statusCode, 200, 'second concurrent refresh should reuse the rotated token during grace');

    const firstBody = JSON.parse(first.payload);
    const secondBody = JSON.parse(second.payload);
    assert.equal(
      firstBody.refreshToken,
      secondBody.refreshToken,
      'concurrent refreshes should converge on the same replacement token'
    );
    assert.notEqual(firstBody.refreshToken, user.refreshToken, 'replacement token should still rotate away from the original');
  });

  test('logout invalidates refresh token', async () => {
    const { registerUser } = await import('./helpers.js');
    const user = await registerUser(app, 'logout_user');

    // Logout with the refresh token
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken: user.refreshToken }
    });
    assert.equal(logoutRes.statusCode, 204);

    // Attempt to refresh — must fail
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: user.refreshToken }
    });
    assert.equal(refreshRes.statusCode, 401, 'logged-out token must be rejected');
  });
});

describe('[integration] auth rate limiting', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('login is rate limited after repeated attempts from the same IP', async () => {
    const { registerUser } = await import('./helpers.js');
    await registerUser(app, 'rate_limit_login_user');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'rate_limit_login_user',
          password: 'wrong-password'
        }
      });
      assert.equal(response.statusCode, 401);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'rate_limit_login_user',
        password: 'supersecurepassword'
      }
    });
    assert.equal(limited.statusCode, 429);
    assert.match(limited.payload, /too many login attempts/i);
    assert.ok(limited.headers['retry-after']);
  });

  test('registration is rate limited after repeated attempts from the same IP', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: `rate_limit_register_${attempt}`,
          password: 'supersecurepassword',
          inviteCode: 'PENTHOUSE-ALPHA',
          acceptTestNotice: true,
          testNoticeVersion: 'alpha-v1'
        }
      });
      assert.equal(response.statusCode, 201);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'rate_limit_register_blocked',
        password: 'supersecurepassword',
        inviteCode: 'PENTHOUSE-ALPHA',
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(limited.statusCode, 429);
    assert.match(limited.payload, /too many registration attempts/i);
    assert.ok(limited.headers['retry-after']);
  });

  test('password reset is rate limited after repeated attempts from the same IP', async () => {
    const { registerUser } = await import('./helpers.js');
    const user = await registerUser(app, 'rate_limit_reset_user');
    assert.ok(user.recoveryCode);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset',
        payload: {
          username: 'rate_limit_reset_user',
          recoveryCode: 'WRNG-WRNG-WRNG-WRNG',
          newPassword: 'brandnewpassword'
        }
      });
      assert.equal(response.statusCode, 401);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: {
        username: 'rate_limit_reset_user',
        recoveryCode: user.recoveryCode,
        newPassword: 'brandnewpassword'
      }
    });
    assert.equal(limited.statusCode, 429);
    assert.match(limited.payload, /too many password reset attempts/i);
    assert.ok(limited.headers['retry-after']);
  });
});

describe('[integration] member self-service', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('me/profile endpoints expose and update display name and bio', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const member = await registerUser(app, 'profile_owner');

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.payload);
    assert.equal(meBody.username, 'profile_owner');
    assert.equal(meBody.displayName, 'profile_owner');
    assert.equal(meBody.bio, null);

    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/profile',
      headers: authHeaders(member.accessToken),
      payload: {
        displayName: 'Profile Owner',
        bio: 'Building quietly'
      }
    });
    assert.equal(updateRes.statusCode, 200);
    const updated = JSON.parse(updateRes.payload);
    assert.equal(updated.displayName, 'Profile Owner');
    assert.equal(updated.bio, 'Building quietly');

    const membersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/members?q=profile',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(membersRes.statusCode, 200);
    const members = JSON.parse(membersRes.payload);
    assert.ok(members.some((row: any) => row.id === member.user.id && row.displayName === 'Profile Owner'));

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/members/${member.user.id}`,
      headers: authHeaders(member.accessToken)
    });
    assert.equal(detailRes.statusCode, 200);
    const detail = JSON.parse(detailRes.payload);
    assert.equal(detail.bio, 'Building quietly');
  });

  test('recovery code rotate and password change invalidate older credentials', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const member = await registerUser(app, 'security_owner');
    assert.ok(member.recoveryCode);

    const rotateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/me/recovery-code/rotate',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(rotateRes.statusCode, 200);
    const rotated = JSON.parse(rotateRes.payload);
    assert.notEqual(rotated.recoveryCode, member.recoveryCode, 'recovery code should rotate');

    const oldResetRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: {
        username: 'security_owner',
        recoveryCode: member.recoveryCode,
        newPassword: 'brandnewsecret1'
      }
    });
    assert.equal(oldResetRes.statusCode, 401, 'old recovery code must stop working after rotation');

    const changePasswordRes = await app.inject({
      method: 'POST',
      url: '/api/v1/me/password',
      headers: authHeaders(member.accessToken),
      payload: {
        currentPassword: 'supersecurepassword',
        newPassword: 'brandnewsecret1'
      }
    });
    assert.equal(changePasswordRes.statusCode, 200);
    const changed = JSON.parse(changePasswordRes.payload);
    assert.equal(changed.user.mustChangePassword, false);
    assert.ok(changed.recoveryCode, 'password change should return a fresh recovery code');
    assert.notEqual(changed.recoveryCode, rotated.recoveryCode, 'password change should rotate recovery code again');

    const replayRefreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: member.refreshToken }
    });
    assert.equal(replayRefreshRes.statusCode, 401, 'old refresh token must be invalid after password change');

    const oldPasswordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'security_owner',
        password: 'supersecurepassword'
      }
    });
    assert.equal(oldPasswordLogin.statusCode, 401);

    const newPasswordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'security_owner',
        password: 'brandnewsecret1'
      }
    });
    assert.equal(newPasswordLogin.statusCode, 200);
  });

  test('session list only includes the member sessions, marks current, and can revoke another session', async () => {
    const { authHeaders, cleanup, registerUser, loginUser } = await import('./helpers.js');
    await cleanup();

    const primary = await registerUser(app, 'session_owner');
    const secondary = await loginUser(app, 'session_owner', 'supersecurepassword');
    const stranger = await registerUser(app, 'session_stranger');

    const ownSessionsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/sessions',
      headers: authHeaders(primary.accessToken)
    });
    assert.equal(ownSessionsRes.statusCode, 200);
    const ownSessions = JSON.parse(ownSessionsRes.payload);
    assert.equal(ownSessions.length, 2);
    assert.equal(ownSessions.filter((session: any) => session.current).length, 1);
    assert.ok(ownSessions.some((session: any) => session.deviceLabel));
    assert.ok(ownSessions.every((session: any) => session.appContext === null || typeof session.appContext === 'string'));

    const otherSession = ownSessions.find((session: any) => session.current === false);
    assert.ok(otherSession, 'expected a revoke-able second session');

    const strangerSessionsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/sessions',
      headers: authHeaders(stranger.accessToken)
    });
    assert.equal(strangerSessionsRes.statusCode, 200);
    const strangerSessions = JSON.parse(strangerSessionsRes.payload);
    assert.equal(strangerSessions.length, 1);
    assert.ok(!strangerSessions.some((session: any) => session.id === otherSession.id));

    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/sessions/${otherSession.id}`,
      headers: authHeaders(primary.accessToken)
    });
    assert.equal(revokeRes.statusCode, 204);

    const revokedRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: secondary.refreshToken }
    });
    assert.equal(revokedRefresh.statusCode, 401);

    const currentRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: primary.refreshToken }
    });
    assert.equal(currentRefresh.statusCode, 200);
  });

  test('current session cannot be revoked through the other-session endpoint and revoke-all-others preserves it', async () => {
    const { authHeaders, cleanup, registerUser, loginUser } = await import('./helpers.js');
    await cleanup();

    const primary = await registerUser(app, 'session_revoke_owner');
    const secondary = await loginUser(app, 'session_revoke_owner', 'supersecurepassword');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/sessions',
      headers: authHeaders(primary.accessToken)
    });
    assert.equal(listRes.statusCode, 200);
    const sessions = JSON.parse(listRes.payload);
    const currentSession = sessions.find((session: any) => session.current === true);
    assert.ok(currentSession);

    const revokeCurrentRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/me/sessions/${currentSession.id}`,
      headers: authHeaders(primary.accessToken)
    });
    assert.equal(revokeCurrentRes.statusCode, 409);

    const revokeOthersRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/sessions/others',
      headers: authHeaders(primary.accessToken)
    });
    assert.equal(revokeOthersRes.statusCode, 200);
    assert.equal(JSON.parse(revokeOthersRes.payload).revokedCount, 1);

    const revokedRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: secondary.refreshToken }
    });
    assert.equal(revokedRefresh.statusCode, 401);
  });
});

describe('[integration] admin user management', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('configured bootstrap username becomes admin', async () => {
    const { cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    await withBootstrapUsername('owner_admin', async () => {
      const admin = await registerUser(app, 'owner_admin');
      assert.equal(admin.user.role, 'admin');
    });
  });

  test('admin can fetch operator summary and non-admin is rejected', async () => {
    const { cleanup, registerUser, authHeaders } = await import('./helpers.js');
    await cleanup();

    await withBootstrapUsername('owner_operator', async () => {
      const admin = await registerUser(app, 'owner_operator');
      const member = await registerUser(app, 'plain_member_operator');

      const adminSummaryRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/operator/summary',
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(adminSummaryRes.statusCode, 200);
      const summary = JSON.parse(adminSummaryRes.payload);
      assert.equal(summary.app.name, 'The Penthouse API');
      assert.equal(typeof summary.app.checkedAt, 'string');
      assert.equal(summary.app.databaseReachable, true);
      assert.equal(typeof summary.app.startedAt, 'string');
      assert.equal(typeof summary.app.uptimeSeconds, 'number');
      assert.equal(typeof summary.app.version === 'string' || summary.app.version === null, true);
      assert.equal(typeof summary.members.total, 'number');
      assert.equal(typeof summary.members.active, 'number');
      assert.equal(typeof summary.content.chats, 'number');
      assert.equal(typeof summary.content.messages, 'number');
      assert.equal(typeof summary.content.uploads, 'number');
      assert.equal(typeof summary.content.uploadBytesTotal, 'number');
      assert.equal(typeof summary.realtime.sockets, 'number');
      assert.equal(typeof summary.realtime.connectedUsers, 'number');
      assert.equal(typeof summary.realtime.activeChatRooms, 'number');
      assert.equal(typeof summary.moderation.hiddenMessages, 'number');
      assert.equal(typeof summary.moderation.recentActions24h, 'number');
      assert.equal(typeof summary.invite.code, 'string');
      assert.equal(summary.push.configured, false);
      assert.equal(typeof summary.push.androidTokens, 'number');
      assert.equal(typeof summary.push.iosTokens, 'number');
      assert.equal(typeof summary.push.notificationsDisabled, 'number');
      assert.equal(typeof summary.push.quietHoursEnabled, 'number');
      assert.equal(typeof summary.push.previewsDisabled, 'number');
      assert.equal(typeof summary.push.sinceStart.successfulSends, 'number');
      assert.equal(typeof summary.push.sinceStart.failedSends, 'number');
      assert.equal(typeof summary.push.sinceStart.staleTokensRemoved, 'number');
      assert.equal(typeof summary.uploads.status, 'string');
      assert.equal(Array.isArray(summary.errors.sinceStart.routeGroups), true);
      assert.equal(typeof summary.backup.status, 'string');

      const memberSummaryRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/operator/summary',
        headers: authHeaders(member.accessToken)
      });
      assert.equal(memberSummaryRes.statusCode, 403);
    });
  });

  test('admin issued temporary password forces password change before full access resumes', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const admin = await registerUser(app, 'owner_temp');
    await promoteAdmin('owner_temp');
      const member = await registerUser(app, 'temp_target');

      const tempPasswordRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/members/${member.user.id}/temp-password`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(tempPasswordRes.statusCode, 200);
      const tempPassword = JSON.parse(tempPasswordRes.payload);

      const staleAccessBlocked = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(member.accessToken)
      });
      assert.equal(staleAccessBlocked.statusCode, 403, 'existing access token should be downgraded immediately');
      assert.equal(JSON.parse(staleAccessBlocked.payload).error, 'Password change required');

      const oldPasswordLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'temp_target',
          password: 'supersecurepassword'
        }
      });
      assert.equal(oldPasswordLogin.statusCode, 401);

      const tempLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'temp_target',
          password: tempPassword.temporaryPassword
        }
      });
      assert.equal(tempLogin.statusCode, 200);
      const tempSession = JSON.parse(tempLogin.payload);
      assert.equal(tempSession.user.mustChangePassword, true);

      const rotateRecoveryBlocked = await app.inject({
        method: 'POST',
        url: '/api/v1/me/recovery-code/rotate',
        headers: authHeaders(tempSession.accessToken)
      });
      assert.equal(rotateRecoveryBlocked.statusCode, 403, 'temp-password users should not rotate recovery codes');

      const changedPasswordRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/password',
        headers: authHeaders(tempSession.accessToken),
        payload: {
          currentPassword: tempPassword.temporaryPassword,
          newPassword: 'freshsupersecurepassword'
        }
      });
      assert.equal(changedPasswordRes.statusCode, 200);
      const changedSession = JSON.parse(changedPasswordRes.payload);
      assert.equal(changedSession.user.mustChangePassword, false);

      const chatsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(changedSession.accessToken)
      });
      assert.equal(chatsRes.statusCode, 200, 'full access should resume after password change');
  });

  test('admin remove revokes member access immediately and hides them from the active directory', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const admin = await registerUser(app, 'owner_remove');
    await promoteAdmin('owner_remove');
      const member = await registerUser(app, 'remove_target');

      const removeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/members/${member.user.id}/remove`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(removeRes.statusCode, 204);

      const staleMe = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: authHeaders(member.accessToken)
      });
      assert.equal(staleMe.statusCode, 403);

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'remove_target',
          password: 'supersecurepassword'
        }
      });
      assert.equal(loginRes.statusCode, 403);

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: member.refreshToken }
      });
      assert.equal(refreshRes.statusCode, 401);

      const activeMembersRes = await app.inject({
        method: 'GET',
        url: '/api/v1/members?q=remove',
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(activeMembersRes.statusCode, 200);
      const activeMembers = JSON.parse(activeMembersRes.payload);
      assert.ok(activeMembers.every((row: any) => row.username !== 'remove_target'));

      const adminMembersRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/members?q=remove',
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(adminMembersRes.statusCode, 200);
      const adminMembers = JSON.parse(adminMembersRes.payload);
      assert.equal(adminMembers.find((row: any) => row.username === 'remove_target')?.status, 'removed');
  });

  test('admin ban blocks login and keeps the username reserved', async () => {
    const { authHeaders, cleanup, registerUser } = await import('./helpers.js');
    await cleanup();

    const admin = await registerUser(app, 'owner_ban');
    await promoteAdmin('owner_ban');
      const member = await registerUser(app, 'ban_target');

      const banRes = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/members/${member.user.id}/ban`,
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(banRes.statusCode, 204);

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'ban_target',
          password: 'supersecurepassword'
        }
      });
      assert.equal(loginRes.statusCode, 403);

      const registerAgainRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'ban_target',
          password: 'supersecurepassword',
          inviteCode: 'PENTHOUSE-ALPHA',
          acceptTestNotice: true,
          testNoticeVersion: 'alpha-v1'
        }
      });
      assert.equal(registerAgainRes.statusCode, 409, 'banned username should remain reserved');

      const adminMembersRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/members?q=ban',
        headers: authHeaders(admin.accessToken)
      });
      assert.equal(adminMembersRes.statusCode, 200);
      const adminMembers = JSON.parse(adminMembersRes.payload);
      assert.equal(adminMembers.find((row: any) => row.username === 'ban_target')?.status, 'banned');
  });
});

describe('[integration] test notice acknowledgement', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('register rejects stale acknowledgement version', async () => {
    await withTestNoticeVersion('alpha-v2', async () => {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'stale_notice_user',
          password: 'supersecurepassword',
          inviteCode: 'PENTHOUSE-ALPHA',
          acceptTestNotice: true,
          testNoticeVersion: 'alpha-v1'
        }
      });

      assert.equal(registerRes.statusCode, 400);
      assert.match(registerRes.payload, /current test notice/i);
    });
  });

  test('version bump marks existing users as mustAcceptTestNotice until they acknowledge', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const member = await registerUser(app, 'notice_gate_user');

    await withTestNoticeVersion('alpha-v2', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          username: 'notice_gate_user',
          password: 'supersecurepassword'
        }
      });
      assert.equal(loginRes.statusCode, 200);
      const loggedIn = JSON.parse(loginRes.payload);
      assert.equal(loggedIn.user.mustAcceptTestNotice, true);
      assert.equal(loggedIn.user.requiredTestNoticeVersion, 'alpha-v2');
      assert.equal(loggedIn.user.acceptedTestNoticeVersion, 'alpha-v1');

      const chatsBlocked = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(loggedIn.accessToken)
      });
      assert.equal(chatsBlocked.statusCode, 403);
      assert.equal(JSON.parse(chatsBlocked.payload).error, 'Test account acknowledgement required');

      const meAllowed = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: authHeaders(loggedIn.accessToken)
      });
      assert.equal(meAllowed.statusCode, 200);

      const ackRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/test-notice/ack',
        headers: authHeaders(loggedIn.accessToken),
        payload: { version: 'alpha-v2' }
      });
      assert.equal(ackRes.statusCode, 200);
      const ackBody = JSON.parse(ackRes.payload);
      assert.equal(ackBody.user.mustAcceptTestNotice, false);
      assert.equal(ackBody.user.requiredTestNoticeVersion, 'alpha-v2');
      assert.equal(ackBody.user.acceptedTestNoticeVersion, 'alpha-v2');
      assert.ok(ackBody.acceptedAt);

      const ackAgainRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/test-notice/ack',
        headers: authHeaders(loggedIn.accessToken),
        payload: { version: 'alpha-v2' }
      });
      assert.equal(ackAgainRes.statusCode, 200);
      assert.equal(JSON.parse(ackAgainRes.payload).user.acceptedTestNoticeVersion, 'alpha-v2');

      const chatsAfterAck = await app.inject({
        method: 'GET',
        url: '/api/v1/chats',
        headers: authHeaders(loggedIn.accessToken)
      });
      assert.equal(chatsAfterAck.statusCode, 200);
    });

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: member.refreshToken }
    });
    assert.equal(refreshRes.statusCode, 200);
    const refreshed = JSON.parse(refreshRes.payload);
    assert.equal(refreshed.user.mustAcceptTestNotice, false);
    assert.equal(refreshed.user.acceptedTestNoticeVersion, 'alpha-v2');
  });
});

});
