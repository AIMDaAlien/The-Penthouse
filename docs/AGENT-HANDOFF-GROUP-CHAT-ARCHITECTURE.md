# Agent Handoff — Group Chat + Channel + DM Architecture

**Date:** 2026-05-15
**From:** Kimi K2.6 (frontend + audit)
**To:** Codex (backend + architecture decision)
**Context:** User asked for Codex's take on how to model group chats with channels.

---

## What We Know

### Current DB Schema (`services/api/src/db/enums.ts`)
```ts
export const chatTypeEnum = pgEnum('chat_type', ['dm', 'channel']);
```

### Current `chats` table (`services/api/src/features/chats/schema.ts`)
- `id`, `type` ('dm' | 'channel'), `name`, `system_key`, `parent_chat_id`, `updated_at`, `created_at`
- `parent_chat_id` self-references for channels

### Current API surface
- `POST /api/v1/chats/dm` — create DM (idempotent pair)
- `POST /api/v1/chats/:id/channels` — create channel under parent
- `GET /api/v1/chats/:id/channels` — list channels
- `GET /api/v1/chats/:id/members` — list members
- `GET /api/v1/chats` — list parent chats only (no channels)
- **NO** group creation, member add/remove, channel delete/rename, chat delete, archive

### Push payload already references `'group'`
`apps/web/src/lib/push/payload.ts` has `chatType?: 'dm' | 'group'` — but DB has no `'group'`.

---

## The Question

We need to add **group chats with channels** and **DM management** (delete/archive). Three architecture options:

### Option A — Add `'group'` to `chat_type` enum
- `'dm'` = 1:1 direct message
- `'group'` = multi-user parent container (like a Discord server)
- `'channel'` = child chat under a group
- **Migration:** `ALTER TYPE chat_type ADD VALUE 'group'`
- **Pros:** Clean semantics. `GET /chats` can filter `WHERE type IN ('dm', 'group')`. Channels are always children.
- **Cons:** Requires enum migration. Need to decide if existing seeded "General" chat becomes `type = 'group'`.

### Option B — Reuse `'channel'` as parent
- Any `channel` with `parent_chat_id = NULL` acts as the group/server
- `channel` with `parent_chat_id != NULL` is a sub-channel
- **Pros:** Zero migration. Works today.
- **Cons:** Terminology is muddy — a "server" is a `channel`. `GET /chats` already filters `type = 'channel'` for the list, so this accidentally works, but it's semantically confusing.

### Option C — Flat group chats (no channel hierarchy)
- Multi-user chats are just `type = 'channel'` with no parent and no children
- Drop the parent/child concept entirely for groups
- **Pros:** Simplest.
- **Cons:** Loses the channel hierarchy the schema already supports. The seeded "General" chat + sub-channels would need rethinking.

---

## What's Needed Regardless of Option

| Feature | Backend | Frontend | Contracts |
|---------|---------|----------|-----------|
| Create group chat | New endpoint | New UI + store method | Request/response schemas |
| Add/remove members | New endpoints | Member management UI | Event schemas |
| Leave chat | New endpoint | Leave button | Event schema |
| Delete channel | New endpoint | Delete UI | Event schema |
| Rename channel | New endpoint | Rename UI | Request schema |
| Delete chat/DM | New endpoint | Delete UI | Event schema |
| Archive chat | New endpoint | Archive toggle | Request/response schemas |
| Folder delete/edit UI | — (already exists) | Add buttons | — |
| Chat members list | — (already exists) | Wire `GET /members` | — |

---

## Kimi's Recommendation

**Option A** is cleanest long-term. The push payload already expects `'group'`. The enum migration is cheap (`ADD VALUE` is safe in PG). Existing seeded "General" chat can be migrated to `type = 'group'`.

But Codex should weigh in on:
1. Which option matches the original design intent
2. Whether `chat_members` needs a `role` column (owner, admin, member)
3. Whether `direct_chats` table should stay separate or be folded into `chat_members`
4. Migration strategy for existing data

---

## Files to Read
- `services/api/src/features/chats/schema.ts`
- `services/api/src/db/enums.ts`
- `services/api/src/routes/chats.ts`
- `services/api/src/features/channels/routes.ts`
- `packages/contracts/src/api.ts` (Chat/Channel/Folder schemas)
- `apps/web/src/lib/stores/chats.svelte.ts`
- `apps/web/src/lib/stores/channels.svelte.ts`

---

*Codex: Please reply with your architecture choice and any backend considerations Kimi should know before starting implementation.*
