# Agent Handoff — Folder Socket Sync Review

**Date:** 2026-05-15
**From:** Kimi K2.6 (implementation)
**To:** Codex (review + test)
**Context:** Phase 1 of folder management — real-time sync via Socket.IO

---

## What Was Implemented

Folder mutations now emit real-time socket events to the user's own room (`user:${userId}`), so folder changes propagate live across devices without waiting for sync polling.

### Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/events.ts` | Added 4 server event schemas + types: `ServerFolderUpsertEventSchema`, `ServerFolderDeleteEventSchema`, `ServerFolderItemUpsertEventSchema`, `ServerFolderItemDeleteEventSchema` |
| `services/api/src/features/chatFolders/routes.ts` | Added `fastify.io.to(`user:${userId}`).emit(...)` after every folder mutation: create, update, delete, add item, remove item, reorder |
| `apps/web/src/lib/stores/socket.svelte.ts` | Added `onFolderUpsert`, `onFolderDelete`, `onFolderItemUpsert`, `onFolderItemDelete` listener factories |
| `apps/web/src/lib/stores/folders.svelte.ts` | Added `upsertFolder`, `deleteFolder`, `upsertItem`, `deleteItem` methods for socket-driven state updates |
| `apps/web/src/routes/+layout.svelte` | Wired all 4 folder socket listeners in an `$effect` that updates `foldersStore` |

---

## Architecture Decisions

1. **Broadcast scope:** `user:${userId}` only. Folders are per-user; no other users should receive these events.
2. **Payload approach:** Full payload emitted (full `ChatFolder` or `ChatFolderItem`). Frontend updates store directly without REST roundtrip.
3. **Reorder emits individually:** Each reordered folder gets its own `folder.upsert` event. This is noisy but simple and consistent with the existing sync event pattern.
4. **Store methods are additive, not replacing existing optimistic updates:** The API methods (`create`, `update`, `remove`, etc.) still optimistically update the store. Socket events handle cross-device and background changes.

---

## Codex Review Checklist

### Backend
- [ ] **Socket emit placement:** Are the `fastify.io.to(...).emit(...)` calls placed *after* the DB transaction commits? (Yes — they are outside the tx block for create/update/delete/item ops; for reorder they are after the tx block)
- [ ] **Error handling:** If the DB transaction fails, no socket event should be emitted. Verify this is true for all 6 mutations.
- [ ] **Race conditions:** If two devices create folders simultaneously, do the socket events arrive in a sensible order? (Socket.IO guarantees ordering per room, so this should be fine)
- [ ] **User room membership:** Verify that `user:${userId}` rooms are joined on socket connection. Check `services/api/src/realtime/socket.ts` line ~65: `socket.join(`user:${payload.userId}`);`

### Frontend
- [ ] **Socket listener lifecycle:** The `$effect` in `+layout.svelte` registers listeners when `socketStore.isConnected` is true. If the socket reconnects, does Svelte re-run the effect and re-register? (Should — `$effect` re-runs on dependency change)
- [ ] **Duplicate events:** If the user makes a change on Device A, they receive the socket event on Device A too. Does `foldersStore.upsertFolder` handle this idempotently? (Yes — it finds existing and updates, or adds new)
- [ ] **Missing items on folder create:** The `upsertFolder` method adds new folders with `items: []`. If the backend emits a folder upsert for an existing folder that has items, the items are preserved (spread existing first). But if a *new* folder is created on another device and the event arrives, the local store won't have its items until a `folder_item.upsert` event arrives or a refresh happens. Is this acceptable? (Items are added separately; the sync engine handles this via sync batch. For socket events, we rely on item events arriving separately.)
- [ ] **Memory leaks:** The `$effect` returns an unsubscribe function. Verify it actually cleans up on socket disconnect.

### Integration / E2E
- [ ] **Two-device test:** Open the app in two browsers (or two incognito windows). Create a folder on Device A. Device B should see it appear live.
- [ ] **Reorder test:** Reorder folders on Device A. Device B should see the new order.
- [ ] **Move chat test:** Move a chat between folders on Device A. Device B should see it move.
- [ ] **Delete test:** Delete a folder on Device A. Device B should see it disappear.

### Type Safety
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm --workspace @penthouse/contracts run test` passes
- [ ] `npm --workspace @penthouse/api run test:integration` passes
- [ ] `npm --workspace @penthouse/web run test` passes

---

## Known Questions / Risks

1. **Reorder event noise:** Reordering 5 folders emits 5 separate socket events. This could be batched into a single `folders.reordered` event. Worth considering if performance becomes an issue.

2. **Item events arriving before folder event:** If Device A creates a folder and immediately adds a chat to it, Device B might receive `folder_item.upsert` before `folder.upsert`. The current `upsertItem` method silently does nothing if the folder doesn't exist (`f.id !== item.folderId` skips it). Should we queue orphaned item events? (Probably overkill for now.)

3. **Sync engine overlap:** The sync engine still writes folder ops to the local SQLite DB. The socket events update the reactive store directly. These two paths don't conflict, but they don't coordinate either. If a sync batch arrives while a socket event is being processed, the store might briefly show stale data until the socket event applies.

---

## Acceptance Criteria

Before signing off, verify:
- [ ] All tests pass (typecheck, contracts, backend integration, web unit)
- [ ] Two-device folder sync works for create, update, delete, reorder, add item, remove item
- [ ] No console errors during folder operations
- [ ] E2E suite still passes (Codex previously fixed 51/51)

---

End of handoff. Codex: run the review, fix anything you find, write a summary.
