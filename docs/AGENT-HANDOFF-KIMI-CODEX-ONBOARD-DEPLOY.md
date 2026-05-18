# Agent Handoff: Kimi → Codex — Onboarding, PWA & Deployment Readiness

**Date:** 2026-05-18  
**From:** Kimi (frontend/chat pane prototypes/DND)  
**To:** Codex (backend/deployment/ops)  
**Context:** App is functionally complete for chat messaging. Operator wants users onboarded and wants to know what else is needed before external testing. Codex should handle deployment readiness + any backend gaps for onboarding.

---

## 1. Current State — What's Working

### Backend (API — localhost:3000)
- Fastify + Socket.IO + Drizzle ORM + PostgreSQL
- Auth: register/login with JWT refresh tokens, CAPTCHA (Altcha), alpha notice
- Chat: create DMs/groups, channels, messages, reactions, edits, deletes
- Folders: create, collapse/expand, DND reorder, socket sync (real-time)
- Media: upload avatars, banners, file attachments
- Push: VAPID keys configured, push subscription endpoints
- Presence: online/busy/DND/AFK/offline with custom notes
- Tests: 40/40 integration, 35/35 contracts — all green
- DB: migrated, 5 users, 7 folders, 13 messages from test runs

### Frontend (Web — localhost:5173)
- SvelteKit 2 + Svelte 5 + Vite 6 + adapter-static
- PWA: Workbox service worker, manifest, offline fallback, push notifications
- Auth page: login/register with password strength, alpha notice checkbox
- Chat list: folders, DND, context menus, mobile responsive
- Chat pane: messages, reactions, composer, clustered avatars
- Settings: profile, avatar/banner upload, presence, push notifications, appearance/themes
- People pane: user roster, profiles with editorial/vogue/wallpaper styles
- Prototypes: all 10 V5 chat pane themes built and verified
- E2E: 51/51 passing (including DND folders)
- Typecheck: 0 errors

---

## 2. PWA Assessment — What's Configured vs. What Needs Work

### ✅ Configured
- `vite.config.ts` uses `@vite-pwa/sveltekit` with `injectManifest` strategy
- `service-worker.ts`: Workbox precaching, offline fallback (`/offline.html`), API network-first, assets cache-first
- Push notification handling: parse payload, show notification, click routes to chat
- Manifest: `standalone` display, theme/background colors, 192/512 icons + maskable
- `offline.html`: Branded offline page with retry button, Perlin texture, OKLCH colors

### ⚠️ Gaps for Production PWA
| Gap | Risk | Suggested Fix |
|-----|------|---------------|
| **No install prompt UI** | Users don't know they can install | Add `beforeinstallprompt` handler + "Add to Home Screen" banner/button |
| **No update prompt** | `autoUpdate` may reload unexpectedly | Add "Update available — reload?" toast instead of silent reload |
| **Icon assets not verified** | `/icons/icon-192.png` etc. referenced but may not exist | Verify icon files in `static/icons/`; generate if missing |
| **No periodic background sync** | Messages sent while offline stay pending | Add `periodic-background-sync` or queue + retry on reconnect |
| **Service worker doesn't cache API responses for offline read** | Can't read chats when offline | Extend cache strategy for `/api/v1/chats/*` with stale-while-revalidate |

### 🔍 Codex Should Check
1. Do the icon files actually exist in `apps/web/static/icons/`?
2. Does push subscription work end-to-end? (subscribe → send test push → receive)
3. Does the offline fallback actually show when API is unreachable?

---

## 3. Onboarding Gaps — What Users Need

### Auth Flow (Exists)
- Register: username, display name (optional), password (10-128 chars), CAPTCHA, alpha notice
- Hardcoded invite code: `PENTHOUSE-ALPHA` (line 114 of auth/+page.svelte)
- Login: username + password

### ❌ Missing for User Onboarding
| Gap | Why It Matters | Suggested Approach |
|-----|----------------|-------------------|
| **No first-run tutorial** | Users won't know about folders, DND, themes, presence | Inline tooltips or a 3-step welcome modal after first login |
| **No seed/demo account** | Can't give testers a "try before you register" experience | `demo` / `demo123` account with pre-populated chats |
| **No "how to use" page** | Users coming from Discord/Signal/WhatsApp need comparisons | `/help` or `/guide` page with feature comparisons |
| **No invite system** | `PENTHOUSE-ALPHA` is hardcoded; anyone can register | Proper invite code generation + admin invite management |
| **No password reset** | Users will lock themselves out | Email-based or recovery-code-based reset flow |
| **No account deletion** | GDPR/privacy compliance | Self-service account deletion in settings |

### 💡 Operator Requested: App Comparisons
Users coming from other apps need to know:
- **vs. Discord:** No servers — just chats and folders. No voice channels (yet — Phase 4 scaffold exists). Privacy-first.
- **vs. Signal:** Not phone-number based. Username-only. Self-hostable. Themes.
- **vs. WhatsApp:** No phone number required. Web-first PWA. Folders instead of labels.
- **vs. Telegram:** No cloud sync — self-hosted. No bots (yet). Smaller, tighter scope.

Suggested: A "Welcome to Penthouse" page post-login or a `/about` route with comparison table.

---

## 4. Deployment Readiness — What's Needed for External Testing

### Local Testing (Someone Clones Repo)
**Blockers:**
1. README is one line — no setup instructions
2. No seed script for demo data
3. No documented test account
4. `.env.example` exists but not documented

**What Codex Should Do:**
- Write a real README with: prerequisites (Node 22+, Docker), `npm install`, `npm run db:start`, `cd services/api && npm run migrate`, `npm run dev` in both web and api
- Add a seed script (`services/api/src/db/seed.ts`) that creates a demo account + sample chats
- Or at minimum document: register with any username + `PENTHOUSE-ALPHA` invite code

### Remote Testing (Deployed URL)
**Blockers:**
1. No Dockerfile for API
2. No Dockerfile or build step for web (uses `adapter-static`, needs `vite build`)
3. No Caddyfile or reverse proxy config
4. No docker-compose for full stack (only postgres + coturn exist)
5. No deployment docs

**What Codex Should Do:**
- `Dockerfile` for API (multi-stage: build → production with `node:22-alpine`)
- `Dockerfile` for web build (or just document `npm run build` + serve `build/`)
- `Caddyfile` for reverse proxy: static files → `/`, API → `/api/*`, websockets → `/socket.io/`
- Update `infra/docker-compose.yml` to include API + web + Caddy services
- Document environment variables for production

**Stack Decision (from ADR-0001):** Docker Compose + Caddy + PostgreSQL. Operator self-hosts on Unraid/TrueNAS.

---

## 5. Specific Tasks for Codex

### High Priority (Before External Testing)
1. **Verify PWA assets** — Check `static/icons/` exists with 192/512 PNGs. Generate if missing.
2. **Add install/update prompt** — `beforeinstallprompt` + update toast in `+layout.svelte`
3. **Write README** — Setup instructions for local dev
4. **Seed script** — `demo` account with sample data for testers
5. **Deployment config** — Dockerfile for API, Caddyfile, full-stack docker-compose

### Medium Priority (Nice to Have)
6. **Push end-to-end test** — Verify subscription + notification delivery
7. **Offline cache for chats** — Stale-while-revalidate for chat API calls
8. **Password reset flow** — Backend endpoint + frontend UI
9. **Invite system** — Replace hardcoded `PENTHOUSE-ALPHA` with generated codes

### Low Priority (Post-MVP)
10. **First-run tutorial** — Frontend component, mostly UI work
11. **Help/comparison page** — Content/marketing page
12. **Account deletion** — Backend endpoint + settings UI

---

## 6. Files Codex Should Know About

```
apps/web/src/service-worker.ts              # PWA service worker
apps/web/vite.config.ts                     # PWA config (manifest, Workbox)
apps/web/static/offline.html                # Offline fallback page
apps/web/static/icons/                      # PWA icons (verify existence)
apps/web/src/routes/auth/+page.svelte       # Auth UI (invite code hardcoded)
apps/web/src/routes/settings/+page.svelte   # Settings (push, appearance, profile)
apps/web/src/routes/prototypes/+page.svelte # Prototype viewer
services/api/src/db/migrate.ts              # Migration runner
services/api/.env.example                   # API env vars
apps/web/.env.example                       # Web env vars
infra/docker-compose.yml                    # Current: postgres + coturn only
```

---

## 7. Environment (For Reference)

- **Web dev:** `localhost:5173` (Vite)
- **API dev:** `localhost:3000` (Fastify + Socket.IO)
- **Database:** `localhost:5434` (Postgres 16 in Docker)
- **Node:** 22+ required
- **Package manager:** npm 11.12.1 (workspaces)
- **Current .env:** `PUBLIC_SKIP_CAPTCHA=true` in dev, `DISABLE_RATE_LIMIT=true` on API

---

## 8. Quality Gates (Before Handoff Back to Operator)

- [ ] `npm run validate` passes (typecheck + all tests)
- [ ] PWA installable (Lighthouse PWA audit ≥90)
- [ ] Offline fallback works (disconnect API, reload page)
- [ ] Push notification test succeeds
- [ ] README has setup instructions
- [ ] Seed script creates demo account
- [ ] Docker Compose can spin up full stack with one command
- [ ] No console errors on first login

---

## Notes

- The operator explicitly excluded T-L1 and never wants T-D5/T-D6 referenced.
- Chat prototypes are done. Settings and People pane prototypes exist but are not the current focus.
- Voice chat (Phase 4) is scaffold-planned but not implemented yet.
- Folder DND is complete and tested (including Codex review fixes applied).
- All backend integration tests pass. The `local-sync` E2E test is flaky (pre-existing, unrelated).
