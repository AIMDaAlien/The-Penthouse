import type { FastifyInstance } from 'fastify';
import { ClientSyncRequestSchema } from '@penthouse/contracts';
import { badRequest } from '../utils/error-responses.js';
import { getSyncResponse, syncCursorFromQuery, syncLimitFromQuery } from '../features/sync/service.js';

export async function registerSyncRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/sync', { preHandler: fastify.authenticate }, async (request) => {
    const query = request.query as { cursor?: string; limit?: string };

    try {
      const cursor = syncCursorFromQuery(query.cursor);
      const limit = syncLimitFromQuery(query.limit);
      ClientSyncRequestSchema.parse({ type: 'sync.request', cursor, limit });
      return getSyncResponse(request.authUser!.userId, cursor, limit);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid sync')) {
        throw badRequest(error.message, 'SYNC_INVALID_CURSOR');
      }
      throw error;
    }
  });
}
