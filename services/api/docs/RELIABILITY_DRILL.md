# Reliability Drill Runbook

Structured drills for verifying The Penthouse backend + realtime behaviour
under failure conditions. Run these manually before any production deploy.

---

## Prerequisites

- PostgreSQL running locally (`docker compose -f infra/compose/docker-compose.yml up -d postgres`)
- API server running (`npm --workspace services/api run dev`)
- Mobile app running (`npm --workspace apps/mobile run dev`)
- Two browser tabs logged in as different users, both in the same chat

---

## Drill 1: API restart during active session

**Goal:** Verify clients recover automatically after a server restart.

### Steps

1. Both users are in a chat. Send a few messages to confirm flow works.
2. Stop the API server (`Ctrl-C` in the terminal running `npm run dev`).
3. Observe the mobile app:
   - ConnectionStatus should show **"Offline"** within a few seconds.
   - Typing a message and pressing Send should queue it (queued count appears).
4. Restart the API server (`npm --workspace services/api run dev`).
5. Observe the mobile app:
   - ConnectionStatus should return to **"Connected"** automatically.
   - Queued messages should flush and appear in the chat for both users.

### Pass criteria

- [ ] ConnectionStatus transitions: Connected → Offline → Connected
- [ ] Messages sent while offline are delivered after reconnect
- [ ] No duplicate messages appear (idempotency via clientMessageId)
- [ ] No JS console errors beyond expected WebSocket close events

### Fail criteria

- ConnectionStatus stays "Offline" after server is back (reconnect broken)
- Queued messages are lost (offline queue or flush logic broken)
- Duplicate messages appear (clientMessageId dedup failed)
- App requires manual page refresh to recover

### Rollback notes

If reconnect fails consistently:
1. Check socket.ts `reconnectionAttempts` and `reconnectionDelay` settings
2. Check that the JWT access token hasn't expired during downtime
3. If token expired, the refresh interceptor in http.ts should renew it
4. As a last resort, user can reload the app (session restores from localStorage)

---

## Drill 2: Reconnect + message replay

**Goal:** Verify that messages sent by other users during a disconnect
are visible after reconnection.

### Steps

1. User A and User B are in the same chat.
2. Disconnect User A's network (DevTools → Network → Offline, or kill WiFi).
3. User B sends 3 messages.
4. Reconnect User A's network.
5. User A should see all 3 messages appear (may require re-joining the chat room).

### Pass criteria

- [ ] All messages from User B appear for User A after reconnect
- [ ] Messages appear in correct chronological order
- [ ] No duplicates if User A had cached messages from before disconnect

### Fail criteria

- Missing messages after reconnect (chat.join or message fetch not triggered)
- Messages appear out of order
- App freezes or errors on reconnect

### Rollback notes

If messages are missing after reconnect:
1. The `connect` handler in App.vue re-emits `chat.join` — verify this fires
2. Messages are fetched via HTTP (`getMessages`) on `openChat` — the cache fallback
   might show stale data. Force a fresh fetch if needed.
3. Socket `message.new` events only arrive for rooms the user has joined.
   If the `chat.join` on reconnect doesn't fire, new messages won't stream in.

---

## Drill 3: Concurrent duplicate sends (idempotency stress)

**Goal:** Verify that rapid duplicate sends with the same clientMessageId
produce exactly one message.

### Steps

1. Open browser DevTools console.
2. Manually trigger two rapid POST requests to the same chat with the same
   `clientMessageId`:
   ```js
   const token = localStorage.getItem('accessToken');
   const chatId = '<your-chat-id>';
   const body = JSON.stringify({
     content: 'dedup test',
     clientMessageId: 'manual-dedup-001'
   });
   fetch(`/api/v1/chats/${chatId}/messages`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
     body
   });
   fetch(`/api/v1/chats/${chatId}/messages`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
     body
   });
   ```
3. Check the chat UI and database.

### Pass criteria

- [ ] Only one message appears in the chat UI
- [ ] Database has exactly one row for that clientMessageId
- [ ] Second response has `deduped: true`

### Fail criteria

- Two messages appear (UNIQUE constraint or dedup query not working)
- 500 error from a constraint violation (dedup check has a race condition)

### Rollback notes

- The UNIQUE constraint on `(chat_id, sender_id, client_message_id)` is the safety net
- If the application-level dedup misses (race condition), the DB constraint will
  reject the second INSERT with a unique violation — check error handling in chats.ts

---

## Drill 4: Token expiry during long session

**Goal:** Verify that the refresh token interceptor renews the access token
transparently.

### Steps

1. Log in and note the access token TTL (default: 15 minutes).
2. Wait for the token to expire (or temporarily set `ACCESS_TOKEN_TTL=10s` in .env).
3. Send a message or navigate to a new chat.

### Pass criteria

- [ ] The app transparently refreshes the token (no visible error)
- [ ] The request succeeds after token refresh
- [ ] No "Unauthorized" error shown to the user

### Fail criteria

- 401 error shown to user (refresh interceptor not triggering)
- Infinite refresh loop (broken refresh token)

### Rollback notes

- Check http.ts interceptor: it retries the original request after refresh
- If refresh token is also expired, user must re-login (expected behaviour)

---

## Running automated integration tests

The integration tests in `services/api/test/integration-*.test.ts` cover
the core scenarios programmatically.

### Local setup

```bash
# 1. Start PostgreSQL (via Docker Compose or standalone)
docker compose -f infra/compose/docker-compose.yml up -d postgres

# 2. Run integration tests only
DATABASE_URL=postgresql://localhost:5432/penthouse_test \
JWT_SECRET=local-test-jwt-secret-long-enough \
  npm --workspace services/api run test:integration

# Or run all tests (unit + integration)
DATABASE_URL=postgresql://localhost:5432/penthouse_test \
JWT_SECRET=local-test-jwt-secret-long-enough \
  npm --workspace services/api run test
```

### CI

Integration tests run automatically in the `integration` job in
`.github/workflows/ci.yml` against a PostgreSQL 16 service container.
They are **not skipped** in CI — regressions will fail the pipeline.

### What the tests verify

- Refresh token rotation invalidates old tokens
- Concurrent refresh replay allows only one success
- Logout invalidates refresh token
- Non-members cannot read/send in foreign chats
- Unauthenticated requests are rejected with 401
- Duplicate clientMessageId is correctly deduped
- Concurrent duplicate sends resolve to one message
- Socket events (message.new, message.ack) are emitted
