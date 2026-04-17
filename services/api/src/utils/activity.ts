import type { FastifyBaseLogger } from 'fastify';
import type { Queryable } from './users.js';

type ActivityLogger = Pick<FastifyBaseLogger, 'warn'>;

export function touchLastSeen(db: Queryable, userId: string, log?: ActivityLogger): void {
  if (!userId) return;

  void db.query(
    `UPDATE users
     SET last_seen_at = NOW()
     WHERE id = $1`,
    [userId]
  ).catch((error) => {
    log?.warn({ error, userId }, 'failed to update user last seen');
  });
}
