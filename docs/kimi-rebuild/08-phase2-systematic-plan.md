# Phase 2 — Systematic Implementation Plan

**Date:** 2026-05-09
**Scope:** Voice notes, GIFs, custom emotes, stickers
**Rule:** 3-file limit per task. Central files (MessageBubble, MessageComposer) coordinated by orchestrator.

---

## Feature 1: Voice Notes Enhancement

### Current State
- `audio` message type exists and is accepted by backend
- `AudioRecorder.svelte` exists for recording
- No dedicated player UI — audio is rendered as a basic `<audio>` tag

### What We're Building
- `AudioPlayer.svelte` with:
  - Waveform visualization (CSS bars or canvas)
  - Play/pause button
  - Scrubber (seek bar)
  - Playback speed toggle (0.5x, 1x, 1.5x, 2x)
  - Duration display
  - Progress indicator

### Files
| Action | File | Type |
|--------|------|------|
| Create | `apps/web/src/lib/components/AudioPlayer.svelte` | New |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` | Existing |

### Backend Changes
- None. Reuses existing `audio` message type and media upload/serve.

### Notes
- Waveform can be generated client-side from audio buffer using Web Audio API
- Or use a simple CSS bar animation as placeholder (no heavy processing)

---

## Feature 2: GIF Integration

### Current State
- `gif` message type exists in schema and contracts
- `GifResultSchema`, `GifSearchResponseSchema` exist in contracts
- No backend integration, no frontend picker

### What We're Building
- **Backend proxy:** `GET /api/v1/gifs/search?q=...&limit=...`
  - Calls Tenor API (or Giphy) server-side to hide API key
  - Returns normalized `{ id, url, previewUrl, width, height }[]`
  - Caches results briefly (optional)
- **Frontend picker:** `GifPicker.svelte`
  - Search input with debounce
  - Grid of GIF previews
  - Click to send as `gif` message type
  - Lazy-load images
- **Composer integration:** GIF button in `MessageComposer`
- **Rendering:** GIF messages render as `<img>` with autoplay (Tenor/Giphy URLs)

### Files
| Action | File | Type |
|--------|------|------|
| Create | `services/api/src/features/gifs/routes.ts` | New |
| Create | `apps/web/src/lib/components/GifPicker.svelte` | New |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` | Existing |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` | Existing |
| Modify | `services/api/src/app.ts` | Existing |

### Dependencies
- Tenor API key (free tier: 1M requests/day, no key needed for v2 beta? Actually Tenor v2 requires key)
- Or Giphy API key (free tier: 100 requests/day for search — too low)
- **Recommendation:** Use Tenor v2. Register at https://tenor.googlev2.com/developers
- If no API key available, we can mock the endpoint for now

### Contract Changes
- Add `GifSearchRequestSchema` to contracts if not already present

---

## Feature 3: Custom Emotes

### Current State
- `customEmotes` table exists in schema
- No backend routes, no frontend upload/render

### What We're Building
- **Backend routes:**
  - `POST /api/v1/emotes` — upload emote (max 64x64, auto-resize)
  - `GET /api/v1/emotes` — list user's emotes
  - `DELETE /api/v1/emotes/:id` — delete emote
- **Frontend upload:**
  - Upload flow reusing existing media pipeline
  - Client-side resize to 48/64px using canvas before upload (or server-side with sharp)
  - Name validation (`:name:` format, alphanumeric only)
- **Frontend rendering:**
  - Inline `:emoteName:` replacement in `MarkdownText.svelte`
  - Emote picker in composer (small grid)
- **Storage:**
  - Uses existing `media_uploads` table via media pipeline
  - `customEmotes` table links `mediaUploadId` to emote name

### Files
| Action | File | Type |
|--------|------|------|
| Create | `services/api/src/features/customEmotes/routes.ts` | New |
| Create | `apps/web/src/lib/components/EmotePicker.svelte` | New |
| Create | `apps/web/src/lib/utils/emotes.ts` | New |
| Modify | `apps/web/src/lib/components/MarkdownText.svelte` | Existing |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` | Existing |
| Modify | `services/api/src/app.ts` | Existing |

### Resize Strategy
- **Option A (client-side):** Use HTML5 canvas to draw image at 64x64, export as PNG, upload. Zero server CPU.
- **Option B (server-side):** Use `sharp` npm package. Requires native dependency.
- **Recommendation:** Option A. Simpler, no native deps, works in PWA.

---

## Feature 4: Stickers

### Current State
- `stickerPacks` and `stickers` tables exist in schema
- No backend routes, no frontend picker/management

### What We're Building
- **Backend routes:**
  - `POST /api/v1/sticker-packs` — create pack
  - `GET /api/v1/sticker-packs` — list user's packs
  - `POST /api/v1/sticker-packs/:id/stickers` — add sticker to pack
  - `DELETE /api/v1/sticker-packs/:id/stickers/:stickerId` — remove sticker
- **Frontend pack management:**
  - Simple CRUD UI in settings or modal
  - Upload sticker (reuses media pipeline)
- **Frontend picker:**
  - `StickerPicker.svelte` — tabbed by pack, grid of stickers
  - Button in composer
- **Frontend rendering:**
  - `sticker` message type renders as `<img>`

### Files
| Action | File | Type |
|--------|------|------|
| Create | `services/api/src/features/customEmotes/routes.ts` | Extend |
| Create | `apps/web/src/lib/components/StickerPicker.svelte` | New |
| Create | `apps/web/src/lib/components/StickerPackManager.svelte` | New |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` | Existing |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` | Existing |
| Modify | `services/api/src/app.ts` | Existing |

### Note on File Overlap
`MessageComposer.svelte` and `MessageBubble.svelte` are touched by GIFs, emotes, and stickers. To respect the 3-file rule and avoid agent conflicts:

1. **Orchestrator (me) will handle composer/bubble integration** — add the buttons/renderers centrally
2. **Agents build new components** (GifPicker, EmotePicker, StickerPicker, AudioPlayer) in parallel
3. **Agents build backend routes** in parallel
4. **Orchestrator wires everything together** in a final integration task

---

## Parallel Execution Plan

### Wave 1 — Backend Routes (Parallel)
| Agent | Task | Files |
|-------|------|-------|
| A | GIF proxy route | `features/gifs/routes.ts` (new), `app.ts` (modify) |
| B | Custom emote routes | `features/customEmotes/routes.ts` (new), `app.ts` (modify) |
| C | Sticker pack routes | `features/customEmotes/routes.ts` (extend) |

### Wave 2 — Frontend Components (Parallel)
| Agent | Task | Files |
|-------|------|-------|
| D | AudioPlayer | `AudioPlayer.svelte` (new) |
| E | GifPicker | `GifPicker.svelte` (new) |
| F | EmotePicker + emote utils | `EmotePicker.svelte` (new), `utils/emotes.ts` (new) |
| G | StickerPicker + PackManager | `StickerPicker.svelte` (new), `StickerPackManager.svelte` (new) |

### Wave 3 — Integration (Sequential, orchestrator)
| Task | Files |
|------|-------|
| Wire AudioPlayer into MessageBubble | `MessageBubble.svelte` |
| Wire GIF/Emote/Sticker buttons into MessageComposer | `MessageComposer.svelte` |
| Wire GIF/Emote/Sticker/Audio rendering into MessageBubble | `MessageBubble.svelte` |
| Add emote inline replacement to MarkdownText | `MarkdownText.svelte` |

---

## Environment Needs

| Feature | Needs |
|---------|-------|
| GIFs | Tenor API key (free) or mock endpoint |
| Emotes | None — uses existing media upload |
| Stickers | None — uses existing media upload |
| Voice | None — uses existing audio pipeline |

---

## Quality Gates

- [ ] `npm run typecheck` green
- [ ] `cd services/api && npm run test:integration` green
- [ ] `cd apps/web && npx svelte-check` green
- [ ] New routes have integration tests
- [ ] Handoff note in `docs/AGENT-HANDOFFS.md`
