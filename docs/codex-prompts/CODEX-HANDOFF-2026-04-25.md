# Codex Handoff — 2026-04-25

## What Claude shipped (frontend, `apps/web/`)

Two commits landed on `main` today:

**`85ad00a` — Desktop nav + monolith routing**
- New component: `apps/web/src/lib/components/DesktopNav.svelte`
  - Typographic Waterfall nav (Gelasio italic, 2.8rem), positioned bottom-left of the left pane
  - Three tabs: Messages (`/`), People (`/users`), Settings (`/settings`)
  - Active state: opacity 1 + translateX(16px); inactive: opacity 0.2; desktop-only via media query
- Routes moved into `(app)` group so they share the monolith layout:
  - `routes/users/+page.svelte` → `routes/(app)/users/+page.svelte`
  - `routes/users/[id]/+page.svelte` → `routes/(app)/users/[id]/+page.svelte`
  - `routes/settings/+page.svelte` → `routes/(app)/settings/+page.svelte`
- `(app)/+layout.svelte`: replaced `isThread` with `showRightPane` covering `/chat/`, `/users`, `/users/[id]`, `/settings`; `DesktopNav` injected into pane-left; pane shells get `height: 100%` override on desktop
- Root `+layout.svelte`: `isMonolithRoute` extended to include `/users`, `/users/[id]`, `/settings`

**`275cd55` — Four frontend fixes**
- Chat page `$effect` now guards on `sessionStore.isAuthenticated` (in addition to `browser`) — prevents unauthenticated `markRead` 401 on direct hard-load
- Welcome page: Erode CDN link removed (`https://fonts.cdnfonts.com/css/erode` returned HTTP 500 in alpha smoke); all logo/display CSS now uses `--font-display` (Gelasio, already self-hosted via `app.html`)
- Desktop back-buttons hidden via `pane-right :global(.back-btn) { display: none }` — DesktopNav handles top-level navigation
- Users page search button: emoji `🔍` replaced with `<Icon name="search" size={18} />`

Typecheck: **0 errors** after both commits.

---

## What Codex needs to tackle

### 1. Unraid backup automation (HIGH)
No recurring PostgreSQL or uploads backup job exists on the Unraid host yet. The TrueNAS nightly script (`scripts/nightly-pg-dump.sh`) needs to be wired into Unraid's cron or User Scripts plugin targeting `/mnt/user/appdata/penthouse/backups/postgres/`. Uploads directory backup should also run on the same cadence.

### 2. Strict DB release gate rerun (HIGH)
`npm run validate` and `npm run scenario:test` passed on the old TrueNAS environment, but a clean rerun is still needed against the Unraid Postgres instance with all 26 migrations applied. Gate cannot be signed off until this runs clean.

### 3. FCM service account mount (MEDIUM)
Firebase push is disabled. The Firebase Admin JSON needs to be placed on the Unraid host and `FCM_SERVICE_ACCOUNT_PATH` set in the production env file (`/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid`). No frontend work needed — backend already supports the config.

### 4. Mobile Add-to-Home-Screen proof (LOW)
Manual QA still needed on a real iOS/Android browser. The PWA manifest and service worker are in place; this is an install-flow confirmation only.

---

## No backend contract changes required
Claude's frontend work is self-contained to `apps/web/`. No migrations, no API changes, no `packages/contracts` edits were made.
