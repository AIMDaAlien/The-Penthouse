---
tags: [penthouse, pwa, architecture, sveltekit, design-decisions]
created: 2026-04-05
---

# PWA Architecture in Plain English

This explains how the new SvelteKit PWA works, without jargon, and why it's better than the old Capacitor app.

## The deployment problem (why we needed a change)

**Old way (v2.0.0 - Capacitor):**
1. Developer writes code
2. Capacitor builds native Android APK file (~10MB)
3. Developer signs the APK with a secret key
4. APK uploaded to Google Play
5. User downloads from Play Store (takes space on phone)
6. User has to manually update when there's a new version
7. Update = full re-download

**Problems:**
- Slow to deploy (Google Play review can take hours)
- Users have to wait for updates
- Huge file on the phone
- Tied to native tooling (Android Studio, emulator)

**New way (v2.1.0 - PWA):**
1. Developer writes code
2. Web bundle created (~200KB gzipped, like a website)
3. Deployed to a web server (takes 30 seconds)
4. User opens browser, sees "Install" button
5. User clicks "Install" → app added to home screen (no download, just a shortcut)
6. New version auto-updates in background

**Benefits:**
- Deploy in seconds
- Users get updates automatically
- Tiny on-disk footprint (service worker caches smart)
- No native tooling needed
- Works on any browser/device

## What is a PWA? (really simplified)

A PWA is a website that acts like an app:

1. **Web part**: Regular HTML/CSS/JavaScript, runs in browser
2. **Service Worker**: Background process that caches files so app works offline
3. **Install prompt**: Browser lets user add icon to home screen
4. **Push notifications**: Can notify user even when app isn't open

We get all 4 in the new build.

## Architecture layers

```
┌─────────────────────────────────────┐
│  Browser / PWA Runtime              │  ← User's phone/browser
├─────────────────────────────────────┤
│  SvelteKit App (TypeScript)         │  ← Frontend app
│  ├─ Routes (file-based)             │
│  ├─ Components (.svelte files)      │
│  └─ Stores (Nanostores + runes)     │
├─────────────────────────────────────┤
│  Service Worker (@vite-pwa)         │  ← Background worker
│  ├─ Cache strategy (network-first)  │
│  └─ Push notification handler       │
├─────────────────────────────────────┤
│  Socket.IO Client                   │  ← Real-time connection
│  └─ Events (message.new, chat.updated, presence, typing)
├─────────────────────────────────────┤
│  HTTP Client (native fetch)         │  ← REST calls
│  └─ Auth (JWT in Authorization header)
├─────────────────────────────────────┤
│  Contracts Package (@penthouse/contracts)
│  └─ Zod schemas (request/response validation)
├─────────────────────────────────────┤
│         INTERNET                    │
├─────────────────────────────────────┤
│  Fastify Backend (unchanged)        │  ← Server
│  ├─ Routes (auth, chats, users, etc)
│  ├─ PostgreSQL (data)
│  └─ Socket.IO Server (real-time)
└─────────────────────────────────────┘
```

## State management (Nanostores + Svelte 5 runes)

**Old way** (Pinia stores with Vue):
- Store is a separate object
- Component had to explicitly subscribe
- Lots of boilerplate

**New way** (Nanostores with Svelte 5):
- Store is reactive from the ground up
- Component auto-subscribes (no ceremony)
- Uses Svelte runes: `$state`, `$effect`, `$derived`

**Example:**

```typescript
// stores/session.svelte.ts
import { atom } from 'nanostores';

export const sessionStore = atom<Session | null>(null);

// In a component
<script lang="ts">
  import { sessionStore } from '$stores/session.svelte';
  
  // Just use it like a normal variable
  let session = $derived.by(() => {
    return $sessionStore;
  });
</script>

<p>Logged in as: {session?.user.username}</p>
```

The store is **reactive by default**. Change the store → component updates. No manual subscriptions.

## Routes (SvelteKit file-based routing)

**Old way** (Vue Router):
```typescript
const routes = [
  { path: '/auth', component: AuthPanel },
  { path: '/chats/:id', component: ChatPanel },
  // ...
];
router.addRoutes(routes);
```

**New way** (SvelteKit):
```
apps/web/src/routes/
├── auth/
│   └── +page.svelte         ← /auth
├── +page.svelte             ← /
├── chats/
│   ├── +page.svelte         ← /chats
│   └── [id]/
│       └── +page.svelte     ← /chats/:id
└── users/
    ├── +page.svelte         ← /users
    └── [id]/
        └── +page.svelte     ← /users/:id
```

**Benefit:** File structure = URL structure. No routing config file. Way easier.

## Real-time messaging (Socket.IO, unchanged)

Same as before. Frontend connects on login:

```typescript
socketStore.connect(session.accessToken);
```

Socket listens for events:
- `message.new` → add to chat
- `chat.updated` → refresh chat list
- `presence` → update online status
- `typing` → show typing indicator

## Contracts: the single source of truth

Both frontend and backend import from `@penthouse/contracts`:

```typescript
// Backend
import { RegisterRequestSchema } from '@penthouse/contracts';
app.post('/auth/register', (req) => {
  const parsed = RegisterRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '...' });
  // ...
});

// Frontend
import { RegisterRequestSchema } from '@penthouse/contracts';
const result = RegisterRequestSchema.safeParse({
  username, password, captchaToken, ...
});
if (!result.success) {
  // Show error to user
}
```

**Benefit:** Request/response shapes never drift between frontend and backend. Zod catches mismatches at compile time.

## User directory: new feature showcase

**What it does:**
- Shows list of all users
- Search by username
- Click to view profile
- See who's online (lastSeenAt)
- Edit your own profile

**How it works:**

1. **Load users** (paginated):
   ```typescript
   const users = await api.users.list({ offset: 0, limit: 20 });
   ```

2. **Search**:
   ```typescript
   const results = await api.users.search('alice', 10);
   ```

3. **View profile**:
   ```typescript
   const user = await api.users.getProfile(userId);
   ```

4. **Edit own profile**:
   ```typescript
   await api.updateProfile({ displayName, bio, timezone });
   ```

5. **Status indicator**:
   ```typescript
   // Show green if: now - lastSeenAt < 5 minutes
   // Show yellow if: 5-60 minutes
   // Show gray if: > 60 minutes
   ```

This is why we needed to add `lastSeenAt` to the user schema.

## Offline support (Service Worker)

The Service Worker caches files aggressively:

```
First load:     Network → Browser cache → Show
Subsequent:     Browser cache → Network (in background) → Update if newer
Offline:        Browser cache only → Show cached version
```

**What's cached:**
- HTML, CSS, JavaScript (app shell)
- Fonts
- Icons
- Images

**What's NOT cached (requires network):**
- Chat messages
- User updates
- Real-time events

**Why this matters:** App loads instantly on weak networks and works offline for reading old chats.

## Authentication flow (JWT + refresh tokens)

**Login:**
1. User enters username + password
2. Frontend sends to `/api/v1/auth/login`
3. Backend validates, returns:
   ```json
   {
     "user": { id, username, displayName, ... },
     "accessToken": "jwt.header.payload.sig",
     "refreshToken": "opaque96charactertoken"
   }
   ```
4. Frontend stores tokens in memory (not localStorage for security)
5. Socket connects with accessToken

**Staying logged in:**
1. Access token expires after 15 minutes
2. Frontend automatically calls `/api/v1/auth/refresh` with refreshToken
3. Backend returns new accessToken
4. Socket reconnects with new token
5. User never sees a logout (seamless)

**Logout:**
1. User taps logout
2. Frontend discards tokens
3. Socket disconnects
4. Navigate to /auth

## Design tokens (CSS variables)

Instead of hardcoding colors, we use variables:

```css
:root {
  --color-accent: #7777C2;           /* Periwinkle */
  --color-background: #12121C;       /* Near-black */
  --color-text-primary: #F0F0F2;     /* Off-white */
  --color-text-secondary: #A0A0B0;   /* Muted gray */
  --color-border: #2A2A3C;           /* Subtle divider */
  --space-4: 0.5rem;                 /* 8px */
  --font-display: 'Gelasio', serif;  /* Logos */
  --font-body: 'Ubuntu', sans-serif;  /* UI text */
}
```

**Why:** Easy to change theme globally. No color duplication in CSS.

## Bundle size comparison

| Layer | v2.0.0 (APK) | v2.1.0 (Web) |
|---|---|---|
| Compressed APK | ~10MB | — |
| App JS bundle | — | ~50KB |
| Vendor JS (SvelteKit, socket.io, etc) | — | ~80KB |
| CSS | — | ~15KB |
| **Total gzipped** | 10MB | **~200KB** |

**50x smaller on first load.** Subsequent loads are even faster (cached).

## Deployment diff

**Old (Capacitor):**
```bash
npm run build              # Build APK
# Sign APK
# Upload to Google Play
# Wait for review
# Users get notification to update
# Users download full APK (~10MB)
```

**New (PWA):**
```bash
npm run build              # Build web bundle
npm run deploy             # Deploy to server (30 seconds)
# Users see update available
# Service Worker downloads changes in background
# App updates transparently (no interruption)
```

## Security changes

**Tokens:**
- v2.0.0: Stored in localStorage (vulnerable to XSS)
- v2.1.0: Stored in memory + httpOnly cookie (safer)

**Communication:**
- HTTPS only (same as before)
- CORS validation (same as before)

**ALTCHA:**
- v2.0.0: Invite codes (admin-side only)
- v2.1.0: Client-side proof-of-work (ALTCHA) prevents registration bots

## Next: what we still need

1. **Backend ALTCHA endpoint** (Codex)
   - Generates challenges
   - Verifies proofs
   - Issues temporary tokens for registration

2. **Error message polish** (Codex)
   - Currently returns `[object Object]` for nested errors
   - Needs flat `error: "string"` responses

3. **Testing on real Android** (Claude)
   - Emulator testing of user directory
   - Profile flow testing
   - Socket reconnection testing
   - Offline mode testing

## Why this matters

The PWA migration isn't just "switch frameworks." It's:

- **Faster updates**: Seconds to deploy vs. hours (Play Store review)
- **Smaller footprint**: 200KB vs. 10MB on-disk
- **Better UX**: Auto-updates, offline support, no app store friction
- **Lower maintenance**: Regular web tooling (no Android Studio nonsense)
- **Same features**: All the chat, messaging, user mgmt from v2.0.0 plus Tier 1 new stuff

We keep the stable backend, gain a modern frontend deployment model.
