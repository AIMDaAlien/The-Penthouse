import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

const HEALTH_DB_TIMEOUT_MS = 2_000;

async function pingDatabaseWithin(timeoutMs: number): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      pool.query('SELECT 1')
        .then(() => true)
        .catch(() => false),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/health', async (_request, reply) => {
    const dbReachable = await pingDatabaseWithin(HEALTH_DB_TIMEOUT_MS);
    if (!dbReachable) {
      return reply.status(503).send({
        status: 'degraded',
        db: 'unreachable'
      });
    }

    return {
      status: 'ok',
      app: 'The Penthouse API',
      ts: new Date().toISOString()
    };
  });
}
