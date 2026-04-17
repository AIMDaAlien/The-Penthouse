---
tags: [penthouse, pwa, sveltekit, migration, ui-framework]
created: 2026-04-05
---

# PWA Migration: Vue+Capacitor → SvelteKit

## Why migrate

The Vue+Capacitor native app (`v2.0.0-alpha`) was proving maintenance-heavy:
- Native Android tooling (Capacitor, Android Studio) required for every change
- Build pipeline complexity (native APK signing, versioning, Google Play uploads)
- Tight coupling between UI and native capabilities
- Limited to native Android/iOS distribution

**PWA strategy** solves this:
- Runs in the browser; users "Install" via "Add to Home Screen"
- No native tooling required; just deploy new code
- Same codebase works on all modern browsers and OSes
- Easier to maintain, deploy, and version (regular web CI/CD)
- Service Worker provides offline support and fast load on weak networks

## What changed: framework layer

| Layer | v2.0.0-alpha (Capacitor) | v2.1.0-alpha (PWA) |
|---|---|---|
| **Framework** | Vue 3 + Vite | **SvelteKit 2.x** |
| **Bundle** | Native APK (~10MB) | Web bundle (~200KB gzipped) |
| **Routing** | Vue Router | **SvelteKit file-based** |
| **State** | Pinia | **Nanostores + Svelte 5 runes** |
| **HTTP** | axios | **Native fetch** |
| **Realtime** | socket.io-client (same) | socket.io-client (same) |
| **UI Styling** | Custom CSS (dark theme) | **Custom CSS (redesigned)** |
| **PWA support** | Partial (Capacitor) | **@vite-pwa/sveltekit (full)** |
| **Offline** | Limited | **Service Worker (modern)** |

## What stayed the same

- **Backend**: Fastify + PostgreSQL (unchanged)
- **Contract schemas**: `@penthouse/contracts` (unchanged)
- **Socket.IO events**: Same real-time structure
- **Architecture**: Chat/message/user/presence models identical
- **Visual identity**: Same color palette, fonts, logo, layout

## Current branch status

- Branch: `pwa`
- Version: `v2.1.0-alpha.0`
- Focus: **Tier 1 – User Management & Search**

### Tier 1 (current)
- ✅ Login / Register / Logout
- ✅ User directory (search + pagination)
- ✅ User profiles (view + edit)
- ✅ Display name, avatar, bio, timezone
- ✅ Online/offline status (lastSeenAt)
- 🔄 ALTCHA captcha (widget ready, backend endpoint pending from Codex)

### Tier 2 (planned, unblocked)
- Typing indicators
- Read receipts per-user
- Message pinning
- Chat muting preferences

### Tier 3 (post-MVP)
- GIF picker (Giphy/Klipy)
- Custom stickers
- Emoji reactions

## Key files migrated

### Frontend structure
```
apps/web/
├── src/routes/
│   ├── auth/+page.svelte         ← Login + Register (new Gelasio logo)
│   ├── +page.svelte              ← Chat list (home)
│   ├── users/+page.svelte        ← User directory + search
│   ├── users/[id]/+page.svelte   ← User profile (view/edit)
│   └── +layout.svelte            ← Root layout (auth guard, socket init)
├── src/lib/
│   ├── services/api.ts           ← REST client (fetch-based)
│   ├── stores/                   ← Nanostores (session, socket, chats)
│   └── components/               ← Reusable UI components
```

### Contracts (shared schemas)
```
packages/contracts/src/
├── api.ts                         ← Request/response Zod schemas
│   ├── RegisterRequestSchema      ← captchaToken (not inviteCode)
│   ├── UserSearchRequestSchema    ← New
│   ├── ListUsersRequestSchema     ← New
│   ├── MemberDetailSchema         ← Added: timezone, lastSeenAt
└── events.ts                      ← Socket.IO events (unchanged)
```

## Breaking changes from v2.0.0

### Registration (inviteCode → captchaToken)
**Before:**
```json
POST /api/v1/auth/register
{
  "username": "alice",
  "password": "secret123",
  "inviteCode": "PENTHOUSE-ALPHA",
  "acceptTestNotice": true
}
```

**After:**
```json
POST /api/v1/auth/register
{
  "username": "alice",
  "password": "secret123",
  "captchaToken": "...",  // ALTCHA proof-of-work token
  "inviteCode": "PLACEHOLDER",  // Temporary until Codex removes
  "acceptTestNotice": true
}
```

**Why:** ALTCHA provides self-hosted bot protection; invite codes are now admin-side (backend-only).

### User schema additions
New optional fields in `MemberDetailSchema`:
- `timezone` (string, max 50 chars) — user's registered timezone
- `lastSeenAt` (ISO 8601 timestamp, optional) — when user was last active

Used for:
- Online/offline status display in user directory
- Timezone info on profile cards

### Auth response no longer includes inviteCode
Frontend doesn't consume invite codes. Admin manage them backend-only.

## Visual changes from v2.0.0

### Logo redesign
- **Font**: Gelasio (serif, elegant, refined) at 600 weight
- **Color**: "The" is accent (periwinkle #7777C2), "PENT HOUSE" is white
- **Style**: Refined serif for brand luxury feel

**Old:** Playfair Display (too traditional)  
**New:** Gelasio 600 (elegant balance)

### Auth form
- Removed invite code field
- Added ALTCHA widget (pending backend)
- Same dark theme, glassmorphic card design

### User directory
- Card-based grid layout
- Online/offline status badges (green=online, yellow=away, gray=offline)
- Search by username
- Pagination (20 users per page)
- Click to view profile

### Profile card
- Avatar with initials fallback
- Display name, username, bio, timezone
- "Last seen" indicator
- Edit mode for own profile

## Handoff points to Codex

### 1. Error Response Standardization (BLOCKING)
**Status**: Documented in `docs/codex-prompts/ERROR_RESPONSE_STANDARDIZATION.md`

Frontend receives `[object Object]` errors when backend returns nested error objects.
**Needs**: All error responses must return flat `error` string fields.

### 2. ALTCHA Challenge Endpoint (BLOCKING)
**Status**: Documented in `packages/contracts/src/api.ts` (line ~108)

Frontend widget is ready but backend endpoint missing.
**Needs**: `POST /api/v1/altcha` that returns ALTCHA challenge for proof-of-work.

### 3. Remove inviteCode from registration (NON-BLOCKING)
**Status**: Temporary placeholder in use

Frontend is ready to remove inviteCode once backend no longer validates it.
**Needs**: Update `services/api/src/routes/auth.ts` to accept registration without inviteCode.

## Testing checklist

- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Tests pass (`npm run test`)
- [ ] Login flow works in browser dev server (`npm run dev`)
- [ ] Register form shows ALTCHA widget (once backend endpoint exists)
- [ ] User directory loads and searches
- [ ] Profile view and edit modes work
- [ ] Online/offline status displays correctly
- [ ] PWA install prompt appears on Android
- [ ] App works offline (service worker cached)
- [ ] Socket.IO reconnects properly

## Next steps

1. **Codex**: Implement `POST /api/v1/altcha` endpoint
2. **Codex**: Standardize error responses to flat `error` string fields
3. **Claude**: Android emulator testing of user management flows
4. **Claude**: Polish Tier 1 based on testing feedback
5. **Codex**: Implement Tier 2 features (typing, read receipts, pinning)
