# Architecture Modularity Discussion — The Penthouse v4+

**Date:** 2026-05-08
**Context:** Operator wants modularity, local-first sync, extensibility, embeds, rich micro-interactions, and in-app search. Operator is not a dev and needs clarity on scope.

---

## Executive Summary (Lead With The Answer)

**You are right: keep everything modular.** But "local-first sync on day one" is a rewrite, not a feature. It changes every file in the codebase. Here's the pragmatic path:

1. **Phase 1–3:** Ship your selected features on the existing server-authoritative stack. Add a **local SQLite cache** (not full CRDT sync) for offline reads + fast search.
2. **Phase 4:** Build the **embed system** (YouTube/IG/TikTok) — it's self-contained.
3. **Phase 5:** Build the **micro-interaction system** — also self-contained, toggleable per-feature.
4. **Post-v1:** Evaluate full local-first + plugin system based on real user load.

This gives you every feature you want without a 3-month rewrite. The modular architecture below lets you swap in local-first later without throwing away code.

---

## The Problem You're Facing

A messaging app has ~8 subsystems that all touch each other:

```
Auth ──┬── Realtime (Socket.IO)
       ├── DB (Postgres)
       ├── Push (Web Push)
       ├── Media (upload/serve)
       ├── Search (FTS)
       └── Presence

Frontend ──┬── Message renderer
           ├── Composer
           ├── Chat list
           ├── Settings
           └── Service worker
```

When everything is spaghetti, one bug in media upload breaks push notifications. Modularity means each subsystem has a **contract** — it promises "I take X, I return Y" — and other subsystems don't care how it works inside.

---

## Recommended Architecture: The Module Contract System

Instead of rewriting for local-first now, we enforce modularity through **feature modules**.

### Core Principle

Every feature = a folder with 4 files:

```
services/api/src/features/pins/
├── schema.ts          # Drizzle table(s) — ONLY this feature's tables
├── routes.ts          # Fastify routes — ONLY this feature's HTTP surface
├── socket.ts          # Socket.IO handlers — ONLY this feature's realtime events
└── index.ts           # Exports: registerPinsFeature(fastify, io)

apps/web/src/features/pins/
├── api.ts             # Frontend API calls
├── store.svelte.ts    # Svelte runes store
├── components/
│   ├── PinBanner.svelte
│   └── PinButton.svelte
└── index.ts           # Exports: registerPinsFeature()
```

**Rule:** A feature module CANNOT import from another feature module. It CAN import from `core/` (shared utilities, DB connection, auth middleware).

### The `core/` Layer (Shared Infrastructure)

```
services/api/src/core/
├── db.ts              # Drizzle client singleton
├── auth.ts            # JWT verify, requireAdmin
├── socket.ts          # Socket.IO server singleton
├── push.ts            # Web Push dispatcher
├── media.ts           # Upload/serve helpers
└── errors.ts          # AppError class, error codes

apps/web/src/core/
├── api.ts             # Fetch wrapper with auto-refresh
├── socket.svelte.ts   # Socket.IO client singleton
├── session.svelte.ts  # Auth session store
└── media.ts           # Upload helper
```

**Diagnostic win:** If pins break, you only look in `features/pins/`. If the whole app breaks, you look in `core/`.

### The Contract Layer (`packages/contracts/`)

Already exists. Every module's HTTP body, socket payload, and DB shape is a Zod schema here. **This is your stability layer.**

```
packages/contracts/src/
├── features/
│   ├── pins.ts
│   ├── reactions.ts
│   ├── voice.ts
│   └── embeds.ts
└── core/
    ├── auth.ts
    ├── messages.ts
    └── events.ts
```

---

## Local-First Sync: The Real Talk

### What "Local-First" Actually Means

| Approach | What It Does | Effort | Risk |
|---|---|---|---|
| **A. Server cache** (what v4 does now) | Client stores messages in memory + localStorage. Server is truth. Offline = read cached, queue sends. | None | Low |
| **B. Local SQLite cache** | Client stores messages in IndexedDB/SQLite. Server is still truth. Offline = read local, sync on reconnect. | 2–3 weeks | Medium |
| **C. Full local-first (CRDT)** | Client is truth. Server is relay/backup. Conflicts resolved client-side. | 3–6 months | High |

### What the Research Says

The 04-technical research pushes hard for **C** (CRDT). Linear, Figma, Notion use it. But those are **document editors** where users type in one doc for hours. Messaging is different:

- Messages are **append-only** (no edits to old rows)
- Conflicts are rare (two people don't edit the same message)
- The hard problem in messaging is **delivery ordering**, not conflict resolution

**Verdict:** For a messaging app, **B (local SQLite cache)** gets you 90% of the benefit with 10% of the effort. Full CRDT is overkill until you have 10K+ daily active users.

### What B Gives You

- Offline message history browsing
- Instant search (client-side FTS)
- Faster cold start (no server round-trip for recent messages)
- Easier diagnostics (client DB is queryable in DevTools)

### Implementation of B

```
apps/web/src/core/localDb.ts
  └── Uses sql.js (SQLite compiled to WASM) or IndexedDB + Dexie
  └── Sync protocol: "give me messages after timestamp X"
  └── On reconnect: pull delta, apply to local DB
```

This is additive. It doesn't replace the server. It sits **alongside** it.

---

## The Embed System (YouTube, Instagram, TikTok)

### What You're Asking For

When a user pastes a URL, the app renders the content inline without requiring the native app or browser switch.

### Architecture

```
packages/contracts/src/features/embeds.ts
  └── EmbedUrlSchema = z.union([
        z.object({ provider: 'youtube', videoId: z.string() }),
        z.object({ provider: 'instagram', postId: z.string() }),
        z.object({ provider: 'tiktok', videoId: z.string() }),
      ])

services/api/src/features/embeds/
  ├── routes.ts        # POST /api/v1/embeds/resolve — backend proxy
  └── index.ts

apps/web/src/features/embeds/
  ├── components/
  │   ├── YouTubeEmbed.svelte      # iframe lazy-loaded
  │   ├── InstagramEmbed.svelte    # oEmbed or iframe
  │   └── TikTokEmbed.svelte       # oEmbed or iframe
  └── index.ts
```

### The ToS Problem (Critical)

| Platform | Embedding Method | Legal Risk |
|---|---|---|
| **YouTube** | `youtube-nocookie.com` iframe | ✅ Official, safe |
| **Instagram** | Meta oEmbed API + iframe | ⚠️ Requires app review for some use cases |
| **TikTok** | TikTok oEmbed API + iframe | ⚠️ Requires API key, rate limits |
| **Direct scrape** (yt-dlp, etc.) | ❌ Violates ToS everywhere | 🔴 Account ban, legal risk |

**Recommendation:** Use official embed iframes only. No scraping. No proxying video streams. The backend's only job is URL parsing (extract video ID from URL). The frontend renders the iframe. This keeps you 100% compliant.

### Privacy Win

Using `youtube-nocookie.com` + loading iframes lazily (IntersectionObserver) means users don't get tracked by Google until they click play. This aligns with your privacy positioning.

---

## The "Search Engine" Concept

### What You Actually Want

> "User talked about hyacinths. I want to search that up without switching to browser."

This is **two different features** masquerading as one:

### Feature A: Message History Search (FTS)

Search YOUR conversations for "hyacinths."

- **With local SQLite cache:** Client-side FTS. Instant. Zero server load. Private.
- **Without local cache:** Server endpoint `GET /api/v1/search?q=hyacinths` using Postgres `tsvector`. Loads server per query.

**Recommendation:** Build client-side FTS via local SQLite. This is your "search engine." It handles hundreds of concurrent users because the work happens on their phones, not your server.

### Feature B: Web Search (External Results)

Search the web for "hyacinths" and show results in-app.

- **Option 1:** Embed DuckDuckGo Lite or Brave Search in a webview/iframe. Free. Privacy-respecting.
- **Option 2:** Use a search API (SerpAPI, Bing API). Costs money. Rate limits.
- **Option 3:** Don't build it. Open the user's default browser. One tap.

**Recommendation:** Option 1. Add a "Search Web" button in the composer that opens a lightweight webview with DuckDuckGo results. No API keys. No server load. The webview is sandboxed (no cookies shared with your app).

### The LLM Alternative

You mentioned not wanting LLMs because of cost. Here's the truth:

- **0.8B parameter model on server:** Requires GPU or fast CPU. At 100 concurrent users, you'd need a $200+/month server.
- **On-device LLM (WebNN / transformer.js):** Free. Runs on user's phone. But 0.8B models are dumb. They hallucinate. They answer slowly on mid-tier phones.
- **Client-side FTS + DuckDuckGo webview:** Solves the exact use case ("what are hyacinths?") without AI cost or hallucination.

**Verdict:** Skip LLM entirely. FTS + webview search is faster, cheaper, and more reliable.

---

## Micro-Interactions System

### Architecture for Modularity

```
apps/web/src/features/microInteractions/
├── registry.ts        # Keyword → action mapping
├── settings.svelte.ts # Per-feature toggle states
├── engine.ts          # IntersectionObserver + event listener dispatcher
└── effects/
    ├── keywordSounds.ts     # "bruh" → vine boom
    ├── typingTone.ts        # Emotional typing indicators
    ├── unreadBadgeMotion.ts # Gradient + pulse badges
    └── transitionAnimator.ts # Global transition presets
```

### How It Works

1. **Registry:** A map of `keyword → effect function`. Effects are pure functions that take a DOM element + context and return a cleanup function.
2. **Engine:** Watches the chat container. On new message: check registry for keyword matches. On intersection: trigger scroll-into-view effects.
3. **Settings:** Each effect has a toggle in Settings. Default = on. Stored in `localStorage`.

### Why This Is Modular

- Adding a new sound effect = add one entry to `registry.ts`. No other files touched.
- Removing a broken effect = delete one registry entry. No ripple effects.
- Testing = mock the engine, pass a fake message, assert the effect function was called.

### The "Bruh" Example

```typescript
// registry.ts
registerKeywordEffect({
  id: 'bruh-vine-boom',
  keywords: ['bruh', 'bruhhh'],
  trigger: 'message-received', // or 'message-visible'
  effect: async (ctx) => {
    if (!getSetting('soundEffectsEnabled')) return;
    if (ctx.isSenderMuted || ctx.isReceiverMuted) return;
    await playSound('/sfx/vine-boom.mp3', { volume: 0.4 });
  },
});
```

**Performance:** Audio files are cached by the service worker. First load = ~50KB. Subsequent plays = instant.

---

## Emotional Typing Indicators

### What the Research Says

03-delight research cites Epp et al. (77–88% accuracy classifying emotional states from typing rhythm). Implementation without ML:

```typescript
// Heuristic classifier (no model needed)
function classifyTypingTone(events: KeyEvent[]): TypingTone {
  const avgInterval = average(events.map(e => e.interval));
  const backspaceRate = events.filter(e => e.key === 'Backspace').length / events.length;
  const burstLength = longestConsecutiveFastTyping(events); // <100ms between keys

  if (backspaceRate > 0.3) return 'hesitant';
  if (avgInterval < 80 && burstLength > 10) return 'excited';
  if (avgInterval > 400) return 'contemplative';
  if (backspaceRate > 0.15 && avgInterval > 250) return 'careful';
  return 'neutral';
}
```

**Privacy:** Keystroke timing is captured client-side only. Never sent to server. The tone is sent as a metadata flag (`typingTone: 'excited'`) with the message or typing indicator.

---

## Updated Phase Plan (All Features)

### Phase 1 — Foundation (Week 1)
- Schema migrations: pins, folders, emotes, stickers, wallpapers, presence
- Modularize existing code into `core/` + `features/` structure
- Deep availability + dynamic notes + AFK
- Any-emoji reactions
- Markdown rendering
- Wallpapers
- Pinned messages

### Phase 2 — Content + Media (Week 2)
- Voice notes enhancement
- GIF integration
- Custom emotes + stickers

### Phase 3 — Organization (Weeks 3–4)
- Chat folders (DnD)
- Channels within groups

### Phase 4 — Embeds + Search (Weeks 5–6)
- Embed resolver (YouTube, IG, TikTok)
- Client-side SQLite cache (local DB)
- Message history FTS search
- Web search webview (DuckDuckGo)

### Phase 5 — Micro-Interactions (Weeks 7–8)
- Micro-interaction engine + registry
- Keyword sound effects
- Emotional typing indicators
- Unread badge motion/gradients
- Global transition/animation system

### Phase 6 — Voice + Polish (Weeks 9–11)
- WebRTC voice chats
- Bug fixes + performance
- Lighthouse/axe gates

### Phase 7 — Extensibility (Post-v1)
- Plugin API surface
- Developer documentation
- Local-first CRDT evaluation (only if user count justifies it)

---

## Diagnostic Benefits of This Architecture

| Problem | Before (monolith) | After (modular) |
|---|---|---|
| Pins don't work | Debug 2,287-line chat page | Check `features/pins/` only |
| Search is slow | Profile entire backend | Check `features/search/` + local DB |
| Sound effects broken | Guess which component | Check `features/microInteractions/effects/` |
| Embed doesn't load | Trace through media pipeline | Check `features/embeds/` only |
| Need to remove a feature | Delete scattered code across 10 files | Delete one `features/X/` folder |
| New dev onboarding | "Read the whole codebase" | "Read `core/`, then pick a feature" |

---

## Final Recommendation

1. **Don't do full local-first CRDT now.** It adds 3–6 months and doesn't improve UX at 20–200 users. Do local SQLite cache instead.
2. **Do enforce the module contract system now.** It costs 1–2 days of refactoring and pays dividends forever.
3. **Do use official embed iframes.** No scraping. No ToS risk.
4. **Do skip LLM entirely.** FTS + DuckDuckGo webview solves the use case better.
5. **Do build the micro-interaction engine as a registry.** It makes your app feel alive without coupling effects to components.

**The rebuild skill says I shouldn't start writing app code until you accept the plan.** This is that plan. Accept, revise, or reject — then we start Phase 1.
