# Agent Handoff: Codex -> Kimi — Codebase Trim and Optimization Review

Date: 2026-05-21
Repo: `/Users/aim/Documents/The Penthouse`
Branch: `main`
Baseline commit: `bfffe9f Clean release residuals`

## Purpose

Aim wants one more skeptical pass over the merged v4 codebase to find anything that still looks stale, duplicated, oversized, confusing, or unnecessarily expensive.

This is a trim-and-optimize review, not a redesign request. The app has already been merged into the canonical `The-Penthouse` repo, cleaned, committed, pushed, and redeployed to Unraid.

## Current Release State

Latest shipped commits:

- `34221b6 Stabilize auth realtime release wiring`
- `4cf1748 Preserve Unraid deployment wiring`
- `f09089c Make device token migrations replay-safe`
- `bfffe9f Clean release residuals`

Live deployment proof after `bfffe9f`:

- `https://api.penthouse.blog/api/v1/health` returns `{ "status": "ok", "db": "reachable" }`
- `https://api.penthouse.blog/api/v1/auth/config` returns `invite_only`
- `https://api.penthouse.blog/api/v1/app-distribution` declares the PWA as source of truth
- Socket.IO polling works at `https://api.penthouse.blog/socket.io/?EIO=4&transport=polling`
- Unraid checkout is at `bfffe9f`
- API/Caddy/Postgres containers are healthy
- Rendered `/welcome` has no `Kimi`, no `Migration`, and no `Coming from somewhere`
- Static deployed bundle scan found zero Kimi string matches

Local verification after cleanup:

```bash
npm --workspace @penthouse/web run typecheck
npm --workspace @penthouse/web run build
npm --workspace @penthouse/web run test
npm --workspace @penthouse/api run typecheck
npm --workspace @penthouse/api run build
npm --workspace @penthouse/api run test
npm audit --json
PUBLIC_APP_URL=http://localhost DATABASE_URL=postgresql://penthouse:penthouse@postgres:5432/penthouse JWT_SECRET=placeholder ALTCHA_HMAC_KEY=placeholder VAPID_PUBLIC_KEY=placeholder VAPID_PRIVATE_KEY=placeholder CORS_ORIGIN=http://localhost docker compose -f infra/docker-compose.yml config --quiet
```

Results:

- Web typecheck: 0 errors, 0 warnings
- Web build: clean
- Web unit tests: 21 passed
- API typecheck/build: passed
- API tests: 189 passed
- Full npm audit: 0 vulnerabilities
- Compose config: valid with placeholder required env

## Important Context

### Welcome Page Is Settled

Do not restore the Kimi migration welcome section.

The current welcome page should stay aligned to the final selected editorial/Floating Orb version:

- `PRIMARY WORDMARK`
- `MISSION // 01`
- `Quiet contact.`
- `VALUES // 02`
- `DELIVERY // 03`
- footer with `ALPHA RELEASE 4.0.0`

The removed stale section was:

- `Migration // 04`
- `Coming from somewhere else?`
- Discord/Signal/WhatsApp/Telegram comparison cards

That section was from the latest Kimi merge iteration and is intentionally gone.

### Preserve Deployment Shape

Do not rewrite deployment around the generic `infra/docker-compose.yml` unless Aim explicitly asks.

The live Unraid deployment uses preserved deployment files under:

```text
/mnt/user/appdata/penthouse/app/infra/compose
```

Important live files include:

- `infra/compose/docker-compose.production.yml`
- `infra/compose/docker-compose.truenas.yml`
- `infra/compose/.env.unraid`
- `infra/compose/site/public/`

The local `infra/docker-compose.yml` is useful for local/dev config validation, but it is not the full live deployment contract.

### Recent Residual Cleanup

`bfffe9f` already handled:

- Removed Kimi-era welcome migration section
- Removed non-doc Kimi strings from app/package/service/infra code
- Renamed local dev compose resources from `penthouse-kimi-*` / `penthouse_kimi_pgdata`
- Fixed Svelte accessibility/type warnings
- Fixed PWA Workbox glob warning
- Removed Vite dynamic-import chunk warning in `ChatListPane`
- Upgraded Vitest to `4.1.7`
- Added targeted npm overrides for:
  - `@sveltejs/kit -> cookie@0.7.2`
  - `@esbuild-kit/core-utils -> esbuild@^0.25.12`

## Review Goals

### 1. Find Remaining Merge Residuals

Search app/package/service/infra code for stale branch/project names, duplicated concepts, old migration assumptions, or compatibility glue that no longer serves a real runtime path.

Start with:

```bash
rg -n "Kimi|kimi|The-Penthouse-Kimi|penthouse-kimi|penthouse_kimi|v3|correct/main|Migration // 04|Coming from somewhere" apps packages services infra package.json package-lock.json
```

Historical docs can still mention Kimi; do not churn docs just to erase history. Focus on runtime code, scripts, package metadata, deployment files, and user-visible text.

### 2. Identify Dead or Misleading Prototypes

The repo still contains many prototypes under:

- `apps/web/src/routes/prototypes/`
- `apps/web/src/lib/prototypes/`

Decide which are useful reference artifacts and which are clutter. Do not delete prototypes just because they are not production routes; instead, classify them:

- keep as useful design reference
- move behind clearer naming/indexing
- archive/remove because obsolete or misleading

If proposing deletions, list exact files and the user-facing reason.

### 3. Check Bundle and Build Cost

Look for obvious bloat or accidental eager imports.

Suggested checks:

```bash
npm --workspace @penthouse/web run build
rg -n "await import\\(|from '\\$lib/prototypes|from '\\$routes/prototypes|sql-wasm|mediasoup-client" apps/web/src
```

Watch for:

- prototype code leaking into production chat/auth/settings paths
- `sql.js` / local-first worker assets loading where they should not
- mediasoup client code loading outside call/media paths
- unnecessary large shared chunks caused by static imports

### 4. Review Local-First Sync and IndexedDB Surface

The build ships a SQL.js WASM worker. Confirm whether this is intentionally loaded only for local-first sync and whether current feature flags make sense for production.

Files to inspect:

- `apps/web/src/lib/sync/`
- `apps/web/src/lib/db/`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/lib/services/sync.ts`
- `apps/web/src/lib/stores/sync*.ts`

Questions to answer:

- Is local-first sync still shadow-mode only in production?
- Are offline/local DB assets loaded lazily enough?
- Are there obsolete sync branches from earlier prototypes?

### 5. Look for API/DB Cleanup Candidates

The API is passing tests. Do not destabilize it casually.

Good targets:

- unused helpers
- duplicate validation logic
- dead routes or services not referenced by contracts/frontend
- migration comments that no longer match actual replay-safe behavior
- overly broad dependencies

Be careful around:

- `services/api/src/db/migrations/`
- `services/api/src/db/migrate.ts`
- `services/api/src/realtime/socket.ts`
- `services/api/src/features/sync/`
- `services/api/src/routes/media.ts`
- `services/api/src/utils/media-access.ts`

Migration replay safety was just fixed for live production. Do not "simplify" migrations unless you prove a fresh DB and the live replay path both survive.

### 6. Inspect Dependency Hygiene

Current `npm audit` is clean. Keep it clean.

Pay attention to whether the targeted root `overrides` are still the least-risk answer:

- `@sveltejs/kit` still depends on `cookie@^0.6.0`
- `drizzle-kit` still brings deprecated `@esbuild-kit/esm-loader`
- overrides currently prevent audit noise without downgrading tools

If you propose dependency changes, include:

- before/after `npm ls`
- before/after `npm audit`
- all impacted verification commands

### 7. Check Deployment Docs Against Reality

Do not assume docs are current. Verify them against the actual preserved Unraid deployment shape.

Files to inspect:

- `docs/UNRAID_DEPLOYMENT.md` if present
- `docs/DEPLOYMENT.md` if present
- `infra/compose/`
- `infra/docker-compose.yml`
- `services/api/Dockerfile`
- `apps/web/Dockerfile`
- `scripts/`

Flag any doc that would cause the next agent to deploy the wrong thing.

## Deliverable

Produce a concise review report with sections:

1. `Shipping blockers`
2. `Safe trims`
3. `Optimization candidates`
4. `Leave alone`
5. `Suggested patch order`
6. `Verification commands`

For each finding, include:

- severity: blocker / high / medium / low / cosmetic
- exact file path and line
- why it matters
- proposed fix
- risk of the fix
- verification needed

If no blocker is found, say that plainly.

## Rules For This Pass

- Do not rebrand the welcome page back to the Kimi migration version.
- Do not delete live Unraid deployment artifacts.
- Do not make sweeping refactors without a measurable payoff.
- Do not treat historical docs as runtime residuals.
- Do not change frontend source if the finding is only personal taste.
- Do not downgrade SvelteKit or Drizzle Kit just to satisfy npm audit suggestions.
- Prefer small, reviewable patches grouped by risk.

## If You Patch

Run at minimum:

```bash
git diff --check
npm audit --json
npm --workspace @penthouse/web run typecheck
npm --workspace @penthouse/web run build
npm --workspace @penthouse/web run test
npm --workspace @penthouse/api run typecheck
npm --workspace @penthouse/api run build
```

Run API tests if touching API, contracts, migrations, sync, media, auth, sessions, push, or package locks:

```bash
npm --workspace @penthouse/api run test
```

If touching deployment files:

```bash
PUBLIC_APP_URL=http://localhost DATABASE_URL=postgresql://penthouse:penthouse@postgres:5432/penthouse JWT_SECRET=placeholder ALTCHA_HMAC_KEY=placeholder VAPID_PUBLIC_KEY=placeholder VAPID_PRIVATE_KEY=placeholder CORS_ORIGIN=http://localhost docker compose -f infra/docker-compose.yml config --quiet
```

If touching public web behavior, verify the rendered route with Playwright or an actual browser, not only `curl`.

## Current Known Non-Blocker

The local dev Compose volume rename from `penthouse_kimi_pgdata` to `penthouse_pgdata` means a local `npm run db:start` may create a fresh local DB instead of reusing the old dev volume. That is intentional branding cleanup and not a production data issue. Production Unraid uses the preserved `infra/compose` deployment.

## Suggested First Pass

Start read-only:

```bash
git status --short --branch
git log --oneline -6
rg -n "Kimi|kimi|The-Penthouse-Kimi|penthouse-kimi|penthouse_kimi|Migration // 04|Coming from somewhere" apps packages services infra package.json package-lock.json
rg --files apps/web/src/routes/prototypes apps/web/src/lib/prototypes | sort
npm --workspace @penthouse/web run build
npm audit --json
```

Then report before patching anything broad.
