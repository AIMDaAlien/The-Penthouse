import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://penthouse:penthouse@127.0.0.1:5432/penthouse_test';
process.env.JWT_SECRET ??= 'health-test-jwt-secret-long-enough';
process.env.CORS_ORIGIN ??= 'http://localhost:4173';
process.env.REFRESH_TOKEN_SECRET ??= 'health-test-refresh-secret';
process.env.UPLOAD_DIR ??= '/tmp/penthouse-health-test-uploads';

async function loadApp() {
  const [{ createApp }, { pool }] = await Promise.all([
    import('../src/app.js'),
    import('../src/db/pool.js')
  ]);

  return { createApp, pool };
}

test('[unit] health returns ok when the database ping succeeds', async () => {
  const { createApp, pool } = await loadApp();
  const originalQuery = pool.query.bind(pool);
  const app = await createApp();

  pool.query = (async (sql: string, ...args: unknown[]) => {
    if (sql === 'SELECT 1') {
      return { rowCount: 1, rows: [{ '?column?': 1 }] } as any;
    }
    return originalQuery(sql, ...(args as []));
  }) as typeof pool.query;

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.payload).status, 'ok');
  } finally {
    pool.query = originalQuery as typeof pool.query;
    await app.close();
  }
});

test('[unit] health returns degraded when the database ping rejects', async () => {
  const { createApp, pool } = await loadApp();
  const originalQuery = pool.query.bind(pool);
  const app = await createApp();

  pool.query = (async (sql: string, ...args: unknown[]) => {
    if (sql === 'SELECT 1') {
      throw new Error('db down');
    }
    return originalQuery(sql, ...(args as []));
  }) as typeof pool.query;

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(JSON.parse(response.payload), {
      status: 'degraded',
      db: 'unreachable'
    });
  } finally {
    pool.query = originalQuery as typeof pool.query;
    await app.close();
  }
});

test('[unit] health times out the database ping after roughly two seconds', async () => {
  const { createApp, pool } = await loadApp();
  const originalQuery = pool.query.bind(pool);
  const app = await createApp();

  pool.query = (async (sql: string, ...args: unknown[]) => {
    if (sql === 'SELECT 1') {
      return new Promise(() => undefined) as any;
    }
    return originalQuery(sql, ...(args as []));
  }) as typeof pool.query;

  const startedAt = Date.now();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });
    const elapsedMs = Date.now() - startedAt;

    assert.equal(response.statusCode, 503);
    assert.equal(JSON.parse(response.payload).db, 'unreachable');
    assert.ok(elapsedMs >= 1_900, `health timeout should wait about 2s before degrading, got ${elapsedMs}ms`);
    assert.ok(elapsedMs < 5_000, `health timeout should stop within 5s, got ${elapsedMs}ms`);
  } finally {
    pool.query = originalQuery as typeof pool.query;
    await app.close();
  }
});
