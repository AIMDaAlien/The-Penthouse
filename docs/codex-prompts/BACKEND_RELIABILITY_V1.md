# Codex Task: Backend Reliability Improvements — The Penthouse API

## Context

You are working on `services/api/` in the **The Penthouse** monorepo.
This is a self-hosted, privacy-focused messaging app running on a personal server
(commodity hardware, no ECC RAM, SAS drives via HBA). The app is in alpha.

Read `services/api/CLAUDE.md` before starting. It defines what this service owns,
how the database is structured, and the rules for adding migrations.

The frontend (`apps/web/`) is a SvelteKit PWA built by a separate agent (Claude).
Do **not** touch any files outside `services/api/` and `packages/contracts/`.
If a contract change is needed, add a `HANDOFF →` comment in the relevant contract file
and note it in your response — do not modify `apps/web/` directly.

---

## Current issues to fix

### 1. Socket.IO connection drops on reconnect lose room membership

**Problem:** When a client reconnects after a brief disconnect (e.g., phone screen off,
flaky network), their Socket.IO socket joins the `user:{userId}` room via the `auth`
middleware, but does NOT automatically rejoin the `chat:{chatId}` rooms they were in.
This means they stop receiving `message.new` events for their chats until they reload.

**Fix:** On `connection` event, after auth is verified, look up all chat IDs the user
is a member of (query `chat_members` where `user_id = $userId`) and call
`socket.join('chat:{chatId}')` for each. This is safe to do on every connect —
Socket.IO deduplicates room membership.

File: `src/realtime/socket.ts`
DB: `SELECT chat_id FROM chat_members WHERE user_id = $1 AND ...` (check existing query patterns)

---

### 2. Refresh token rotation leaves orphaned tokens on rapid tab reload

**Problem:** If a client calls `/api/v1/auth/refresh` twice in quick succession
(e.g., two browser tabs opening simultaneously), the second call may use the
already-rotated token, receiving a 401 and forcing a full logout.

**Fix:** Implement a short grace window (5 seconds) on token rotation:
when a refresh token is presented that was recently rotated (within 5s), return
the *new* token that replaced it rather than a 401. Store `rotated_at` and
`rotated_to_token_hash` on the `refresh_tokens` table.

This requires:
- A new migration (`008_refresh_token_grace.sql` or similar) adding two nullable columns
  to `refresh_tokens`: `rotated_at TIMESTAMPTZ` and `rotated_to_token_hash TEXT`
- Update `src/routes/auth.ts` refresh logic to check grace window before rejecting

---

### 3. Message delivery silently fails when DB write succeeds but socket emit throws

**Problem:** In `src/utils/chatMessages.ts`, the message is written to the DB and
then `message.new` is emitted via Socket.IO. If the emit throws (e.g., because the
`io` reference is temporarily unavailable), the error is swallowed and the sender
never gets a `message.ack`. The message exists in the DB but the UI thinks it failed.

**Fix:** Wrap the emit in a try/catch and always emit `message.ack` to the sender's
socket even if the broadcast to the room fails. The sender deserves to know the
message was saved, regardless of whether other clients received it in real-time.
They will receive it on next load via REST.

File: `src/utils/chatMessages.ts`

---

### 4. Health endpoint does not check DB connectivity

**Problem:** `GET /api/v1/health` returns 200 even when the database connection pool
is exhausted or PostgreSQL is unreachable. This makes it useless as a Docker health check.

**Fix:** Add a lightweight DB ping (`SELECT 1`) to the health check. If it fails,
return 503 with `{ status: 'degraded', db: 'unreachable' }`. Keep a 2-second timeout
on the ping so a slow DB doesn't hang the health check indefinitely.

File: `src/routes/health.ts`

---

### 5. Slow query: chat list loads all messages to compute unread count

**Problem:** `listChatSummariesForUser` in `src/utils/chats.ts` counts unread messages
with a subquery that may do a full table scan on large message tables.

**Fix:** Ensure the following index exists (add in a migration if missing):
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_chat_created
  ON messages (chat_id, created_at DESC)
  WHERE hidden_by_moderation = FALSE;
```

Check `src/db/migrations/` — if this index is not already present, add it as the
next numbered migration file.

---

## Rules for this task

- Read `services/api/CLAUDE.md` first.
- Never modify files outside `services/api/` and `packages/contracts/`.
- Never modify existing migration files — only add new ones.
- Each migration file must be idempotent (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Tests live in `services/api/test/` — run existing tests before and after to confirm nothing broke.
- If a fix requires a contract change, add a `HANDOFF → Claude` comment and stop there.

## Acceptance criteria

- `npm run test` in `services/api/` passes without regression
- `npm run typecheck` in `services/api/` passes
- Health endpoint returns 503 when DB is unreachable, 200 when healthy
- Reconnected clients rejoin their chat rooms (verifiable in Socket.IO server logs)
