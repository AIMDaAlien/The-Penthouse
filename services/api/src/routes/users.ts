import { and, count, ilike, ne, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { ListUsersRequestSchema, UserSearchRequestSchema } from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { users } from '../db/schema.js';
import { toMemberDetail } from '../utils/users.js';

export async function registerUserRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/users', { preHandler: fastify.authenticate }, async (request) => {
    const query = ListUsersRequestSchema.parse(request.query);
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const where = eq(users.status, 'active');

    const rows = await db.select().from(users).where(where).orderBy(users.displayName).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(users).where(where);

    return { users: rows.map(toMemberDetail), total, offset, limit };
  });

  fastify.get('/api/v1/users/search', { preHandler: fastify.authenticate }, async (request) => {
    const query = UserSearchRequestSchema.parse(request.query);
    const results = await db.select()
      .from(users)
      .where(and(
        eq(users.status, 'active'),
        ne(users.id, request.authUser!.userId),
        ilike(users.displayName, `%${query.q}%`)
      ))
      .orderBy(users.displayName)
      .limit(query.limit ?? 20);

    return { results: results.map(toMemberDetail) };
  });
}
