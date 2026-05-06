# Handoff — 2026-05-06 | Kimi → Team

## State
Branch: main | Commit: 7420bfd | Working tree: 3 uncommitted files
Last commit: phase-1: adr stack + data model + realtime contract

## Changed this session
- `package.json` — root monorepo config (workspaces: apps/*, services/*, packages/*)
- `.gitignore` — standard Node + build artifacts
- `packages/contracts/package.json` — shared Zod contracts package, tsx test runner
- `packages/contracts/tsconfig.json` — NodeNext ESM strict
- `packages/contracts/src/api.ts` — ported 777-line incumbent API schemas faithfully
- `packages/contracts/src/events.ts` — ported 204-line Socket.IO event schemas
- `packages/contracts/src/push.ts` — ported 99-line push subscription + prefs schemas
- `packages/contracts/src/workflow.ts` — ported 36-line task routing schemas
- `packages/contracts/src/index.ts` — re-exports
- `packages/contracts/test/api.test.ts` — 25 assertions covering auth, messages, polls
- `packages/contracts/test/events.test.ts` — event envelope validation
- `packages/contracts/test/push.test.ts` — push subscription + prefs validation

## Intent
Phase 2 bootstrap: contracts are the foundation. Root monorepo is wired. Next: scaffold
`services/api/` and `apps/web/` so both agents can work in parallel.

## Your task

### → Codex | `services/api/`
**What:** Bootstrap Fastify 5 + Drizzle ORM backend skeleton.
**Files to create (≤3 at a time):**
1. `services/api/package.json` — Fastify 5, @fastify/jwt, @fastify/cors, @fastify/multipart,
   @fastify/websocket OR socket.io, drizzle-orm, pg, zod, pino, tsx
2. `services/api/src/db/schema.ts` — Drizzle schema from `docs/kimi-rebuild/02-data-model.md`.
   Use the exact table definitions in that doc. Intentional changes from incumbent:
   - `sessionDevices` extracted from `refreshTokens` (device metadata separate from auth tokens)
   - `messageEdits` + `messageDeletions` tables normalize the `messages` god table
   - `pushSubscriptions.sessionDeviceId` FK → `sessionDevices` (not `refreshTokens`)
   - `notificationPrefs` is the single source of truth for quiet hours (drop dup on `deviceTokens`)
3. `services/api/src/db/index.ts` — Drizzle client init with `drizzle-orm/node-postgres`
4. `services/api/src/app.ts` — Fastify plugin assembly (auth, routes, Socket.IO)
5. `services/api/src/server.ts` — entry point
6. `services/api/tsconfig.json` — NodeNext ESM

**Diffs + intents to know:**
- Drizzle replaces raw `pg`. Type-safe queries + `drizzle-kit generate` for migrations.
- `sessionDevices` is new: `id, userId, deviceLabel, appContext, hasPushToken, lastUsedAt, createdAt`.
  `refreshTokens.sessionDeviceId` FKs to it. `pushSubscriptions.sessionDeviceId` FKs to it.
- `messageDeletions` replaces soft-delete columns on `messages`. Tombstone pattern.
- `messageEdits` is new audit table. No edit history in incumbent.
- Keep all API response shapes identical to `packages/contracts/src/api.ts` — zero contract drift.

**Quality gate:** `npm run typecheck` passes, `npm test` runs (even if empty for now).

### → Claude | `apps/web/`
**What:** Bootstrap SvelteKit 2 + Svelte 5 frontend skeleton.
**Files to create (≤3 at a time):**
1. `apps/web/package.json` — @sveltejs/kit, @sveltejs/adapter-static, svelte, vite,
   tailwindcss, @penthouse/contracts (workspace link), socket.io-client
2. `apps/web/svelte.config.js` — static adapter, CSP config
3. `apps/web/vite.config.ts` — PWA plugin (@vite-pwa/sveltekit), tailwind
4. `apps/web/src/app.html` — root HTML
5. `apps/web/src/routes/+layout.svelte` — root layout
6. `apps/web/src/routes/+page.svelte` — placeholder landing
7. `apps/web/tsconfig.json` — SvelteKit tsconfig

**Diffs + intents to know:**
- Keep incumbent event contract shapes from `packages/contracts/src/events.ts`.
- `typing.start/stop` client events stay separate (server broadcasts `typing.update`).
- Presence uses `online: boolean` (not status enum) for backward compat.
- Primary canvas: 375px mobile. Desktop additive.
- Typography: Erode (display), Ubuntu (body), JetBrains Mono (technical).

**Quality gate:** `npm run typecheck` passes, `npm run build` produces static output.

## Open questions
- None. Both agents have clear specs and contract source of truth.
