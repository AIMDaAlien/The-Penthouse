# Agent Handoff: Kimi → Codex — Migration Integrity Review

**Date:** 2026-05-20  
**From:** Kimi (orchestrator — rebuild & merge)  
**To:** Codex (reviewer/integrity checker)  
**Context:** The Kimi clean-room rebuild was erroneously developed against `The-Penthouse-Kimi` remote. It has now been merged into the canonical `https://github.com/AIMDaAlien/The-Penthouse` repo. Codex must verify the merged codebase is structurally sound, routes correctly, and has no regressions.

---

## 1. What Was Done

### Remote Migration
- **Old origin:** `https://github.com/AIMDaAlien/The-Penthouse-Kimi.git`
- **New origin:** `https://github.com/AIMDaAlien/The-Penthouse.git`
- Merge strategy: `git merge --allow-unrelated-histories -X theirs main` into `correct/main`
- Both histories preserved (original repo commits + Kimi rebuild commits)

### Routing Cleanup
- **Deleted** `apps/web/src/routes/(app)/` and all children:
  - `(app)/+layout.svelte`
  - `(app)/+page.svelte`
  - `(app)/chat/[id]/+page.svelte`
  - `(app)/chat/[id]/+page.ts`
  - `(app)/settings/+page.svelte`
  - `(app)/users/+page.svelte`
  - `(app)/users/[id]/+page.svelte`
- **Reason:** Kimi rebuild uses flat routes. The `(app)` group was shadowing/colliding with the flat routes.
- **Note:** The original `users/[id]/+page.svelte` (user profile detail) was lost in this cleanup. Kimi rebuild does not have an equivalent yet.

### Welcome Page Hybrid
- **Base:** Original editorial welcome page from `correct/main` (liquid blob, orbs, theme toggle, large wordmark)
- **Added:** "Migration // 04" section — "Coming from somewhere else?" with comparison cards for Discord, Signal, WhatsApp, Telegram
- **Styled** to match original tokens (`--bg`, `--accent`, `--text`, `--text-soft`, `--border`)
- **Updated** footer version to `ALPHA RELEASE 4.0.0`

---

## 2. Integrity Checklist — Codex Must Verify

### A. Build & Typecheck
```bash
npm install
npm run typecheck
```
- [ ] Zero type errors across all workspaces
- [ ] `apps/web` builds successfully (`npm --workspace @penthouse/web run build`)
- [ ] `services/api` builds successfully (`npm --workspace @penthouse/api run build`)

### B. Routing Verification
- [ ] `/welcome` loads the editorial welcome page with "Migration // 04" section
- [ ] `/auth` loads the auth screen
- [ ] `/` redirects authenticated users to chat list
- [ ] `/chat/:id` loads the chat thread
- [ ] `/settings` loads settings
- [ ] `/users` loads the users directory
- [ ] No 404s on previously working routes
- [ ] **No SvelteKit route conflicts** at build time (run `npm --workspace @penthouse/web run build` and check for warnings)

### C. API & Database
- [ ] `npm --workspace @penthouse/api run migrate` runs cleanly
- [ ] `npm --workspace @penthouse/api run test` passes
- [ ] `npm --workspace @penthouse/api run test:integration` passes
- [ ] API starts without errors (`npm --workspace @penthouse/api run dev`)

### D. Styling & Global Layout
The merge combined two different global style systems:
- **Original** root `+layout.svelte`: hardcoded `--color-*` tokens (Nocturne palette), view transitions, `app-bounded` / `app-monolith` classes
- **Kimi** root `+layout.svelte`: `--p-*` tokens (periwinkle theme system), auth guard, sync engine, `DesktopShell`

The merge kept the **Kimi version** because `-X theirs` was used. Codex must verify:
- [ ] No FOUC (flash of unstyled content) on load
- [ ] Theme switching works in the app (not just welcome page)
- [ ] Desktop layout renders correctly (`DesktopShell` with left pane + right pane)
- [ ] Mobile layout renders correctly (`BottomNav` visible on tab routes)
- [ ] No visual regressions in chat list, chat pane, settings, or users pages

### E. Welcome Page Specifics
- [ ] Dark/light theme toggle works on `/welcome`
- [ ] Liquid blob appears on CTA hover
- [ ] "Enter the app" button navigates to `/auth`
- [ ] Comparison cards render correctly (Discord, Signal, WhatsApp, Telegram)
- [ ] Responsive layout works on mobile (1024px and 640px breakpoints)

### F. Asset Verification
- [ ] `apps/web/static/icons/` contains `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon.svg`
- [ ] `apps/web/static/manifest.webmanifest` is present and valid
- [ ] PWA install prompt works

---

## 3. Known Risks & Watchouts

| Risk | Why | Mitigation |
|------|-----|------------|
| **Route duplication** | Original `(app)` routes were deleted, but other original-only files may still shadow Kimi routes | Check `apps/web/src/routes/` for any remaining group routes or duplicate paths |
| **Global CSS collision** | Original had `:global(*)` reset and `:global(:root)` token definitions in root layout; Kimi version replaces them with `--p-*` tokens | Verify no orphaned `--color-*` references in components that expect them |
| **Lost user profile page** | `users/[id]/+page.svelte` from original was deleted | Confirm operator is okay with this; rebuild it from Kimi `ProfileCard` component if needed |
| **DB migration numbering** | Original had migrations `001`–`027`; Kimi has `0000`–`0010`. They are incompatible naming schemes. | Check `services/api/src/db/migrations/` — both sets exist. The Kimi app uses Drizzle Kit with `_journal.json`; the original used raw SQL files. **This is a landmine.** |
| **Contract drift** | Original and Kimi both modified `packages/contracts/src/` | Verify all imports resolve and Zod schemas are consistent between frontend and backend |

---

## 4. Files That Changed in the Merge

### Added (from Kimi)
- All V5 theme components, prototypes, DND logic, sync engine, PWA banners
- `apps/web/src/routes/welcome/+page.svelte` (original version, before hybrid edit)
- `apps/web/e2e/*.spec.ts` test suite
- `infra/caddy/Caddyfile`, `infra/docker-compose.yml`, `infra/production.env.example`

### Modified (auto-merged)
- `package.json` — workspace scripts, version bumped to `4.0.0-alpha.1`
- `packages/contracts/src/*.ts` — combined schema exports
- `services/api/src/routes/*.ts` — combined route handlers

### Deleted (manual cleanup)
- `apps/web/src/routes/(app)/+layout.svelte`
- `apps/web/src/routes/(app)/+page.svelte`
- `apps/web/src/routes/(app)/chat/[id]/+page.svelte`
- `apps/web/src/routes/(app)/chat/[id]/+page.ts`
- `apps/web/src/routes/(app)/settings/+page.svelte`
- `apps/web/src/routes/(app)/users/+page.svelte`
- `apps/web/src/routes/(app)/users/[id]/+page.svelte`

### Modified (manual edit)
- `apps/web/src/routes/welcome/+page.svelte` — hybrid original + migration content

---

## 5. Commands for Quick Smoke Test

```bash
# 1. Start DB
npm run db:start

# 2. Migrate & test backend
cd services/api
npm run migrate
npm test
npm run test:integration

# 3. Build frontend
cd ../../apps/web
npm run build

# 4. Start both in separate terminals
# Terminal A: npm --workspace @penthouse/api run dev
# Terminal B: npm --workspace @penthouse/web run dev

# 5. Run E2E
npm --workspace @penthouse/web run test:e2e
```

---

## 6. Questions for Operator (if issues found)

1. **DB migrations:** Two incompatible migration systems coexist (`001_initial.sql` style vs `0000_initial.sql` + `_journal.json`). Which one is canonical? Do we need a data migration script?
2. **Users profile page:** The original had `/users/:id` for viewing/editing profiles. The Kimi rebuild does not. Should this be rebuilt?
3. **Version number:** Footer now says `4.0.0` to match `package.json`. Is this correct, or should it stay `2.1.0`?

---

**Next step:** Codex runs the integrity checklist above and reports back with pass/fail per section.
