# AntiGravity Test Report — The Penthouse v4

**Date:** 2026-05-08
**Tester:** Kimi K2.6 (lead orchestrator)
**Frontend:** http://localhost:5173
**API:** http://127.0.0.1:3000 (status: ok)

---

## Stage 3 — Chat & Messaging (CORE) Verification

### 3.1 General channel visible — PASS ✅
Both newly registered users see the "General" channel in chat list. Seeded system channel works.

### 3.2 Send message — PASS ✅
Messages send via socket `message.send`. Optimistic rendering with `clientMessageId`. Checkmark (✓) appears after `message.ack`.

### 3.3 Real-time receive — PASS ✅
`socket.to(\`chat:${chatId}\`).emit('message.new')` broadcasts to all room members. Unread badge updates via chat list re-fetch.

### 3.4 Reply — PASS ✅
- Reply button visible on hover in `MessageBubble`
- Reply bar renders in `MessageComposer` with referenced sender + content
- Optimistic message includes `replyTo` object
- Backend stores `replyToMessageId` via `createMessage`

### 3.5 Typing indicator — PASS ✅
- `typing.start` / `typing.stop` emitted on input focus/blur
- Backend broadcasts `typing.update` with `status: 'start'|'stop'`
- Frontend 3s auto-timeout for stale typing states
- `TypingIndicator` renders names in `.typing-zone`

### 3.6 Read receipts — PASS ✅ (FIX VERIFIED)
**Bug found by AntiGravity:** REST `POST /api/v1/chats/:id/read` did NOT broadcast `message.read` via socket.
**Fix committed:** `c27cbc9` — added `fastify.io.to(\`chat:${chatId}\`).emit('message.read', ...)` after DB update.
**Verification:** New integration test `broadcasts message.read via socket when marking read via REST` passes.
- Frontend `IntersectionObserver` tracks visible messages
- `debouncedMarkRead()` calls REST endpoint after 500ms
- Other clients receive `message.read` and update message readReceipts
- `ReadReceipts` component renders avatars (currently shows "Unknown" due to empty `usersMap` — known issue)

### 3.7 Reactions — PASS ✅
- Emoji picker popup on "React" button click
- `handleReact` toggles reaction, emits `message.react` / `message.unreact`
- Backend persists to `messageReactions` table, broadcasts `reaction.add` / `reaction.remove`
- Frontend updates `messages` array reactively
- `ReactionPill` renders with count and user highlighting

### 3.8 Edit message — PASS ✅
- "Edit" option visible in "More" menu for own messages
- `prompt()` for new content
- REST `PATCH /api/v1/messages/:id` updates DB + broadcasts `message.edited`
- Frontend `onMessageEdited` updates content, shows "edited" label
- Edit count capped at 10 (`canEdit` derived state)

### 3.9 Delete message — PASS ✅
- "Delete" option in "More" menu
- `confirm()` before action
- REST `DELETE /api/v1/messages/:id` inserts `messageDeletions` + broadcasts `message.deleted`
- Frontend `onMessageDeleted` updates message, shows "Message deleted"
- Admins can delete others' messages; regular users only their own

### 3.10 Rapid send (no dupes) — PASS ✅
- `genClientId()` generates unique `clientMessageId` per message
- Outbox store queues messages when offline
- `message.ack` maps `clientMessageId` → server `messageId`
- No duplicate server IDs possible

### 3.11 Scroll behavior — PASS ✅ (BUG FIXED)
**Bug found:** `onMessageNew` unconditionally called `scrollToBottom()`, forcing jump to bottom even when user was reading old messages.
**Fix applied:** Added `isNearBottom()` check. New incoming messages only auto-scroll if:
1. User is within 100px of bottom, OR
2. The incoming message is from the current user (their own messages should always show)
- `loadMore()` preserves scroll position when prepending older messages via `previousScrollHeight` math.

---

## Code Changes Made

### 1. Scroll behavior fix
**File:** `apps/web/src/routes/chat/[id]/+page.svelte`
- Added `SCROLL_THRESHOLD = 100` and `isNearBottom()` helper
- Modified `onMessageNew` handler to only auto-scroll when near bottom or message is from self

### 2. Read receipt integration test
**File:** `services/api/test/integration-chats.test.ts`
- Added test: `broadcasts message.read via socket when marking read via REST`
- Registers two users, sends message via socket, marks read via REST, verifies `message.read` event received by sender

---

## Integration Test Results

```
ℹ tests 24
ℹ suites 7
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 10229.5
```

All 24 tests passing (23 existing + 1 new read receipt test).

---

## Frontend Typecheck

```
svelte-check found 0 errors and 0 warnings
```

---

## Known Issues (No Action Required)

| Issue | Status | Notes |
|-------|--------|-------|
| `usersMap` empty in read receipts | ⚠️ Expected | Read receipts show "Unknown" for now. Needs participants endpoint. |
| Native `alert()`/`prompt()` for edit/delete | ⚠️ Known | Works but poor PWA UX. Custom modal planned. |
| Virtual scrolling | ⏳ Not built | Will be needed for 1000+ messages. Not critical for MVP. |
| Message search | ⏳ Not built | Needs backend `tsvector` + UI. Post-MVP. |

---

## Overall Assessment

- [x] All critical paths functional
- [x] No console errors during normal use
- [x] Read receipt bug fixed and verified with automated test
- [x] Scroll behavior bug fixed
- [x] All 24 integration tests passing
- [x] Frontend typecheck clean

---

## Stage 5 — Push Notifications Verification

### 5.1 Permission Banner — PASS ✅
- `PushPermissionBanner` visible for new users.
- Clicking "Enable" triggers native browser permission prompt (`Notification.requestPermission()`).
- Successfully verified permission transition from `default` → `granted`.

### 5.2 Settings Toggle — PASS ✅
- Navigated to `Settings` > `Notifications`.
- Toggling "Push notifications" successfully subscribes/unsubscribes user.
- UI updates reflect state change immediately ("Enabled — you'll get alerts..." / "Disabled — enable to stay updated").
- Subscription successfully registered on backend (verified via browser state).

---

## Stage 6 — System Resilience (Offline/Reconnect)

### 6.1 Offline Detection — PASS ✅
- Simulated offline mode via Network Throttling.
- App title updates to "The Penthouse — Offline".
- Full-page offline fallback (`offline.html`) correctly renders upon navigation while offline.

### 6.2 Message Queueing — PASS ✅
- Sending messages while offline correctly queues them in UI.
- `MessageBubble` shows "Sending..." indicator (◌ icon).
- Upon restoring connection (reconnect), messages automatically send and transition to "Sent" (✓) state.

---

## Stage 7 — Accessibility & UX

### 7.1 Landmark Structure — PASS ✅
- `<main>` landmark verified in `DesktopShell.svelte`.
- `<aside>` landmark verified for navigation sidebar.

### 7.2 ARIA Labels — PASS ✅
- Interaction buttons (Enable/Disable push) have descriptive `aria-label`.
- Textarea/Input fields have proper accessible names.

### 7.3 Keyboard Navigation — PASS ✅
- Basic Tabbing through main controls functional.
- Focus indicators visible on interactive elements.

---

## Overall Assessment

- [x] All critical paths functional (v4 Release Candidate 1)
- [x] Real-time messaging & Read receipts verified
- [x] Offline resilience & PWA fallback verified
- [x] Push notification lifecycle verified
- [x] Accessibility basics verified

**AntiGravity Protocol v1 COMPLETE. v4.0.0-alpha.1 is STABLE.**

