import test, { afterEach, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

describe('[integration] user directory and profiles', { skip: SKIP, concurrency: false }, () => {
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

  test('searches active users by case-insensitive username or display name prefix and tolerates blank queries', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const actor = await registerUser(app, 'directory_actor');
    const alice = await registerUser(app, 'alice_lookup');
    const bob = await registerUser(app, 'bob_lookup');
    const removed = await registerUser(app, 'alicia_removed');

    await pool.query(
      `UPDATE users
       SET display_name = $1,
           timezone = $2
       WHERE id = $3`,
      ['Alice Example', 'America/New_York', alice.user.id]
    );
    await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', ['Builder Bob', bob.user.id]);
    await pool.query(
      `UPDATE users
       SET display_name = $1,
           status = 'removed'
       WHERE id = $2`,
      ['Alicia Hidden', removed.user.id]
    );

    const byUsername = await app.inject({
      method: 'GET',
      url: '/api/v1/users/search?q=ALI&limit=20',
      headers: authHeaders(actor.accessToken)
    });
    assert.equal(byUsername.statusCode, 200);
    const usernameBody = JSON.parse(byUsername.payload);
    assert.equal(usernameBody.results.length, 1);
    assert.equal(usernameBody.results[0].username, 'alice_lookup');
    assert.equal(usernameBody.results[0].timezone, 'America/New_York');
    assert.equal(usernameBody.results[0].displayName, 'Alice Example');

    const byDisplayName = await app.inject({
      method: 'GET',
      url: '/api/v1/users/search?q=buil&limit=20',
      headers: authHeaders(actor.accessToken)
    });
    assert.equal(byDisplayName.statusCode, 200);
    const displayBody = JSON.parse(byDisplayName.payload);
    assert.equal(displayBody.results.length, 1);
    assert.equal(displayBody.results[0].username, 'bob_lookup');

    const blank = await app.inject({
      method: 'GET',
      url: '/api/v1/users/search?q=',
      headers: authHeaders(actor.accessToken)
    });
    assert.equal(blank.statusCode, 200);
    assert.deepEqual(JSON.parse(blank.payload), { results: [] });
  });

  test('lists active users with pagination metadata and stable ordering', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const actor = await registerUser(app, 'list_actor');
    const first = await registerUser(app, 'user_first');
    const second = await registerUser(app, 'user_second');
    const third = await registerUser(app, 'user_third');

    await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', ['Bravo User', first.user.id]);
    await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', ['Alpha User', second.user.id]);
    await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', ['Charlie User', third.user.id]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users?offset=1&limit=2',
      headers: authHeaders(actor.accessToken)
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.total, 4);
    assert.equal(body.offset, 1);
    assert.equal(body.limit, 2);
    assert.equal(body.users.length, 2);
    assert.deepEqual(
      body.users.map((user: any) => user.displayName),
      ['Bravo User', 'Charlie User']
    );
  });

  test('returns a user profile with timezone and lastSeenAt and hides removed users', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const actor = await registerUser(app, 'profile_reader');
    const member = await registerUser(app, 'profile_subject');
    const removed = await registerUser(app, 'profile_removed');

    await pool.query(
      `UPDATE users
       SET bio = $1,
           timezone = $2,
           last_seen_at = NOW() - INTERVAL '5 minutes'
       WHERE id = $3`,
      ['Quietly building', 'UTC', member.user.id]
    );
    await pool.query(`UPDATE users SET status = 'removed' WHERE id = $1`, [removed.user.id]);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${member.user.id}`,
      headers: authHeaders(actor.accessToken)
    });
    assert.equal(detail.statusCode, 200);
    const body = JSON.parse(detail.payload);
    assert.equal(body.username, 'profile_subject');
    assert.equal(body.bio, 'Quietly building');
    assert.equal(body.timezone, 'UTC');
    assert.ok(body.lastSeenAt, 'expected lastSeenAt to be returned');

    const missing = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${removed.user.id}`,
      headers: authHeaders(actor.accessToken)
    });
    assert.equal(missing.statusCode, 404);
  });

  test('PATCH /api/v1/auth/me updates the current profile and returns auth user shape', async () => {
    const { authHeaders, registerUser } = await import('./helpers.js');
    const member = await registerUser(app, 'profile_editor');

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/me',
      headers: authHeaders(member.accessToken),
      payload: {
        displayName: 'Profile Editor',
        bio: 'Tier 1 ready',
        timezone: 'America/Chicago'
      }
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.username, 'profile_editor');
    assert.equal(body.displayName, 'Profile Editor');
    assert.equal(body.timezone, 'America/Chicago');
    assert.ok(!('bio' in body), 'auth/me should return the auth user shape, not the full me payload');
  });

  test('user directory reads update lastSeenAt asynchronously', async () => {
    const { authHeaders, pool, registerUser } = await import('./helpers.js');
    const member = await registerUser(app, 'last_seen_actor');

    await pool.query(
      `UPDATE users
       SET last_seen_at = NOW() - INTERVAL '2 days'
       WHERE id = $1`,
      [member.user.id]
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users?offset=0&limit=20',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(response.statusCode, 200);

    await new Promise((resolve) => setTimeout(resolve, 75));

    const refreshed = await pool.query(
      `SELECT last_seen_at
       FROM users
       WHERE id = $1`,
      [member.user.id]
    );
    const lastSeenAt = refreshed.rows[0]?.last_seen_at as string | undefined;
    assert.ok(lastSeenAt, 'last_seen_at should be populated');
    assert.ok(
      new Date(lastSeenAt).getTime() > Date.now() - 60_000,
      `expected last_seen_at to be refreshed recently, got ${lastSeenAt}`
    );
  });
});
