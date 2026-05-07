# Backend Scaffolding Plan — Codex Implementation Guide

**Date:** 2026-05-06
**Owner:** Codex (`services/api/`, `infra/`)
**Goal:** Make the frontend functional end-to-end. The frontend is complete; every API call it makes currently 404s.

**Prerequisites already in place:**
- `packages/contracts/` — Zod schemas for all request/response bodies (1,120 lines, 25 tests passing)
- `docs/kimi-rebuild/02-data-model.md` — Full Drizzle schema
- `docs/kimi-rebuild/03-realtime-contract.md` — Socket.IO event contract
- `apps/web/` — Complete PWA frontend (auth, chat, push, settings)

**Tech stack:** Fastify 5 + Drizzle ORM + PostgreSQL + Socket.IO 4 + `web-push` + `bcryptjs` + `altcha-lib`

---

## 0. Bootstrap — Project Skeleton

**Create `services/api/` directory with:**

```
services/api/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # Entry point: build Fastify app, start HTTP + Socket.IO server
│   ├── app.ts                # Fastify instance factory (plugins, hooks, error handlers)
│   ├── config/
│   │   └── env.ts            # Env validation (zod schema for process.env)
│   ├── db/
│   │   ├── schema.ts         # Drizzle table definitions (copy from 02-data-model.md)
│   │   ├── pool.ts           # Postgres pool (pg)
│   │   ├── migrate.ts        # Migration runner script
│   │   └── migrations/       # drizzle-kit generated SQL files
│   ├── middleware/
│   │   ├── auth.ts           # JWT verify decorator + preHandler hook
│   │   ├── rateLimit.ts      # Auth route rate limiting (X-Forwarded-For keyed)
│   │   └── errorHandler.ts   # Global Fastify error handler
│   ├── routes/
│   │   ├── health.ts         # GET /health
│   │   ├── auth.ts           # POST /auth/*
│   │   ├── users.ts          # GET /users, PATCH /users/me
│   │   ├── chats.ts          # GET /chats, GET /chats/:id/messages, POST /chats/:id/read, etc.
│   │   ├── push.ts           # GET /push/vapid-key, POST /push/subscribe, DELETE /push/subscribe
│   │   └── media.ts          # POST /media/upload, GET /media/:id
│   ├── utils/
│   │   ├── sessions.ts       # Refresh token create/verify/rotate/revoke
│   │   ├── users.ts          # Password hash (bcrypt), user lookup helpers
│   │   ├── chats.ts          # Chat membership guards, unread count queries
│   │   ├── messages.ts       # Message CRUD + hydrate sender info
│   │   ├── messageReads.ts   # Mark-read logic (seenThroughMessageId semantics)
│   │   ├── uploads.ts        # File storage abstraction (local disk for dev)
│   │   ├── altcha.ts         # Altcha challenge generation & verification
│   │   └── error-responses.ts # Typed AppError class + HTTP status mapping
│   ├── realtime/
│   │   └── socket.ts         # Socket.IO auth middleware + event handlers
│   └── push/
│       ├── web.ts            # VAPID web-push delivery
│       ├── scope.ts          # Scope filtering (dm_only, all, etc.)
│       └── dnd.ts            # Quiet hours + DND override checks
└── test/
    ├── helpers.ts            # Test DB setup, authenticated request helper
    ├── safe-db.ts            # Isolated test database per test file
    ├── integration-auth.test.ts
    ├── integration-users.test.ts
    ├── integration-chats.test.ts
    ├── integration-realtime.test.ts
    ├── integration-push.test.ts
    ├── integration-media.test.ts
    └── contracts-smoke.test.ts
```

### 0.1 package.json

```json
{
  "name": "@penthouse/api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "tsx --test --test-concurrency=1 ./test/*.test.ts",
    "test:integration": "tsx --test --test-concurrency=1 ./test/integration-*.test.ts",
    "migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@fastify/jwt": "^9.0.1",
    "@fastify/multipart": "^9.0.1",
    "@fastify/static": "^8.1.0",
    "@penthouse/contracts": "file:../../packages/contracts",
    "altcha-lib": "^1.4.1",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.38.0",
    "fastify": "^5.2.1",
    "pg": "^8.13.1",
    "socket.io": "^4.8.1",
    "web-push": "^3.6.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.2",
    "@types/pg": "^8.11.10",
    "@types/web-push": "^3.6.4",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### 0.2 .env.example

```
# Database
DATABASE_URL=postgres://penthouse:penthouse@localhost:5432/penthouse

# Auth
JWT_SECRET=change-me-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Altcha (get from https://altcha.org/)
ALTCHA_HMAC_KEY=your-altcha-hmac-key

# Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=base64url-public-key
VAPID_PRIVATE_KEY=base64url-private-key
VAPID_SUBJECT=mailto:admin@penthouse.blog

# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Server
PORT=3000
NODE_ENV=development
```

### 0.3 First migration

Copy the Drizzle schema from `docs/kimi-rebuild/02-data-model.md` into `src/db/schema.ts`. Generate the first migration:

```bash
cd services/api
npm install
npx drizzle-kit generate --dialect postgresql --schema ./src/db/schema.ts --out ./src/db/migrations
```

Review `src/db/migrations/0000_initial.sql`. Apply:

```bash
npm run migrate
```

---

## Phase 1 — Auth (Days 1–2)

**Goal:** Frontend can register, login, refresh, and logout.

### 1.1 `src/routes/auth.ts`

| Endpoint | Body | Response | Notes |
|---|---|---|---|
| `POST /api/v1/auth/register` | `RegisterRequest` (contracts) | `AuthResponse` | Validate Altcha challenge. Hash password with bcrypt (10 rounds). Create user row. Create session device + refresh token. Return tokens. |
| `POST /api/v1/auth/login` | `LoginRequest` | `AuthResponse` | Verify password. Create new session device + refresh token. Return tokens. |
| `POST /api/v1/auth/refresh` | `{ refreshToken: string }` | `AuthResponse` | Verify refresh token hash. Rotate: mark old as rotated, create new. Return fresh access + refresh. |
| `POST /api/v1/auth/logout` | `{ refreshToken: string }` | `204` | Revoke refresh token. Delete associated push subscriptions. |

**Key contracts with frontend:**
- `AuthResponse` must match `packages/contracts/src/auth.ts` exactly (accessToken, refreshToken, user object with id, username, displayName, avatarUrl, role).
- On 401, frontend calls `/auth/refresh` automatically (see `apps/web/src/lib/services/api.ts`).

### 1.2 `src/middleware/auth.ts`

```ts
// Decorates fastify instance with verifyJWT
fastify.decorate('authenticate', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const payload = await request.jwtVerify(token);
  request.user = payload; // { userId, username }
});
```

Use `@fastify/jwt` plugin. Access token expiry: 15 minutes. Refresh token expiry: 7 days.

### 1.3 `src/utils/altcha.ts`

```ts
export function createChallenge(): AltchaChallenge { /* use altcha-lib */ }
export function verifyChallenge(payload: string): boolean { /* hmac verify */ }
```

Expose `GET /api/v1/auth/challenge` for frontend to fetch a challenge before register.

### 1.4 Acceptance
- `npm run test` passes `test/integration-auth.test.ts` (register → login → refresh → logout → protected route 401).

---

## Phase 2 — Users & Directory (Day 2)

### 2.1 `src/routes/users.ts`

| Endpoint | Auth | Response |
|---|---|---|
| `GET /api/v1/users` | Yes | `{ users: MemberDetail[] }` |
| `PATCH /api/v1/users/me` | Yes | `{ id, username, displayName, avatarUrl }` |

**`MemberDetail` schema** is in `packages/contracts/src/api.ts`.

### 2.2 Acceptance
- `test/integration-users.test.ts` passes.

---

## Phase 3 — Chats & Messages REST (Days 3–4)

### 3.1 `src/routes/chats.ts`

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/v1/chats` | Yes | Return chats where user is member, with `unreadCount` computed as messages after `chatMembers.lastReadMessageId`. |
| `GET /api/v1/chats/:id/messages` | Yes | Return messages in createdAt ASC order. Include `readReceipts` array, `reactions` array. |
| `POST /api/v1/chats/:id/messages` | Yes | REST fallback for sending messages. Same logic as socket `message.send` but returns message directly. |
| `PATCH /api/v1/messages/:id` | Yes | Only sender can edit. Update content, set editedAt, increment editCount. Insert `messageEdits` audit row. |
| `DELETE /api/v1/messages/:id` | Yes | Soft delete: insert `messageDeletions` row. |
| `POST /api/v1/chats/:id/read` | Yes | Update `chatMembers.lastReadMessageId` and `lastReadAt` ONLY if `throughMessageId` is provided. If missing, return 400. |
| `PATCH /api/v1/chats/:id/preferences` | Yes | Update `chatMembers.notificationsMuted`, etc. |

**Critical semantic (from 03-realtime-contract.md):**
- `POST /chats/:id/read` REQUIRES `throughMessageId`. If the frontend sends `{}`, return 400.
- The backend must NOT auto-mark-read on `chat.join` socket event.

### 3.2 `src/utils/messageReads.ts`

```ts
export async function markChatRead(
  chatId: string,
  userId: string,
  throughMessageId: string
): Promise<void> {
  // Verify throughMessageId exists in chat
  // Update chatMembers.lastReadMessageId = throughMessageId
  // Update chatMembers.lastReadAt = now
}
```

### 3.3 Acceptance
- `test/integration-chats.test.ts` passes.

---

## Phase 4 — Socket.IO Realtime (Days 4–5)

### 4.1 `src/realtime/socket.ts`

**Auth middleware:**
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('AUTH_REQUIRED'));
  try {
    const payload = await fastify.jwt.verify(token);
    socket.data.userId = payload.userId;
    socket.data.username = payload.username;
    socket.join(`user:${payload.userId}`);
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});
```

**Event handlers (all wrapped in try/catch):**

| Client Event | Server Action | Broadcast |
|---|---|---|
| `chat.join` | Verify membership → `socket.join(chat:${chatId})` | `chat.joined` to sender |
| `chat.leave` | `socket.leave(chat:${chatId})` | — |
| `typing.start` | `socket.to(chat:${chatId}).emit('typing.update', { userId, username, isTyping: true })` | All except sender |
| `typing.stop` | Same with `isTyping: false` | All except sender |
| `message.send` | Insert message → update chat.updatedAt → broadcast `message.new` → emit `message.ack` to sender | `message.new` to chat room |
| `message.edit` | Update message → broadcast `message.edited` | Chat room |
| `message.delete` | Soft delete → broadcast `message.deleted` | Chat room |
| `message.react` | Upsert reaction → broadcast `reaction.add` | Chat room |
| `message.unreact` | Delete reaction → broadcast `reaction.remove` | Chat room |
| `message.read` | Call `markChatRead()` → broadcast `message.read` | Chat room |

**Message payload shapes** must match `packages/contracts/src/events.ts` exactly.

### 4.2 Presence

On connect: update `users.lastSeenAt = now()`.
On `presence.update`: broadcast to `user:${userId}` room.
On disconnect: no action (frontend treats offline as default).

### 4.3 Acceptance
- `test/integration-realtime.test.ts` passes (15/15 tests).

---

## Phase 5 — Push Notifications (Days 5–6)

### 5.1 `src/routes/push.ts`

| Endpoint | Auth | Response |
|---|---|---|
| `GET /api/v1/push/vapid-key` | No | `{ publicKey: string }` |
| `POST /api/v1/push/subscribe` | Yes | `204` |
| `DELETE /api/v1/push/subscribe` | Yes | `204` |

**`POST /push/subscribe` body:** `PushSubscribeRequest` (from contracts).
- Upsert into `pushSubscriptions` (unique on `userId + endpoint`).
- Link to `sessionDevices` row.

**`DELETE /push/subscribe` body:** `{ endpoint: string }`.
- Delete matching row.

### 5.2 `src/push/web.ts`

```ts
export async function sendWebPushForNewMessage(
  chatId: string,
  message: Message,
  senderName: string
): Promise<void> {
  // 1. Skip if no subscriptions for chat members
  // 2. Skip online users (check Socket.IO adapter)
  // 3. Skip quiet hours / DND
  // 4. Skip scope-filtered users (dm_only for channels)
  // 5. Build payload per privacy level (private/metadata/full)
  // 6. Send via web-push library
  // 7. Log to pushNotifications table
}
```

**Payload shape (matches frontend `payload.ts`):**
```json
{
  "privacyLevel": "metadata",
  "chatId": "...",
  "chatName": "General",
  "chatType": "channel",
  "messageId": "...",
  "senderId": "...",
  "senderName": "Alice",
  "body": "Hello world",
  "scope": "all"
}
```

### 5.3 VAPID keys

Generate once:
```bash
npx web-push generate-vapid-keys
```
Add to `services/api/.env` and `apps/web/.env`.

### 5.4 Acceptance
- `test/integration-push.test.ts` passes (mock spy injects, asserts payload schema).

---

## Phase 6 — Media Uploads (Day 6)

### 6.1 `src/routes/media.ts`

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/v1/media/upload` | Yes | Multipart upload. Save to `UPLOAD_DIR` with UUID filename. Insert `mediaUploads` row. Return `{ mediaId, url }`. |
| `GET /api/v1/media/:id` | Yes (or public with signed URL) | Serve file. |

### 6.2 Frontend integration
- Frontend `POST /media/upload` → receives `mediaId` → includes `mediaId` in `message.send` metadata.
- Backend hydrates `mediaUrl` in message response.

### 6.3 Acceptance
- `test/integration-media.test.ts` passes.

---

## Phase 7 — Rate Limiting & Observability (Day 7)

### 7.1 Auth rate limiting (`src/utils/authRateLimit.ts`)

- Key: `X-Forwarded-For` IP + route.
- Window: 15 minutes.
- Max attempts: 5 per window for login, 3 for register.
- Response: 429 with `Retry-After` header.

### 7.2 Error responses

Use `AppError` class with `code` + `status` + `message`. Global handler maps to JSON:
```json
{ "code": "VALIDATION_ERROR", "message": "...", "status": 400 }
```

### 7.3 Logging

Use Fastify's built-in pino. Log format:
```ts
fastify.log.error({ err, userId, route }, 'handler failed');
```

---

## Phase 8 — Integration Tests

**Test strategy:** Each integration test file gets an isolated database via `safe-db.ts`.

```ts
// test/helpers.ts
export async function createTestUser(fastify, { username, password }) { ... }
export async function login(fastify, { username, password }) { ... }
export async function createChat(fastify, token, { name, type, memberIds }) { ... }
```

**Minimum test coverage:**
- `integration-auth.test.ts` — register, login, refresh, logout, challenge
- `integration-users.test.ts` — directory, profile update
- `integration-chats.test.ts` — create chat, send message, edit, delete, mark read, pagination
- `integration-realtime.test.ts` — socket auth, join/leave, message send/ack, typing, read receipts
- `integration-push.test.ts` — subscribe, unsubscribe, VAPID key, mock delivery
- `integration-media.test.ts` — upload, download

---

## Integration Checklist

Before declaring "backend functional":

- [ ] `npm run typecheck` passes in `services/api/`
- [ ] `npm run test` passes (unit + integration)
- [ ] `npm run migrate` runs clean on fresh Postgres
- [ ] Frontend `npm run build` produces PWA that can `npm run preview` against `localhost:3000`
- [ ] Auth flow: register → login → chat list loads → open chat → send message → message appears
- [ ] Socket.IO: second browser tab sees message in real time
- [ ] Push: subscribe in settings → send message from other account → push notification arrives
- [ ] Read receipts: scroll message into view → slash glyph updates to `//` in accent

---

## Files Codex Should NOT Touch

These are Kimi/Claude frontend territory. Codex reads them for contract understanding only:
- `apps/web/src/lib/services/*.ts` — API client wrappers
- `apps/web/src/lib/stores/socket.svelte.ts` — Socket.IO event expectations
- `apps/web/src/lib/push/*.ts` — Push subscription lifecycle
- `apps/web/src/routes/**/*.svelte` — Page components

## Files Codex MAY Touch (with handoff comment)

- `packages/contracts/src/**/*.ts` — If a backend field is missing from a Zod schema, add it and add inline comment:
  ```ts
  // HANDOFF → Kimi | added: deliveredAt field | why: backend now tracks message delivery time
  ```

---

## Open Questions for Human Input

1. **File storage backend:** Local disk for dev is fine. For production, should uploads go to S3/R2/MinIO?
2. **Altcha HMAC key:** Need a real key for production (free from altcha.org).
3. **FCM legacy:** Incumbent had `device_tokens` for Firebase. Rebuild only does Web Push (VAPID). Confirm iOS Safari 16.4+ PWA install is acceptable.
4. **Operator diagnostics:** Incumbent had `/operator/diagnostics` endpoint. Out of scope for MVP?
