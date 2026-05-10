# Kimi Rebuild Follow-ups

## Phase 2 Carryover

- GIF proxy: Replace the mock Giphy endpoint with a server-side proxy before production so provider details and API keys stay off the client.
- Direct picker uploads: Let emote and sticker pickers upload files directly instead of requiring media upload followed by emote or sticker creation.

## Phase 3 Carryover

- Folder drag-and-drop: Add drag-and-drop folder organization after choosing and testing the DnD dependency on desktop and mobile.
- ~~Channel member inheritance for late joiners~~ — FIXED: `assertChatMember` now auto-inherits child channel membership from parent.
- Channel gating: Decide whether channel creation should be restricted to top-level group/channel chats instead of DMs.
- Channel deletion: Add `DELETE /api/v1/channels/:id` if operators need channel cleanup.
- Folder socket events: Add real-time folder rename, reorder, add, and remove events so other devices do not need a refresh.
