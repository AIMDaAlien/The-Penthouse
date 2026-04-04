# services/api — Fastify Backend

## Owned by: Codex (GPT-5.4)
Claude may read this directory for context. Claude must NOT edit files here without a handoff note approved by the project owner.

---

## What this directory is
The server that powers all of The Penthouse.
Handles authentication, chat/message persistence, real-time delivery via Socket.IO,
media uploads, admin moderation, and push notifications.

This backend is STABLE. It was built in v2.0.0 and carried forward unchanged into the `pwa` branch.
Do not refactor or reorganize it — only add, fix, or extend.

---

## Stack
- Fastify (HTTP server + plugin system)
- PostgreSQL (via `pg` pool — see `src/db/pool.ts`)
- Socket.IO (real-time events — see `src/realtime/socket.ts`)
- Zod validation via `@penthouse/contracts` schemas
- JWT (access tokens) + opaque tokens (refresh tokens)
- bcrypt for password hashing
- FCM (Firebase Cloud Messaging) for push — being phased out in favor of Web Push post-MVP

---

## Route structure
```
src/routes/
├── auth.ts      ← Login, register, refresh, password reset
├── chats.ts     ← Chat list, messages, send, mark read, preferences
├── media.ts     ← File/image/video upload and serving
├── members.ts   ← Member directory, profiles
├── admin.ts     ← Admin moderation, invite management, operator panel
└── health.ts    ← Health check endpoint
```

## Key utilities
```
src/utils/
├── security.ts        ← Hashing, tokens, JWT sign/verify
├── sessions.ts        ← Auth response construction, session metadata
├── users.ts           ← User lookup, creation, mapping
├── chats.ts           ← Chat summary, membership, ordering
├── chatMessages.ts    ← Message send logic (dedup, optimistic ack)
├── messages.ts        ← Message row mapping
├── authRateLimit.ts   ← Per-IP rate limiting for auth routes
├── settings.ts        ← Registration mode, server-side settings
└── uploads.ts         ← Upload validation, storage path logic
```

---

## Database
- PostgreSQL connection pool in `src/db/pool.ts`
- Migrations in `src/db/migrations/` — numbered sequentially (001, 002, ...)
- Run migrations via `src/db/migrate.ts`
- Never modify existing migration files — always add a new migration
- Table names: `users`, `chats`, `chat_members`, `messages`, `refresh_tokens`, `invite_codes`, `push_subscriptions`, `settings`

---

## Socket.IO events (current)
Defined in `packages/contracts/src/events.ts`.
- `message.new` — broadcast to `chat:{chatId}` room
- `message.ack` — sent to sender socket only
- `chat.updated` — broadcast to all members of a chat
- `typing` / `typing.stop` — broadcast to `chat:{chatId}`
- `presence` — sent to `user:{userId}` room

---

## Auth flow
1. Login → POST /api/v1/auth/login → returns `{ accessToken, refreshToken, user }`
2. Access token: short-lived JWT (15 min)
3. Refresh token: opaque, stored in DB, rotated on use
4. Password reset: recovery code flow (no email — code displayed to admin or sent via future integration)

---

## What this directory does NOT do
- No frontend rendering, no Svelte, no HTML templates
- No PWA manifest or service worker
- No client-side socket connection management

---

## Adding a new route
1. Create or extend a file in `src/routes/`
2. Register it in `src/app.ts` via `app.register()`
3. Add request/response schemas to `packages/contracts/` first
4. Leave a HANDOFF note if the frontend needs to consume the new endpoint

---

## Environment variables
See `.env.example` in this directory. Key vars:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
REFRESH_TOKEN_SECRET=...
PORT=3000
UPLOAD_DIR=/data/uploads
FCM_SERVICE_ACCOUNT_KEY=...   (optional, push)
REGISTRATION_MODE=invite_only  # or 'open' or 'closed'
```

---

## Definition of done (backend tasks)
1. Route/logic works against a real PostgreSQL instance
2. TypeScript compiles clean
3. Existing tests pass (`npm run test`)
4. No files outside `services/api/` or `packages/contracts/` were touched
5. If a new migration was added, it runs cleanly from scratch
