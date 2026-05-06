# Handoff — 2026-05-06 | Kimi → Codex

## State
Branch: main | Commit: 9c16883 | Working tree: clean
Last commit: feat(web): chat thread phase 1 — message list + composer

## Changed this session
- `packages/contracts/` — shared Zod schemas, fully tested (25 assertions)
- `apps/web/` — complete frontend skeleton: auth, chat list, thread, settings, users, socket store
  - SvelteKit 2 + Svelte 5 + static adapter + PWA
  - Typecheck clean, build produces static output
  - Socket.IO client with auto-connect, typed events, optimistic updates

## Intent
Frontend foundation is solid and feature-ready for phase 2 (media, reactions).
However, **frontend without backend is demo-ware** — cannot test real auth, messages,
or sockets. Backend is the critical path. Hand off to Codex to build `services/api/`
so both ends can be integrated and tested end-to-end.

## Your task → Codex | `services/api/`

### Priority 1: Bootstrap Fastify + Drizzle skeleton
**Files to create (≤3 at a time, per 3-file rule):**

1. `services/api/package.json`
   - Fastify 5, @fastify/jwt, @fastify/cors, @fastify/multipart, @fastify/websocket
   - drizzle-orm, pg, drizzle-kit, zod, pino, tsx, bcryptjs, web-push, altcha-lib
   - `@penthouse/contracts` workspace dependency

2. `services/api/tsconfig.json` — NodeNext ESM, strict

3. `services/api/src/db/schema.ts` — **Use exact Drizzle schema from**
   `docs/kimi-rebuild/02-data-model.md` section 3.
   Key intentional changes from incumbent:
   - `sessionDevices` extracted from `refreshTokens`
   - `messageEdits` + `messageDeletions` normalize `messages` god table
   - `pushSubscriptions.sessionDeviceId` → `sessionDevices` (not `refreshTokens`)
   - Quiet-hours only on `notificationPrefs` (drop dup on `deviceTokens`)

4. `services/api/src/db/index.ts` — Drizzle client with `drizzle-orm/node-postgres`

5. `services/api/drizzle.config.ts` — drizzle-kit config for migration generation

6. `services/api/src/app.ts` — Fastify plugin assembly
   - Register: `@fastify/jwt`, `@fastify/cors`, `@fastify/multipart`
   - Socket.IO attached via `@fastify/websocket` or direct socket.io integration
   - Routes registered under `/api/v1/`

7. `services/api/src/server.ts` — entry point, `fastify.listen({ port: 3000 })`

### Priority 2: Auth routes
Implement all endpoints matching `packages/contracts/src/api.ts` schemas exactly.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `RegisterRequestSchema` | `AuthResponseSchema` |
| POST | `/api/v1/auth/login` | `LoginRequestSchema` | `AuthResponseSchema` |
| POST | `/api/v1/auth/refresh` | `RefreshRequestSchema` | `AuthResponseSchema` |
| POST | `/api/v1/auth/logout` | — | 204 |
| GET | `/api/v1/auth/me` | — | `MeResponseSchema` |
| PATCH | `/api/v1/auth/me` | `UpdateProfileRequestSchema` | `MeResponseSchema` |
| PATCH | `/api/v1/auth/password` | `ChangePasswordRequestSchema` | 204 |
| POST | `/api/v1/auth/reset-password` | `PasswordResetRequestSchema` | 204 |

**Critical:**
- Password hashing via `bcryptjs` (incumbent uses this)
- JWT access token (short expiry, ~15min)
- Refresh token rotation with grace period (incumbent has `rotated_at`, `rotated_to_token_hash`)
- `sessionDevices` record created on login/refresh
- Altcha captcha verification on register (use `altcha-lib`)

### Priority 3: Chat routes
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/v1/chats` | — | `{ chats: ChatSummarySchema[] }` |
| GET | `/api/v1/chats/:id/messages` | `?before=` | `{ messages: MessageSchema[] }` |
| POST | `/api/v1/chats/:id/messages` | `SendMessageRequestSchema` | `SendMessageResponseSchema` |
| PATCH | `/api/v1/messages/:id` | `EditMessageRequestSchema` | `EditMessageResponseSchema` |
| DELETE | `/api/v1/messages/:id` | — | `DeleteMessageResponseSchema` |
| POST | `/api/v1/chats/:id/read` | `MarkChatReadRequestSchema` | `MarkChatReadResponseSchema` |
| PATCH | `/api/v1/chats/:id/preferences` | `ChatPreferencesRequestSchema` | `ChatPreferencesResponseSchema` |

### Priority 4: Socket.IO event handlers
Use `packages/contracts/src/events.ts` for event shapes.

**Client → Server:**
- `chat.join` / `chat.leave` — room management
- `typing.start` / `typing.stop` — broadcast `typing.update`
- `message.send` — insert message, broadcast `message.new`, emit `message.ack`
- `presence.update` — broadcast `presence.update`

**Server → Client:**
- `message.new`, `message.ack`, `message.read`, `message.edited`, `message.deleted`
- `typing.update`, `presence.update`, `presence.sync`, `chat.sync_required`

**Auth:** Token in handshake `auth.token`. Middleware verifies JWT.
**Rooms:** `user:${userId}`, `chat:${chatId}`.

### Priority 5: Push notifications (web-push)
- VAPID key generation endpoint (or manual generation script)
- `POST /api/v1/push/subscribe` — `PushSubscribeRequestSchema`
- `POST /api/v1/push/unsubscribe` — `PushUnsubscribeRequestSchema`
- `GET /api/v1/push/preferences` — `NotificationPrefsSchema`
- `PATCH /api/v1/push/preferences` — `PatchNotificationPrefsRequestSchema`
- Deliver push on new message for offline users (skip if online in chat)

### Quality gates
- `npm run typecheck` passes
- `npm test` runs (start with auth route tests using Node test runner + ephemeral DB)
- Environment: `DATABASE_URL`, `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

## Diffs + intents Codex must know
- **Drizzle replaces raw `pg`**. All queries type-safe. Migrations via `drizzle-kit generate`.
- **Schema changes from incumbent** are documented in `docs/kimi-rebuild/02-data-model.md` section 2.
  Do NOT silently revert to incumbent schema without handoff comment.
- **Contracts are source of truth.** Response shapes must match `packages/contracts/src/api.ts` exactly.
  If a contract needs change, add `// HANDOFF → Kimi | needs: <change> | why: <reason>` inline.
- **Socket.IO event names and payloads** are frozen per `packages/contracts/src/events.ts`.
- **Test DB safety:** Each test file gets its own database. Helper must hard-refuse non-test DB names.

## What Kimi will do while Codex builds backend
- Continue frontend phase 2 (media bubbles, reactions, replies) in parallel
- Ready to integrate once backend endpoints are live
- Will update `apps/web/src/lib/services/*.ts` API paths if backend routing differs

## Open questions
- None. Both sides have contract source of truth.
