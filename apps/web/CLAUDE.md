# apps/web — SvelteKit PWA Frontend

## Owned by: Claude (Sonnet)
Codex may read this directory for context. Codex must NOT edit files here without a handoff note approved by the project owner.

---

## What this directory is
The SvelteKit PWA that users interact with directly. Installed via browser "Add to Home Screen" on Android. No native shell, no APK, no Capacitor.

---

## Stack
- SvelteKit 2.x with TypeScript, Svelte 5 runes (`$state`, `$derived`, `$effect`)
- `@vite-pwa/sveltekit` — service worker, manifest, offline support
- `socket.io-client` — real-time messaging
- Native `fetch` — REST calls (no axios)
- CSS custom properties — design tokens, no UI framework (no Tailwind, MUI, etc.)
- `@penthouse/contracts` — all request/response/event types

---

## Directory structure

```
apps/web/src/
├── lib/
│   ├── components/         ← Reusable UI components
│   │   ├── Avatar.svelte
│   │   ├── Icon.svelte     ← SVG icon system (Lucide-style, stroke-based)
│   │   ├── MediaBubble.svelte
│   │   ├── MediaComposer.svelte
│   │   ├── MediaComposer.utils.ts
│   │   ├── ReadReceipts.svelte
│   │   ├── TypingIndicator.svelte
│   │   └── ...
│   ├── stores/
│   │   ├── session.svelte.ts    ← Auth state + access token
│   │   ├── socket.svelte.ts     ← Socket.IO singleton
│   │   └── readReceipts.svelte.ts ← Per-message read receipt state
│   └── services/
│       └── api.ts              ← REST API client (thin fetch wrapper)
├── routes/
│   ├── +layout.svelte          ← Auth guard, socket init, global listeners
│   ├── +page.svelte            ← Chat list (home)
│   ├── chat/[id]/+page.svelte  ← Message thread (primary feature surface)
│   └── auth/                   ← Login / Register pages
├── service-worker.ts
└── app.html
```

---

## Design principles
- Mobile-first (primary target: Android Chrome, 375px viewport)
- Dark theme by default — consistent with The Penthouse visual identity
- CSS custom properties for all colors, spacing, typography — no hardcoded values
- Smooth but not gratuitous animations — respect `prefers-reduced-motion`
- No external UI frameworks — keep the bundle lean and the look distinctive
- SVG icons only via `<Icon name="..." />` — never emoji as icon substitutes

---

## Socket.IO events

| Event (in) | Handler location | Purpose |
|---|---|---|
| `message.new` | `chat/[id]/+page.svelte` | New message received |
| `message.ack` | `chat/[id]/+page.svelte` | Server confirms delivery + deliveredAt |
| `message.read` | `+layout.svelte` → `readReceiptsStore` | Recipient read a message |
| `typing.update` | `chat/[id]/+page.svelte` | Who is currently typing |
| `chat.updated` | `+layout.svelte` | Chat metadata changed |
| `presence.update` | `chat/[id]/+page.svelte` | User came online/offline |
| `presence.sync` | `chat/[id]/+page.svelte` | Full presence snapshot on join |

| Event (out) | Emitted from | Purpose |
|---|---|---|
| `typing.start` | `chat/[id]/+page.svelte` | User started typing |
| `typing.stop` | `chat/[id]/+page.svelte` | User stopped typing |

---

## API calls
- Base URL: `PUBLIC_API_URL` env var
- All calls go through `services/api.ts`
- Auth token in memory (not localStorage) — refreshed via httpOnly cookie flow

---

## Environment variables
```
PUBLIC_API_URL=https://api.penthouse.blog   # http://localhost:3000 for dev
PUBLIC_SOCKET_URL=https://api.penthouse.blog
```

---

## What this directory does NOT do
- No Fastify routes, SQL, or migrations
- No Docker or infra config
- No FCM / Firebase (push notifications are post-alpha)
- No native Android/iOS build tooling

---

## Testing
- Unit tests: Vitest (pure functions, no jsdom required)
- Test files: alongside source (`Component.test.ts`, `module.utils.test.ts`)
- Run: `npm run test`

---

## Definition of done (frontend tasks)
1. Renders without console errors
2. TypeScript compiles clean (`npm run typecheck`)
3. Works at 375px mobile viewport (Android Chrome target)
4. No files outside `apps/web/` modified (unless a contract change — document it)
