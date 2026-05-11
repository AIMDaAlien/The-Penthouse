import { env } from '../src/config/env.js';
import { pool } from '../src/db/pool.js';

function assertSafeTestDatabase() {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Refusing to reset schema outside NODE_ENV=test');
  }

  const url = new URL(env.DATABASE_URL);
  if (url.pathname !== '/penthouse_test') {
    throw new Error(`Refusing to reset non-test database: ${url.pathname}`);
  }
}

assertSafeTestDatabase();

try {
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
} finally {
  await pool.end();
}
