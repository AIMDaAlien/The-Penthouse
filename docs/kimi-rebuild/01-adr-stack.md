# ADR-0001 — Rebuild Stack Decision

**Status:** Proposed  
**Date:** 2026-05-06  
**Decider:** Kimi K2.6 (lead orchestrator)  
**Stakeholder:** AIMDaAlien (operator, final arbiter)

---

## 1. Context

Clean-room rebuild of The Penthouse v2.1.0-alpha.1. Goals: feature parity, smaller bundle, faster cold start, lower memory, stronger typing, deterministic migrations, contract-first realtime.

Incumbent stack:
- Frontend: SvelteKit 2.50 + Svelte 5.54 + Vite 6.4 + `@sveltejs/adapter-static` + Workbox 7
- Backend: Fastify 5 + ESM + raw `pg` 8.13 + hand-rolled `migrate.ts`
- Realtime: Socket.IO 4.8
- Contracts: Zod 3.24 + shared TypeScript types
- Tests: Vitest 2 + Playwright 1.59 (frontend); Node test runner + `tsx` (backend)
- Deployment: Docker Compose + Caddy + PostgreSQL

---

## 2. Decision

| Concern | Choice | Alternative (rejected) |
|---|---|---|
| Frontend framework | **SvelteKit 2.x + Svelte 5** | Next.js 15 App Router, SolidStart |
| UI primitives | **Tailwind CSS + framework-native components** | shadcn/ui (React), bits-ui (Svelte) |
| Backend framework | **Fastify 5** | Hono, Elysia |
| Runtime | **Node 22** | Bun 1.x, Deno 2 |
| ORM / DB layer | **Drizzle ORM + drizzle-kit** | Kysely, raw SQL |
| Realtime transport | **Socket.IO 4** | Native WebSocket (`ws`), SSE |
| Validation / contracts | **Zod 3.24** | Valibot, ArkType |
| Testing frontend | **Vitest + Playwright** | Bun test |
| Testing backend | **Node test runner + `tsx`** | Bun test, Vitest |
| Deployment | **Docker Compose + Caddy** | Bun single binary, Fly |

---

## 3. Frontend — Keep SvelteKit

### Why not Next.js 15
- Next.js ships React runtime (~45KB gzipped). Svelte compiles to vanilla JS. Same app: SvelteKit ~85KB, Next.js ~240KB. Rebuild budget: ≤250KB gzipped on chat page. Next.js leaves almost no headroom before app code.
- React Server Components add cognitive surface. Svelte 5 runes are simpler and already used in incumbent.
- `@vite-pwa/sveltekit` + `adapter-static` are proven in production. Migrating PWA config to Next.js is rewrite-for-rewrite-sake.
- Incumbent team (Claude) is fluent in SvelteKit. Switching costs real time.

### Why not SolidStart
- Solid is excellent but ecosystem smaller. No clear PWA plugin equivalent to `@vite-pwa/sveltekit`.
- No migration value for a working SvelteKit app.

### What changes
- Decompose 2,287-line chat page into lazy-loaded sub-routes or dynamic imports for GIF picker, poll builder, media composer.
- Add `prefers-reduced-motion` guards universally (WCAG 2.1 AA requirement).
- Keep Workbox 7 precache strategy; service worker stays custom for push + notification routing.

---

## 4. Backend — Keep Fastify

### Why not Hono
- Hono is ~20KB lighter but lacks equivalent plugin depth. `@fastify/jwt`, `@fastify/multipart`, `@fastify/static`, `@fastify/cors` cover every surface without custom wiring.
- Fastify 5 + ESM is already production-proven in this repo.

### Why not Elysia
- Bun-native. Bun is fast but ecosystem gaps for `pg`, `web-push`, `bcryptjs` exist. Operator self-hosts on modest hardware; Bun's speed advantage is irrelevant at 20–200 users.
- Single runtime lock-in adds risk.

### What changes
- Raw `pg` → Drizzle ORM (see §6).
- Add structured logging (`pino`) with a `/metrics` Prometheus endpoint (lightweight observability, no heavy stack).
- Keep plugin architecture; add rate-limiting plugin for auth surface.

---

## 5. Runtime — Keep Node 22

Bun and Deno are faster. At this scale, raw throughput is not the bottleneck. PostgreSQL query time + network RTT dominate. Node 22 has:
- Native `fetch`
- Stable `test` runner
- Largest ecosystem compatibility
- No runtime-specific bugs to debug

Operator already runs Node 22. No change needed.

---

## 6. ORM — Drizzle ORM (the big change)

### Why Drizzle
- Type-safe queries that look like SQL. Example:
  ```ts
  db.select().from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt))
    .limit(50);
  ```
- `drizzle-kit generate` produces numbered, idempotent SQL migrations from schema diffs. No more hand-rolling `DO $$` blocks.
- `drizzle-kit push` for rapid local prototyping.
- Smaller than Prisma; no query-engine binary.
- Excellent PostgreSQL support (`pg-core`).

### Why not Kysely
- Kysely is a query builder, not an ORM. No migration generation. Still requires hand-written migrations.
- Drizzle gives both query builder + schema + migrations in one tool.

### Why not raw SQL
- Raw `pg` is the incumbent. It works but has no compile-time type safety between schema and code. Every schema change requires manual query audit. At 29 migrations, this is the #1 maintainability foot-gun.

### Migration story
1. Write Drizzle schema that matches incumbent tables.
2. `drizzle-kit generate` produces migration `0000_initial.sql`.
3. Verify generated SQL matches incumbent schema (spot-check indexes, constraints, CHECKs).
4. For cutover: run Drizzle migrations on a fresh DB, then ETL data from incumbent DB with a dry-run script.
5. Document rollback: `drizzle-kit drop` or manual `DROP TABLE` order via FK graph.

---

## 7. Realtime — Keep Socket.IO

### Why not native WebSocket
- Socket.IO provides automatic reconnection, room broadcasting, and HTTP long-polling fallback. At 20–200 users, performance is not the bottleneck.
- Native WebSocket requires custom reconnection logic, heartbeat, room management. Rebuilding these correctly is error-prone.
- Client bundle size of `socket.io-client` (~30KB) is acceptable for the reliability it provides.
- Incumbent's Socket.IO hardening (explicit state machine, bounded degraded polling, queue flush) is hard-won knowledge. Porting to native WebSocket loses that safety.

### What changes
- Keep same event envelope shapes (from `packages/contracts/src/events.ts`).
- Keep `auth` token in handshake.
- Add stricter origin validation (already in incumbent).

---

## 8. Validation — Keep Zod

Valibot is smaller tree-shakeable. Rewriting 777 lines of `api.ts`, 204 lines of `events.ts`, and 99 lines of `push.ts` is not a rebuild win. Zod 3.24 performance is acceptable.

Contracts are the source of truth. Changing the validator means changing every contract file. Rejected.

---

## 9. Testing

### Frontend
- Keep Vitest + Playwright. `@axe-core/playwright` and `playwright-lighthouse` already configured.
- Add Percy or equivalent for visual regression baseline.

### Backend
- Keep Node test runner. It is fast, native, and requires zero config.
- **Key change:** Parallelize integration tests with ephemeral databases per file (e.g., `pgtmp` or testcontainers). Current sequential execution (`--test-concurrency=1`) is the #1 test-speed pain point.
- Each test file gets its own database name (`test_${timestamp}_${pid}`). Helpers hard-refuse to run against non-test names (safety guard already in incumbent).

---

## 10. Deployment

- Keep Docker Compose + Caddy. Operator self-hosts on Unraid. Compose stack is the right abstraction.
- Keep static adapter for frontend: Caddy serves `build/` as static files.
- Keep PostgreSQL in Compose.
- Add healthcheck endpoint (`/api/v1/health`) to Compose depends_on.
- No Kubernetes, no Fly, no managed cloud.

---

## 11. Trade-off summary

| Decision | Gain | Cost |
|---|---|---|
| Keep SvelteKit | Zero migration risk, proven PWA path, team fluency | None |
| Keep Fastify | Mature plugin ecosystem, proven in prod | None |
| Add Drizzle ORM | Type safety, auto migrations, smaller than Prisma | Learning curve, one-time schema rewrite |
| Keep Socket.IO | Reliable reconnect, fallback, rooms | ~30KB client bundle |
| Keep Zod | Zero contract rewrite | Slightly larger than Valibot |
| Parallelize tests | Faster CI feedback | One-time test helper refactor |

---

## 12. What "better" means

Rebuild is meaningfully better because:
1. **Drizzle ORM** replaces raw `pg` — type safety + generated migrations.
2. **Component decomposition** replaces 2,287-line monolith — smaller cognitive surface.
3. **Parallel tests** replace sequential — faster feedback.
4. **Lazy loading** reduces initial bundle — faster cold start.
5. **Deterministic schema** from day one — no 29 incremental migrations to reason about.

Not better because of framework swaps. Better because of disciplined simplification.

---

**Next step:** Operator review. If accepted, proceed to `02-data-model.md` (Drizzle schema mapping all incumbent migrations).
