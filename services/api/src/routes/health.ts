import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

function timeout(ms: number) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('health check timed out')), ms);
  });
}

export async function registerHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/health', async (_request, reply) => {
    try {
      await Promise.race([pool.query('SELECT 1'), timeout(2_000)]);
      return { status: 'ok', db: 'reachable' };
    } catch {
      return reply.status(503).send({ status: 'degraded', db: 'unreachable' });
    }
  });

  fastify.get('/health', async () => ({ status: 'ok' }));
}
