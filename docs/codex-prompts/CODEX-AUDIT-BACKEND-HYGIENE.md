# Codex Audit — Backend Hygiene & Frontend Wiring

**Branch:** `pwa`  
**Scope:** `services/api/` + `packages/contracts/`  
**Do not touch:** `apps/web/`

---

## What to look for

Read-only audit first. Fix only what you find. Do not add features.

---

### 1. Socket event envelope consistency
The frontend expects every realtime event as `{ type, payload }`.
Check every `socket.emit(...)` in `realtime/socket.ts` and any route handlers
that emit events. Flag any raw-payload emits or event names that don't match
`packages/contracts/src/events.ts`.

### 2. New endpoint response shapes vs contracts
The Wave A/B utils may not return shapes that exactly match the Zod schemas.
Verify:
- `messageHydration.ts` — hydrated `Message` includes `reactions`, `replyTo`,
  `metadata` fields matching `MessageSchema`
- `messageReads.ts` — `GET /chats/:id/members/read` returns `ChatMemberReadStateSchema[]`
- `polls.ts` — poll vote response matches `PollDataSchema`
- Pin routes (`/chats/:id/pins` and `/messages/:id/pin`) — same response shape,
  same socket event emitted from both

### 3. Unhandled promise rejections in route handlers
Scan `routes/chats.ts` for async handlers missing try/catch or not wrapped in
Fastify's error boundary. An uncaught throw escapes silently and leaves the
HTTP request hanging.

### 4. Migration ordering and idempotency
Verify `migrate.ts` runs 019–022 in numeric order. Each migration should use
`IF NOT EXISTS` / `IF EXISTS` guards so re-running them is safe.
Check that no migration references a table or column introduced by a later one.

### 5. Reaction and vote uniqueness at the DB level
`reaction.add` and poll voting should be idempotent — verify there's either a
unique constraint on the relevant table or the upsert logic handles duplicates.
Without this, rapid double-taps from the frontend insert duplicate rows.

### 6. Auth and membership guards on new routes
Pin, reaction, and poll vote routes must: (a) require a valid JWT, and (b) verify
the requesting user is a member of the target chat. Confirm this uses the same
membership check pattern as the existing chat routes, not a weaker ad-hoc check.

### 7. N+1 query patterns
`messageHydration.ts` likely loads reactions, replies, and pins per message.
Check whether it does one query per message (N+1) or batches them. Under a
50-message page load this multiplies to ~150 queries and will noticeably slow
the chat open time.

### 8. Memory / resource leaks in the Node process
- Any `setInterval` or `setTimeout` registered at module scope (outside a
  request lifecycle) that is never cleared
- Socket.IO listeners registered with `socket.on(...)` inside a per-request
  handler (instead of the connection handler) — these stack on every request
- Large in-memory caches (arrays/maps) that grow without an eviction policy

### 9. Error response shape
All error responses must return `{ error: "readable string" }` — not nested
Fastify error objects. The frontend reads `data.error` directly. Check the new
chats.ts additions and the poll/reaction/pin routes for any that return
`{ message: ... }` or the raw Fastify shape.

### 10. Type safety gaps
Look for `as any`, untyped `req.body`, or missing Zod `.parse()` / `.safeParse()`
on incoming request payloads in the new routes. These are the most likely places
for a runtime crash from a malformed frontend request.

---

## Output format

For each issue found:
```
FILE: services/api/src/...
ISSUE: one sentence
RISK: low | medium | high
FIX: what to change
```

Fix all **medium** and **high** risk issues.  
Commit as: `fix(api): backend hygiene — <short summary>`  
Leave low-risk style issues as comments only — do not refactor working code.
