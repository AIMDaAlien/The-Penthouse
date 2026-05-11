# Agent Handoff — Codex: Backend Test Expansion

**Date:** 2026-05-09
**Scope:** Expand integration test coverage for custom emotes/stickers and pin permissions
**Rule:** Tests don't count against the 3-file rule. Touch only test files.

---

## Context

The backend routes for custom emotes, stickers, and pins are fully implemented and passing all existing tests (24/24). However, coverage is thin in two areas:

1. **Custom emotes/stickers:** Only 1 integration test exists (`integration-custom-emotes.test.ts`). It covers ownership checks but misses list, delete, pack CRUD, admin override, and public pack visibility.
2. **Pin permissions:** Pin/unpin endpoints enforce sender-or-admin rules, but no test verifies the 403 rejection path.

---

## Task 1: Expand `integration-custom-emotes.test.ts`

**Current state:** 1 test (~82 lines). Tests that users can't use another user's image upload.

**Add these tests:**

### Emote CRUD
- `lists empty emotes for new user` — GET /api/v1/emotes returns `{ emotes: [] }`
- `creates, lists, and deletes an emote` — full lifecycle
- `forbids non-owner from deleting emote` — user A creates, user B gets 403 on DELETE
- `allows admin to delete any emote` — admin deletes user A's emote successfully

### Sticker Pack CRUD
- `lists empty packs for new user` — GET /api/v1/sticker-packs returns `{ packs: [] }`
- `creates, lists, and deletes a pack` — full lifecycle
- `forbids non-owner from deleting pack` — user B gets 403 on DELETE
- `allows admin to delete any pack` — admin deletes user A's pack successfully

### Sticker CRUD
- `adds, lists, and deletes stickers in a pack` — full lifecycle
- `forbids non-owner from adding stickers` — user B gets 403 on POST
- `forbids non-owner from deleting stickers` — user B gets 403 on DELETE
- `allows admin to delete any sticker` — admin deletes user A's sticker successfully

### Pack Visibility
- `allows other users to view public packs` — set `isPublic = true`, user B can list stickers
- `forbids other users from viewing private packs` — default `isPublic = false`, user B gets 403

**Helper already exists:** `insertImageUpload(userId)` in the same file inserts a mock `media_uploads` row.

**Pattern to follow:** See `integration-chats.test.ts` for `registerUser(app, 'username')` and `testApp()` usage.

---

## Task 2: Add pin permission tests to `integration-chats.test.ts`

**Current state:** `pins, lists, and unpins messages over REST` test covers the happy path.

**Add these tests:**

- `forbids non-sender from pinning a message` — user A sends, user B tries to pin → 403
- `allows admin to pin any message` — admin pins user A's message → 200
- `forbids non-pinner from unpinning a message` — user A pins, user B tries to unpin → 403
- `allows admin to unpin any message` — admin unpins user A's pin → 200

**Note:** The REST endpoints return 403 with `forbidden()` helper. The socket handlers throw `Error` strings — socket tests for permission denial are optional (focus on REST first).

---

## Quality Gate

Run `cd /Users/aim/Documents/The-Penthouse-Kimi && npm run test --workspace=services/api` and confirm all tests pass including the new ones.

---

## Files to Modify

| File | Action |
|------|--------|
| `services/api/test/integration-custom-emotes.test.ts` | Expand with new tests |
| `services/api/test/integration-chats.test.ts` | Add pin permission tests |
