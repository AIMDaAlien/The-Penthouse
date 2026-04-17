# apps/web — SvelteKit PWA Frontend

## Owned by: Claude (Sonnet)
Codex may read this directory for context. Codex must NOT edit files here without a handoff note approved by the project owner.

---

## What this directory is
The SvelteKit PWA that users interact with directly.
Replaces the old `apps/mobile` (Vue + Capacitor). No native shell, no APK.
Users install via browser "Add to Home Screen" on Android.

---

## Stack
- SvelteKit 2.x with TypeScript
- `@vite-pwa/sveltekit` for service worker, manifest, offline support
- `socket.io-client` for real-time messaging
- Native `fetch` for REST calls (no axios)
- CSS: custom properties (design tokens), no UI framework (Tailwind, MUI, etc.)
- `@penthouse/contracts` for all request/response types

---

## Directory structure (target)
```
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/     ← Reusable UI components (.svelte)
│   │   ├── stores/         ← Svelte stores (session, socket, chat state)
│   │   ├── services/       ← API client functions (REST + socket)
│   │   └── types.ts        ← App-level types (extends contracts)
│   ├── routes/             ← SvelteKit file-based routing
│   │   ├── +layout.svelte  ← Root layout (auth guard, socket init)
│   │   ├── +page.svelte    ← Chat list (home)
│   │   ├── chat/[id]/      ← Message thread
│   │   └── auth/           ← Login / Register pages
│   ├── service-worker.ts   ← PWA service worker
│   └── app.html            ← HTML shell
├── static/
│   └── icons/              ← PWA icons (192px, 512px, maskable)
├── package.json
├── svelte.config.js
└── vite.config.ts
```

---

## Design principles
- Mobile-first layout (primary target: Android Chrome)
- Dark theme as default, consistent with The Penthouse visual identity
- CSS custom properties for all colors, spacing, and typography — no hardcoded values
- Smooth but not gratuitous animations (respect `prefers-reduced-motion`)
- No external UI frameworks — keep the bundle small and the look distinctive

---

## Socket.IO usage
- One socket instance, initialized in a Svelte store (`stores/socket.ts`)
- Socket connects on successful login, disconnects on logout
- Events mirror the existing backend: `message.new`, `message.ack`, `chat.updated`, `typing`, `presence`
- All socket event types are imported from `@penthouse/contracts` (events.ts)

---

## API calls
- Base URL read from `PUBLIC_API_URL` environment variable
- All REST calls go through a thin wrapper in `services/api.ts`
- Request/response types imported from `@penthouse/contracts`
- Auth token stored in memory (not localStorage) — refreshed via httpOnly cookie flow

---

## What this directory does NOT do
- No Fastify routes, no SQL, no migrations
- No Docker or infra configuration
- No FCM / Firebase — push notifications are post-MVP
- No native Android/iOS build tooling (no Capacitor)

---

## Environment variables (prefix: PUBLIC_ for client-exposed)
```
PUBLIC_API_URL=https://api.penthouse.blog   # or http://localhost:3000 for dev
PUBLIC_SOCKET_URL=https://api.penthouse.blog
```

---

## Testing
- Unit tests: Vitest
- Component tests: `@testing-library/svelte`
- Test files live alongside components (`Component.test.ts`)

---

## Definition of done (frontend tasks)
1. Component renders without console errors
2. TypeScript compiles clean
3. Works on a real Android Chrome browser (or emulated 375px mobile viewport)
4. No files outside `apps/web/` were touched (unless a contract change was needed — document it)
