import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

async function promoteAdmin(username: string) {
  const { pool } = await import('./helpers.js');
  await pool.query(`UPDATE users SET role = 'admin' WHERE username = $1`, [username]);
}

describe('[integration] invite management', { skip: SKIP, concurrency: false }, () => {
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

  test('admin can list invites', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'invite_admin');
    await promoteAdmin('invite_admin');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(res.statusCode, 200);
    const invites = JSON.parse(res.payload);
    assert.ok(invites.length >= 1);
    assert.ok(invites.some((inv: any) => inv.code === 'PENTHOUSE-ALPHA'));
  });

  test('admin can create a new invite with label and max uses', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'create_inv_admin');
    await promoteAdmin('create_inv_admin');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Friends batch', maxUses: 5 }
    });
    assert.equal(res.statusCode, 201);
    const created = JSON.parse(res.payload);
    assert.equal(created.label, 'Friends batch');
    assert.equal(created.maxUses, 5);
    assert.equal(created.uses, 0);
    assert.ok(created.id);
    assert.ok(created.code);
  });

  test('register succeeds with a newly created invite', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'reg_inv_admin');
    await promoteAdmin('reg_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Test batch', maxUses: 1 }
    });
    const invite = JSON.parse(createRes.payload);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'invited_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 201);
  });

  test('revoked invite fails at registration', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'revoke_inv_admin');
    await promoteAdmin('revoke_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Revokable', maxUses: 10 }
    });
    const invite = JSON.parse(createRes.payload);

    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/invites/${invite.id}/revoke`,
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(revokeRes.statusCode, 204);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'revoked_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 400);
  });

  test('exhausted invite fails at registration', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'exhaust_inv_admin');
    await promoteAdmin('exhaust_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Single use', maxUses: 1 }
    });
    const invite = JSON.parse(createRes.payload);

    // Use it once
    const firstReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'exhaust_first',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(firstReg.statusCode, 201);

    // Second use should fail
    const secondReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'exhaust_second',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(secondReg.statusCode, 400);
  });

  test('expired invite fails at registration', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const admin = await registerUser(app, 'expire_inv_admin');
    await promoteAdmin('expire_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Expiring', maxUses: 10, expiresAt: new Date(Date.now() - 86400_000).toISOString() }
    });
    assert.equal(createRes.statusCode, 201);
    const invite = JSON.parse(createRes.payload);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'expired_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 400);
  });

  test('closed registration mode rejects even with a valid invite', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const admin = await registerUser(app, 'closed_admin');
    await promoteAdmin('closed_admin');

    // Switch to closed
    const modeRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken),
      payload: { registrationMode: 'closed' }
    });
    assert.equal(modeRes.statusCode, 200);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'closed_user',
        password: 'supersecurepassword',
        inviteCode: 'PENTHOUSE-ALPHA',
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 403);
    assert.match(regRes.payload, /closed/i);
  });

  test('public auth config exposes registration mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/config'
    });
    assert.equal(res.statusCode, 200);
    const config = JSON.parse(res.payload);
    assert.equal(config.registrationMode, 'invite_only');
  });

  test('non-admin cannot manage invites', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const member = await registerUser(app, 'nonadmin_inv');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/invites',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(listRes.statusCode, 403);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(member.accessToken),
      payload: { label: 'Sneaky', maxUses: 1 }
    });
    assert.equal(createRes.statusCode, 403);
  });

  test('admin can get and update registration mode', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'mode_admin');
    await promoteAdmin('mode_admin');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(getRes.statusCode, 200);
    assert.equal(JSON.parse(getRes.payload).registrationMode, 'invite_only');

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken),
      payload: { registrationMode: 'closed' }
    });
    assert.equal(putRes.statusCode, 200);
    assert.equal(JSON.parse(putRes.payload).registrationMode, 'closed');

    // Verify persistence
    const getRes2 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(JSON.parse(getRes2.payload).registrationMode, 'closed');
  });
});
