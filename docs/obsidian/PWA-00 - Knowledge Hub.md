---
tags: [penthouse, pwa, knowledge-base, obsidian, sveltekit]
created: 2026-04-05
---

# The Penthouse PWA Knowledge Hub

This is the "what we built and why" for the SvelteKit PWA migration (`pwa` branch, v2.1.0-alpha).

## Quick facts

- **What**: Rebuilding The Penthouse from Vue+Capacitor native app to SvelteKit PWA
- **When**: Started 2026-04-04, Tier 1 (user management) active
- **Why**: Faster deploys, smaller footprint, easier maintenance
- **Status**: Tier 1 implementation complete, blocked by 2 backend tasks
- **Backend**: Unchanged (Fastify + PostgreSQL, v2.0.0 stable)

## Read in this order (PWA branch)

1. **[[15 - PWA Migration (SvelteKit)]]** – Start here: what changed, why, status
2. **[[16 - PWA Architecture in Plain English]]** – How the new PWA works (no jargon)
3. **[[17 - Tier 1 User Management Implementation]]** – What's built, what's pending, how to test

## Read for context (original v2.0.0 rebuild)

For understanding the backend and original rebuild, see:

- **[[../00 - Knowledge Hub]]** – Full v2.0.0 rebuild timeline
- **[[../02 - Architecture in Plain English]]** – Backend architecture (unchanged)
- **[[../07 - User Management Basics]]** – User features in v2.0.0 (we built on this)

## Current status (as of 2026-04-05)

### ✅ Implemented

- SvelteKit PWA app structure
- Authentication (login, register, logout)
- User directory with search and pagination
- User profiles (view + edit own profile)
- Design system (Gelasio logo, dark theme, CSS variables)
- All TypeScript types and Zod schemas
- 74 passing tests
- Socket.IO integration (ready, not in use yet)
- Contract schemas for all Tier 1 endpoints

### 🔄 Pending (blocked by Codex backend tasks)

1. **ALTCHA captcha endpoint** (`POST /api/v1/altcha`)
   - Frontend widget ready, backend missing
   - Blocks real registration testing
   - Temporary: Using placeholder token to unblock

2. **Error message standardization**
   - Backend returns nested objects → frontend shows `[object Object]`
   - Blocks meaningful emulator testing
   - Spec documented, waiting for implementation

3. **Remove inviteCode field** (non-blocking)
   - Registration still includes placeholder inviteCode
   - Can be removed once backend stops validating it

### 📋 Not yet tested

- Android emulator (user directory, profiles)
- Real ALTCHA flow
- Error message display
- Service Worker / offline support
- Socket.IO reconnection
- Scale (many users, pagination)

## What changed from v2.0.0

### Major changes

| Aspect | v2.0.0 | v2.1.0 PWA |
|--------|--------|-----------|
| **Framework** | Vue 3 + Capacitor | **SvelteKit 2.x** |
| **Distribution** | Google Play (native APK) | **Browser + "Install" button** |
| **Deployment** | Hours (Play Store review) | **Seconds (web server)** |
| **Bundle size** | ~10MB | **~200KB** |
| **Registration** | Invite codes | **ALTCHA proof-of-work** |
| **State mgmt** | Pinia | **Nanostores + Svelte 5 runes** |
| **HTTP client** | axios | **Native fetch** |

### Minor changes

- **Logo**: Gelasio serif (was Playfair Display)
- **User schema**: Added `timezone` and `lastSeenAt` fields
- **Styling**: Redesigned with CSS variables (consistent with v2.0.0 palette)
- **Routing**: File-based (SvelteKit) vs. Vue Router config

### Unchanged

- **Backend**: Fastify + PostgreSQL (stable)
- **Real-time**: Socket.IO (same events, same structure)
- **Features**: Chat, messages, user management
- **Visual identity**: Dark theme, periwinkle accent, Ubuntu/JetBrains Mono fonts

## Blockers to testing

### 1. ALTCHA Endpoint Missing
**Impact**: Can't test registration without a CAPTCHA token  
**Fix**: Codex implements `POST /api/v1/altcha`  
**Workaround**: Placeholder token (`'PENDING_BACKEND_IMPLEMENTATION'`) allows code testing  
**Scope**: High (required for real registration)

### 2. Error Messages Are Unreadable
**Impact**: Can't understand why operations fail during emulator testing  
**Fix**: Codex standardizes error responses to `{ error: "string" }` format  
**Workaround**: Check browser dev tools / backend logs  
**Scope**: High (blocks meaningful testing)

### 3. inviteCode Still Required
**Impact**: None currently (placeholder works)  
**Fix**: Codex removes inviteCode validation from registration  
**Scope**: Low (non-blocking, can be done post-testing)

## File structure (PWA)

```
THE PENTHOUSE OPTIMIZED/
├── apps/web/                 ← SvelteKit PWA (CLAUDE owns)
│   ├── src/routes/           ← File-based routing
│   │   ├── auth/+page.svelte
│   │   ├── users/
│   │   │   ├── +page.svelte  ← Directory + search
│   │   │   └── [id]/+page.svelte ← Profile view/edit
│   │   └── +page.svelte      ← Chat list (home)
│   ├── src/lib/
│   │   ├── services/api.ts   ← REST client
│   │   └── stores/           ← Nanostores (session, socket, chats)
│   └── .env                  ← API URLs, ALTCHA endpoint URL
├── packages/contracts/       ← Shared Zod schemas (both own)
│   └── src/api.ts           ← RegisterRequest, User schemas, etc.
├── services/api/            ← Fastify backend (CODEX owns, unchanged)
└── docs/obsidian/           ← This knowledge vault
    ├── 00 - Knowledge Hub   ← Original v2.0.0 rebuild docs
    ├── 15 - PWA Migration
    ├── 16 - PWA Architecture
    └── 17 - Tier 1 Implementation
```

## Handoff summary

### Codex needs to implement (blocking)

1. **`POST /api/v1/altcha`**
   - Generates ALTCHA challenges
   - Returns: `{ algorithm, challenge, salt, signature }`
   - Spec in `packages/contracts/src/api.ts` (~line 109)

2. **Error response standardization**
   - All endpoints return `{ error: "readable string" }`
   - No nested objects, no `[object Object]`
   - Detailed spec in `docs/codex-prompts/ERROR_RESPONSE_STANDARDIZATION.md`

### Claude needs to do (after blockers clear)

1. Android emulator testing of:
   - User directory load + search
   - Profile view + edit
   - Real ALTCHA flow
   - Error messages (once backend fixed)
   - Socket reconnection
   - Offline support

2. Collect feedback and polish Tier 1

3. Plan Tier 2 (typing, read receipts, pinning)

## Decision log: why PWA

### Problem with Capacitor (v2.0.0)
- Slow CI/CD (Google Play review, signing, versioning)
- Heavy tooling (Android Studio, emulator, native build chain)
- Large app size (10MB, drains battery, uses phone storage)
- Manual update process (user has to download from Play Store)

### Solution: PWA
- Web-based deployment (seconds, no review)
- Same tooling as web (npm, TypeScript, Vite)
- Tiny footprint (200KB, auto-caches)
- Automatic updates (service worker in background)
- Works offline (service worker caching strategy)
- Installable (user clicks "Add to Home Screen")

### Why SvelteKit specifically
- **Purpose-built for PWA** (not an afterthought like Vue)
- **File-based routing** (simpler than configuring routes)
- **Svelte 5 runes** (reactive by default, less boilerplate)
- **Smaller bundle** (SvelteKit compiles away unused code)
- **Great TypeScript support** (strict by default)

## Architecture at a glance

```
┌────────────────────────────┐
│  Browser (PWA)             │  ← User installs from home screen
│  ├─ SvelteKit app          │     Auto-updates in background
│  ├─ Service Worker         │     Works offline
│  └─ Nanostores (state)     │
├────────────────────────────┤
│  Socket.IO                 │  ← Real-time connection
│  Real-time events:         │     message.new, presence, typing
├────────────────────────────┤
│  HTTP (fetch)              │  ← REST API calls
│  Auth (JWT)                │     Login, user directory, profiles
├────────────────────────────┤
│  Contracts (@penthouse)    │  ← Request/response Zod schemas
├────────────────────────────┤
       INTERNET
├────────────────────────────┤
│  Fastify Backend (unchanged) │ ← Stable from v2.0.0
│  ├─ PostgreSQL              │    No changes needed for PWA
│  ├─ Socket.IO Server        │
│  └─ All routes (auth, users, chats, media, admin)
└────────────────────────────┘
```

## Testing checklist

When you're ready to emulator test:

- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Tests pass (`npm run test`)
- [ ] Dev server runs (`npm run dev`)
- [ ] Can login with test account
- [ ] User directory loads
- [ ] User search works
- [ ] Profile view works
- [ ] Profile edit works (own profile)
- [ ] Online status displays correctly
- [ ] Socket connects (check dev tools)
- [ ] ALTCHA widget shows (once endpoint exists)
- [ ] Registration works with real captcha (once endpoint exists)
- [ ] Error messages are readable (once backend fixed)

## References

**Implementation details:**
- [[15 - PWA Migration (SvelteKit)]] – What changed, schema diffs, breaking changes
- [[16 - PWA Architecture in Plain English]] – How everything works
- [[17 - Tier 1 User Management Implementation]] – What's built, what's pending, how to test

**Backend (unchanged, for reference):**
- [[../00 - Knowledge Hub]] – Original rebuild docs
- [[../07 - User Management Basics]] – User features (backend perspective)

**Project root:**
- `CLAUDE.md` – Project constitution, agent delegation, MVP scope
- `packages/contracts/CLAUDE.md` – Contract ownership rules
- `apps/web/CLAUDE.md` – Frontend ownership rules
- `services/api/CLAUDE.md` – Backend ownership rules

## Status updates

**2026-04-05**: Initial PWA migration complete
- Tier 1 user management implemented
- All TypeScript types and tests passing
- Two backend blockers identified
- Knowledge vault created
