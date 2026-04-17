import { ServerPresenceSyncEventSchema } from '@penthouse/contracts';

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id: string }> }>;
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

export async function buildPresenceSnapshot(db: Queryable): Promise<Record<string, boolean>> {
  const result = await db.query(`SELECT id FROM users WHERE status = 'active' ORDER BY created_at ASC`);
  const snapshot = Object.fromEntries(
    result.rows.map((row) => [String(row.id), activePresenceSocketsByUser.has(String(row.id))])
  );

  return ServerPresenceSyncEventSchema.parse(snapshot);
}

export function resetPresenceState(): void {
  activePresenceSocketsByUser.clear();
}
