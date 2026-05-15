# Code Review — Local-First Sync + WebRTC SFU Implementation

**Reviewer:** Kimi K2.6 (orchestrator)
**Date:** 2026-05-11
**Scope:** Codex's implementation of local-first sync engine and Mediasoup SFU scaffolding
**Status:** Foundation is solid. Several issues need addressing before this can be considered production-ready.

---

## Executive Summary

Codex delivered a **strong architectural foundation** for both local-first sync and WebRTC SFU. The code is well-structured, typed, and tested. All existing tests continue to pass. The sync engine runs in "shadow mode" — filling a client-side SQLite DB without disrupting the existing HTTP-based UI.

However, there are **7 issues** ranging from privacy leaks to architectural inconsistencies that must be fixed before this is complete. The most critical are a user directory privacy leak and the fact that the new SQLite outbox is not yet wired into message sending (the old `localStorage` outbox is still in use).

**Verdict:** Mergeable as scaffolding, but requires a follow-up session before the cutover from HTTP to local-first reads.

---

## ✅ What's Done Well

### Local-First Sync

1. **Clean separation of concerns**
   - `sync_events` log table on server ( Postgres )
   - `sql.js` Web Worker on client ( off-main-thread )
   - RPC wrapper `db-client.ts` with typed request/response
   - Idempotent op appliers in `operations.ts`

2. **Shadow mode integration**
   - `+layout.svelte` starts sync engine on login, stops on logout
   - Existing HTTP flows remain untouched
   - Search already falls back to local DB when enabled
   - Feature flag via `PUBLIC_LOCAL_FIRST_SYNC` env (defaults to `'shadow'`)

3. **Comprehensive test coverage**
   - 4 integration tests for sync endpoint (snapshot, replay, tombstones, visibility, invalid cursor)
   - Contract schema tests for all sync Zod types
   - Unit tests for SQLite op appliers, outbox, and search
   - Playwright E2E proving first-sync persistence, reload persistence, two-tab sync, and local search during server outage

4. **Visibility filtering**
   - `getSyncResponse` correctly scopes events to chats the user is a member of
   - Non-members cannot sync private chat events

5. **Auth gating**
   - Both REST `GET /api/v1/sync` and Socket.IO `sync.request` require authentication
   - Media signaling also gated by `assertChatMember`

### WebRTC / Mediasoup

6. **Solid Mediasoup scaffolding**
   - Embedded Worker in API process (simpler than separate service for MVP)
   - Proper room lifecycle: create router → join → create transports → produce/consume → leave → cleanup
   - All Socket.IO signaling events typed with Zod schemas
   - Observer-based cleanup (transport/consumer/producer close handlers)

7. **Graceful degradation**
   - `MEDIASOUP_ENABLED` env flag (defaults `true`)
   - Old mesh `voice.*` handlers preserved — no breakage
   - Coturn in docker-compose as opt-in profile

8. **Integration proof**
   - Test verifies a socket can join a media room and create a real WebRTC transport
   - Test verifies non-members are rejected with `CHAT_FORBIDDEN`

---

## 🔴 Critical Issues (Must Fix)

### Issue 1: Privacy Leak — All Active Users Synced to Every Client

**File:** `services/api/src/features/sync/service.ts:257-263`

**Problem:** `buildInitialSnapshot` fetches **every active user** in the database and syncs them:

```typescript
const userRows = await db.select().from(users)
  .where(eq(users.status, 'active'))
  .orderBy(asc(users.displayName));

for (const user of userRows) {
  push({ type: 'user.upsert', payload: toMemberDetail(user) });
}
```

This means any registered user learns the existence of every other active user, their display names, avatars, and bios — even if they've never interacted.

**Fix:** Only sync users who are members of chats visible to the requesting user:

```typescript
const visibleUserIds = new Set<string>();
// Collect from chat_members of visible chats
// Also include self
for (const userId of visibleUserIds) {
  push({ type: 'user.upsert', payload: ... });
}
```

**Severity:** 🔴 High — Privacy violation

---

### Issue 2: Sync Events Not Wrapped in Transactions

**File:** `services/api/src/features/sync/service.ts:38-51` and all call sites

**Problem:** `appendSyncEvent` does a separate `db.insert()` after the main database operation. There's no transaction wrapping. Two failure modes:

1. **Main op succeeds, sync event fails** → Client never receives the event. Sync log is inconsistent with actual state.
2. **Sync event succeeds, main op rolls back** (in routes that use transactions) → Ghost sync event points to nonexistent data.

**Example in `socket.ts:message.send`:**
```typescript
const result = await createMessage({...});        // succeeds
await appendSyncEvent({...});                      // could fail
appEvents.emit('message.sent', {...});             // push fires regardless
```

**Fix:** Pass the sync event as part of the same transaction where possible. For Socket.IO handlers that don't use explicit transactions, wrap both operations in `db.transaction()` or accept a `tx` parameter.

**Severity:** 🟡 Medium — Data consistency risk

---

### Issue 3: SQLite Outbox Not Wired Into Message Flow

**Files:** `apps/web/src/lib/sync/outbox.ts` (new, unused) vs `apps/web/src/lib/stores/outbox.svelte.ts` (old, still active)

**Problem:** Codex built a proper SQLite-based outbox in `sync/outbox.ts` with:
- `enqueueTextMessage()`
- `listDueOutboxItems()`
- `markOutboxAttempt()` / `removeOutboxItem()`
- Retry scheduling with `next_retry_at`
- 1000-item cap with trimming

But the chat page (`chat/[id]/+page.svelte`) still uses the old `localStorage`-based `outboxStore`:

```typescript
// Line 34
import { outboxStore, MAX_RETRIES } from '$stores/outbox.svelte';
// Line 96-98 — merges localStorage outbox into messages
const pending = outboxStore.items.filter(...)
```

The SQLite outbox is **never initialized, never read, never drained**.

**Fix:** Migrate the chat page to use `syncEngine` / `localSyncDb` outbox primitives. On send:
1. Write to SQLite outbox
2. Optimistically apply to local messages table
3. Try socket send immediately
4. If offline, the sync engine's background loop drains the outbox on reconnect

**Severity:** 🟡 Medium — Feature incomplete (shadow mode hides this, but cutover will break)

---

### Issue 4: No Sync Events for Folder/Item Deletions

**File:** `services/api/src/features/chatFolders/routes.ts`

**Problem:** The contract schema supports `folder.delete` and `folder_item.delete` ops, but inspecting the folder routes shows no `appendSyncEvent` calls for delete operations. Only upserts are synced.

**Severity:** 🟡 Medium — Deleted folders/items reappear on sync

---

## 🟡 Moderate Issues (Should Fix)

### Issue 5: Initial Snapshot Not Paginated

**File:** `services/api/src/features/sync/service.ts:131-266`

**Problem:** When `cursor=0`, `buildInitialSnapshot` returns EVERYTHING in a single response: all chats, all channels, all read states, all pins, last 50 messages per chat, all folders, all folder items, all users. For a power user in 50 chats, this could be thousands of operations in one HTTP response.

The response always sets `hasMore: false`, so the client won't paginate.

**Fix:** Either:
- Return `hasMore: true` with a synthetic cursor if the snapshot exceeds a threshold, and stream subsequent chunks
- Or: cap initial snapshot more aggressively (e.g., 20 most recent messages per chat, not 50)

**Severity:** 🟡 Medium — Performance at scale

---

### Issue 6: No `message.edit` Sync Event Type — Only `message.upsert`

**File:** `packages/contracts/src/sync.ts`

**Problem:** When a message is edited, the backend sends a `message.upsert` sync event. The client op applier handles this by overwriting the message row. However, the `messageEdits` audit table (which stores previous content) is never synced. Clients that sync after an edit won't see the edit history.

**Fix:** Add `message.edit_history` sync op type, or include `editCount` + `editedAt` in the upsert payload (it already is) and accept that edit history is server-only for now. Document this limitation.

**Severity:** 🟢 Low — Edit history is not a displayed feature yet

---

### Issue 7: Mediasoup Port Range Check Deferred to Runtime

**File:** `services/api/src/realtime/mediasoup.ts:422-429`

**Problem:** The `MEDIASOUP_MIN_PORT > MEDIASOUP_MAX_PORT` check happens inside `getOrCreateWorker()`, which is only called when the first user joins a media room. A configuration error isn't caught at startup.

**Fix:** Move validation to `buildApp()` or `env.ts` so the server fails fast on bad config.

**Severity:** 🟢 Low — Configuration edge case

---

## 🔵 Observations / Notes

### 8. LIKE Search Instead of FTS5

Codex correctly identified that the stock `sql.js` WASM build doesn't include FTS5. Using `LIKE` with term splitting is a reasonable v1 tradeoff. **No action needed** — document in `CODEX-HANDOFF` that FTS5 requires a custom sql.js build if desired later.

### 9. Old Mesh Voice Preserved

Codex kept the existing `voice.*` Socket.IO handlers intact while adding `media.*` handlers. This is correct for backward compatibility. Eventually the mesh code should be removed once the Mediasoup UI is complete.

### 10. Two Outbox Systems Coexisting

There's now:
- `apps/web/src/lib/stores/outbox.svelte.ts` — `localStorage`, used by chat page
- `apps/web/src/lib/sync/outbox.ts` — SQLite, unused

This is technical debt. The SQLite outbox should subsume the `localStorage` one.

### 11. Missing: Simulcast Configuration for 1080p

The Mediasoup producer creation doesn't set `encodings` for simulcast. For 1080p group streaming, this is essential so consumers with different bandwidth get appropriate quality layers. This will be needed when the video UI is built.

### 12. Missing: TURN Config in Client

The client `media-room.svelte.ts` doesn't configure TURN servers on the `Device` or transports. If users are behind symmetric NAT, they won't connect without TURN relay. The env vars exist but aren't plumbed to the client.

---

## 📋 Completion Checklist for Codex (Next Session)

### Sync Engine — Must Complete
- [ ] **Fix user privacy leak** — Only sync users in shared chats (Issue 1)
- [ ] **Wire SQLite outbox** — Replace `localStorage` outbox in chat page (Issue 3)
- [ ] **Add sync events for folder/item deletions** (Issue 4)
- [ ] **Transaction-wrap sync events** with main DB ops where possible (Issue 2)

### Sync Engine — Should Complete
- [ ] **Paginate initial snapshot** or add synthetic cursors (Issue 5)
- [ ] **Document edit-history limitation** or add `message.edit_history` op (Issue 6)

### Mediasoup — Must Complete
- [ ] **Build video UI** — `MediaRoom.svelte` with participant grid, mute/video toggle, screen share
- [ ] **Complete signaling loop** — create send/recv transports, produce camera/screen, consume remote
- [ ] **Add simulcast** — 3-layer encoding for 1080p/720p/480p
- [ ] **Plumb TURN config** to client transports

### Mediasoup — Should Complete
- [ ] **Move port validation** to startup (Issue 7)
- [ ] **Remove old mesh voice** once media UI is proven

---

## Test Results (Verified by Reviewer)

| Suite | Tests | Status |
|-------|-------|--------|
| API integration (all) | 30 | ✅ Pass |
| API sync (new) | 4 | ✅ Pass |
| API media signaling (new) | 2 | ✅ Pass |
| Contracts | 32 | ✅ Pass |
| Web sync operations | 2 | ✅ Pass |
| Playwright E2E local-sync | 1 | ✅ Pass |
| svelte-check | 0 errors, 36 warnings | ✅ Pass |
| `npm run validate` | All green | ✅ Pass |

---

## Architecture Assessment

| Aspect | Score | Notes |
|--------|-------|-------|
| Type safety | 9/10 | All new code fully typed; Zod schemas comprehensive |
| Test coverage | 8/10 | Good unit + integration + E2E; missing negative path tests for outbox retry |
| Security | 6/10 | Auth gating good; user privacy leak is a real issue |
| Performance | 7/10 | Worker offloads DB; snapshot not paginated |
| Maintainability | 8/10 | Clean file structure; good separation |
| Completeness | 5/10 | Foundation is there; outbox not wired; no video UI |

**Overall: 7/10** — Solid foundation with critical fixes needed.

---

*End of review. Hand this back to Codex with the checklist above.*
