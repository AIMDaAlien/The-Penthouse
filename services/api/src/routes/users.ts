import { and, count, ilike, ne, eq, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { ListUsersRequestSchema, UserSearchRequestSchema } from '@penthouse/contracts';
import { db } from '../db/pool.js';
import { users } from '../db/schema.js';
import { notFound } from '../utils/error-responses.js';
import { toMemberDetail } from '../utils/users.js';

function coerceOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  return Number(value);
}

export async function registerUserRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/users', { preHandler: fastify.authenticate }, async (request) => {
    const rawQuery = request.query as { offset?: unknown; limit?: unknown };
    const query = ListUsersRequestSchema.parse({
      offset: coerceOptionalInt(rawQuery.offset),
      limit: coerceOptionalInt(rawQuery.limit)
    });
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const where = eq(users.status, 'active');

    const rows = await db.select().from(users).where(where).orderBy(users.displayName).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(users).where(where);
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, request.authUser!.userId));

    return { users: rows.map(toMemberDetail), total, offset, limit };
  });

  fastify.get('/api/v1/users/search', { preHandler: fastify.authenticate }, async (request) => {
    const rawQuery = request.query as { q?: unknown; limit?: unknown };
    if (typeof rawQuery.q !== 'string' || rawQuery.q.trim().length === 0) return { results: [] };
    const query = UserSearchRequestSchema.parse({
      q: rawQuery.q,
      limit: coerceOptionalInt(rawQuery.limit)
    });
    const results = await db.select()
      .from(users)
      .where(and(
        eq(users.status, 'active'),
        ne(users.id, request.authUser!.userId),
        or(
          ilike(users.username, `${query.q}%`),
          ilike(users.displayName, `${query.q}%`)
        )
      ))
      .orderBy(users.displayName)
      .limit(query.limit ?? 20);

    return { results: results.map(toMemberDetail) };
  });

  fastify.get('/api/v1/users/:id', { preHandler: fastify.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const [user] = await db.select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.status, 'active')))
      .limit(1);

    if (!user) throw notFound('User not found');

    return toMemberDetail(user);
  });
}
