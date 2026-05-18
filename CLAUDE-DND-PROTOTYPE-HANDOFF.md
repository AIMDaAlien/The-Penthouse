# Claude DND Prototype Handoff

## Context

We're implementing **Discord-style drag-and-drop** for the folder/chat sidebar in The Penthouse. The user chose **Approach A**: adapt Discord's DND interaction patterns to our existing **text-list sidebar** (not a visual icon strip).

**Backend is fully implemented** (see below). You are prototyping the **frontend UI/UX** — animations, micro-interactions, drag states, drop indicators, and the overall feel of the DND feature.

## Current Sidebar Structure

```
ChatListPane.svelte
├── Header ("Messages" + New folder / New chat buttons)
└── .list (scrollable)
    ├── <details class="folder" open>     ← collapsible folder
    │   ├── <summary class="folder-header">  ← draggable
    │   │   └── folder name + color dot
    │   └── .folder-items
    │       └── ChatListItem[]              ← draggable
    ├── ...more folders...
    └── ChatListItem[] (unfoldered)         ← draggable
```

- Folders use native `<details>`/`<summary>` for collapse/expand
- `ChatListItem` renders avatar (48px), name, preview, unread badge
- Existing context menu handles "Move to folder" via click (not drag)

## Backend Contract (Implemented & Ready)

### Already Existed

| Action | Endpoint |
|--------|----------|
| Reorder folders | `PATCH /api/v1/folders/reorder` |
| Move chat to folder | `POST /folders/:id/items` |
| Remove chat from folder | `DELETE /folders/:id/items/:chatId` |
| Create empty folder | `POST /api/v1/folders` |

### New (Just Implemented)

#### 1. Reorder chats within a folder
```
PATCH /api/v1/folders/:id/items/reorder
Body: { items: [{ chatId: string, sortOrder: number }] }
Response: { folder: ChatFolder & { items: ChatFolderItem[] } }
Socket: folder.upsert (full folder with reordered items)
```

#### 2. Create folder with chats
```
POST /api/v1/folders
Body: { name, icon?, color?, chatIds?: string[] }
Response: { folder: ChatFolder & { items: ChatFolderItem[] } }
Socket: folder.upsert (full folder with items)
```

### Frontend Store Methods (Ready)

```ts
foldersStore.reorder(order: { id, sortOrder }[])       // folder reorder
foldersStore.reorderItems(folderId, itemOrder)         // item reorder
foldersStore.create(name, icon?, color?, chatIds?)     // create folder (now with chats)
foldersStore.moveChat(folderId, chatId, fromFolderId?) // move between folders
foldersStore.removeChat(folderId, chatId)              // remove from folder
```

## DND Interaction Map

| User Action | Frontend Calls |
|-------------|---------------|
| **Drag folder header up/down** | `foldersStore.reorder([...])` |
| **Drag chat within same folder** | `foldersStore.reorderItems(folderId, [...])` |
| **Drag chat onto another folder header** | `foldersStore.moveChat(targetFolderId, chatId, sourceFolderId)` |
| **Drag unfoldered chat onto another unfoldered chat** | Prompt name → `foldersStore.create(name, undefined, undefined, [chatA, chatB])` |
| **Drag chat out of folder to root** | `foldersStore.removeChat(folderId, chatId)` |

## What You Should Prototype

The user wants to see **animations, micro-interactions, and design** before implementation. Create prototypes for:

1. **Drag initiation**: What does grabbing a folder header or chat row feel like? Cursor change? Lift animation?
2. **Drag ghost/preview**: What's dragged — a clone of the row, a simplified version, or something else?
3. **Drop indicators**: Where is the item being inserted? A line between rows? A highlighted zone?
4. **Folder header as drop target**: How does a folder header look when a chat is hovering over it? Glow? Background change?
5. **Create-folder-from-drag**: Visual feedback when hovering one chat over another (delay ~500ms before triggering "create folder" state)
6. **Empty state / root zone**: How does the unfoldered area look when dragging out of a folder?
7. **Keyboard/accessibility**: How does this work without a mouse? (Escape to cancel, Space to grab, arrow keys to move)

## Constraints

- **Svelte 5 runes** — use `$state`, `$derived`, `$effect`
- **No DND library chosen yet** — you decide whether to recommend `svelte-dnd-action`, `@dnd-kit`, raw HTML5 DnD, or something else
- **Keep the text-list visual model** — don't redesign into an icon strip
- **Respect the existing design system** — OKLCH tokens, `var(--p-accent)`, `var(--p-surface-2)`, etc.
- **The `<details>`/`<summary>` collapse behavior stays** — folders expand/collapse independently of DND

## Key Files to Reference

- `apps/web/src/lib/components/ChatListPane.svelte` — sidebar layout
- `apps/web/src/lib/components/ChatListItem.svelte` — chat row component
- `apps/web/src/lib/stores/folders.svelte.ts` — folder store (has `reorderItems`, `create`, etc.)
- `apps/web/src/lib/services/folders.ts` — API wrappers

## Deliverable

A prototype (HTML/Svelte files or detailed design doc) showing the DND interactions with animations and states. The implementation team will build against this.
