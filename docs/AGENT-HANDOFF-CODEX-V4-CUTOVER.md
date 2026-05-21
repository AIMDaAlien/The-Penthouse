# Agent Handoff — Codex: V4 → V3 Cutover & Deployment

**Date:** 2026-05-09
**From:** Kimi K2.6 (lead orchestrator, v4 rebuild)
**To:** Codex (deployment + docs + merge executor)
**Scope:** Merge v4 clean-room rebuild into v3 incumbent repo, overwrite v3, prepare for alpha release

---

## The Situation

V4 clean-room rebuild is **feature-complete for alpha**. Operator wants v4 merged into the incumbent v3 repo (`https://github.com/AIMDaAlien/The-Penthouse`) and deployed exactly as v3 used to deploy. v3 conventions, naming, directory structure, and deployment config must be preserved.

**Two repos on disk:**
- `/Users/aim/Documents/The-Penthouse-Kimi` — v4 rebuild (current working tree, `main` branch pushed to `The-Penthouse-Kimi` origin)
- `/Users/aim/Documents/penthouse-v3` — cloned v3 incumbent (`https://github.com/AIMDaAlien/The-Penthouse`)

---

## What V4 Has Built (Since V3 Parity Audit)

### Closed Gaps vs V3
| Feature | V3 State | V4 State |
|---------|---------|----------|
| Pinned messages | ✅ Had it | ✅ Now built (schema + REST + socket + PinBanner) |
| Channel creation | ✅ Had it | ✅ Now built (parentChatId + routes + ChannelList UI) |
| GIF search | ✅ Had it | ✅ Now built (live Giphy proxy + UnifiedPicker) |
| Message search | ❌ Missing | ✅ Now built (ilike backend + search panel) |
| Audio player | ❌ Basic | ✅ Now built (waveform, scrubber, speed toggle) |
| Read receipt socket | ❌ Broken | ✅ Now fixed (REST broadcasts message.read) |
| Custom emotes | ❌ Missing | ✅ New feature (:name: syntax, picker, inline) |
| Stickers | ❌ Missing | ✅ New feature (pack CRUD, picker, standalone) |
| Deep availability | ❌ Missing | ✅ New feature (available/busy/dnd/afk + notes) |
| AFK auto-trigger | ❌ Missing | ✅ New feature (idle detection) |
| Chat folders | ❌ Missing | ✅ New feature (folder CRUD + assignment) |
| Wallpapers | ❌ Missing | ✅ New feature (per-chat/global + opacity) |
| Rich text formatting | ❌ Missing | ✅ New feature (markdown in messages) |
| Any-emoji reactions | ❌ Missing | ✅ New feature (native emoji + custom emote) |
| Dark mode toggle | ❌ Missing | ✅ New feature (system/dark/light) |
| Unified "+" picker | ❌ Missing | ✅ New feature (emoji/GIF/stickers in one panel) |
| Emoji autocomplete | ❌ Missing | ✅ New feature (:sob: → 😭 inline) |
| Voice chat scaffold | ❌ Missing | 🟡 Scaffolded (WebRTC store, PTT, mesh) — **DEFER to beta** |

### Architecture Improvements Over V3
- **Schema**: Modular `features/*/schema.ts` instead of monolithic 274-line file
- **ORM**: Drizzle instead of raw `pg`
- **Contracts**: Shared `@penthouse/contracts` package with Zod
- **Tests**: 24 integration tests, all green
- **Push**: Tiered scopes, privacy levels, quiet hours
- **Auth**: Token rotation + session devices + refresh audit
- **Realtime**: Event-driven pub/sub decoupling

---

## Critical: V3 Conventions That Must Be Preserved

### 1. Directory Structure
V3 uses this layout. V4 must be **restructured** to match:
```
The-Penthouse/
├── apps/
│   └── web/                    ← v4 has this (SvelteKit PWA)
├── services/
│   └── api/                    ← v4 has this (Fastify)
├── packages/
│   └── contracts/              ← v4 has this (Zod)
├── infra/
│   ├── docker-compose.yml      ← v3: postgres + postgres_test only
│   └── compose/                ← v3: Caddy + production compose + site
│       ├── docker-compose.yml
│       ├── docker-compose.production.yml
│       ├── docker-compose.truenas.yml
│       ├── docker-compose.truenas.preview.yml
│       ├── caddy/Caddyfile
│       ├── caddy/Caddyfile.production
│       └── site/public/
├── scripts/
│   ├── backup-compose-postgres.sh
│   ├── backup-local-db.sh
│   ├── restore-compose-postgres.sh
│   ├── restore-local-db.sh
│   ├── seed-local-dev-data.mjs
│   ├── prepare-local-test-db.sh
│   ├── run-release-gate.mjs
│   ├── build-android-debug.sh      ← KEEP even if Android deferred
│   ├── install-android-debug.sh
│   ├── prepare-android-testing.sh
│   └── start-android-dev.sh
├── antigravity/
│   ├── scenarios/test-cases.json
│   ├── scripts/run-scenarios.mjs
│   ├── scripts/policy-engine.mjs
│   └── scripts/route-task.mjs
├── docs/
│   ├── DEPLOYMENT.md
│   ├── UNRAID_DEPLOYMENT.md
│   ├── INTERNAL_TESTING.md
│   └── obsidian/                   ← MUST update with v4 changes
├── package.json
├── pnpm-workspace.yaml             ← v3 uses pnpm
├── README.md
└── .env.example
```

### 2. Key Naming Differences
| V4 Location | V3 Location | Action |
|-------------|-------------|--------|
| `infra/docker-compose.yml` | `infra/docker-compose.yml` | KEEP v3's version (has postgres_test) |
| `infra/compose/` | `infra/compose/` | v4 is MISSING this entirely — PORT from v3 |
| `package.json` (npm workspaces) | `package.json` + `pnpm-workspace.yaml` (pnpm) | Operator said mirror v3. Decide: keep npm or switch to pnpm? |
| `apps/web/` (Svelte 5) | `apps/web/` (Svelte 5) | Same structure, overwrite with v4 |
| `services/api/` | `services/api/` | Same structure, overwrite with v4 |
| `packages/contracts/` | `packages/contracts/` | Same structure, overwrite with v4 |

### 3. Deployment Artifacts to Port from V3
These exist in v3 but NOT in v4. They must be copied over:
- `infra/compose/docker-compose.yml` (full stack: postgres + api + caddy)
- `infra/compose/docker-compose.production.yml`
- `infra/compose/docker-compose.truenas.yml`
- `infra/compose/docker-compose.truenas.preview.yml`
- `infra/compose/caddy/Caddyfile`
- `infra/compose/caddy/Caddyfile.production`
- `infra/compose/site/public/` (static landing page)
- `services/api/Dockerfile` (multi-stage Node 22 Alpine build)
- `services/api/.env.example`
- `scripts/` (all backup/restore/seed/release scripts)
- `docs/DEPLOYMENT.md`
- `docs/UNRAID_DEPLOYMENT.md`
- `docs/INTERNAL_TESTING.md`
- `antigravity/` (testing framework)
- `CLAUDE.md`, `HANDOFF_E2E_TESTING.md`, `QA_REPORT.md`

### 4. Package Manager Decision
V4 uses **npm workspaces**. V3 uses **pnpm workspaces** (`pnpm-workspace.yaml`).
- **Ask operator** which to keep. If mirroring v3 exactly → switch to pnpm.
- If keeping npm → remove `pnpm-workspace.yaml` from merged result.
- Either way, `package.json` scripts should match v3's (db:start, db:stop, validate, release:gate, etc.)

---

## Merge Strategy

### Step 1: Prep
1. `git clone https://github.com/AIMDaAlien/The-Penthouse.git` (if not already cloned)
2. Create a fresh branch: `git checkout -b v4-cutover`

### Step 2: Overwrite Source Code
1. Delete `apps/web/` from v3 → copy v4's `apps/web/` in its place
2. Delete `services/api/` from v3 → copy v4's `services/api/` in its place
3. Delete `packages/contracts/` from v3 → copy v4's `packages/contracts/` in its place
4. Keep v3's `infra/` but ADD v4's `infra/docker-compose.yml` (simpler local dev version)
5. Keep v3's `scripts/`, `antigravity/`, `docs/` (will update docs later)

### Step 3: Port Deployment Config
1. Copy v3's `services/api/Dockerfile` → adjust if v4's build steps differ
2. Ensure `services/api/.env.example` has all v4 env vars PLUS v3's
3. Verify `infra/compose/docker-compose.production.yml` references correct paths

### Step 4: Root Files
1. Merge `package.json` — keep v3's scripts, bump version to `4.0.0-alpha.1`
2. Keep `pnpm-workspace.yaml` OR remove it (operator decision)
3. Update `.gitignore` if needed

### Step 5: Validation
1. `npm install` (or `pnpm install`)
2. `npm run typecheck` — green
3. `npm run test` — green (24/24 integration)
4. `cd apps/web && npm run build` — green
5. `cd services/api && npm run build` — green
6. Docker build: `docker build -f services/api/Dockerfile .` — green

### Step 6: Docs & README
1. **Fresh README.md** — creative, modern, captures v4's new features (see section below)
2. **Update Obsidian notes** — capture all v4 changes
3. **Update DEPLOYMENT.md** — reflect v4's new env vars (GIPHY_API_KEY, etc.)
4. **Handoff note** in `docs/AGENT-HANDOFFS.md`

---

## README Requirements

The v3 README is functional but bland. Operator wants a **fresh creative README** for the merged repo. Requirements:

1. **Lead with identity** — what is The Penthouse? (private chat platform, alpha)
2. **Stack section** — Svelte 5, Fastify, PostgreSQL, Socket.IO, Drizzle, Zod
3. **Feature highlights** — call out NEW v4 features: custom emotes, stickers, GIF search, voice notes with waveforms, dark mode, message search, availability states, chat folders, channels
4. **Quick start** — `npm install`, `npm run db:start`, `npm run dev` (both workspaces)
5. **Deployment** — link to DEPLOYMENT.md and UNRAID_DEPLOYMENT.md
6. **Testing** — `npm run validate`, `npm run test`, `npm run scenario:test`
7. **Android note** — mention it's deferred to beta (keep scripts but note status)
8. **Version badge** — `v4.0.0-alpha.1`
9. **Creative flair** — not generic AI README. Use the Penthouse branding (Gelasio serif, gold accent `#C9A96E`, editorial/luxury feel)

---

## Obsidian Notes to Update

V3 has Obsidian project memory in `docs/obsidian/`. These MUST be updated to reflect v4 reality:

### Must-Create New Notes
1. **V4 Feature Additions** — comprehensive list of every new feature with file paths
2. **V4 Architecture Changes** — Drizzle vs raw pg, modular schema, contracts package
3. **V4 Cutover Log** — what was merged, what was overwritten, what was preserved
4. **V4 Deployment Changes** — new env vars, new Docker build steps

### Must-Update Existing Notes
1. **00 - Knowledge Hub.md** — update links, feature status
2. **01 - Rebuild Timeline.md** — add v4 completion date, cutover date
3. **08 - Live Chat Essentials.md** — update with emotes, stickers, GIFs, search
4. **13 - MVP Stability Plan v2.md** — mark completed items

### Notes to Archive (V3-only features that v4 replaced)
- Any notes about v3's raw pg queries → archive with "superseded by Drizzle"
- Any notes about v3's monolithic schema → archive with "superseded by modular features/"

---

## Environment Variables (Critical for Deployment)

V4 introduced new env vars that must be in `.env.example` and production config:

```
# NEW in v4 — MUST add to v3's .env.example
GIPHY_API_KEY=               # Giphy API key for GIF search
JWT_SECRET=                  # Already in v3, keep
ADMIN_BOOTSTRAP_USERNAME=    # Already in v3, keep
TEST_ACCOUNT_NOTICE_VERSION= # Already in v3, keep
UPLOAD_MAX_MB=20             # Already in v3, keep
CORS_ORIGIN=                 # Already in v3, keep
DATABASE_URL=                # Already in v3, keep
```

Also ensure `docker-compose.production.yml` has `GIPHY_API_KEY` in its environment section.

---

## Known Gotchas

1. **Giphy key is hardcoded** in `services/api/src/features/gifs/routes.ts` — move to `process.env.GIPHY_API_KEY` before merge
2. **V4 uses npm**, v3 uses **pnpm** — decide with operator before merge
3. **V4's `infra/docker-compose.yml`** only has postgres. V3's has postgres + postgres_test. Keep v3's.
4. **V4 has no `antigravity/` folder** — must be preserved from v3
5. **V4 has no `scripts/` folder** — must be preserved from v3
6. **V4 has no `docs/obsidian/`** — must be preserved and updated
7. **V4's `.env.example` may be missing** — v3 has `services/api/.env.example`, ensure it's merged
8. **V4's web app is SvelteKit PWA** — v3's was also SvelteKit, but verify adapter-static config matches

---

## Files That Must NOT Be Lost from V3

These are v3 assets that v4 doesn't have:
- `infra/compose/` (entire directory)
- `services/api/Dockerfile`
- `services/api/.env.example`
- `scripts/` (entire directory)
- `antigravity/` (entire directory)
- `docs/DEPLOYMENT.md`
- `docs/TRUENAS_DEPLOYMENT.md`
- `docs/INTERNAL_TESTING.md`
- `docs/obsidian/` (entire directory)
- `.claude/settings.json`
- `.codex/config.toml`
- `CLAUDE.md`
- `HANDOFF_E2E_TESTING.md`
- `QA_REPORT.md`
- `package.json` (scripts section — merge, don't overwrite)
- `pnpm-workspace.yaml` (if keeping pnpm)

---

## Validation Checklist (Before Pushing to V3 Repo)

- [ ] `npm run typecheck` green across all workspaces
- [ ] `npm run test` green (24/24 integration tests)
- [ ] `cd apps/web && npm run build` green
- [ ] `cd services/api && npm run build` green
- [ ] `docker build -f services/api/Dockerfile .` succeeds
- [ ] `docker compose -f infra/docker-compose.yml up -d` starts postgres
- [ ] `docker compose -f infra/compose/docker-compose.yml up -d` starts full stack (postgres + api + caddy)
- [ ] README.md is fresh and creative
- [ ] Obsidian notes updated
- [ ] `docs/AGENT-HANDOFFS.md` has cutover note
- [ ] `.env.example` has all required vars
- [ ] No secrets hardcoded in source
- [ ] Version bumped to `4.0.0-alpha.1` in root package.json

---

## Subagent Suggestions (Parallelize)

Codex should spawn parallel agents for:

| Agent | Task | Files |
|-------|------|-------|
| A | Merge source code (apps/web, services/api, packages/contracts) | 3 directories |
| B | Port deployment config (Dockerfile, compose, Caddy, .env.example) | infra/, services/api/Dockerfile |
| C | Merge root files (package.json, .gitignore, workspace config) | Root level |
| D | Write fresh README.md | README.md |
| E | Update Obsidian notes | docs/obsidian/ |
| F | Validate build + tests | All workspaces |

---

*End of handoff. v4 is alpha-ready. Merge it, deploy it, document it.*
