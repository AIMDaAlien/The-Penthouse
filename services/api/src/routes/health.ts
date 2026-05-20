import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';

export async function registerHealthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/health', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', db: 'reachable' };
    } catch {
      return reply.status(503).send({ status: 'degraded', db: 'unreachable' });
    }
  });

  fastify.get('/health', async () => ({ status: 'ok' }));
}
