---
tags: [penthouse, reliability, bugs, postmortem]
created: 2026-03-05
---

# Reliability Fix Log

This note captures issues we hit, why they happened, and how we fixed them.

## Fix 1: Refresh token replay race

- Symptom:
  Two concurrent refresh calls could both succeed from one old refresh token.
- Root cause:
  Refresh flow checked token existence before transactional delete/rotate.
- Fix:
  Use atomic delete-if-valid with `RETURNING user_id`, then insert new token in same transaction.
- Files:
  - `services/api/src/routes/auth.ts`
  - `services/api/test/integration-auth.test.ts` (concurrency regression test)

## Fix 2: Message idempotency race

- Symptom:
  Concurrent duplicate sends (same `clientMessageId`) could throw DB unique violations.
- Root cause:
  Query-then-insert pattern was race-prone under concurrency.
- Fix:
  Use conflict-safe insert:
  - `INSERT ... ON CONFLICT (chat_id, sender_id, client_message_id) DO NOTHING`
  - fallback select existing row
- Files:
  - `services/api/src/routes/chats.ts`
  - `services/api/src/realtime/socket.ts`
  - `services/api/test/integration-chats.test.ts` (concurrency regression test)

## Fix 3: Corrupt local user cache crash

- Symptom:
  App could crash on startup if `localStorage.user` was invalid JSON.
- Root cause:
  Direct `JSON.parse` without guard.
- Fix:
  Safe parse + shape check with null fallback.
- File:
  - `apps/mobile/src/services/http.ts`

## Fix 4: Stuck "sending" state when socket ack is delayed/missed

- Symptom:
  Some messages could stay in local "sending" state even after successful HTTP send.
- Root cause:
  UI state relied mainly on socket ack/new events to finalize local message ids.
- Fix:
  Reconcile delivery state from HTTP `sendMessage` response as well, then keep socket ack as a secondary confirmation path.
- Files:
  - `apps/mobile/src/App.vue`
  - `apps/mobile/src/App.test.ts`

## Other hardening already landed

- Socket auth token refreshed dynamically on reconnect.
- `chat.join` re-emitted on reconnect.
- Queue flush handles per-item failure (one bad item no longer blocks all).
- Mobile test harness migrated to Vitest with optimistic-flow coverage.
- Observability hook logs structured request data.

## Still-open risks

1. Integration suites skip if `DATABASE_URL` is missing; CI must always provide a DB.
2. Socket auth failure counter is logged, but no production alert threshold is wired yet.
3. TrueNAS instability means manual reliability drills should continue before releases.

See: [[../../services/api/docs/RELIABILITY_DRILL|Reliability Drill Runbook]]
