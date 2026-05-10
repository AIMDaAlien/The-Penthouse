import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'test' ? 4 : 10
});

export const db = drizzle(pool as never, { schema });

export async function closeDb() {
  await pool.end();
}
