# Codex Handoff — Local-First Sync Engine + WebRTC SFU Streaming

**Date:** 2026-05-11
**Priority:** 🔴 CRITICAL PATH — Blocker for all future features
**Estimated Sessions:** 6–8 Codex sessions
**Scope:** Two major architectural deliverables:
1. **Local-First Sync Engine** (primary) — CRDT-based client-side persistence
2. **WebRTC SFU Streaming** (secondary) — Self-hosted 1080p video/voice

---

## Executive Summary

The current architecture is entirely server-dependent: every message fetch, every chat list load, every search hits Postgres over HTTP. This handoff defines the migration to a **local-first** architecture where:

- Client maintains a SQLite database (via sql.js in a Web Worker)
- All reads are local and instant
- Server sync happens over WebSocket in the background
- Offline usage is fully supported (reads always work, writes queue)
- Multi-device sync is enabled by server-authoritative CRDT operations

Concurrently, we replace the existing mesh WebRTC scaffold with a **self-hosted Mediasoup SFU** that supports 1080p video streaming with low latency. No 3rd-party services. No Twilio. No Daily.co.

---

## Part 1: Local-First Sync Engine

### 1.1 Why This Is The Foundation

Every feature in our backlog compounds from this:

| Feature | Unlocked By Local-First |
|---------|------------------------|
| Instant UI | Local reads = zero network latency |
| Offline messaging | Write queue + sync on reconnect |
| Full-text search | SQLite FTS5 on device |
| Multi-device sync | Server CRDT merge |
| AI context (RAG) | Queryable local message history |
| GraphQL API (Tier 3) | SQLite = local database |
| Message search | No server round-trip |
| Focus mode/digest | Local aggregation of unread counts |

### 1.2 Architecture Decisions (LOCKED)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client DB | **sql.js** (SQLite compiled to WASM) | Zero native deps, runs in Web Worker, persisted via IndexedDB (sql.js-storage-api or idb-keyval) |
| Worker pattern | **Dedicated Web Worker** | DB operations off main thread; shared worker deferred |
| Sync protocol | **Operation-based CRDT** (server-authoritative) | Simpler than state-based; server is source of truth; client applies ops in order |
| Conflict resolution | **Last-write-wins (LWW) with server timestamp** | Good enough for chat; custom rules for reactions (set union), edits (append-only log) |
| Sync transport | **WebSocket (existing Socket.IO)** | Reuse established connection; fallback to HTTP long-polling |
| Offline queue | **IndexedDB-backed outbox** | Separate from sql.js; survives page refresh; retry with exponential backoff |
| Initial hydration | **Chunked sync** | First sync pulls recent N messages per chat, then backfills history on demand |
| Schema versioning | **Migration table in SQLite** | Same pattern as Drizzle migrations |

### 1.3 Client-Side SQLite Schema

The SQLite schema mirrors the server Drizzle schema but adds sync-tracking columns:

```sql
-- Core tables (mirror server schema)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_media_id TEXT,
  bio TEXT,
  presence_state TEXT NOT NULL DEFAULT 'offline',
  presence_note TEXT NOT NULL DEFAULT '',
  last_seen_at TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  -- sync tracking
  _synced_at TEXT,
  _version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_chat_id TEXT,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  _synced_at TEXT,
  _version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at TEXT NOT NULL,
  last_read_message_id TEXT,
  notifications_muted INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  client_message_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata TEXT, -- JSON
  reply_to_message_id TEXT,
  reply_to_snapshot TEXT, -- JSON
  created_at TEXT NOT NULL,
  edited_at TEXT,
  edit_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by_user_id TEXT,
  _synced_at TEXT,
  _version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE message_reactions (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE message_edits (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  previous_content TEXT NOT NULL,
  edited_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE pinned_messages (
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  pinned_by TEXT NOT NULL,
  pinned_at TEXT NOT NULL,
  content_snapshot TEXT,
  sender_display_name_snapshot TEXT,
  PRIMARY KEY (chat_id, message_id)
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  content='messages',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts (rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;

CREATE TRIGGER messages_fts_update AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
  INSERT INTO messages_fts (rowid, content) VALUES (new.rowid, new.content);
END;

-- Sync state tracking
CREATE TABLE _sync_state (
  table_name TEXT PRIMARY KEY,
  last_sync_at TEXT,
  last_sync_cursor TEXT -- opaque server cursor
);

-- Local-only tables
CREATE TABLE _outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL, -- 'message.send', 'message.edit', 'message.delete', 'reaction.add', 'reaction.remove', 'chat.join'
  payload TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  error TEXT
);

CREATE TABLE _pending_reads (
  chat_id TEXT NOT NULL,
  through_message_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, through_message_id)
);

-- Indexes
CREATE INDEX idx_messages_chat_created ON messages (chat_id, created_at);
CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_client ON messages (chat_id, sender_id, client_message_id);
CREATE INDEX idx_chat_members_user ON chat_members (user_id);
```

### 1.4 Sync Protocol

#### Operation Types

Each server event becomes an **operation** that the client applies idempotently:

| Server Event | Client Operation | CRDT Behavior |
|-------------|------------------|---------------|
| `message.new` | `InsertMessageOp` | Insert if not exists (idempotent by message.id) |
| `message.edited` | `EditMessageOp` | Append edit to edits table, update messages row |
| `message.deleted` | `DeleteMessageOp` | Soft delete (set deleted_at) |
| `reaction.add` | `AddReactionOp` | Set union (message_id, user_id, emoji) |
| `reaction.remove` | `RemoveReactionOp` | Remove from set |
| `message.pinned` | `PinMessageOp` | Upsert into pinned_messages |
| `message.unpinned` | `UnpinMessageOp` | Remove from pinned_messages |
| `presence.update` | `UpdatePresenceOp` | Update users row |
| `typing.update` | `UpdateTypingOp` | Ephemeral — store in memory, not SQLite |

#### Sync Flow

```
1. Client connects via Socket.IO
2. Server emits `sync.state` with cursor per table
   → If client has no cursor: full initial sync needed
3. Client requests `sync.request` with its stored cursors
4. Server responds with `sync.batch` containing ops since cursor
5. Client applies ops in order, updates cursors
6. Real-time: server pushes individual ops as they happen
7. Client writes: added to _outbox, optimistic local apply, then sent to server
```

#### Zod Schemas (add to `@penthouse/contracts`)

```typescript
// Sync operation envelope
export const SyncOpSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message.insert'), payload: MessageSchema }),
  z.object({ type: z.literal('message.edit'), payload: z.object({ messageId: z.string(), content: z.string(), editedAt: z.string(), editCount: z.number() }) }),
  z.object({ type: z.literal('message.delete'), payload: z.object({ messageId: z.string(), deletedAt: z.string(), deletedByUserId: z.string() }) }),
  z.object({ type: z.literal('reaction.add'), payload: z.object({ messageId: z.string(), userId: z.string(), emoji: z.string(), createdAt: z.string() }) }),
  z.object({ type: z.literal('reaction.remove'), payload: z.object({ messageId: z.string(), userId: z.string(), emoji: z.string() }) }),
  z.object({ type: z.literal('message.pin'), payload: z.object({ chatId: z.string(), messageId: z.string(), pinnedBy: z.string(), pinnedAt: z.string(), content: z.string(), senderDisplayName: z.string().nullable() }) }),
  z.object({ type: z.literal('message.unpin'), payload: z.object({ chatId: z.string(), messageId: z.string() }) }),
  z.object({ type: z.literal('user.update'), payload: z.object({ userId: z.string(), username: z.string().optional(), displayName: z.string().optional(), avatarMediaId: z.string().nullable().optional(), presenceState: z.string().optional(), presenceNote: z.string().optional() }) }),
  z.object({ type: z.literal('chat.update'), payload: z.object({ chatId: z.string(), name: z.string().optional(), updatedAt: z.string() }) }),
  z.object({ type: z.literal('member.update'), payload: z.object({ chatId: z.string(), userId: z.string(), lastReadAt: z.string().nullable().optional(), lastReadMessageId: z.string().nullable().optional(), notificationsMuted: z.boolean().nullable().optional(), archivedAt: z.string().nullable().optional() }) }),
]);

export type SyncOp = z.infer<typeof SyncOpSchema>;

// Sync request/response
export const ClientSyncRequestSchema = z.object({
  type: z.literal('sync.request'),
  cursors: z.record(z.string(), z.string().optional()) // tableName -> cursor
});

export const ServerSyncBatchSchema = z.object({
  type: z.literal('sync.batch'),
  payload: z.object({
    tableName: z.string(),
    ops: z.array(SyncOpSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean()
  })
});

export const ServerSyncStateSchema = z.object({
  type: z.literal('sync.state'),
  payload: z.record(z.string(), z.string().optional()) // tableName -> latest cursor
});
```

### 1.5 File Breakdown

#### NEW FILES

| File | Purpose |
|------|---------|
| `apps/web/src/lib/sync/db.worker.ts` | Web Worker hosting sql.js; exposes RPC interface |
| `apps/web/src/lib/sync/db-client.ts` | Thin wrapper that posts messages to worker; typed API |
| `apps/web/src/lib/sync/schema.sql` | SQLite DDL (the schema above) |
| `apps/web/src/lib/sync/migrations.ts` | Client-side migration runner (table `_migrations`) |
| `apps/web/src/lib/sync/sync-engine.svelte.ts` | Svelte 5 store: sync state, outbox processing, cursor management |
| `apps/web/src/lib/sync/outbox.ts` | Outbox queue: add, process, retry, error handling |
| `apps/web/src/lib/sync/operations.ts` | Op appliers: each SyncOp type → SQL execution |
| `apps/web/src/lib/sync/search.ts` | FTS5 query wrapper |
| `services/api/src/realtime/sync.ts` | Server-side sync: cursor generation, batch construction |
| `services/api/src/db/sync-cursors.sql` | Server SQL for efficient cursor-based pagination |
| `packages/contracts/src/sync.ts` | All sync-related Zod schemas |

#### MODIFIED FILES

| File | Changes |
|------|---------|
| `apps/web/src/lib/stores/socket.svelte.ts` | Add sync event handlers; emit sync.request on connect |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Replace server fetches with local DB queries |
| `apps/web/src/routes/users/+page.svelte` | Replace server fetches with local DB queries |
| `apps/web/src/lib/stores/chats.svelte.ts` | Source from local DB instead of HTTP |
| `apps/web/src/lib/stores/channels.svelte.ts` | Source from local DB instead of HTTP |
| `services/api/src/realtime/socket.ts` | Add sync.batch emission; integrate sync handler |
| `services/api/src/db/schema.ts` | Add `_version` or `updated_at` where needed for cursors |

### 1.6 Outbox Flow (Detailed)

When user sends a message offline:

```
1. User clicks send → MessageComposer
2. sync-engine assigns clientMessageId, generates optimistic message
3. ops.apply('message.insert', optimisticMessage) → local SQLite
4. outbox.add({ type: 'message.send', payload: { ... } }) → _outbox table
5. UI immediately shows message (optimistic)
6. When socket connects:
   a. outbox.process() iterates pending items
   b. Sends via socket.emit('message.send', payload)
   c. Waits for message.ack (with matching clientMessageId)
   d. On ack: update local message with server id, remove from outbox
   e. On error: increment retry_count, set next_retry_at, store error
7. If server ack never arrives but message.new arrives with same clientMessageId:
   → Treat as implicit ack, update local record, clear outbox
```

### 1.7 Server-Side Sync Implementation

The server needs to generate cursors and serve batches. Use a **hybrid cursor** approach:

```typescript
// Cursor format: base64(JSON({ updatedAt, id }))
// Queries use (updated_at, id) > (cursor.updatedAt, cursor.id) for stable pagination

async function getSyncBatch(
  tableName: string,
  cursor: string | undefined,
  userId: string,
  limit: number = 100
): Promise<{ ops: SyncOp[]; nextCursor?: string; hasMore: boolean }> {
  switch (tableName) {
    case 'messages':
      return getMessageOps(cursor, userId, limit);
    case 'chats':
      return getChatOps(cursor, userId, limit);
    case 'chat_members':
      return getMemberOps(cursor, userId, limit);
    case 'users':
      return getUserOps(cursor, userId, limit);
    // ... etc
  }
}
```

**Critical:** Filter by user visibility. Users should only sync:
- Messages from chats they are members of
- Chats they are members of
- Users who are in shared chats
- Their own chat_member rows

### 1.8 Migration from Current Architecture

**Phase A — Scaffold (Session 1–2):**
1. Add sql.js dependency + Web Worker scaffolding
2. Create SQLite schema + migration runner
3. Add sync Zod schemas to contracts
4. Create server sync batch endpoint (REST fallback: `GET /api/v1/sync?cursor=...`)

**Phase B — Sync Engine (Session 3–4):**
1. Implement client sync engine (sync-engine.svelte.ts)
2. Implement outbox queue
3. Wire socket events to apply ops to SQLite
4. Add `sync.request` on socket connect

**Phase C — Cutover (Session 5–6):**
1. Replace `chatsStore` fetch logic with local DB queries
2. Replace chat page message loading with local DB
3. Replace user directory with local DB
4. Add search UI using FTS5
5. Test offline mode (airplane mode, send message, reconnect)

**Phase D — Polish (Session 7–8):**
1. Add sync progress indicator
2. Handle schema migrations gracefully
3. Performance: index tuning, query optimization
4. E2E test: multi-device sync scenario

---

## Part 2: WebRTC SFU Streaming (Mediasoup)

### 2.1 Why Replace Mesh?

Current mesh topology caps at ~4 users for voice and is unusable for video. For 1080p streaming:

| Topology | Upload per peer (4 users) | Upload per peer (8 users) | Feasible for 1080p? |
|----------|---------------------------|---------------------------|---------------------|
| Mesh | 3 × 3 Mbps = 9 Mbps | 7 × 3 Mbps = 21 Mbps | ❌ No |
| SFU | 1 × 3 Mbps = 3 Mbps | 1 × 3 Mbps = 3 Mbps | ✅ Yes |
| MCU | 1 × 3 Mbps = 3 Mbps | 1 × 3 Mbps = 3 Mbps | ✅ Yes (more CPU) |

**Decision:** Self-hosted **Mediasoup** SFU. It's what Discord uses. Pure Node.js API (C++ internals via node-gyp, but no separate service language).

### 2.2 Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Web Client    │◄───────►│  Penthouse API   │◄───────►│  Mediasoup SFU  │
│                 │  WS/SIO │  (Node.js)       │  plain  │  (Node.js)      │
│  - Camera share │         │  - Auth/gatekeep │  proto  │  - RTP routing  │
│  - Screen share │         │  - Room mgmt     │         │  - Simulcast    │
│  - Consume      │         │  - Signal relay  │         │  - Recording    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │                            │
                                    ▼                            ▼
                              ┌──────────┐                 ┌──────────┐
                              │ Postgres │                 │  TURN    │
                              │          │                 │ (Coturn) │
                              └──────────┘                 └──────────┘
```

**Key design:** The existing Socket.IO connection handles signaling. The API server acts as a **signaling proxy** to the Mediasoup worker. Media never touches the API server — it flows peer ↔ Mediasoup via UDP/TCP directly.

### 2.3 Mediasoup Integration Plan

#### Option A: Embedded Worker (Recommended for MVP)

Run Mediasoup inside the same Node.js process as the API:

```typescript
// services/api/src/realtime/mediasoup.ts
import { Worker, Router, WebRtcTransport } from 'mediasoup';

let worker: Worker;
const routers = new Map<string, Router>(); // chatId -> Router
const transports = new Map<string, WebRtcTransport>();

export async function initMediasoup() {
  worker = await Worker.create({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });
}

export async function getOrCreateRouter(chatId: string) {
  if (routers.has(chatId)) return routers.get(chatId)!;
  const router = await worker.createRouter({
    mediaCodecs: [
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
      { kind: 'video', mimeType: 'video/VP9', clockRate: 90000 },
      { kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters: { 'packetization-mode': 1, 'profile-level-id': '4d0032', 'level-asymmetry-allowed': 1 } },
    ]
  });
  routers.set(chatId, router);
  return router;
}
```

#### Option B: Separate Service (Deferred)

If Mediasoup CPU usage becomes problematic, extract to `services/sfu/`. For now, embedded is simpler.

### 2.4 Signaling Protocol (Socket.IO Events)

Replace current mesh `voice.signal` with structured Mediasoup signaling:

```typescript
// packages/contracts/src/media.ts (NEW FILE)

export const ClientMediaJoinRoomSchema = z.object({
  type: z.literal('media.join'),
  chatId: z.string(),
  device: z.object({
    rtpCapabilities: z.record(z.unknown())
  })
});

export const ClientMediaProduceSchema = z.object({
  type: z.literal('media.produce'),
  chatId: z.string(),
  transportId: z.string(),
  kind: z.enum(['audio', 'video']),
  rtpParameters: z.record(z.unknown())
});

export const ClientMediaConsumeSchema = z.object({
  type: z.literal('media.consume'),
  chatId: z.string(),
  transportId: z.string(),
  producerId: z.string(),
  rtpCapabilities: z.record(z.unknown())
});

export const ClientMediaConnectTransportSchema = z.object({
  type: z.literal('media.connect'),
  chatId: z.string(),
  transportId: z.string(),
  dtlsParameters: z.record(z.unknown())
});

export const ClientMediaScreenShareSchema = z.object({
  type: z.literal('media.screenshare'),
  chatId: z.string(),
  enabled: z.boolean()
});

export const ServerMediaRouterRtpCapabilitiesSchema = z.object({
  type: z.literal('media.routerRtpCapabilities'),
  payload: z.object({
    chatId: z.string(),
    rtpCapabilities: z.record(z.unknown())
  })
});

export const ServerMediaTransportCreatedSchema = z.object({
  type: z.literal('media.transportCreated'),
  payload: z.object({
    chatId: z.string(),
    transportId: z.string(),
    iceParameters: z.record(z.unknown()),
    iceCandidates: z.array(z.record(z.unknown())),
    dtlsParameters: z.record(z.unknown())
  })
});

export const ServerMediaProducerAddedSchema = z.object({
  type: z.literal('media.producerAdded'),
  payload: z.object({
    chatId: z.string(),
    userId: z.string(),
    producerId: z.string(),
    kind: z.enum(['audio', 'video'])
  })
});

export const ServerMediaConsumerReadySchema = z.object({
  type: z.literal('media.consumerReady'),
  payload: z.object({
    chatId: z.string(),
    consumerId: z.string(),
    producerId: z.string(),
    kind: z.enum(['audio', 'video']),
    rtpParameters: z.record(z.unknown())
  })
});
```

### 2.5 Client-Side Mediasoup Integration

```typescript
// apps/web/src/lib/stores/media-room.svelte.ts
import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer } from 'mediasoup-client';

interface RoomState {
  chatId: string | null;
  device: Device | null;
  sendTransport: Transport | null;
  recvTransport: Transport | null;
  producers: Map<string, Producer>; // kind -> producer
  consumers: Map<string, Consumer>; // consumerId -> consumer
  participants: Map<string, { audio?: string; video?: string; screen?: string }>;
}

function createMediaRoomStore() {
  let state = $state<RoomState>({
    chatId: null,
    device: null,
    sendTransport: null,
    recvTransport: null,
    producers: new Map(),
    consumers: new Map(),
    participants: new Map()
  });

  async function join(chatId: string) {
    const device = new Device();
    // ... load router capabilities, create transports, produce/consume
  }

  async function produce(kind: 'audio' | 'video', track: MediaStreamTrack) {
    // ... sendTransport.produce({ track, ... })
  }

  async function consume(producerId: string, userId: string, kind: 'audio' | 'video') {
    // ... recvTransport.consume({ producerId, ... })
  }

  return { state, join, leave, produce, consume };
}
```

### 2.6 1080p Configuration

Mediasoup supports **simulcast** — the client sends multiple quality layers, and the SFU selects the best one for each consumer based on their bandwidth:

```typescript
// Producer options for 1080p with simulcast
const producerOptions = {
  track: videoTrack,
  encodings: [
    { maxBitrate: 100000, scaleResolutionDownBy: 4 },  // 480p-ish for low bandwidth
    { maxBitrate: 500000, scaleResolutionDownBy: 2 },  // 720p-ish for medium
    { maxBitrate: 2500000, scaleResolutionDownBy: 1 }  // 1080p for high bandwidth
  ],
  codecOptions: { videoGoogleStartBitrate: 1000 }
};
```

### 2.7 Self-Hosted TURN (Coturn)

For NAT traversal, a TURN server is required. Deploy via Docker:

```yaml
# infra/docker-compose.yml addition
coturn:
  image: coturn/coturn:latest
  restart: unless-stopped
  ports:
    - "3478:3478/udp"
    - "3478:3478/tcp"
    - "5349:5349/udp"
    - "5349:5349/tcp"
    - "49152-65535:49152-65535/udp"
  environment:
    - TURN_SECRET=your-static-auth-secret
  command: >
    -n --listen-port=3478 --tls-listening-port=5349
    --fingerprint --lt-cred-mech
    --static-auth-secret=your-static-auth-secret
    --realm=penthouse.local
    --no-cli --no-tlsv1 --no-tlsv1_1
```

Mediasoup WebRtcTransport config:

```typescript
const transport = await router.createWebRtcTransport({
  listenIps: [{ ip: '0.0.0.0', announcedIp: env.PUBLIC_IP || '127.0.0.1' }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1000000,
});
```

### 2.8 File Breakdown

#### NEW FILES

| File | Purpose |
|------|---------|
| `services/api/src/realtime/mediasoup.ts` | Mediasoup worker, router, transport management |
| `services/api/src/realtime/media-signaling.ts` | Socket.IO handlers for Mediasoup signaling |
| `apps/web/src/lib/stores/media-room.svelte.ts` | Client media room state + mediasoup-client integration |
| `apps/web/src/lib/components/MediaRoom.svelte` | Video grid, participant tiles, controls |
| `apps/web/src/lib/components/MediaControls.svelte` | Mute, video toggle, screen share, leave |
| `packages/contracts/src/media.ts` | All media signaling Zod schemas |

#### MODIFIED FILES

| File | Changes |
|------|---------|
| `services/api/src/app.ts` | Init Mediasoup worker on boot |
| `services/api/src/realtime/socket.ts` | Replace voice.* handlers with media.* handlers |
| `services/api/src/config/env.ts` | Add MEDIASOUP_* and TURN_* env vars |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Replace VoiceRoom with MediaRoom |
| `apps/web/src/lib/stores/voice.svelte.ts` | Deprecate — migrate logic to media-room.svelte.ts |
| `apps/web/package.json` | Add `mediasoup-client` dependency |
| `services/api/package.json` | Add `mediasoup` dependency |

---

## Part 3: Execution Order

### Session 1: Foundation
- [ ] Add `sql.js` + `mediasoup-client` + `mediasoup` dependencies
- [ ] Create SQLite schema file + migration runner
- [ ] Create Web Worker scaffolding for sql.js
- [ ] Add sync Zod schemas to `@penthouse/contracts`
- [ ] Add media signaling Zod schemas to `@penthouse/contracts`

### Session 2: Server Sync Backend
- [ ] Implement server-side sync batch endpoint (`GET /api/v1/sync`)
- [ ] Add `sync.batch` emission in Socket.IO
- [ ] Create cursor generation SQL helpers
- [ ] Add integration tests for sync endpoint

### Session 3: Client Sync Engine
- [ ] Implement `db.worker.ts` with full schema initialization
- [ ] Implement `db-client.ts` RPC wrapper
- [ ] Implement `operations.ts` — all SyncOp appliers
- [ ] Implement `outbox.ts` — queue + retry logic

### Session 4: Sync Integration
- [ ] Implement `sync-engine.svelte.ts`
- [ ] Wire `socket.svelte.ts` to emit `sync.request` on connect
- [ ] Handle `sync.batch` and individual real-time ops
- [ ] Test: connect, receive messages, go offline, send, reconnect

### Session 5: Frontend Cutover (Part 1)
- [ ] Replace `chatsStore` with local DB queries
- [ ] Replace chat list loading with local DB
- [ ] Add `search.ts` FTS5 wrapper + basic search UI
- [ ] Verify: chat list loads instantly, search works

### Session 6: Frontend Cutover (Part 2)
- [ ] Replace chat page message loading with local DB
- [ ] Replace user directory with local DB
- [ ] Handle message.send through outbox (optimistic + real)
- [ ] Verify: offline send, reconnect, message appears

### Session 7: Mediasoup Backend
- [ ] Implement `realtime/mediasoup.ts` (worker, router, transport)
- [ ] Implement `realtime/media-signaling.ts` (Socket.IO handlers)
- [ ] Configure TURN/Coturn in docker-compose
- [ ] Add env vars to `config/env.ts`

### Session 8: Mediasoup Frontend + Integration
- [ ] Implement `media-room.svelte.ts` (mediasoup-client)
- [ ] Create `MediaRoom.svelte` + `MediaControls.svelte`
- [ ] Replace VoiceRoom in chat page
- [ ] Test: 2+ users join, 1080p video flows, screen share works

---

## Part 4: Environment Requirements

### New Dependencies

```bash
# API
npm install mediasoup

# Web client
npm install mediasoup-client sql.js
npm install -D @types/dom-mediacapture-transform

# Contracts (if splitting schemas into new file)
# No new deps — uses existing zod
```

### New Environment Variables

```bash
# Mediasoup
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1  # Set to public IP in production
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100

# TURN (Coturn)
TURN_ENABLED=true
TURN_URL=turn:penthouse.local:3478
TURN_USERNAME=penthouse
TURN_CREDENTIAL=your-static-auth-secret
```

---

## Part 5: Quality Gates

### Per-Session Gates
- [ ] `npm run typecheck` green across all workspaces
- [ ] `cd services/api && npm run test:integration` green (existing + new tests)
- [ ] `cd apps/web && npx svelte-check` green
- [ ] No lint errors

### Final Gates (Before Marking Complete)
- [ ] **Offline test:** Load app, turn off network, send message, turn on network → message delivers
- [ ] **Multi-device test:** Two browser tabs, same user, message in one appears in other within 2s
- [ ] **Search test:** FTS5 returns results for exact and partial matches
- [ ] **Video test:** 2 users join media room, 1080p camera flows, latency < 500ms
- [ ] **Screen share test:** Screen share starts, other user sees it
- [ ] **Performance test:** Chat with 10k messages loads in < 100ms from local DB

---

## Part 6: Context Reference

### Current State (Snapshot)

**Socket.IO events already implemented:**
- `message.send`, `message.edit`, `message.delete`, `message.react`, `message.unreact`
- `message.read`, `message.pin`, `message.unpin`
- `typing.start`, `typing.stop`
- `presence.update`
- `chat.join`, `chat.leave`
- `voice.join`, `voice.leave`, `voice.signal`, `voice.mute`, `voice.deafen`, `voice.ptt`, `voice.speaking`

**Schema tables already exist (Drizzle):**
- `users`, `sessionDevices`, `refreshTokens`, `signupInvites`, `serverSettings`
- `chats`, `chatMembers`, `directChats`, `messages`, `messageEdits`, `messageDeletions`, `messageModerationEvents`, `messageReactions`
- `mediaUploads`, `pinnedMessages`
- `chatFolders` (schema only, minimal routes), `customEmotes` (schema only, routes exist), `wallpapers`

**Frontend stores:**
- `socket.svelte.ts` — Socket.IO connection, presence, AFK
- `chats.svelte.ts` — Chat list (HTTP sourced)
- `channels.svelte.ts` — Channel list
- `voice.svelte.ts` — Mesh voice state (to be replaced)
- `outbox.svelte.ts` — Simple outbox (can be replaced by sync outbox)

**Test infrastructure:**
- Integration tests use ephemeral Postgres via `DATABASE_URL`
- `services/api/test/setup.ts` (inspect for test helpers)
- 29 tests passing as of last verification

### Files to Read Before Starting

1. `services/api/src/realtime/socket.ts` — Understand existing socket event structure
2. `services/api/src/db/schema.ts` — Understand server schema
3. `apps/web/src/lib/stores/socket.svelte.ts` — Understand client socket lifecycle
4. `apps/web/src/routes/chat/[id]/+page.svelte` — Understand chat page data flow
5. `packages/contracts/src/events.ts` — Understand existing event schemas

---

## Part 7: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| sql.js WASM bundle too large (~1MB) | Medium | Medium | Lazy load worker; gzip should reduce to ~400KB; acceptable for desktop PWA |
| Mediasoup native compilation fails | Medium | High | Document Node version + build tools needed; provide Dockerfile with build env |
| Sync cursor drift (missed ops) | Low | Critical | Add periodic full-sync fallback; checksum on message count per chat |
| SQLite performance with 100k+ messages | Medium | Medium | Paginate queries; lazy load history; consider message archiving |
| TURN server cost/bandwidth | Low | Medium | Start without TURN (STUN only); add Coturn when NAT issues reported |
| Mediasoup CPU usage on API server | Medium | Medium | Monitor; extract to separate service if needed |
| Outbox grows unbounded offline | Low | Medium | Cap at 1000 items; drop oldest with user notification |

### Known Limitation: Edit History

- The `messageEdits` audit table remains server-only.
- Sync sends `message.upsert` with latest content plus `editCount`/`editedAt`.
- Clients can show the edited indicator, but cannot inspect old versions offline.
- To support local edit history later, add a dedicated `message.edit_history` sync op.

---

## Part 8: Notes for Codex

1. **The 3-file rule is relaxed for this handoff** because this is architectural foundation work that necessarily touches many files. However, batch changes logically — e.g., all sync schemas in one PR, all Mediasoup backend in another.

2. **Do NOT delete existing HTTP routes** during cutover. Keep them working as fallback. Mark them `@deprecated` in code comments.

3. **Test-driven:** Write integration tests BEFORE implementing sync batch endpoint. Test the unhappy paths (cursor invalid, user not in chat, missing permissions).

4. **Mediasoup has sharp edges:** The C++ Worker can crash. Wrap all Mediasoup calls in try/catch. Add health check endpoint that verifies Worker is alive.

5. **Commit early, commit often:** Each session should produce at least one passing commit. Push to branch `feature/local-first-sync`.

6. **If stuck on Mediasoup:** Skip to finishing the sync engine first. Mediasoup is secondary priority. The user specifically wants sync engine done NOW.

7. **Ask before adding new abstractions:** If you feel the urge to create a generic "sync framework" — don't. Keep it concrete to our tables and use cases. Generalization comes later if needed.

---

*End of handoff. This document is ~4,000 words. If any section is ambiguous, ask for clarification before implementing. Do not guess on sync protocol semantics — they must be correct from day one.*
