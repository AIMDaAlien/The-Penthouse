import type { FastifyInstance } from 'fastify';
import {
  ListUsersRequestSchema,
  ListUsersResponseSchema,
  MemberDetailSchema,
  UserSearchRequestSchema,
  UserSearchResponseSchema
} from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { touchLastSeen } from '../utils/activity.js';
import { formatValidationError } from '../utils/error-responses.js';
import {
  getUserById,
  listActiveUsersPage,
  mapMemberDetail,
  searchActiveUsers
} from '../utils/users.js';

function parseOptionalInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/users/search', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const rawQuery = String((request.query as { q?: string })?.q ?? '').trim();
    const rawLimit = parseOptionalInteger((request.query as { limit?: unknown })?.limit);

    if (!rawQuery) {
      touchLastSeen(pool, request.user.userId, request.log);
      return UserSearchResponseSchema.parse({ results: [] });
    }

    const parsed = UserSearchRequestSchema.safeParse({
      q: rawQuery,
      limit: rawLimit
    });
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const users = await searchActiveUsers(pool, parsed.data.q, parsed.data.limit ?? 20);
    touchLastSeen(pool, request.user.userId, request.log);

    return UserSearchResponseSchema.parse({
      results: users.map((user) => MemberDetailSchema.parse(mapMemberDetail(user)))
    });
  });

  app.get('/api/v1/users', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const query = request.query as { offset?: unknown; limit?: unknown };
    const parsed = ListUsersRequestSchema.safeParse({
      offset: parseOptionalInteger(query.offset),
      limit: parseOptionalInteger(query.limit)
    });
    if (!parsed.success) return reply.status(400).send({ error: formatValidationError(parsed.error) });

    const offset = parsed.data.offset ?? 0;
    const limit = parsed.data.limit ?? 20;
    const result = await listActiveUsersPage(pool, offset, limit);
    touchLastSeen(pool, request.user.userId, request.log);

    return ListUsersResponseSchema.parse({
      users: result.users.map((user) => MemberDetailSchema.parse(mapMemberDetail(user))),
      total: result.total,
      offset,
      limit
    });
  });

  app.get('/api/v1/users/:userId', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const user = await getUserById(pool, userId);
    if (!user || user.status !== 'active') {
      return reply.status(404).send({ error: 'User not found' });
    }

    touchLastSeen(pool, request.user.userId, request.log);
    return MemberDetailSchema.parse(mapMemberDetail(user));
  });
}
