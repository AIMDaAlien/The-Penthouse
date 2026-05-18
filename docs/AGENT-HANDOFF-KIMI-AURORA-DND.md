# Agent Handoff: DND Phase (Kimi → Aurora)

**Date:** 2026-05-15  
**From:** Kimi (backend + contract implementation)  
**To:** Aurora (frontend DND UX prototyping)  
**Phase:** Discord-style drag-and-drop for folder/chat sidebar  
**Approach:** A — text-list sidebar with adapted Discord DND patterns

---

## Executive Summary

Backend is fully implemented and tested. All typechecks pass. All 40 backend integration tests, 4 web unit tests, 17 E2E tests pass.

Your job is to **prototype the frontend UX** — animations, drag states, drop indicators, micro-interactions, and DND library choice. Do not implement backend changes. Do not touch the data model. Build against the contract below.

---

## Current Sidebar Architecture

```
DesktopShell.svelte
└── .pane-left (340px)
    └── ChatListPane.svelte
        ├── Header ("Messages" + New folder / New chat)
        └── .list (scrollable)
            ├── <details class="folder" open>
            │   ├── <summary class="folder-header">  ← draggable
            │   │   └── [color dot] Folder Name
            │   └── .folder-items
            │       └── ChatListItem[]              ← draggable
            ├── ...more folders...
            └── ChatListItem[] (unfoldered)         ← draggable
```

- Folders are native `<details>`/`<summary>` elements (collapse/expand)
- `ChatListItem` renders: avatar (48px), display name, preview text, time, unread badge
- Existing context menu (right-click / "more" button) handles "Move to folder" via click
- Folders sorted by `sortOrder` then `createdAt`
- Items within folders sorted by `sortOrder`

---

## Backend Contract (Implemented)

### Existing Endpoints (No Changes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/folders` | List all folders with items |
| `PATCH` | `/api/v1/folders/:id` | Update folder name/icon/color/sortOrder |
| `DELETE` | `/api/v1/folders/:id` | Delete folder + cascade items |
| `POST` | `/api/v1/folders/:id/items` | Add chat to folder (idempotent) |
| `DELETE` | `/api/v1/folders/:id/items/:chatId` | Remove chat from folder |
| `PATCH` | `/api/v1/folders/reorder` | Batch reorder folders |

### New Endpoints (Just Added)

#### 1. Reorder items within a folder
```
PATCH /api/v1/folders/:id/items/reorder
Content-Type: application/json

Body:
{
  "items": [
    { "chatId": "uuid", "sortOrder": 0 },
    { "chatId": "uuid", "sortOrder": 1 },
    ...
  ]
}

Response: 200
{
  "folder": {
    "id": "uuid",
    "userId": "uuid",
    "name": "string",
    "icon": "string|null",
    "color": "string|null",
    "sortOrder": 0,
    "createdAt": "ISO",
    "updatedAt": "ISO",
    "items": [
      { "folderId": "uuid", "chatId": "uuid", "sortOrder": 0, "createdAt": "ISO" },
      ...
    ]
  }
}

Socket event emitted: folder.upsert
```

**Behavior:** Validates all `chatId`s belong to the folder. Batch-updates `sort_order` in a transaction. Re-fetches folder with reordered items. Emits single `folder.upsert` socket event with full folder payload.

#### 2. Create folder with chats
```
POST /api/v1/folders
Content-Type: application/json

Body:
{
  "name": "string (1-64 chars)",
  "icon": "string? (max 32)",
  "color": "string? (max 32)",
  "chatIds": ["uuid", "uuid"]  // ← NEW optional field
}

Response: 200
{
  "folder": ChatFolder & { items: ChatFolderItem[] }
}

Socket event emitted: folder.upsert
```

**Behavior:** When `chatIds` provided, creates folder + inserts `chat_folder_items` rows in the same transaction. Items get sequential `sortOrder: 0, 1, 2...` matching array order. `onConflictDoNothing` prevents duplicates if a chat is already in the folder. Does **NOT** remove chats from their old folders — frontend must call `DELETE /folders/:oldId/items/:chatId` first if needed.

---

## Frontend Service API

```ts
// apps/web/src/lib/services/folders.ts

folders.list(): Promise<ListFoldersResponse>

folders.create(data: CreateFolderRequest): Promise<{ folder: ChatFolder & { items: ChatFolderItem[] } }>
// Note: CreateFolderRequest now includes optional chatIds: string[]

folders.update(id, data: UpdateFolderRequest): Promise<{ folder: ChatFolder }>

folders.delete(id): Promise<{ success: boolean }>

folders.addItem(folderId, data: AddFolderItemRequest): Promise<{ item: ChatFolderItem }>

folders.removeItem(folderId, chatId): Promise<{ success: boolean }>

folders.reorder(data: ReorderFoldersRequest): Promise<{ success: boolean }>

folders.reorderItems(folderId, data: ReorderFolderItemsRequest): Promise<{ folder: ChatFolder & { items: ChatFolderItem[] } }>
// NEW — batch reorder items within a folder
```

---

## Frontend Store API

```ts
// apps/web/src/lib/stores/folders.svelte.ts

foldersStore.folders           // FolderWithItems[] — reactive $state
foldersStore.loading           // boolean
foldersStore.loaded            // boolean
foldersStore.error             // string

foldersStore.load({ force? })  // Promise<void>

foldersStore.create(name, icon?, color?, chatIds?): Promise<ChatFolder>
// Now accepts optional chatIds array

foldersStore.update(id, patch): Promise<ChatFolder>

foldersStore.remove(id): Promise<void>

foldersStore.moveChat(folderId, chatId, fromFolderId?): Promise<void>
// Removes from old folder (if fromFolderId), adds to new, then force-reloads

foldersStore.removeChat(folderId, chatId): Promise<void>
// Removes item, then force-reloads

foldersStore.reorder(order: { id, sortOrder }[]): Promise<void>
// Optimistic: re-sorts local array before API call

foldersStore.reorderItems(folderId, itemOrder: { chatId, sortOrder }[]): Promise<void>
// NEW — optimistic: replaces folder items locally, then API call

foldersStore.upsertFolder(folder)   // Socket sync handler
foldersStore.deleteFolder(folderId) // Socket sync handler
foldersStore.upsertItem(item)       // Socket sync handler
foldersStore.deleteItem(folderId, chatId) // Socket sync handler

foldersStore.reset() // Clears all state
```

---

## DND Interaction Map

| # | User Action | Frontend Behavior | Backend Call |
|---|-------------|-------------------|--------------|
| 1 | **Drag folder header** up/down | DND zone on folder list. On drop, compute new sortOrder for all affected folders. | `foldersStore.reorder([...])` |
| 2 | **Drag chat** within same folder | DND zone on `folder.items`. On drop, compute new sortOrder for all items in folder. | `foldersStore.reorderItems(folderId, [...])` |
| 3 | **Drag chat** onto another folder header | Cross-zone drop. Detect folder header as drop target. | `foldersStore.moveChat(targetFolderId, chatId, sourceFolderId)` |
| 4 | **Drag unfoldered chat** onto another unfoldered chat | Hover threshold (~500ms) triggers "create folder" state. On drop, prompt for folder name. | `foldersStore.create(name, undefined, undefined, [chatA, chatB])` |
| 5 | **Drag chat** out of folder to root/unfoldered area | Drop on root zone below all folders. | `foldersStore.removeChat(folderId, chatId)` |

---

## Socket Sync Events

All folder mutations emit real-time sync events via Socket.IO. The frontend `+layout.svelte` already wires these:

```ts
// Already implemented in +layout.svelte
onFolderUpsert((e) => foldersStore.upsertFolder(e.payload))
onFolderDelete((e) => foldersStore.deleteFolder(e.payload.folderId))
onFolderItemUpsert((e) => foldersStore.upsertItem(e.payload))
onFolderItemDelete((e) => foldersStore.deleteItem(e.payload.folderId, e.payload.chatId))
```

**No new socket events needed.** Item reorder is modeled as a `folder.upsert` (full folder with reordered items).

---

## What to Prototype

The user wants to see **animations, micro-interactions, and design** before any DND implementation code is written.

### Required Prototype Elements

1. **Drag initiation**
   - How does the user start dragging? (drag handle vs whole row?)
   - Cursor change? (`grab` → `grabbing`)
   - Lift animation? (scale up, shadow, opacity change)

2. **Drag ghost / preview**
   - What's visually dragged? Full row clone? Simplified card? Avatar + name only?
   - Opacity of original element while dragging?

3. **Drop indicators**
   - Where will the item land? Horizontal line between rows?
   - Animated line or static indicator?
   - Color of indicator? (`--p-accent`?)

4. **Folder header as drop target**
   - Visual feedback when hovering a chat over a folder header
   - Background highlight? Border glow? Expand the folder?

5. **Create-folder-from-drag**
   - Visual feedback when hovering one unfoldered chat over another
   - ~500ms delay before triggering "create folder" state
   - What does the "create folder" preview look like?

6. **Root / unfoldered drop zone**
   - Visual feedback when dragging a chat out of a folder to the root area
   - Highlight the entire unfoldered section?

7. **Keyboard accessibility**
   - Space to grab, arrow keys to move, Enter to drop, Escape to cancel
   - Focus ring behavior?

### Constraints

- **Svelte 5 runes** — `$state`, `$derived`, `$effect`
- **No DND library pre-selected** — you recommend: `svelte-dnd-action`, `@dnd-kit/core`, raw HTML5 Drag and Drop API, or other
- **Keep text-list visual model** — do not redesign into Discord's icon strip
- **Respect existing design tokens** — `var(--p-accent)`, `var(--p-surface-2)`, `var(--p-line)`, `var(--radius-lg)`, etc.
- **`<details>`/`<summary>` stays** — folders collapse/expand independently of DND
- **No backend changes** — the contract above is frozen

### Key Reference Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/components/ChatListPane.svelte` | Sidebar layout, folder rendering, `<details>` blocks |
| `apps/web/src/lib/components/ChatListItem.svelte` | Chat row component (avatar, name, preview, badge) |
| `apps/web/src/lib/stores/folders.svelte.ts` | Folder store with `reorderItems`, `create`, `moveChat` |
| `apps/web/src/lib/services/folders.ts` | API service wrappers |
| `apps/web/src/routes/+layout.svelte` | Socket event wiring for folder sync |

---

## Deliverable

A prototype package containing:

1. **Recommended DND library** with rationale
2. **Svelte component mockups** or **detailed design spec** showing all 7 interaction states
3. **Animation descriptions** (timing, easing, transforms)
4. **CSS/styling notes** using existing design tokens
5. **Accessibility behavior** for keyboard-only operation

The implementation team (Kimi or next agent) will build the production version against your prototype.

---

## Test Status (All Green)

| Suite | Result |
|-------|--------|
| Backend typecheck | ✅ 0 errors |
| Backend integration tests | ✅ 40/40 pass |
| Contracts build | ✅ Clean |
| Web typecheck | ✅ 0 errors (4 pre-existing Svelte warnings) |
| Web unit tests | ✅ 4/4 pass |
| Playwright E2E (chromium) | ✅ 17/17 pass |
| Playwright E2E (all browsers) | ✅ 51/51 pass |

---

## Files Changed in This Handoff

### Contracts
- `packages/contracts/src/api.ts` — Added `ReorderFolderItemsRequestSchema`, `FolderItemReorderEntrySchema`, extended `CreateFolderRequestSchema` with `chatIds`

### Backend
- `services/api/src/features/chatFolders/routes.ts` — Added `PATCH /folders/:id/items/reorder`, extended `POST /folders` to handle `chatIds`

### Frontend Services
- `apps/web/src/lib/services/folders.ts` — Added `reorderItems()`, updated `create()` return type

### Frontend Store
- `apps/web/src/lib/stores/folders.svelte.ts` — Added `reorderItems()`, updated `create()` to accept `chatIds`

### Migrations
- `services/api/src/db/migrations/0009_banner_media_id.sql` — (unrelated, from prior phase)

---

## Open Questions for Prototype to Resolve

1. **DND library choice** — `svelte-dnd-action` vs `@dnd-kit` vs raw HTML5?
2. **Drag handle vs whole-row drag** — Discord drags the whole server icon. Should we use a dedicated drag handle (⋮⋮) or make the whole row draggable?
3. **Folder expansion on hover** — Should hovering a folder header during drag auto-expand it after a delay?
4. **Touch/mobile behavior** — Long-press to initiate drag? How does the prototype feel on touch?
5. **Empty folder state** — What does an empty folder look like during DND? (Drop target for "move here")
6. **Unfoldered zone label** — Should there be a visual "Unfoldered" or "Direct Messages" header for the root area?
