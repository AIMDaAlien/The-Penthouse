# Codex Orchestrator Handoff — DM Tier A Integration + Future Feature Lead

**Date:** 2026-04-18  
**Written by:** Claude (Sonnet 4.6)  
**For:** Codex (GPT-5.4)  
**Owner:** AIMDaAlien  

---

## Your Role Going Forward

**Codex is the validating manager and overall planner for The Penthouse.** Codex owns backend implementation, contracts coordination, integration testing, release/runtime proof, and the work roster. Codex does not directly implement `apps/web/` unless Aim explicitly overrides the ownership boundary.

Current agent roster as of 2026-04-19:

- **Claude** owns frontend implementation in `apps/web/`: SvelteKit, Svelte 5 runes, API client wiring, component state, and production frontend fixes.
- **Gemini** currently owns visual ideation and design exploration for frontend direction. Until its other strengths are proven, use Gemini for concepts, style directions, visual alternatives, and critique rather than core implementation.
- **Codex** owns backend, contracts, infra, scripts, release validation, runtime proof, and cross-agent planning.
- **Claude Opus 4.7** should be consulted for major second takes: large architecture shifts, high-risk security/auth/privacy decisions, deployment/release strategy changes, or broad frontend rewrites. Aim expects this because Codex's model knowledge should be treated as aging as of 2026-04-20.

The cycle for every new feature is:

```
1. You design the full feature spec (backend + contracts + frontend requirements)
2. You implement backend (services/api/) and contracts (packages/contracts/)
3. You write a Claude frontend handoff for implementation
4. Use Gemini for visual ideation or design critique when the feature needs stronger visual direction
5. Claude implements frontend (apps/web/)
6. You review Claude's output for correctness (types, API calls, socket events, ownership boundaries)
7. You run integration tests and runtime proof, then assign focused fixbacks if needed
8. For major/high-risk calls, ask Claude Opus 4.7 for a second take before finalizing
9. Done — update handoff/project memory and move to next feature
```

Never modify `apps/web/` directly unless Aim explicitly asks Codex to cross that boundary. Never ask Claude or Gemini to modify `services/api/`. Keep ownership boundaries clean.

---

## Current State of the Codebase

### Branch: `main` — v2.1.0-alpha.1

### What's shipped and working
- Auth (login/register/logout/refresh)
- Chat list (DMs + channels)
- Real-time messaging (Socket.IO)
- GIF picker (Klipy)
- Message reactions
- Threaded replies
- Polls
- Chat muting
- Read receipts (three-state: Sent / Received / Read with timestamps)
- Presence + connection status
- Media uploads (images, video, documents, up to 10 files / 25MB)
- User profiles (display name, avatar)
- PWA install (Android Chrome)
- Typing indicators (named, animated, 3-second inactivity hide)
- Pinned messages

### What was just implemented and verified (Tier A DM enhancements)

Backend and frontend Tier A work was integrated and runtime-proven locally on 2026-04-19 against `penthouse_test`.

| Feature | Backend status | Frontend status | Integration tested? |
|---|---|---|---|
| Message editing | Done (migration 023, PATCH route, `message.edited` socket event) | Done | ✅ Runtime-proven |
| Delete for everyone | Done (migration 024, DELETE route, `message.deleted` socket event) | Done | ✅ Runtime-proven |
| Voice notes | Done (audio MIME types in upload, `audio` message type) | Done (MediaBubble audio player) | ✅ Runtime-proven |
| Starred messages | Done (migration 025, star/unstar routes, `/api/v1/me/starred`) | Done (star toggle in context menu, me.starred API call) | ✅ Runtime-proven |
| Archive conversations | Done (migration 026, archive/unarchive routes, list filter) | Done (archive in context menu, archived section in chat list) | ✅ Runtime-proven |
| Message formatting | Frontend only — no backend needed | Done (bold/italic/code/strike via `formatMessageContent`) | ✅ No backend required |

Runtime proof covered root chat list, direct hard-load `/chat/:id`, realtime send/receive, edit, star persistence after reload, delete tombstone on both clients, audio upload/render, archive by real pointer click, and archived section visibility.

Known frontend cleanup item: direct `/chat/:id` now works, but Vite logs an eager-fetch SSR warning from the chat page load `$effect`; Claude should move those API calls behind a browser-only/on-mount boundary or into proper route load plumbing.

---

## Tier A: Verification Notes (Completed 2026-04-19)

### 1. Migrations

Migrations 023–026 exist in `services/api/src/db/migrations/` and were applied/verified locally against the dev and test databases on 2026-04-19. Before any separate staging or production rollout, rerun migrations against that target environment.

```
023_message_editing.sql   — adds edited_at, edit_count to messages
024_message_deletion.sql  — adds deleted_at, deleted_by_user_id to messages
025_starred_messages.sql  — creates starred_messages table
026_chat_archive.sql      — adds archived_at to chat_members
```

### 2. Backend routes verified

These routes are in `services/api/src/routes/chats.ts` and are covered by integration/runtime proof:

- `PATCH  /api/v1/chats/:chatId/messages/:messageId` — edit message (sender only, non-deleted, non-audio)
- `DELETE /api/v1/chats/:chatId/messages/:messageId` — soft-delete (sender only); sets `deleted_at`, broadcasts `message.deleted`
- `POST   /api/v1/chats/:chatId/messages/:messageId/star` — star a message
- `DELETE /api/v1/chats/:chatId/messages/:messageId/star` — unstar a message
- `GET    /api/v1/me/starred` — paginated starred messages (cursor + limit params)
- `POST   /api/v1/chats/:chatId/archive` — archive (sets `archived_at` for current user)
- `POST   /api/v1/chats/:chatId/unarchive` — unarchive (clears `archived_at`)
- `GET    /api/v1/chats` — must accept `?archived=true` filter

`GET /api/v1/chats?archived=true` returns chats where the calling user's `chat_members.archived_at IS NOT NULL`, and the default inbox returns chats where `archived_at IS NULL`.

### 3. Socket events verified

The frontend listens for:
- `message.edited` — payload: `{ chatId, messageId, content, editedAt, editCount }`
- `message.deleted` — payload: `{ chatId, messageId, deletedAt, deletedByUserId }`

The backend broadcasts these to the correct Socket.IO room (`chat:{chatId}`) after the DB update.

### 4. `message.deleted` tombstone behavior verified

When a message is deleted:
- Backend: sets `deleted_at = NOW()`, clears/blanks `content`, broadcasts `message.deleted`
- Frontend: displays "This message was deleted" (italic, muted) instead of message content
- The `hidden` field (used for admin moderation) still shows "Message removed" — **these are two different tombstones**. Do not conflate them.

### 5. Audio upload MIME types verified

In `services/api/src/routes/media.ts`, confirm that `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg` are accepted. The frontend sends `audio/webm` from `MediaRecorder`.

After upload, the frontend sends:
```json
{
  "chatId": "uuid",
  "content": "",
  "type": "audio",
  "metadata": {
    "audioUploadId": "upload-uuid",
    "audioUrl": "/uploads/path/to/file.webm",
    "durationSeconds": 14.3
  }
}
```
The `audioUrl` must be accessible from the browser at `PUBLIC_API_URL + audioUrl`.

### 6. `/api/v1/me/starred` response shape verified

The frontend calls `me.starred({ cursor?, limit? })` and expects `StarredMessagesResponse`:
```typescript
{
  items: StarredMessageEntry[],
  nextCursor: string | null
}
```
Where `StarredMessageEntry` includes the full hydrated message plus `starredAt`.

`packages/contracts/src/api.ts` defines `StarredMessagesResponseSchema`; the backend response matches it and the browser proof confirmed star persistence.

### 7. `chats.self()` endpoint verified

The frontend calls `chats.self()` which does `POST /api/v1/chats/self` to get or create the user's self-DM (Saved Notes). It returns a valid `ChatSummary`; a regression test now covers browser-style empty JSON requests for this endpoint.

---

## Key Files — Frontend (apps/web/)

Claude implemented these in the last session. Read them before handing off to Gemini for any future work so you understand what's already there.

```
apps/web/src/lib/services/api.ts          — REST client (all API calls go here)
apps/web/src/lib/components/
  Icon.svelte                              — SVG icon system (add new icons here)
  MessageContextMenu.svelte               — Long-press action sheet
  MediaBubble.svelte                      — Renders image/video/file/audio messages
  ReadReceipts.svelte                     — Three-state read receipts
apps/web/src/lib/utils/messageFormat.ts  — Bold/italic/code/strike formatter (NEW)
apps/web/src/routes/
  +page.svelte                            — Chat list (archive toggle added)
  chat/[id]/+page.svelte                  — Message thread (1200+ lines, main feature surface)
apps/web/src/lib/stores/
  session.svelte.ts                       — Auth state + access token
  socket.svelte.ts                        — Socket.IO singleton
```

## Key Files — Backend (services/api/)

```
services/api/src/routes/
  chats.ts      — Chat CRUD, messages, read, preferences, archive, star, edit, delete
  media.ts      — Upload handling (must accept audio MIME types)
  admin.ts      — Admin moderation
services/api/src/utils/
  chatMessages.ts    — Message send logic
  messages.ts        — Message row → type mapping
  messageHydration.ts — Full message hydration (reactions, replies, etc.)
services/api/src/db/
  migrate.ts         — Run this to apply pending migrations
  migrations/        — SQL files 001–026
```

## Key Files — Contracts (packages/contracts/)

```
packages/contracts/src/
  api.ts     — All request/response Zod schemas
  events.ts  — Socket.IO event payload types
  index.ts   — Re-exports everything
```

Both sides import from `@penthouse/contracts`. If you change a schema, both sides need updating in the same session.

---

## Architecture Quick Reference

### How messages flow (send)
```
Frontend (chat/[id]/+page.svelte)
  → POST /api/v1/chats/:chatId/messages  (chats.send())
  → Backend inserts DB row
  → Backend emits message.new to room  (Socket.IO)
  → Backend emits message.ack to sender  (for optimistic replacement)
  → Frontend replaces optimistic message with confirmed one
```

### How messages flow (edit)
```
Frontend
  → PATCH /api/v1/chats/:chatId/messages/:messageId  (chats.editMessage())
  → Backend updates content, edited_at, edit_count
  → Backend emits message.edited to room  (Socket.IO)
  → All clients update their local state
```

### How messages flow (delete)
```
Frontend
  → DELETE /api/v1/chats/:chatId/messages/:messageId  (chats.deleteMessage())
  → Backend sets deleted_at, clears content
  → Backend emits message.deleted to room  (Socket.IO)
  → All clients show tombstone
```

### Socket.IO event envelope format
The backend wraps events as `{ type: string, payload: object }`. The frontend registers handlers like:
```javascript
socket.on('message.edited', (envelope) => {
  const { chatId, messageId, content, editedAt, editCount } = envelope.payload;
});
```
Do not change this envelope format — it's consistent across all events.

### Auth
- Access token: short-lived JWT (15 min), stored in memory (`sessionStore.accessToken`)
- Refresh token: opaque, stored in DB, rotated on use
- The API client in `services/api.ts` auto-refreshes on 401 and retries once
- All authenticated routes need `Authorization: Bearer <token>` header

### Database tables
- `messages` — has `edited_at`, `edit_count`, `deleted_at`, `deleted_by_user_id` (after migration 023/024)
- `starred_messages` — `(user_id, message_id, starred_at)` (after migration 025)
- `chat_members` — has `archived_at` (after migration 026)
- `chats` — base chat table, immutable
- `users` — user accounts
- `reactions` — `(message_id, user_id, emoji, created_at)`
- `message_reads` — `(message_id, user_id, read_at)`
- `pinned_messages` — `(chat_id, message_id, pinned_by, pinned_at)`

---

## Next Features to Implement (Priority Order)

After Tier A integration is verified:

### Tier B — Group Chats (Discord-style)

This is the largest next chunk. The architecture decision:
- Groups are invite-only
- Group owner is admin; owner can grant admin role to members
- Capped at 50 members (expect most groups ~10)
- Channel-style (like Discord servers — one group can have multiple channels eventually, but for now treat groups as a single chat room)

**Backend work (you):**
1. Schema: `chats` table `type` needs `'group'` (it may already have it). Add `owner_id UUID REFERENCES users(id)`.
2. Schema: `chat_members` needs `role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin'))`.
3. Migration for above.
4. Routes:
   - `POST /api/v1/chats/group` — create group (name, initial member IDs, optional avatar)
   - `POST /api/v1/chats/:chatId/members` — invite member (admin only)
   - `DELETE /api/v1/chats/:chatId/members/:userId` — remove member (admin only)
   - `PATCH /api/v1/chats/:chatId/members/:userId/role` — promote/demote (owner only)
   - `DELETE /api/v1/chats/:chatId/leave` — leave group (members only; owner must transfer first)
   - `PATCH /api/v1/chats/:chatId` — update name/avatar (admin only)
5. Socket: broadcast `chat.updated` on member changes
6. Enforce 50-member cap

**Frontend work (Gemini):**
- Create Group modal (name, invite members search)
- Group header: avatar, name, member count, info button
- Group info panel (members list with roles, leave button)
- Admin controls visible only if `role === 'admin'`

### Tier C — Message Search

Full-text search across messages. Backend: PostgreSQL `tsvector` on `messages.content`. Route: `GET /api/v1/chats/:chatId/messages/search?q=...`. Frontend: search input in header.

### Tier D — Push Notifications (Web Push / VAPID)

Backend: store `PushSubscription` objects, send via `web-push` npm package. Frontend: service worker already set up in `apps/web/src/service-worker.ts`. Just needs subscription registration and `push` event handler.

### Tier E — Link Previews (oEmbed)

Backend: new route `GET /api/v1/oembed?url=...` — fetches oEmbed data server-side (avoids CORS). Cache in Redis or Postgres. Frontend: detect URLs in message content, render preview card below message.

---

## How to Write a Gemini Handoff

When you need Gemini to implement frontend work, create a file at:
`docs/gemini-prompts/GEMINI-HANDOFF-[FEATURE].md`

Use this template:

```markdown
# Gemini Frontend Handoff — [Feature Name]

**Date:** [date]
**Written by:** Codex
**For:** Gemini (Gemini 2.5 Pro)

## Your role
You are implementing the frontend for [feature] in The Penthouse SvelteKit PWA.
Do NOT modify services/api/ or packages/contracts/ — those are done.
Do NOT create documentation files.

## Stack
- SvelteKit 2.x, Svelte 5 runes ($state, $derived, $effect)
- No Tailwind, no MUI — CSS custom properties only (var(--color-accent), etc.)
- All icons via <Icon name="..." /> — SVG only, never emoji as icons
- TypeScript strict mode
- Import types from @penthouse/contracts
- All API calls go through apps/web/src/lib/services/api.ts

## Design system tokens (key ones)
--color-bg, --color-surface, --color-surface-2, --color-surface-raised
--color-accent (primary purple), --color-accent-dim (hover states)
--color-text-primary, --color-text-secondary, --color-border
--color-success, --color-danger, --color-error
--space-1 through --space-8 (4px scale)
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full
--text-xs, --text-sm, --text-base, --text-lg
--font-sans, --font-display

## New API endpoints available (Codex just implemented)
[list the exact endpoints with request/response shapes]

## New socket events available
[list event names and payload shapes — envelope format: { type, payload }]

## New contract types available
[list new TypeScript types from @penthouse/contracts]

## What you need to build
[specific files to create or modify, with exact component props and behavior]

## Files to read first (for context)
- apps/web/src/lib/services/api.ts (API client pattern)
- apps/web/src/routes/chat/[id]/+page.svelte (main feature surface)
- apps/web/src/lib/components/Icon.svelte (available icons)
- apps/web/src/lib/components/MessageContextMenu.svelte (action sheet pattern)

## Definition of done
1. TypeScript compiles clean: cd apps/web && npm run typecheck
2. No console errors at runtime
3. Works at 375px mobile viewport
4. No files outside apps/web/ modified (except contracts if you need new types — coordinate with Codex first)
```

**Key things to tell Gemini every time:**
- It must use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`) — NOT Svelte 4 (`let x = ...` without `$state`)
- All icons must be in `Icon.svelte`'s `IconName` union type — if an icon is missing, add it there first
- The design system is dark-first — don't hardcode colors
- Mobile-first — primary target is 375px Android Chrome
- `{@html}` is only safe if content was escaped first (see `messageFormat.ts` pattern)
- Long-press = context menu pattern (see `MessageContextMenu.svelte`)
- Bottom sheets slide up from bottom (see existing sheet CSS pattern in `+page.svelte`)

---

## Contracts Coordination Rule

Before adding a field to a contract, ask: does both sides need it now?
- Adding optional fields: safe, do it
- Removing fields: never without confirming both sides
- Adding required fields: only if you update both sides in the same session
- Renaming fields: dangerous — update both sides atomically

The contracts package is at `packages/contracts/src/api.ts` and `events.ts`. Both agents re-export from `@penthouse/contracts`.

---

## Environment

```
# Development
PUBLIC_API_URL=http://localhost:3000
PUBLIC_SOCKET_URL=http://localhost:3000

# Production
PUBLIC_API_URL=https://api.penthouse.blog
PUBLIC_SOCKET_URL=https://api.penthouse.blog
```

The backend runs on TrueNAS at home. Deployment guide: `docs/TRUENAS_DEPLOYMENT.md`. Migration guide: `docs/DEPLOYMENT.md`.

---

## Immediate Action Checklist

In order:

- [ ] Apply migrations 023–026 to development database
- [ ] Verify all 8 new routes are registered and returning correct responses
- [ ] Verify `message.edited` and `message.deleted` socket events are emitting correctly
- [ ] Smoke test editing a message: edit → see "edited" label on both sides
- [ ] Smoke test deleting a message: delete → see "This message was deleted" tombstone on both sides  
- [ ] Smoke test starring a message: star → appears in `/api/v1/me/starred`
- [ ] Smoke test archiving a chat: archive → disappears from main list → appears in Archived section
- [ ] Smoke test voice note: record → upload → send → audio player appears in bubble
- [ ] Run `cd services/api && npm run test` — ensure no regressions
- [ ] Run `cd apps/web && npm run typecheck` — already passes (0 errors as of 2026-04-18)
- [ ] Apply migrations to production once dev verified

---

## What Claude Built in the Last Session (2026-04-18)

For your reference — all in `apps/web/`:

1. **`src/lib/services/api.ts`** — Added `chats.editMessage()`, `chats.deleteMessage()` (already existed), `chats.archive()`, `chats.unarchive()`, `chats.starMessage()`, `chats.unstarMessage()`, `me.starred()`. Updated `chats.list()` to accept `{ archived?: boolean }` param.

2. **`src/lib/components/Icon.svelte`** — Added icons: `mic`, `square`, `star`, `star-filled`, `info`, `archive`, `inbox`, `chevron-down`.

3. **`src/lib/components/MessageContextMenu.svelte`** — Added `onEdit` prop (shows for own non-deleted text messages), `onStar`/`isStarred` props (shows for any non-deleted message), renamed Delete to "Delete for everyone", wrapped delete in `!message.deletedAt` guard.

4. **`src/lib/utils/messageFormat.ts`** *(new file)* — `formatMessageContent(raw)` — escapes HTML then applies regex for `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, newlines → `<br>`. Safe to use with `{@html}`.

5. **`src/lib/components/MediaBubble.svelte`** — Added audio voice note player for `message.type === 'audio'`: play/pause toggle, seek bar, current time display, 1x/1.5x/2x playback speed cycling.

6. **`src/routes/chat/[id]/+page.svelte`** — Major update:
   - New state: `editingMsgId`, `editingContent`, `editSaving`, `starredMessageIds`, `isRecording`, `recordingDuration`, `mediaRecorder`, `audioChunks`
   - Socket handlers: `message.edited` (updates content + editedAt), `message.deleted` (sets deletedAt, clears content)
   - `handleDeleteMessage`: now sets `deletedAt` optimistically (was `hidden: true`)
   - `startEditing` / `cancelEdit` / `submitEdit`: inline edit textarea replaces my bubble, PATCH on save
   - `handleStarMessage`: optimistic toggle, POST/DELETE star
   - `startRecording` / `finishRecording` / `cancelRecording` / `sendVoiceNote`: MediaRecorder API → upload → send type:'audio'
   - Voice recording bar replaces composer when `isRecording`
   - Mic button appears in composer when text input is empty
   - Message rendering: uses `formatMessageContent` for text, `{@html}` safe, "edited" label, `deletedAt` tombstone differentiated from `hidden` tombstone
   - `MessageContextMenu` updated with `onEdit`, `onStar`, `isStarred` props

7. **`src/routes/+page.svelte`** — Added:
   - `handleToggleArchive()`: calls `chats.archive()`/`chats.unarchive()`, removes from/adds to respective lists
   - `loadArchivedChats()`: lazy-loads archived list on first expand
   - Archive/Unarchive button in context menu bottom sheet
   - Collapsible "Archived" section at bottom of chat list

---

*This document was written by Claude on 2026-04-18. It reflects the exact state of the codebase at that point. Codex: you are now the lead. Build the next chapter.*
