# Codex Review Handoff — Phase 2 + Non-Blockers

**Date:** 2026-05-09
**Reviewer:** Codex
**Scope:** All changes since Phase 1 completion

---

## Files Changed/Created

### Backend — Core Infrastructure
| File | Action | What to Review |
|------|--------|---------------|
| `services/api/src/core/events.ts` | **Created** | Event bus design. Is `EventEmitter` the right abstraction? Are typed payloads correct? |
| `services/api/src/features/push/handlers.ts` | **Created** | Push handler registration. Does it properly decouple from chat logic? Error handling OK? |
| `services/api/src/app.ts` | **Modified** | `registerPushHandlers(io)` called after `registerSocket()`. Is ordering correct? |

### Backend — Routes & Schema
| File | Action | What to Review |
|------|--------|---------------|
| `services/api/src/realtime/socket.ts` | **Modified** | Removed `sendPushForMessage` import/call. Added `appEvents.emit()`. Added pin permission checks in `message.pin` and `message.unpin`. |
| `services/api/src/routes/chats.ts` | **Modified** | Removed `sendPushForMessage` import/call. Added `appEvents.emit()`. Added pin permission checks in REST pin/unpin endpoints. |
| `services/api/src/utils/messages.ts` | **Modified** | Added `sticker` to `createMessage` `messageType` union. |
| `services/api/src/features/customEmotes/routes.ts` | **Created** | CRUD for emotes + sticker packs + stickers. Inline Zod schemas (not contracts). Owner/admin permission checks. |
| `services/api/src/features/gifs/routes.ts` | **Created** | Mock GIF search endpoint. Returns static hardcoded GIFs. |
| `services/api/src/db/enums.ts` | **Modified** | Added `sticker` to `messageTypeEnum`. |
| `services/api/src/db/migrations/0002_sticker_message_type.sql` | **Created** | `ALTER TYPE message_type ADD VALUE 'sticker'` |
| `services/api/src/features/pins/schema.ts` | **Modified** | Added `relations()` for `pinnedMessages`. |
| `services/api/src/features/customEmotes/schema.ts` | **Modified** | Added `relations()` for `customEmotes`, `stickerPacks`, `stickers`. |

### Contracts
| File | Action | What to Review |
|------|--------|---------------|
| `packages/contracts/src/api.ts` | **Modified** | Added `sticker` to `MessageTypeSchema`. Added `sticker` validation in `SendMessageRequestSchema` (requires `stickerUrl`). Added `PinResponseSchema`, `ListPinsResponseSchema`. |

### Frontend — Components
| File | Action | What to Review |
|------|--------|---------------|
| `apps/web/src/lib/components/MarkdownText.svelte` | **Modified** | Replaced regex parser with `snarkdown` + `DOMPurify`. Added optional `emotes` prop for `:name:` → `<img>` replacement. Added `img` to ALLOWED_TAGS. |
| `apps/web/src/lib/components/AudioPlayer.svelte` | **Created** | Waveform player with CSS bars, play/pause, seek, speed toggle. Uses deterministic pseudo-random bars from URL seed. |
| `apps/web/src/lib/components/GifPicker.svelte` | **Created** | Searchable GIF grid. Fetches from `/api/v1/gifs/search`. |
| `apps/web/src/lib/components/EmotePicker.svelte` | **Created** | Grid of user's custom emotes from `/api/v1/emotes`. Click inserts `:name:`. |
| `apps/web/src/lib/components/StickerPicker.svelte` | **Created** | Pack tabs + sticker grid. Fetches from `/api/v1/sticker-packs` and `/api/v1/sticker-packs/:id/stickers`. |
| `apps/web/src/lib/components/MessageComposer.svelte` | **Modified** | Added buttons for GIF, Emote, Sticker pickers. Added `onGifSelect` and `onStickerSelect` props. Pickers render as popups. |
| `apps/web/src/lib/components/MessageBubble.svelte` | **Modified** | Uses `AudioPlayer` for audio messages. Renders `sticker` type. Extracts `stickerUrl` from metadata. Passes `emotes` to `MarkdownText`. |
| `apps/web/src/lib/utils/emotes.ts` | **Created** | `replaceEmotesInText()` utility for `:name:` → `<img>` replacement. |

### Frontend — Pages
| File | Action | What to Review |
|------|--------|---------------|
| `apps/web/src/routes/chat/[id]/+page.svelte` | **Modified** | Added `handleGifSelect` and `handleStickerSelect` handlers. Fetches emotes on mount and passes to `MessageBubble`. Passes handlers to `MessageComposer`. |

### Dependencies
| File | Action |
|------|--------|
| `apps/web/package.json` | Added `snarkdown`, `dompurify`, `@types/dompurify` |

---

## Specific Scrutiny Areas

1. **Event bus memory leaks** — `appEvents.setMaxListeners(50)` but listeners are registered once at boot. Is this safe for hot reload in dev?
2. **Pin permission edge cases** — Socket `message.unpin` queries `pinnedMessages.pinnedBy`. What if the pin was created before this code existed (no `pinnedBy` tracking)?
3. **Mock GIF endpoint** — Returns external giphy.com URLs. Should these be proxied through our server for privacy?
4. **Emote inline replacement** — `replaceEmotesInText` runs AFTER `snarkdown` but BEFORE `DOMPurify`. Is this ordering safe? Could a malicious emote URL bypass sanitization?
5. **Sticker message validation** — `SendMessageRequestSchema` now requires `stickerUrl` for `sticker` type. Does the frontend always provide this?
6. **AudioPlayer accessibility** — Has `role="slider"` and keyboard handlers. Is the a11y implementation sufficient?
7. **MessageBubble structure** — My sed edits may have left indentation inconsistencies. Does the Svelte template still compile and render correctly?
8. **Drizzle relations imports** — `relations` is imported from `drizzle-orm` in schema files. Are these properly re-exported from `db/schema.ts` barrel? Do they cause any circular imports?

---

## Quality Gates Status

| Gate | Status |
|------|--------|
| `services/api tsc --noEmit` | ✅ Clean |
| `apps/web svelte-check` | ✅ 0 errors, 2 warnings (a11y autofocus, unused CSS) |
| `services/api npm run test:integration` | ✅ 9/9 passing |

---

## Codex Review Results

**Status:** ✅ Completed  
**Findings:** 4 concrete issues fixed  
**Tests:** API 10/10 passing (was 9, +1 new integration test), Contracts 25/25 passing  

### Fixes Applied by Codex
1. **Push listener leak** — `registerPushHandlers()` now returns unregister fn, wired to Fastify `onClose`
2. **Media ownership** — `assertOwnedImageUpload()` prevents using another user's upload for emotes/stickers
3. **Private pack privacy** — `assertPackVisible()` blocks non-owners from reading private pack stickers
4. **Authenticated API client** — All pickers use `api.get()` instead of raw `fetch()` (was missing bearer token)
5. **Composer button wiring** — Added working `tool-btn` elements that toggle pickers
6. **Test coverage** — New `integration-custom-emotes.test.ts` with ownership/privacy assertions

### Remaining Judgment Call
- Mock GIF endpoint returns direct `media.giphy.com` URLs. Should become a server-side proxy before production.

## How to Review

1. Read each created/modified file
2. Check for security issues (XSS, auth bypass, injection)
3. Check for TypeScript type safety gaps
4. Check for error handling completeness
5. Verify the 3-file rule wasn't violated in any single task
6. Flag anything that would "sloppify" the codebase
