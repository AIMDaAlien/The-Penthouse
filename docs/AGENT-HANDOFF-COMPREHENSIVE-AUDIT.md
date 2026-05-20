# Agent Handoff — Comprehensive Audit

**Date:** 2026-05-15
**From:** Kimi K2.6 (frontend implementation)
**To:** Codex (audit + test repair)
**Context:** Group chat + channel + DM management frontend is now wired. Need comprehensive audit of the full stack.

---

## What Just Landed

### Backend (Codex implemented)
- `chat_type` enum expanded: `['dm', 'group', 'channel']`
- `chat_members.role` enum: `['owner', 'admin', 'member']`
- New routes: `POST /chats/group`, `PATCH /chats/:id`, `DELETE /chats/:id`, `POST /chats/:id/archive`, `POST /chats/:id/unarchive`, `POST /chats/:id/members`, `DELETE /chats/:id/members/:memberId`, `POST /chats/:id/leave`, `GET /chats/:id/members`
- Channel routes updated with auth checks for delete/rename
- DB migrations: `0007_chat_type_group.sql`, `0008_group_chat_roles.sql`

### Frontend (Kimi implemented)
- `chatsStore`: `createGroup`, `deleteChat`, `archive`, `unarchive`
- `channelsStore`: `delete`, `update`
- `ChatListPane.svelte`: Fixed dead "New chat" button, added inline group creation form
- `chat/[id]/+page.svelte`: Added chat actions menu (members modal, archive, leave, delete)
- `ChannelList.svelte`: Added hover-reveal rename/delete actions
- `chats.ts` service: Added `listMembers`
- `channels.ts` service: Added `delete`, `update`

---

## Audit Scope

### 1. E2E Test Suite
**Status:** Currently failing. `apps/web/test-results/` has many failure artifacts.

Run:
```bash
cd apps/web && npx playwright test
```

**Expected issues:**
- V5 redesign changed DOM structure, selectors likely broken
- New chat actions menu may interfere with existing tests
- Group creation flow not covered by existing tests
- Channel rename/delete not covered

**Files to check:**
- `apps/web/e2e/auth-flow.spec.ts`
- `apps/web/e2e/auth-chat.spec.ts`
- `apps/web/e2e/folders-channels.spec.ts`
- `apps/web/e2e/voice.spec.ts`
- `apps/web/e2e/audio-messages.spec.ts`
- `apps/web/e2e/local-sync.spec.ts`

### 2. Backend Integration Tests
**Status:** 39/39 passing. But need new tests for:
- Group chat creation
- Member add/remove
- Leave chat
- Archive/unarchive
- Channel delete/rename auth checks
- Role-based permissions (owner/admin/member)

**File to extend:**
- `services/api/test/integration-groups.test.ts` (new, started by Codex)
- `services/api/test/integration-sync.test.ts`

### 3. Contract Tests
**Status:** 33/33 passing. But verify new schemas are tested:
- `CreateGroupChatRequestSchema`
- `UpdateChatRequestSchema`
- `AddChatMemberRequestSchema`
- `ArchiveChatResponseSchema`
- `DeleteChatResponseSchema`

### 4. Frontend Type Safety
**Status:** `svelte-check` 0 errors, 4 pre-existing warnings.

**Check:**
- `ChatSummary` type includes `archivedAt` and `role` fields where expected
- `ChannelList` props are correctly typed everywhere it's used
- `chats.listMembers` response type matches backend

### 5. API Consistency Check
Verify these patterns are consistent across the stack:

| Feature | Contract | Backend Route | Frontend Service | Frontend Store | Frontend UI |
|---------|----------|---------------|------------------|----------------|-------------|
| Create group | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Archive | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add member | ✅ | ✅ | ✅ | ❌ (no UI) | ❌ |
| Remove member | ✅ | ✅ | ✅ | ❌ (no UI) | ❌ |
| Leave | ✅ | ✅ | ✅ | ❌ (no UI) | ✅ |
| List members | ✅ | ✅ | ✅ | ❌ (no UI) | ✅ |
| Rename channel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete channel | ✅ | ✅ | ✅ | ✅ | ✅ |

**Gaps:** Add/remove member UI is missing — not in scope for this handoff but flag it.

### 6. Security / Auth Audit
- `DELETE /chats/:id` — verify only owner can delete group, only participants can delete DM
- `DELETE /chats/:id/channels/:channelId` — verify only group owner/admin can delete
- `PATCH /chats/:id` — verify only owner can rename group
- `POST /chats/:id/members` — verify only owner/admin can add
- `DELETE /chats/:id/members/:memberId` — verify only owner can remove, self can leave
- `POST /chats/:id/leave` — verify participant can leave, owner cannot leave without transferring ownership

### 7. Sync / Real-time Audit
- Member add/remove emits sync tombstones to affected users
- Chat delete emits `chat.delete` sync op
- Channel delete emits `channel.delete` sync op
- Frontend sync engine handles `chat.delete` and `channel.delete` ops correctly
- Check `apps/web/src/lib/sync/operations.ts` and `apps/web/src/lib/sync/queries.ts`

### 8. DB Migration Safety
- `0007_chat_type_group.sql` — `ALTER TYPE ... ADD VALUE` is safe but verify it works on fresh DBs
- `0008_group_chat_roles.sql` — verify `UPDATE` statements set correct owners for seeded data
- `chats_type_parent_invariant` CHECK constraint — verify it doesn't break existing edge cases

---

## Files to Read

### Backend
- `services/api/src/routes/chats.ts` (new group/member/archive routes)
- `services/api/src/features/channels/routes.ts` (updated delete/rename)
- `services/api/src/features/chats/schema.ts`
- `services/api/src/db/enums.ts`
- `services/api/src/db/migrations/0007_chat_type_group.sql`
- `services/api/src/db/migrations/0008_group_chat_roles.sql`
- `services/api/test/integration-groups.test.ts`

### Contracts
- `packages/contracts/src/api.ts` (new schemas around line 330+)
- `packages/contracts/src/sync.ts` (chat.delete, channel.delete ops)

### Frontend
- `apps/web/src/lib/stores/chats.svelte.ts`
- `apps/web/src/lib/stores/channels.svelte.ts`
- `apps/web/src/lib/services/chats.ts`
- `apps/web/src/lib/services/channels.ts`
- `apps/web/src/lib/components/ChatListPane.svelte`
- `apps/web/src/lib/components/ChannelList.svelte`
- `apps/web/src/routes/chat/[id]/+page.svelte`
- `apps/web/src/lib/sync/operations.ts`
- `apps/web/e2e/*.spec.ts`

---

## Acceptance Criteria for Audit

Before signing off, Codex should verify:

- [ ] `npm run test:integration` passes (backend)
- [ ] `npm test` passes (contracts)
- [ ] `cd apps/web && npm run test` passes (unit)
- [ ] `cd apps/web && npx playwright test` passes (E2E) — fix or update selectors as needed
- [ ] New backend integration tests cover group lifecycle, member management, archive, channel auth
- [ ] No `any` types introduced
- [ ] No security holes in auth checks
- [ ] DB migrations are reversible or at least safe for existing data
- [ ] Sync tombstones propagate correctly to all affected clients

---

## Known Issues to Flag

1. **E2E tests likely broken** by V5 redesign — DOM selectors changed
2. **Add/remove member UI missing** — backend exists, frontend only has list modal
3. **Unused CSS selector `.menu-divider`** in `chat/[id]/+page.svelte` — harmless Svelte warning, but there's a `menu-divider` div in the template. Svelte incorrectly flags it. Consider removing the div or the CSS.
4. **`canManage={true}`** hardcoded in `ChannelList` — should be role-gated once member roles are available on `ChatSummary`
5. **`archive` vs `delete` for DMs** — Codex implemented DM "delete" as per-user archive. Verify this is consistent across UI copy and backend behavior.

---

End of handoff. Codex: run the audit, fix what you find, write a summary report.
