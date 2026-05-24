# Backend Trim + Performance Audit

**Date:** 2026-05-23
**Branch:** `audit/backend-trim-performance`
**Base:** `main` at `cf2cf63`
**Scope:** Backend-only trim and performance pass. No frontend source edits.

## Executive Summary

This branch started as report-first, then moved into implementation after explicit approval. The backend dead-file/dependency cleanup is now applied, and the highest-signal performance hotspot, message list/search hydration, now uses batch hydration instead of a per-message hydration loop. A query-budget regression test now guards that path with a full 50-message page.

Message-send orchestration is now centralized for the active HTTP and Socket.IO send paths. Pin/unpin behavior is also centralized behind one backend service used by REST and Socket.IO. Chat/member sync-event payload construction has also been moved out of the routes and into `services/api/src/features/chats/sync.ts`. The chat route split is applied: `services/api/src/routes/chats.ts` is now only the route-family registrar, while lifecycle, list, member, message, read, poll, pin, preference, and reaction routes live under `services/api/src/routes/chat/`.

## Implemented In This Branch

- Removed confirmed-unused backend files:
  - `services/api/src/routes/members.ts`
  - `services/api/src/observability.ts`
  - `services/api/src/utils/activity.ts`
  - `services/api/src/utils/chatMessages.ts`
  - `services/api/src/utils/chats.ts`
  - `services/api/src/utils/messageHydration.ts`
  - `services/api/src/utils/messageModeration.ts`
  - `services/api/src/utils/messageReads.ts`
  - `services/api/src/utils/settings.ts`
  - `services/api/src/utils/uploads.ts`
  - `services/api/src/push/fcm.ts`
- Removed unregistered backend dependency `@fastify/static`; `npm install` removed 15 packages and reported 0 vulnerabilities.
- Trimmed unused backend-only exports and stale helper functions from push, auth-rate-limit, diagnostics, presence, security, time, polls, and media helpers.
- Added `hydrateMessages()` in `services/api/src/utils/messages.ts` and moved list/search hydration onto grouped queries for sender/deletion rows, edit counts/latest edit timestamps, reactions, read receipts, and media URL signing.
- Added `rewriteMessageMediaUrlsBatch()` in `services/api/src/utils/media-access.ts` so message list/search no longer queries media uploads once per message.
- Added `services/api/test/message-hydration-performance.test.ts` to assert message list and search stay inside a batched SQL budget for 50 messages with edits, reactions, read receipts, and private media URL rewriting.
- Added `services/api/src/db/migrations/028_chat_member_read_receipt_lookup.sql` and the matching schema index on `chat_members(last_read_message_id)` so batched read-receipt hydration has an index that matches its lookup shape.
- Added `services/api/src/db/migrations/029_message_search_trigram.sql` so current `%term%` chat message search is backed by PostgreSQL `pg_trgm` and a GIN index on `messages.content`.
- Added `services/api/src/features/messages/send.ts` as the canonical backend message-send/delivery seam for active HTTP and Socket.IO sends. It now owns normal message persistence orchestration, socket ack emission, `message.new` broadcast, and `message.sent` push-domain event emission. Poll creation still uses its special persistence flow, but now uses the shared delivery helper after poll metadata is written and rehydrated.
- Added unit coverage for message delivery ordering: HTTP delivery broadcasts without ack; Socket.IO delivery acks first, then broadcasts, then emits the push-domain event.
- Added `services/api/src/features/pins/service.ts` as the canonical pin/unpin/list service for REST and Socket.IO. Legacy `/api/v1/chats/:id/pins` and current `/api/v1/chats/:chatId/messages/:messageId/pin` routes now share persistence, authorization, payload serialization, and sync-event append behavior.
- Added `services/api/src/features/chats/sync.ts` as the shared backend sync-event helper for chat summaries, read-state upserts, channel upserts, channel delete tombstones, member-add sync fanout, and chat delete tombstones.
- Split high-churn chat route families out of `services/api/src/routes/chats.ts`:
  - `services/api/src/routes/chat/lifecycle-routes.ts`
  - `services/api/src/routes/chat/list-routes.ts`
  - `services/api/src/routes/chat/member-routes.ts`
  - `services/api/src/routes/chat/message-routes.ts`
  - `services/api/src/routes/chat/read-routes.ts`
  - `services/api/src/routes/chat/poll-routes.ts`
  - `services/api/src/routes/chat/pin-preference-routes.ts`
  - `services/api/src/routes/chat/shared.ts`
- Normalized tests onto the canonical `buildApp()` factory and removed the duplicate `createApp` alias from `services/api/src/app.ts`.

## Optimization Intent Notes

- Dead backend files were removed only where static analysis showed no active import path and live app registration confirmed the route/helper was not wired. The goal was to remove stale code paths without making product decisions about active features.
- `@fastify/static` was removed because `buildApp()` never registered it. Keeping unregistered server dependencies makes deployment review noisier and can mislead future agents about how static assets are served.
- Message list/search hydration moved from per-message hydration to grouped queries because this is the highest-risk backend scaling path: a 50-message page previously multiplied edits, reactions, read receipts, sender, deletion, and media lookups per row. The response contract stayed unchanged.
- `rewriteMessageMediaUrlsBatch()` exists to keep private media signing out of the N+1 path. The intent is not new media behavior; it is the same URL rewrite, performed with one lookup group.
- The hydration query-budget test is intentionally data-rich: edits, reactions, read receipts, and private media are all present so a future per-message regression fails before it reaches users.
- `chat_members(last_read_message_id)` was indexed because batched receipt hydration filters by `last_read_message_id IN (...)`. The existing chat/member-shaped indexes did not match that access pattern.
- The `pg_trgm` GIN index backs the current scoped substring search behavior without changing search semantics. Relevance ranking, snippets, typo tolerance, or a search engine are product decisions for a later pass.
- `features/messages/send.ts` centralizes delivery orchestration so HTTP and Socket.IO no longer drift on ack, broadcast, and push-domain event ordering. Persistence still flows through the existing message writer.
- `features/pins/service.ts` centralizes pin persistence and sync-event construction because REST and Socket.IO had repeated authorization and payload logic that could diverge.
- `features/chats/sync.ts` removes repeated sync payload construction while preserving existing event scopes, especially the chat-scoped channel upsert shape.
- The chat route split was by behavior, with public API paths unchanged. It lowers edit collision and review cost without pretending route files are domain boundaries.
- Removing the `createApp` alias is a static-analysis cleanup only. Production already used `buildApp()`; tests now use the same factory name so there is one app construction seam.

## Post-Implementation Validation

- `npm --workspace @penthouse/api run typecheck`: passed.
- Targeted app factory cleanup command passed: `DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx src/db/migrate.ts && DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx --test --test-concurrency=1 ./test/health.test.ts ./test/distribution.test.ts ./test/integration-realtime.test.ts ./test/operator-diagnostics.test.ts` passed, 24 tests, 0 failures.
- Targeted hydration/search performance command passed: `DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx src/db/migrate.ts && DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx --test --test-concurrency=1 ./test/message-hydration-performance.test.ts` passed, 2 tests, 0 failures.
- Targeted pin/realtime regression command passed: `npm --workspace @penthouse/api exec -- tsx src/db/migrate.ts && DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx --test --test-concurrency=1 ./test/integration-chats.test.ts ./test/integration-realtime.test.ts` passed, 20 tests, 0 failures.
- Targeted chat/group/sync regression command passed: `npm --workspace @penthouse/api exec -- tsx src/db/migrate.ts && DATABASE_URL=${DATABASE_URL:-postgresql://penthouse:penthouse@localhost:5433/penthouse_test} npm --workspace @penthouse/api exec -- tsx --test --test-concurrency=1 ./test/integration-chats.test.ts ./test/integration-groups.test.ts ./test/integration-sync.test.ts` passed, 18 tests, 0 failures.
- `npm --workspace @penthouse/api run test`: passed, 193 tests, 0 failures.
- `npm run typecheck`: passed across web, API, and contracts.
- `npm --workspace @penthouse/web run build`: passed.
- `git diff --check`: passed.
- `git diff --name-only -- apps/web`: empty; this branch did not modify frontend source.
- `npm exec --yes knip -- --no-progress --workspace apps/web --workspace services/api --workspace packages/contracts`: still exits `1`, but backend unused file/dependency findings from the audit are gone. Remaining file/dependency findings are frontend handoff items; backend leftovers are exported Mediasoup result types plus `AuthedRequest` that are left as public/test seams.

## Evidence Commands

### `knip`

Command:

```bash
npm exec --yes knip -- --no-progress --workspace apps/web --workspace services/api --workspace packages/contracts
```

Result: exited `1` because findings were present.

Original backend findings:

- Unused backend files:
  - `services/api/src/observability.ts`
  - `services/api/src/push/fcm.ts`
  - `services/api/src/routes/members.ts`
  - `services/api/src/utils/activity.ts`
  - `services/api/src/utils/chatMessages.ts`
  - `services/api/src/utils/chats.ts`
  - `services/api/src/utils/messageHydration.ts`
  - `services/api/src/utils/messageModeration.ts`
  - `services/api/src/utils/messageReads.ts`
  - `services/api/src/utils/settings.ts`
- Unused backend dependency:
  - `@fastify/static` in `services/api/package.json`
- Backend unused exports:
  - `isInsideQuietHours` from `services/api/src/push/dnd.ts`
  - `shouldNotifyForScope` from `services/api/src/push/scope.ts`
  - `isInsideQuietHours` from `services/api/src/push/send.ts`
  - `sendWebPushForNewMessage` from `services/api/src/push/web.ts`
  - `replyIfRateLimited` from `services/api/src/utils/authRateLimit.ts`
  - `signedPrivateMediaPath` from `services/api/src/utils/media-access.ts`
  - `chatMemberIds` from `services/api/src/utils/messages.ts`
  - selected diagnostics, polls, presence, security, time, and uploads helpers
- Backend duplicate export:
  - `buildApp|createApp` from `services/api/src/app.ts`

After implementation, the backend unused-file, `@fastify/static` dependency, and `buildApp|createApp` duplicate-export findings are gone. Remaining backend findings are exported Mediasoup result interfaces plus `AuthedRequest`; frontend findings from this command remain out of scope for this branch and should be handed to Kimi.

### `jscpd`

Command:

```bash
npm exec --yes jscpd -- --min-lines 30 --min-tokens 180 --reporters console --format typescript --ignore "**/node_modules/**" --ignore "**/dist/**" --ignore "**/.svelte-kit/**" services/api/src packages/contracts/src apps/web/src
```

Result: exited `0`.

Output summary:

- Files analyzed: `94`
- Total lines: `13,897`
- Total tokens: `158,127`
- Clones found: `2`
- Duplicated lines: `137 (0.99%)`
- Duplicated tokens: `3,189 (2.02%)`

Clone groups:

- `apps/web/src/lib/utils/emoji-data-common.ts` and `apps/web/src/lib/utils/emoji-data-full.ts`
- `apps/web/src/lib/sync/queries.ts` and `apps/web/src/lib/sync/search.ts`

No backend clone group crossed the current `30 lines / 180 tokens` threshold. The current duplication signal is frontend-only and belongs in the Kimi handoff queue.

### Typecheck

Command:

```bash
npm run typecheck
```

Result: exited `0`.

Output summary:

- `@penthouse/web`: `svelte-check found 0 errors and 0 warnings`
- `@penthouse/api`: `tsc -p tsconfig.json --noEmit` passed
- `@penthouse/contracts`: `tsc -p tsconfig.json --noEmit` passed

### Web Build

Command:

```bash
npm --workspace @penthouse/web run build
```

Result: exited `0`.

Output summary:

- SSR build: `257 modules transformed`
- Client build: `308 modules transformed`
- Service worker build: `68 modules transformed`
- VitePWA precache: `53 entries (627.54 KiB)`
- Latest VitePWA precache after route split: `53 entries (627.53 KiB)`
- Adapter output: wrote static site to `build`

## Backend Cleanup Candidates

| Candidate | Evidence | Classification | Decision gate |
| --- | --- | --- | --- |
| `services/api/src/routes/members.ts` | `knip` unused file; `buildApp` registers `registerUserRoutes`, not this route file. | Done | Removed. |
| `services/api/src/observability.ts` | `knip` unused file; `app.ts` enables Fastify logger but does not call `registerObservability`. | Done | Removed. |
| `services/api/src/utils/settings.ts` | `knip` unused file; active registration mode logic lives in admin/auth routes. | Done | Removed. |
| `services/api/src/utils/activity.ts` | `knip` unused file; only consumed by removed `routes/members.ts`. | Done | Removed. |
| `services/api/src/utils/chatMessages.ts` | `knip` unused file; old raw-SQL message send path imports `push/fcm`, `push/web`, and `messageHydration`, but active HTTP/socket send paths use `createMessage`. | Done | Removed with old utility chain. |
| `services/api/src/utils/messageHydration.ts` | `knip` unused except the old `chatMessages.ts` chain. | Done | Removed. |
| `services/api/src/utils/messageModeration.ts` | `knip` unused file. | Done | Removed; active moderation paths are in `routes/admin.ts` and current schema/tables. |
| `services/api/src/utils/messageReads.ts` | `knip` unused file. Active read behavior is in `utils/messages.ts` and `routes/chats.ts`. | Done | Removed. |
| `services/api/src/utils/chats.ts` | `knip` unused file. Active chat list and membership behavior lives in `routes/chats.ts` and `utils/messages.ts`. | Done | Removed. |
| `services/api/src/push/fcm.ts` | `knip` unused file; old FCM path is only referenced by unused `chatMessages.ts`. | Done | Removed. |
| `@fastify/static` | Installed in `services/api/package.json`, but `app.ts` registers only CORS, JWT, and multipart before route registration. | Done | Removed and lockfile regenerated. |
| `buildApp|createApp` duplicate export | `knip` duplicate export in `services/api/src/app.ts`. | Done | Tests now import `buildApp`; the `createApp` alias was removed. |

## Architecture Hotspots

### 1. `registerChatRoutes` route breadth is reduced

Original finding: `services/api/src/routes/chats.ts` was `1,050` lines and owned chat lifecycle, direct chat creation, group creation, archive/unarchive, member management, chat listing, message listing, message search, message send/edit/delete, reads, polls, preferences, pins, reactions, and old/new pin route variants.

Status: implemented. `services/api/src/routes/chats.ts` is now `18` lines and only registers route families. Lifecycle, list, member, message, read, poll, pin, preference, and reaction routes moved to focused modules under `services/api/src/routes/chat/`. Public API paths are unchanged.

The remaining cleanup here is not another mechanical route split. Pin semantics were extracted to `services/api/src/features/pins/service.ts`, and chat/member sync-event construction was extracted to `services/api/src/features/chats/sync.ts`. A future pass should prefer behavior-level services when a route still owns multiple write-side concerns, not a blind file split.

### 2. Message hydration is the clearest performance hotspot

`listMessages()` loads up to `50` IDs, reverses them, then calls `hydrateMessage()` once per message. Each `hydrateMessage()` does the base message/sender/deletion query, edit count query, latest edit query, reactions query, read receipts query, and media URL rewrite.

That means a 50-message page can trigger roughly:

- 1 list query
- 50 base message hydration queries
- 50 edit count queries
- 50 latest edit queries
- 50 reaction queries
- 50 read receipt queries
- plus media rewrite work per message

The search endpoint repeats the same per-message hydration loop after finding up to 50 matching IDs.

Status: implemented for message list/search through `hydrateMessages()` and `rewriteMessageMediaUrlsBatch()`. Single-message callers still use `hydrateMessage()`, which now delegates to the batch implementation.

The branch now also includes a query-budget regression test that exercises a 50-message page with edits, reactions, read receipts, and private media metadata. List and search must stay under the batched SQL ceiling. The read-receipt lookup now has a matching `chat_members(last_read_message_id)` index; the previous index led with `chat_id`, which did not match hydration's `WHERE last_read_message_id IN (...)` access pattern.

Current chat message search still uses the existing product behavior: scoped `ILIKE '%term%'` search by chat, ordered by message creation time. The new `pg_trgm` GIN index supports that query shape without introducing a separate search engine or changing response contracts.

### 3. Message send delivery orchestration is centralized

Original finding: the active HTTP route called `createMessage()`, then emitted `message.new`, then emitted the internal `message.sent` event for push. The active Socket.IO handler also called `createMessage()`, then sent an ack, emitted `message.new`, then emitted `message.sent`.

The unused `sendChatMessage()` utility looks like an abandoned single-path attempt: it persists, dedupes, broadcasts, sends ack, and triggers old FCM/web push helpers. It should not be revived as-is because it bypasses the current sync-event path and old push architecture is stale. But it is strong evidence that message-send orchestration wants one canonical backend module.

Status: implemented for active normal message sends through `services/api/src/features/messages/send.ts`.

The new seam owns:

- persistence through `createMessage()` or its successor
- sync event append through the existing `createMessage()` path
- ack payload construction for socket callers
- realtime `message.new` broadcast semantics through injected room emitters
- push event emission through `appEvents.emit('message.sent', ...)`

HTTP and Socket.IO now only adapt transport details. Poll creation remains special because it creates poll records and rehydrates the message before delivery; it still uses the shared `deliverChatMessage()` helper for broadcast and push-event emission.

### 4. Pin behavior is centralized

Original finding: pin behavior existed in multiple shapes: the legacy REST collection route, the current REST message route, and Socket.IO `message.pin` / `message.unpin` handlers each repeated message lookup, membership assertion, pin upsert/delete, realtime payload construction, and sync-event append.

Status: implemented. REST and Socket.IO now call `pinMessage()`, `unpinMessage()`, and `listPinnedMessages()` from `services/api/src/features/pins/service.ts`. The transports still decide how to emit events and whether missing socket targets should be silent, but the persistence and sync semantics are now one code path.

## Frontend Findings To Hand To Kimi

Do not act on these in this backend branch:

- `jscpd` duplicate groups under `apps/web/src/lib/utils/emoji-data-*` and `apps/web/src/lib/sync/*`.
- `knip` unused web files:
  - `apps/web/scripts/build-logo-gallery.mjs`
  - `apps/web/src/lib/components/MediaComposer.svelte`
  - `apps/web/src/lib/stores/settings.svelte.ts`
  - `apps/web/src/lib/sync/queries.ts`
  - `apps/web/src/lib/utils/emotes.ts`
  - `apps/web/src/lib/utils/messageFormat.ts`
- `knip` web dependency candidates:
  - `mediasoup-client`
  - `@testing-library/svelte`
  - `@types/dompurify`
  - `playwright-lighthouse`
  - `web-vitals`
- `knip` unresolved E2E imports:
  - `/src/lib/sync/db-client.ts`
  - `/src/lib/sync/search.ts`

## Recommended Follow-Up Order

1. Decide whether exported Mediasoup result interfaces and `AuthedRequest` should remain public/test seams or move behind narrower module-local types.
2. If search relevance becomes product-critical, design ranking/snippet behavior explicitly instead of stretching the current simple substring endpoint.
3. Hand frontend `knip` and `jscpd` findings to Kimi.

## Test Plan For Future Changes

- Audit-only validation:
  - `npm run typecheck`
  - `npm --workspace @penthouse/web run build`
- Before any backend deletion/refactor:
  - `npm --workspace @penthouse/api run test`
- If message hydration or message send changes:
  - Run chat, realtime, sync, and push integration tests.
- If a dependency is removed:
  - `npm install`
  - `npm run typecheck`
  - `npm --workspace @penthouse/api run test`

## Constraints Preserved

- No `apps/web/src` edits.
- Local-first sync and voice/WebRTC groundwork left intact.
- Static-analysis frontend findings recorded for handoff, not acted on.
