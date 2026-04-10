# Codex: Database Setup, Migration Run & Full Backend Hardening

**Branch:** `pwa`  
**Scope:** `services/api/` · `packages/contracts/` · `infra/`  
**Do not touch:** `apps/web/`

---

## Step 0 — Commit your existing hygiene fixes first

You have 5 uncommitted files from the last audit round. Stage and commit them before doing anything else:

```
services/api/src/realtime/socket.ts
services/api/src/routes/chats.ts
services/api/src/routes/media.ts
services/api/test/integration-chats.test.ts
services/api/test/media.test.ts
```

Commit message: `fix(api): input validation, UUID guards, GIF cache cap`

---

## Step 1 — Fix the dev database setup

`infra/docker-compose.yml` does not exist or is missing Postgres. The local environment gets `ECONNREFUSED` on port 5432.

Create `infra/docker-compose.yml` (or fix it if it already exists) with a Postgres service matching the existing `.env`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: penthouse
      POSTGRES_PASSWORD: penthouse
      POSTGRES_DB: penthouse
    ports:
      - "5432:5432"
    volumes:
      - penthouse_pgdata:/var/lib/postgresql/data

  postgres_test:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: penthouse
      POSTGRES_PASSWORD: penthouse
      POSTGRES_DB: penthouse_test
    ports:
      - "5433:5432"
    volumes:
      - penthouse_pgdata_test:/var/lib/postgresql/data

volumes:
  penthouse_pgdata:
  penthouse_pgdata_test:
```

Add `db:start` and `db:stop` scripts to the root `package.json`:

```json
"db:start": "docker compose -f infra/docker-compose.yml up -d",
"db:stop":  "docker compose -f infra/docker-compose.yml down"
```

Also add a `db:migrate` script to `services/api/package.json`:

```json
"db:migrate": "tsx src/db/migrate.ts"
```

---

## Step 2 — Run migrations against both databases

Once Postgres is running:

```bash
# Dev DB
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse \
  npm --workspace services/api run db:migrate

# Test DB
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5433/penthouse_test \
  npm --workspace services/api run db:migrate
```

Verify migrations 019–022 applied cleanly by querying `schema_migrations` (or however the migration runner tracks applied files).

---

## Step 3 — Run the full test suite with a live DB

```bash
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5433/penthouse_test \
JWT_SECRET=integration-test-jwt-secret-long-enough \
npx tsx --test --test-concurrency=1 \
  ./services/api/test/chats.test.ts \
  ./services/api/test/integration-chats.test.ts \
  ./services/api/test/integration-realtime.test.ts \
  ./services/api/test/media.test.ts \
  ./services/api/test/contracts-smoke.test.ts
```

All tests must pass before proceeding.

---

## Step 4 — Full backend hardening checklist

Work through each item. Fix anything that isn't already correct.

### 4a. GIF provider lock-in
- `GIPHY_API_KEY` is set in `.env` — keep it.
- Clear `KLIPY_API_KEY` in `.env` (set to empty string). The frontend only calls the `giphy` provider; Klipy routes should gracefully return `503 { error: "GIF provider not configured" }` rather than a hard throw if the key is missing. Verify `media.ts` does this — change the thrown `Error('Klipy not configured')` to a proper `reply.status(503).send({ error: 'GIF provider not configured' })`.

### 4b. Reaction uniqueness
Migration 022 defines `PRIMARY KEY (message_id, user_id, emoji)` and the route uses `ON CONFLICT DO NOTHING`. Confirm this is idempotent end-to-end:
- Rapid double-tap from frontend: second insert silently no-ops, no duplicate socket event emitted.
- Verify the `reaction.add` route does NOT emit the `reaction.add` socket event if the row was already present (i.e., check `rowCount` after the insert — only emit if `rowCount > 0`).

### 4c. Poll vote idempotency
Same pattern as reactions. If a user votes twice on the same option, the second vote should be a no-op (or toggle off, depending on `multiSelect`). Verify the poll vote route handles this without a 500.

### 4d. Read-mark on disconnect
When a user's socket disconnects, mark their last-read position for any chat they were actively viewing. Check `socket.ts` — if there's no disconnect handler that calls `chats.markRead`, add one using the user's last known `chatId`.

### 4e. Rate limiting on new routes
The existing auth routes have rate limiting via `authRateLimit`. The new pin, reaction, poll-vote, and read-mark routes do not. Add per-user rate limiting (or at minimum per-IP) to prevent spam:
- Reactions: max 30/min per user
- Poll votes: max 10/min per user  
- Pin/unpin: max 20/min per user

Use the existing `authRateLimit` pattern or a simple in-memory counter — keep it consistent with the codebase.

### 4e. `message.new` broadcast includes hydrated fields
When a new message is broadcast via `socket.emit('message.new', ...)`, the payload must include `reactions: []`, `replyTo: null` (or the populated snapshot if `replyToMessageId` was set), and `isPinned: false`. Check `chatMessages.ts` — the initial broadcast may emit the raw insert row without hydration. If so, run it through the same hydration step used by the REST message list.

### 4f. Pin endpoint response and socket event consistency
Both pin route shapes (`POST /chats/:chatId/pins` with `{ messageId }` and `POST /messages/:messageId/pin`) must:
1. Return `PinnedMessageSchema`-shaped JSON
2. Emit `message.pinned` with `ServerMessagePinnedEventSchema` shape

Check that the shared pin implementation used by both routes actually emits `pinnedByUserId` and `pinnedAt` — these fields are required by the contract schema.

### 4g. Graceful handling of missing reply snapshot
`replyToMessageId` on `message.send` should fail gracefully if the target message doesn't exist or has been deleted. Currently a FK constraint violation would bubble up as a 500. Add an explicit existence check before the insert and return `404 { error: "Replied-to message not found" }`.

---

## Step 5 — Final verification

```bash
# Typecheck
npm --workspace services/api run typecheck

# Full test suite (live DB)
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5433/penthouse_test \
JWT_SECRET=integration-test-jwt-secret-long-enough \
npx tsx --test --test-concurrency=1 ./services/api/test/*.test.ts
```

All checks must pass. Then commit everything as:

```
feat(api): DB setup, full hardening — rate limits, idempotency, hydration, reply guard
```

---

## What NOT to do
- Do not refactor existing stable routes (auth, members, admin)
- Do not add new features beyond what's listed above
- Do not touch `apps/web/`
- Do not modify existing migration files — add a new one if a schema change is needed
