import { ServerPresenceSyncEventSchema } from '@penthouse/contracts';

type Queryable = {
  query: (
    sql: string,
    params?: unknown[]
  ) => Promise<{
    rows: Array<{
      id: string;
      presence_state: 'available' | 'busy' | 'dnd' | 'afk' | 'offline';
      presence_note: string | null;
      last_seen_at: Date | string | null;
    }>;
  }>;
};

const activePresenceSocketsByUser = new Map<string, Set<string>>();

export function setSocketPresence(userId: string, socketId: string, online: boolean): {
  becameOnline: boolean;
  becameOffline: boolean;
  isOnline: boolean;
} {
  const sockets = activePresenceSocketsByUser.get(userId) ?? new Set<string>();
  const wasOnline = sockets.size > 0;

  if (online) {
    sockets.add(socketId);
    activePresenceSocketsByUser.set(userId, sockets);
  } else {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      activePresenceSocketsByUser.delete(userId);
    } else {
      activePresenceSocketsByUser.set(userId, sockets);
    }
  }

  const isOnline = online
    ? true
    : (activePresenceSocketsByUser.get(userId)?.size ?? 0) > 0;

  return {
    becameOnline: !wasOnline && isOnline,
    becameOffline: wasOnline && !isOnline,
    isOnline
  };
}

export function listOnlineUserIds(): string[] {
  return Array.from(activePresenceSocketsByUser.keys());
}

export async function buildPresenceSnapshot(db: Queryable) {
  const result = await db.query(`
    SELECT id, presence_state, presence_note, last_seen_at
    FROM users
    WHERE status = 'active'
    ORDER BY created_at ASC
  `);
  const snapshot = Object.fromEntries(
    result.rows.map((row) => {
      const isOnline = activePresenceSocketsByUser.has(String(row.id));
      const state = isOnline ? row.presence_state : 'offline';
      const lastSeenAt = row.last_seen_at instanceof Date
        ? row.last_seen_at.toISOString()
        : row.last_seen_at ?? undefined;

      return [String(row.id), {
        state,
        note: row.presence_note ?? '',
        ...(lastSeenAt ? { lastSeenAt } : {})
      }];
    })
  );

  return ServerPresenceSyncEventSchema.parse(snapshot);
}

export function resetPresenceState(): void {
  activePresenceSocketsByUser.clear();
}
