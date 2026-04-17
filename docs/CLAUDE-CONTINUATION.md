# Claude Continuation Brief — Next Session

**Project:** The Penthouse (`/Users/aim/Documents/THE PENTHOUSE OPTIMIZED`)  
**Branch:** `pwa`  
**Date written:** 2026-04-15

---

## Current state — DEPLOYMENT IS LIVE ✅

Codex confirmed the TrueNAS stack is up and verified:
- `https://api.penthouse.blog/health` → OK
- `https://api.penthouse.blog/api/v1/app-distribution` → returns `sourceOfTruth: "pwa"`
- `https://penthouse.blog` → live (currently serving the SvelteKit PWA login screen)
- Old APK redirect: `/downloads/the-penthouse-rebuild.apk` → 308 → `/`
- Legacy APK redirect: `/downloads/the-penthouse.apk` → 308 → `/downloads/legacy/the-penthouse.apk`
- APK file itself: 404 (no artifact exists yet — that's fine, don't show the button)

Codex also wired a new backend contract: `GET /api/v1/app-distribution` which tells the frontend
what's live vs. legacy. The frontend should fetch and respect this.

---

## Your task — Build the standalone landing page

### What this page IS

A standalone marketing/welcome page that lives at the root of `penthouse.blog` as a **pre-login** surface. The user has selected **`apps/web/src/routes/welcome/REFERENCE_DESIGN.html` (The Floating Orb)** as the winning aesthetic for this page.

**Your task is to integrate the HTML/CSS/JS from `REFERENCE_DESIGN.html` into the SvelteKit app.**

**⚠️ REVISED APPROACH:** Instead of a plain HTML file in `infra/`, implement it as a new SvelteKit route at `apps/web/src/routes/welcome/+page.svelte`. Redirect unauthenticated root `/` traffic there instead of straight to `/auth`. This allows the "Enter the app" liquid transition to feel like a seamless part of the PWA.

### Tone and atmosphere

The design brief (from Concept 01):
- **"The Floating Orb"** — Intimate, quiet confidence, editorial.
- **Visuals:** Large, blurred radial orbs (CSS gradients), grain texture (4% opacity), dark periwinkle theme.
- **Transitions:** Full-page kinetic "Liquid Morph" expansion triggered by the "Enter the app" button.
- **Typography:** 'Erode' (Logo), 'Ubuntu' (Body), 'JetBrains Mono' (Labels).

### Visual constraints — ENFORCED

Use the exact design tokens and implementation from `poc-landing-pages-v5/concept-01.html`:
```css
--bg: #0D0D14
--bg-surface: #14141F
--accent: #7777C2
--text: #E2E2EC
--text-soft: #9a9ab4
--border: rgba(119, 119, 194, 0.15)
```
Keep the drifting orb background, grain texture, and specifically the **2x logo scale** for PENT/HOUSE.

### Page structure

**1. Logo** — same as current: "The / Pent / House" stacked in Erode

**2. Hero section**
- Section label: `01 — Welcome` (mono, tiny, uppercase)
- Headline (2 lines max, light weight): something like:
  *"A private space for the people you actually want to talk to."*
- Sub-lede (2–3 sentences, soft/honest):
  Something acknowledging this is early, invite-only, real. Not a pitch — a statement.
  Example: *"The Penthouse is an invite-only messaging app for small, close communities.
  It's early — you're here because someone vouched for you. We're glad you're in."*
- **Primary CTA button**: `Enter the app →` → links to `https://penthouse.blog/auth`
  (full accent border style, not just outline)

**3. What to expect section**
- Section label: `02 — What this is`
- Short checklist or 2–3 short paragraphs describing what the app does:
  real-time messaging, small private groups, no algorithmic feeds, no ads
- Keep it short — this isn't a feature list, it's reassurance

**4. Install section**
- Section label: `03 — Get the app`
- Explain the PWA: "Open in Chrome/Safari and add to your home screen — no app store needed"
- Primary button: `Open The Penthouse` → `https://penthouse.blog/auth`
- **Dynamic legacy APK block**: fetch `GET /api/v1/app-distribution` and:
  - If `legacyAndroid.status === "available"`: show a small secondary "Legacy Android APK" link
  - If `legacyAndroid.status === "unavailable"` or fetch fails: show nothing (no dead button)
  - This fetch is a best-effort — if the API is down, just hide the APK block, don't error

**5. Footer**
- `v2.1.0-alpha · invite only · © The Penthouse`
- Keep it minimal, mono font, low opacity

### Technical notes

- This is a **plain HTML/CSS/JS file** — no build step, no framework
- The dynamic APK check is a simple `fetch('/api/v1/app-distribution').then(...)` — inline `<script>`
- Same-origin: the page is served from `penthouse.blog`, API is at `api.penthouse.blog`, so the
  fetch needs to be `https://api.penthouse.blog/api/v1/app-distribution`
- Caddy serves `infra/compose/site/public/` as `/srv/site` and falls back to `index.html` for
  all unmatched routes — but the SvelteKit PWA build will ALSO be in this directory. The SvelteKit
  build should be deployed to a subdirectory or the landing page should be designed so it doesn't
  conflict. **CHECK THIS with the user before assuming the landing page lives at root.**
  
  Actually, re-reading the Caddyfile: `try_files {path} /index.html` — this means requests to
  `/auth`, `/chat`, etc. all fall through to `index.html`. If index.html is the landing page,
  those routes will be broken. This means the SvelteKit build needs to be copied to `site/public/`
  REPLACING the current `index.html`, and the landing page needs to be at a different path,
  OR the SvelteKit app handles its own routing (which it does via adapter-static + fallback).
  
  **Resolution:** The SvelteKit build IS the `index.html` for `/auth`, `/`, `/chat/*` etc.
  The marketing landing page should be a SEPARATE Caddy route or the SvelteKit app should
  incorporate it as a route (e.g. `/welcome` or as the actual root route before auth redirect).
  
  **Recommended approach:** Add the landing page as a route INSIDE the SvelteKit app at
  `apps/web/src/routes/welcome/+page.svelte`, redirect root `/` to `/welcome` for unauthenticated
  users (instead of straight to `/auth`), and keep `/auth` as the login form.
  This is cleaner than fighting Caddy routing.

---

## Pre-auth 401 calls to fix (from Codex's smoke test)

Codex observed 401/400 calls to `/api/v1/chats` and `/api/v1/chats/self` happening before auth.
These are pre-auth protected calls from the root load — fix these while touching the landing/auth flow:
- Check `apps/web/src/routes/+page.ts` or `+layout.ts` for any load functions that fetch chat
  data without checking `sessionStore.isAuthenticated` first
- Wrap any such calls in an auth guard before the fetch

---

## File reference

| File | Status | Notes |
|---|---|---|
| `infra/compose/site/public/index.html` | Needs update | Current APK-era landing page |
| `apps/web/src/routes/+layout.svelte` | ✅ Done | Socket reconnect fix in place |
| `apps/web/src/routes/auth/+page.svelte` | ✅ Done | canSubmit gating in place |
| `apps/web/src/routes/welcome/+page.svelte` | To create | New landing page (recommended approach) |
| `docs/codex-prompts/CLAUDE-PWA-SOURCE-OF-TRUTH-FRONTEND-HANDOFF.md` | Read me | Codex's full handoff with API contract |

## Memory files to read

- `~/.claude/projects/-Users-aim-Documents-THE-PENTHOUSE-OPTIMIZED/memory/pwa_migration_status.md`
- `~/.claude/projects/-Users-aim-Documents-THE-PENTHOUSE-OPTIMIZED/memory/alpha_release_next_steps.md`

---

## Continuation prompt to paste

> The deployment is live at penthouse.blog. Read `docs/CLAUDE-CONTINUATION.md` and `docs/codex-prompts/CLAUDE-PWA-SOURCE-OF-TRUTH-FRONTEND-HANDOFF.md` to get full context. Your task is to build a standalone landing page for the app by integrating the **`apps/web/src/routes/welcome/REFERENCE_DESIGN.html` (The Floating Orb)** design. It should be an elegant, newcomer-friendly, "The Floating Orb" aesthetic. It should have a primary CTA to enter the PWA, a "What this is" section, a dynamic legacy APK block (fetches `/api/v1/app-distribution`, only shows APK link if status is "available"), and a minimal footer. Implement it as a new SvelteKit route at `apps/web/src/routes/welcome/+page.svelte`, redirect unauthenticated root `/` traffic there instead of straight to `/auth`, and fix the pre-auth 401 calls to `/api/v1/chats` that Codex observed in the smoke test.
