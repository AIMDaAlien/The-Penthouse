# Operator-Selected Features — Phased Implementation Plan

**Date:** 2026-05-08
**Basis:** Existing synthesis (01–04) + v3 parity audit + codebase architecture review
**Scope:** Only features explicitly requested by operator. AI deferred. Forwarding excluded.

---

## What Already Ships (v4 Baseline)

| Feature | Status | Notes |
|---------|--------|-------|
| Text / image / video / audio / file / gif messages | ✅ | `audio` = minimal player |
| Reactions | ✅ | Backend accepts any emoji string; frontend picker limited |
| Reply / edit / delete / read receipts / typing | ✅ | |
| Push notifications (Web Push, VAPID, quiet hours) | ✅ | |
| Presence | ✅ | Boolean `online` only |
| Chat list with archive (`archivedAt`) | ✅ | No archive toggle UI |
| `chats.type = 'channel'` | ✅ | Flat only; no parent/child |
| Media upload / serve | ✅ | Local disk |

**Schema head start:** `PinnedMessageSchema`, `GifResultSchema`, `PollDataSchema` exist in contracts. DB tables missing.

---

## Selected Features (Locked)

### From 01 — Tier 1 (gaps only)
- **Voice notes** — enhance existing `audio` type (waveform, scrubber, player)

### From 01 — Tier 2
- Voice chats (realtime, group)
- User-customizable stickers
- GIF integration (Tenor/Giphy search)
- Chat folders / organization (drag & drop)
- Message reactions with **any emoji**
- Channels within group chats (Discord-like sub-channels)
- Custom emotes (static + GIF, 48/64px)
- Rich text formatting (markdown in messages)
- User customizable wallpapers
- Pinned messages

### From 02 — Differentiators
- Deep availability states (`available`, `busy`, `dnd`, `afk`)
- Short user-writable dynamic notes tied to state
- AFK auto-trigger on idle / app background / phone sleep

---

## Phased Rollout

### Phase 1 — Foundation + Quick Wins (Week 1)
**Goal:** Schema migrations + low-effort features that unblock later phases.
**Risk:** Low. Mostly additive.

| # | Task | Files Touched | Effort |
|---|------|-------------|--------|
| 1.1 | **Schema migration** — `pinnedMessages`, `chatFolders`, `customEmotes`, `stickerPacks`, `stickers`, `userWallpapers`; expand `users` with `presenceState`, `presenceNote`, `presenceNoteUpdatedAt` | `schema.ts`, migration | Low |
| 1.2 | **Deep availability states** — backend enum + socket events (`presence.update` expansion), frontend status picker in settings/profile | `socket.ts`, `settings` route, `users` table | Low |
| 1.3 | **Dynamic presence notes** — 100-char text tied to state, shown on profile hover + user directory | `users.ts` route, `UserDirectory` component | Low |
| 1.4 | **AFK auto-trigger** — client idle detection (5min no input / `visibilitychange` / `pagehide`), emit `presence.update` to `afk`; reset on activity | `socket.svelte.ts`, `+layout.svelte` | Low |
| 1.5 | **Any-emoji reactions** — swap limited picker for full emoji selector (native `emoji-picker-element` or system picker) | `ReactionPill`, `MessageBubble` | Low |
| 1.6 | **Rich text formatting** — markdown parser in `MessageBubble` (bold, italic, code, links, strikethrough); sanitize with DOMPurify | `MessageBubble` | Low |
| 1.7 | **User wallpapers** — per-chat or global wallpaper URL/color, CSS custom prop override, upload via existing media endpoint | `chat/[id]/+page.svelte`, `ChatListPane` | Low |
| 1.8 | **Pinned messages** — backend pin/unpin routes, socket events (`message.pin` / `message.unpin` / `message.pinned` / `message.unpinned`), frontend pin banner | `chats.ts` route, `socket.ts`, chat header | Low-Med |

**Phase 1 exit criteria:** `typecheck` green, integration tests green, `axe` scan 0 serious.

---

### Phase 2 — Media & Content (Week 2)
**Goal:** Voice notes, GIFs, emotes, stickers.
**Risk:** Medium. External API + media processing.

| # | Task | Files Touched | Effort |
|---|------|-------------|--------|
| 2.1 | **Voice notes enhancement** — `AudioPlayer.svelte` with waveform (CSS bars or canvas), scrubber, playback speed, duration display | `AudioPlayer.svelte`, `MessageBubble` | Medium |
| 2.2 | **GIF integration** — Tenor/Giphy search API proxy route, GIF picker in `MessageComposer`, inline GIF rendering | `media.ts` route, `MessageComposer`, `MessageBubble` | Low-Med |
| 2.3 | **Custom emotes** — upload flow, server-side resize to 48/64px (sharp/canvas), `:emoteName:` syntax, inline replacement in markdown renderer | `media.ts` route, `MessageBubble`, emote picker | Medium |
| 2.4 | **User-customizable stickers** — sticker pack CRUD, upload (reuse media pipeline), `sticker` message type, sticker picker in composer | `sticker` route/module, `MessageComposer`, `MessageBubble` | Medium |

**Phase 2 exit criteria:** Same as Phase 1 + GIF search returns results + emote upload + resize works.

---

### Phase 3 — Organization & Structure (Weeks 3–4)
**Goal:** Chat folders, channels within groups.
**Risk:** Medium-High. Schema relationships + DnD UX.

| # | Task | Files Touched | Effort |
|---|------|-------------|--------|
| 3.1 | **Chat folders** — folder CRUD (create/rename/delete), `chatFolders` table with `sortOrder`, drag-and-drop assignment (`svelte-dnd-action` or native HTML5 DnD), folder expand/collapse | `chatFolders` route, `ChatListPane`, stores | Medium |
| 3.2 | **Channels within groups** — add nullable `parentChatId` to `chats`, channel creation UI in group info, member inheritance from parent, channel list sidebar in group view | `schema.ts`, `chats.ts` route, group info UI | High |

**Phase 3 exit criteria:** DnD works on mobile + desktop, channel creation creates child chat, members inherited.

---

### Phase 4 — Realtime Voice (Weeks 5–7)
**Goal:** Voice chats.
**Risk:** High. WebRTC infra, NAT traversal, SFU decision.

| # | Task | Files Touched | Effort |
|---|------|-------------|--------|
| 4.1 | **WebRTC signaling** — Socket.IO events for offer/answer/ICE, voice room join/leave | `socket.ts` + new `voice.ts` module | High |
| 4.2 | **Voice room UI** — participant grid, mute/unmute toggle, voice activity indicator (VAD or volume threshold), push-to-talk option | `chat/[id]/+page.svelte` or new `VoiceRoom` component | High |
| 4.3 | **Group voice support** — Evaluate SFU (Mediasoup, LiveKit, Twilio) vs mesh for <8 users. Start with mesh if group sizes small. | New service or external dependency | High |

**Phase 4 exit criteria:** 2+ users can join voice room, audio flows both ways, mute works.

---

## Dependency Graph

```
Phase 1
├── users.presenceState + users.presenceNote (schema)
│   └── Deep availability + dynamic notes + AFK
├── pinnedMessages (schema)
│   └── Pinned messages
├── userWallpapers (schema)
│   └── Wallpapers
├── MessageBubble markdown parser
│   └── Rich text formatting
│   └── Custom emote rendering (Phase 2)
└── Any-emoji picker
    └── Reactions expanded

Phase 2
├── media_uploads (existing)
│   └── Sticker upload
│   └── Custom emote upload
│   └── Wallpaper upload
├── AudioPlayer.svelte
│   └── Voice notes enhancement
├── Tenor/Giphy API
│   └── GIF integration
└── Emote resize pipeline
    └── Custom emotes

Phase 3
├── chatFolders (schema)
│   └── Chat folders / DnD
└── chats.parentChatId (schema)
    └── Channels within groups

Phase 4
└── WebRTC signaling (new)
    └── Voice chats
    └── Future: video calls, screen share
```

---

## Risk Register

| Feature | Risk | Mitigation |
|---|---|---|
| Channels within groups | `chats` schema change | Add nullable `parentChatId`; no migration of existing rows |
| Voice chats | WebRTC NAT traversal | Start mesh for <8 users; add TURN/SFU later if needed |
| Custom emote GIF resize | Server CPU | Use sharp/libvips or client canvas; enforce 64px max |
| Chat folders DnD | Mobile UX pain | `svelte-dnd-action` handles touch; test on real devices |
| Markdown XSS | Injection via links | DOMPurify whitelist: `b`, `i`, `code`, `a`, `s`, `pre` |
| Presence spam | Rapid state changes | Debounce 5s; coalesce updates |

---

## 3-File Rule Breakdown

Each task above respects the 3-file limit. Examples:
- **Task 1.2 (availability states):** `services/api/src/db/schema.ts` + `services/api/src/realtime/socket.ts` + `apps/web/src/routes/settings/+page.svelte`
- **Task 1.6 (markdown):** `apps/web/src/lib/components/MessageBubble.svelte` + new `apps/web/src/lib/components/MarkdownText.svelte` + `apps/web/src/lib/utils/markdown.ts`
- **Task 2.2 (GIF):** `services/api/src/routes/media.ts` + `apps/web/src/lib/components/MessageComposer.svelte` + `apps/web/src/lib/components/GifPicker.svelte`

If a task needs more than 3 app files, split into sub-tasks (e.g., backend route first, frontend picker second).

---

## What Was Excluded (Operator Decision)

| Feature | Source | Reason |
|---|---|---|
| Message forwarding | 01-T1 | Operator excluded |
| Video notes | 01-T1 | Operator excluded |
| AI summaries / alt-text / transcription | 02/03/04 | Operator: "unused and expensive gimmicks" |
| Focus mode / batch delivery | 02 | Not requested |
| Expiration by engagement | 02 | Not requested |
| Local-first sync engine | 04 | Not requested |
| Bot API / slash commands | 04 | Not requested |
| Plugin system / federation | 04 | Not requested |

**Awaiting operator input on 03-delight-accessibility and 04-technical-enablers selections.**

---

## Quality Gates (Per Phase)

- [ ] `npm run typecheck` green across workspaces
- [ ] `npm run test:integration` green (ephemeral Postgres)
- [ ] `npm run lint` green
- [ ] Drizzle migration generated for new tables
- [ ] New socket events added to `03-realtime-contract.md`
- [ ] New Zod schemas in `@penthouse/contracts`
- [ ] axe scan: 0 serious/critical violations
- [ ] Handoff note in `docs/AGENT-HANDOFFS.md`
