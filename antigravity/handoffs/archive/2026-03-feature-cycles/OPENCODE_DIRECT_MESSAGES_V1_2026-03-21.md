Implement Direct Messages v1 for The Penthouse rebuild. Use this prompt as the contract. Keep scope tight to this slice.

Project context
- The Penthouse rebuild is already live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts in packages/contracts
- Existing chats already support `type = 'dm' | 'channel'`
- Existing systems already exist for:
  - messages
  - media/files/GIFs
  - typing
  - read state
  - push notifications
  - moderation tombstones
  - admin audit/moderation

Goal
Add 1:1 DMs by reusing the existing chat stack, with first-send creation, per-thread mute, mixed-list presentation, and admin audit/moderation support.

Locked decisions
- 1:1 only
- any active member can DM any other active member
- one DM thread per pair
- create on first send, not on open
- DMs mixed into the existing chat list
- full parity with current message/media/GIF/push/read/typing behavior
- admins can audit and moderate DMs
- include a minimal per-thread mute control in v1
- show an in-app notice that admins can review DMs for safety
- no archive, leave, delete, report, blocklist, or group-DM controls in this slice

Implement this exact slice

1. Backend DM identity + storage
- Add a new migration that creates a `direct_chats` table keyed by `chat_id`.
- Store the two participant ids in a stable ordered form and enforce uniqueness so only one DM exists per pair.
- Keep `chat_members` as the membership and read-state table for DMs.
- Do not create a second message system or second membership system for DMs.

2. DM creation endpoint
- Add `POST /api/v1/chats/dm`.
- Request shape: `{ memberId }`.
- Behavior:
  - reject self
  - reject removed/banned target members
  - find the existing DM for the pair if it already exists
  - otherwise create:
    - `chats` row with `type = 'dm'`
    - `direct_chats` row
    - the two `chat_members` rows
  - return the resolved chat summary
- This endpoint is the only DM-creation path for v1.

3. Per-thread mute
- Add a `notifications_muted` boolean to `chat_members` with default `false`.
- Add `PATCH /api/v1/chats/:chatId/preferences` with `{ notificationsMuted }`.
- Scope it to the current user’s own membership row only.
- Mute must suppress for that user only:
  - backend push sends
  - app local background notification fallback
  - app in-app foreground toasts
- Mute must NOT suppress:
  - message delivery
  - unread counts
  - chat list updates

4. Chat summary shape
- Extend `ChatSummarySchema` with optional DM-useful fields:
  - `counterpartMemberId`
  - `counterpartAvatarUrl`
  - `notificationsMuted`
- For DMs, resolve the viewer-facing `name` server-side from the counterpart member.
- Do not store viewer-relative names in the DB.
- For channels, existing behavior should remain as-is.

5. Member chat behavior
- DMs should use the existing:
  - `GET /api/v1/chats`
  - `GET /api/v1/chats/:chatId/messages`
  - `POST /api/v1/chats/:chatId/messages`
  - `POST /api/v1/chats/:chatId/read`
  - typing/presence/push/realtime message flows
- If one participant later becomes removed or banned:
  - keep historical messages readable to the remaining participant
  - make the DM read-only
  - composer should be disabled on the client with a clear unavailable state
- Existing moderation/tombstone behavior should apply to DMs the same way it applies to channels.

6. Admin visibility and moderation
- Add `GET /api/v1/admin/chats` so admins can browse all chats, including DMs, in the moderation UI.
- This should not be limited to the signed-in admin’s own memberships.
- For admin DM rows, use a stable label such as `@alice + @bob`.
- Update the admin moderation UI to use this admin chat list instead of the signed-in user’s own `chats`.
- Admin audit and hide/unhide moderation should work on DM messages unchanged.

7. Frontend entry flow
- Add a `Message` button to `MemberProfileSheet`.
- Keep `MemberDirectory` opening the profile sheet on tap; do not change it into a direct-open DM list.
- If a DM with that member already exists, open it directly.
- If no DM exists yet:
  - open a provisional DM compose state in the chat area
  - do not create a chat row yet
  - on first send, call `POST /api/v1/chats/dm`
  - then send through the normal chat send path
  - replace the provisional state with the real chat

8. Frontend DM UI
- Keep DMs mixed into the current chat list, sorted by `updatedAt`.
- Distinguish DMs visually with counterpart avatar/name while preserving the current channel styling.
- Add a lightweight DM thread strip/header above the message list that includes:
  - counterpart identity
  - mute toggle
  - one-line notice like “Admins can review messages for safety”
- Do not add a separate DM screen, tab, or archive flow.

9. App plumbing
- Add provisional DM state to the app shell in the smallest clean way.
- The provisional DM state must support:
  - text send
  - media send
  - GIF send
- Once the real chat exists, all subsequent behavior should use the normal selected chat id.
- Notification suppression logic in `App.vue` must respect per-chat mute for both real-time toasts and the local background fallback path.

10. Tests
- Backend
  - first DM create succeeds for two active users
  - repeated create returns the same DM
  - self-DM create fails
  - removed/banned target fails
  - DM summaries resolve counterpart name/avatar and mute state correctly per viewer
  - per-chat mute patch only changes the current user’s membership row
  - muted DMs suppress push for the muted recipient only
  - muted DMs still produce unread count/list updates
  - read-only DM state after counterpart removal/ban
  - admin chat list includes DMs
  - admin audit/moderation still works on DMs
- Frontend
  - profile sheet shows Message action
  - existing DM opens directly
  - new DM stays provisional until first send
  - first send resolves DM and lands in the real chat
  - DM rows render correctly in the mixed list
  - mute suppresses toast/local notification behavior
  - admin visibility notice appears in DM thread UI
  - read-only unavailable state renders when counterpart is inactive
  - admin moderation UI can select and inspect DMs

11. Scope discipline
- no group DMs
- no blocklists
- no report flow
- no archive/hide-from-list
- no delete/leave controls
- no new operator/deployment tooling

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/db/migrate.ts`
- new DB migration after `010_message_moderation.sql`
- `services/api/src/routes/chats.ts`
- `services/api/src/routes/admin.ts`
- `services/api/src/routes/members.ts` only if you need small shared user helpers, not for DM APIs
- `services/api/src/push/fcm.ts`
- `services/api/src/realtime/socket.ts` only if a DM-specific realtime edge needs it
- `services/api/src/utils/users.ts`
- `apps/mobile/src/App.vue`
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/components/ChatListPanel.vue`
- `apps/mobile/src/components/MemberProfileSheet.vue`
- `apps/mobile/src/components/MessageComposer.vue` only if provisional state needs a tiny interface extension
- `apps/mobile/src/components/AdminModerationManagement.vue`
- relevant tests and concise obsidian docs

Validation
- run relevant mobile tests
- run relevant backend tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. New API / contract / behavior shapes
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
