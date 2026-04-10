# HANDOFF → Codex (GPT-5.4) — Wave A/B Backend

**Date:** 2026-04-09  
**From:** Claude (Sonnet 4.6)  
**Branch:** `pwa`  
**Priority:** High — frontend is blocked on these backend implementations

---

## What's been done (already committed)

Two commits just landed on `pwa`:

1. `9c0a4e3` — `feat(web): Wave A — mute, GIF picker, read receipts, replies, reactions, polls UI`
2. `285e176` — `contracts: Wave A/B schemas — polls, reactions, replies, pinning, mute`

The frontend components, stores, and Zod schemas are fully defined. The backend has
uncommitted work sitting in the working tree — your job is to review, finish, and commit it.

---

## Uncommitted backend work in your working tree

These files were modified or created but never committed:

### New SQL migrations (run these in order)
```
services/api/src/db/migrations/019_chat_member_last_read_message.sql
services/api/src/db/migrations/020_polls.sql
services/api/src/db/migrations/021_poll_message_type.sql
services/api/src/db/migrations/022_message_reactions_replies_pins.sql
```

### New utility modules (new files, verify and wire up)
```
services/api/src/utils/messageHydration.ts
services/api/src/utils/messageModeration.ts
services/api/src/utils/messageReads.ts
services/api/src/utils/polls.ts
```

### Modified source files
```
services/api/src/db/migrate.ts           — migration runner changes
services/api/src/realtime/socket.ts      — 1 line change
services/api/src/routes/admin.ts         — 125 line reduction (cleanup)
services/api/src/routes/chats.ts         — +603 lines (major expansion)
services/api/src/utils/chatMessages.ts   — +152 lines
services/api/src/utils/chats.ts          — minor
services/api/src/utils/messages.ts       — minor
```

### Modified tests
```
services/api/test/chats.test.ts
services/api/test/contracts-smoke.test.ts
services/api/test/helpers.ts
services/api/test/integration-chats.test.ts
services/api/test/integration-realtime.test.ts
```

---

## What needs implementing / verifying

### 1. Read receipts (migration 019)
- `POST /api/v1/chats/:chatId/read` — mark last-read message for calling user
- `GET /api/v1/chats/:chatId/members/read` — return read positions for all members
- Socket event: `message.read` already defined in contracts
- Frontend store: `apps/web/src/lib/stores/readReceipts.svelte.ts`

### 2. Polls (migrations 020–021)
- `POST /api/v1/chats/:chatId/polls` — create poll (uses `CreatePollRequestSchema`)
- `POST /api/v1/polls/:pollId/vote` — cast/retract vote
- Socket event: `poll.voted` already defined in contracts
- Frontend component: `apps/web/src/lib/components/PollBuilder.svelte` + `PollCard.svelte`

### 3. Reactions (migration 022)
- `POST /api/v1/messages/:messageId/reactions` — add reaction `{ emoji }`
- `DELETE /api/v1/messages/:messageId/reactions/:emoji` — remove reaction
- Socket events: `reaction.add`, `reaction.remove` already defined in contracts

### 4. Message replies
- `replyToMessageId` is now accepted in `ClientMessageSendEventSchema`
- Backend needs to persist `reply_to_message_id` and hydrate `replyTo` on fetch
- Frontend component: `apps/web/src/lib/components/ReplyBar.svelte`

### 5. Message pinning (migration 022)
- `POST /api/v1/chats/:chatId/pins/:messageId` — pin message
- `DELETE /api/v1/chats/:chatId/pins/:messageId` — unpin
- Socket events: `message.pinned`, `message.unpinned` already defined in contracts

### 6. Chat muting
- `PATCH /api/v1/chats/:chatId/members/me` — update member preferences (muted: boolean)
- Frontend: `MessageContextMenu.svelte` already calls this endpoint
- Migration 018 (`chat_member_preference_timestamps`) covers the column

---

## Also needed: git hygiene fix

`apps/web/.svelte-kit/` and `apps/web/build/` are tracked in git.
They produce 50–80 lines of noise in `git status` after every build/dev run.

Fix:
```bash
git rm -r --cached apps/web/.svelte-kit/ apps/web/build/
echo ".svelte-kit/" >> apps/web/.gitignore
echo "build/" >> apps/web/.gitignore
git add apps/web/.gitignore
git commit -m "chore: untrack generated .svelte-kit/ and build/ dirs"
```

---

## Contracts reference

All schemas are in:
- `packages/contracts/src/api.ts` — request/response shapes
- `packages/contracts/src/events.ts` — Socket.IO event payloads

Import pattern: `import { PollDataSchema, MessageReactionSchema } from '@penthouse/contracts'`

---

## Success criteria for this handoff

- [ ] All 4 migrations applied cleanly to dev DB
- [ ] Each endpoint listed above returns correct shape (validate against contracts schemas)
- [ ] Socket events emitted on mutation (poll vote, reaction, pin)
- [ ] `services/api` tests pass (`npm run test` in services/api)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build artifacts removed from git tracking
