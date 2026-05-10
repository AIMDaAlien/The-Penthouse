# Phase 2 + Non-Blockers — Systematic Implementation Plan

**Date:** 2026-05-09
**Scope:** Phase 2 features (voice, GIFs, emotes, stickers) + Phase 1 non-blockers (push decoupling, pin permissions, markdown parser upgrade)
**Rule:** 3-file limit per task. Zero sloppiness — debt gets paid now.

---

## Non-Blocker 1: Push Decoupling from Messages

### Problem
`sendPushForMessage()` is called directly from:
- `services/api/src/realtime/socket.ts` (line ~161)
- `services/api/src/routes/chats.ts` (message send REST endpoint)

This means push logic lives inside chat handlers. If push breaks, chat breaks. If we want to add push for other events (reactions, pins), we have to import push into every handler.

### Solution: Lightweight Event Bus
Use Node's built-in `EventEmitter` as a pub/sub layer.

```
services/api/src/core/events.ts (new)
  └── export const appEvents = new EventEmitter();

services/api/src/features/push/handlers.ts (new)
  └── appEvents.on('message.sent', ({ message, senderId }) => {
        sendPushForMessage(io, message, senderId);
      });

services/api/src/realtime/socket.ts
  └── REMOVE: sendPushForMessage() call
  └── ADD: appEvents.emit('message.sent', { message, senderId });

services/api/src/routes/chats.ts
  └── REMOVE: sendPushForMessage() call
  └── ADD: appEvents.emit('message.sent', { message, senderId });
```

### Files
| Action | File |
|--------|------|
| Create | `services/api/src/core/events.ts` |
| Create | `services/api/src/features/push/handlers.ts` |
| Modify | `services/api/src/realtime/socket.ts` |
| Modify | `services/api/src/routes/chats.ts` |
| Modify | `services/api/src/app.ts` (register push handlers on boot) |

---

## Non-Blocker 2: Pin Permissions

### Problem
Any chat member can pin/unpin any message. Discord restricts pins to admins/moderators. Telegram allows anyone.

### Solution: Role-Based Pin Permission
Add a `canPin` check. For MVP, restrict to:
- Chat creator (no concept yet — need to add `createdByUserId` to `chats`?)
- OR: Admin role users
- OR: Any member (keep current behavior)

Simplest fix without schema changes:
- Only allow the message sender OR admin-role users to pin
- Unpin: only the pinner OR admin can unpin

```typescript
// In pin handler
const isSender = message.senderId === socket.data.userId;
const isAdmin = socket.data.role === 'admin';
if (!isSender && !isAdmin) throw forbidden('Only the sender or admins can pin');
```

### Files
| Action | File |
|--------|------|
| Modify | `services/api/src/realtime/socket.ts` (pin/unpin handlers) |
| Modify | `services/api/src/routes/chats.ts` (pin REST endpoints) |

---

## Non-Blocker 3: Markdown Parser Upgrade

### Problem
Regex-based parser. Nested markdown fails. No proper sanitize pipeline.

### Solution: `snarkdown` + `DOMPurify`
- `snarkdown` = 1KB markdown parser (covers all basic syntax)
- `DOMPurify` = battle-tested HTML sanitizer
- Total bundle impact: ~15KB gzipped

```bash
cd apps/web && npm install snarkdown dompurify
npm install -D @types/dompurify
```

Replace `MarkdownText.svelte` regex logic with:
```typescript
import snarkdown from 'snarkdown';
import DOMPurify from 'dompurify';

$: html = DOMPurify.sanitize(snarkdown(text), {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 's', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
});
```

### Files
| Action | File |
|--------|------|
| Modify | `apps/web/src/lib/components/MarkdownText.svelte` |
| Modify | `apps/web/package.json` (add deps) |

---

## Feature 1: Voice Notes Enhancement

### What We're Building
`AudioPlayer.svelte` with waveform (CSS bars), play/pause, scrubber, playback speed, duration.

### Files
| Action | File |
|--------|------|
| Create | `apps/web/src/lib/components/AudioPlayer.svelte` |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` |

### Backend Changes
None. Reuses existing `audio` message type.

---

## Feature 2: GIF Integration

### What We're Building
- Backend proxy: `GET /api/v1/gifs/search?q=...`
- Frontend picker: `GifPicker.svelte`
- Composer button + bubble rendering

### Files
| Action | File |
|--------|------|
| Create | `services/api/src/features/gifs/routes.ts` |
| Create | `apps/web/src/lib/components/GifPicker.svelte` |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` |
| Modify | `services/api/src/app.ts` |

### API Key
Need Tenor API key. If unavailable, mock endpoint returning static GIFs for now.

---

## Feature 3: Custom Emotes

### What We're Building
- Backend: CRUD routes for `customEmotes`
- Frontend: Upload (canvas resize to 64x64), `:name:` inline replacement, emote picker

### Files
| Action | File |
|--------|------|
| Create | `services/api/src/features/customEmotes/routes.ts` |
| Create | `apps/web/src/lib/components/EmotePicker.svelte` |
| Create | `apps/web/src/lib/utils/emotes.ts` |
| Modify | `apps/web/src/lib/components/MarkdownText.svelte` |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` |
| Modify | `services/api/src/app.ts` |

---

## Feature 4: Stickers

### What We're Building
- Backend: CRUD routes for `stickerPacks` + `stickers`
- Frontend: Pack manager, sticker picker, sticker message rendering

### Files
| Action | File |
|--------|------|
| Create | `services/api/src/features/customEmotes/routes.ts` (extend with sticker routes) |
| Create | `apps/web/src/lib/components/StickerPicker.svelte` |
| Create | `apps/web/src/lib/components/StickerPackManager.svelte` |
| Modify | `apps/web/src/lib/components/MessageComposer.svelte` |
| Modify | `apps/web/src/lib/components/MessageBubble.svelte` |
| Modify | `services/api/src/app.ts` |

---

## Execution Order

To respect the 3-file rule and avoid agent conflicts on central files:

### Wave 1 — Non-Blockers (Parallel)
| Agent | Task | Files |
|-------|------|-------|
| A | Push decoupling | `core/events.ts`, `push/handlers.ts`, `socket.ts`, `chats.ts`, `app.ts` |
| B | Pin permissions | `socket.ts`, `routes/chats.ts` |
| C | Markdown upgrade | `MarkdownText.svelte`, `package.json` |

### Wave 2 — Backend Routes (Parallel)
| Agent | Task | Files |
|-------|------|-------|
| D | GIF proxy | `features/gifs/routes.ts`, `app.ts` |
| E | Custom emote routes | `features/customEmotes/routes.ts`, `app.ts` |
| F | Sticker routes | `features/customEmotes/routes.ts`, `app.ts` |

### Wave 3 — Frontend Components (Parallel)
| Agent | Task | Files |
|-------|------|-------|
| G | AudioPlayer | `AudioPlayer.svelte` |
| H | GifPicker | `GifPicker.svelte` |
| I | EmotePicker + utils | `EmotePicker.svelte`, `utils/emotes.ts` |
| J | StickerPicker + PackManager | `StickerPicker.svelte`, `StickerPackManager.svelte` |

### Wave 4 — Integration (Orchestrator)
| Task | Files |
|------|-------|
| Wire all into MessageComposer | `MessageComposer.svelte` |
| Wire all into MessageBubble | `MessageBubble.svelte` |
| Wire emote replacement into MarkdownText | `MarkdownText.svelte` |

---

## Quality Gates

- [ ] `npm run typecheck` green across all workspaces
- [ ] `cd services/api && npm run test:integration` green (9+ tests)
- [ ] `cd apps/web && npx svelte-check` green
- [ ] New routes have integration tests
- [ ] No direct `sendPushForMessage()` calls outside `features/push/`
- [ ] Pin endpoints reject non-authorized users
- [ ] Markdown sanitizes all input (test: `<script>`, `javascript:`, `onerror=`)
