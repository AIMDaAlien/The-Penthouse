import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { buildPresenceSnapshot } from '../utils/presence.js';

export async function registerPresenceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/presence', { preHandler: [app.authenticate, app.requireFullAccess] }, async () => {
    return buildPresenceSnapshot(pool);
  });
}
