# Codex Handoff — DM Tier A Feature Set

**Date:** 2026-04-17
**Requested by:** Human owner
**Frontend owner:** Claude (apps/web)
**Backend owner:** Codex (services/api)

This handoff covers the backend work for five Tier A DM enhancement features.
Claude will implement all frontend work in parallel once contracts are finalized.
Do not modify `apps/web/` — leave that entirely to Claude.

---

## Scope

| Feature | Migration | New Routes | Socket Events | Contracts |
|---|---|---|---|---|
| Voice Notes | No | No (reuse upload) | No | `MessageTypeSchema` update |
| Message Editing | Yes (023) | PATCH message | `message.edited` | `EditMessageRequest/Response` |
| Delete for Everyone | Yes (024) | DELETE message | `message.deleted` | `DeleteMessageResponse` |
| Starred Messages | Yes (025) | 3 routes | None | `StarredMessageSchema` etc. |
| Archive Conversations | Yes (026) | 2 routes + GET filter | None | `ArchiveChatResponse` |

---

## 1. Voice Notes

### What it is
A new message type `'audio'` sent via the existing upload + send pipeline.
The client records a WebM/OGG audio blob, uploads it via `POST /api/v1/media/upload`,
gets back an upload ID, then sends a message of type `'audio'` with the upload ID
in `metadata.audioUploadId` and duration in `metadata.durationSeconds`.

### Backend changes

**`packages/contracts/src/api.ts` — add `'audio'` to `MessageTypeSchema`:**
```typescript
export const MessageTypeSchema = z.enum(['text', 'image', 'video', 'gif', 'file', 'poll', 'audio']);
```

**`services/api/src/routes/media.ts` — allow audio MIME types through upload validation:**
Ensure the following MIME types are accepted alongside existing ones:
- `audio/webm`
- `audio/ogg`
- `audio/mp4`
- `audio/mpeg`

Store with `media_kind = 'file'` (reuse existing enum — no migration needed).

**No new routes.** The existing `POST /api/v1/chats/:chatId/messages` send route already handles
any `type` that passes `MessageTypeSchema`. The metadata JSONB column already holds arbitrary fields.

### Expected message shape on send
```json
{
  "chatId": "uuid",
  "content": "Voice message",
  "type": "audio",
  "metadata": {
    "audioUploadId": "uuid",
    "durationSeconds": 14.3
  },
  "clientMessageId": "..."
}
```

---

## 2. Message Editing

### Migration 023 — `023_message_editing.sql`
```sql
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;
```

### Route: `PATCH /api/v1/chats/:chatId/messages/:messageId`

**Auth:** Authenticated. Sender only (check `sender_id = req.user.id`).

**Time window:** Reject edits where `NOW() - created_at > interval '15 minutes'`
with a 403 and `{ error: "Message can no longer be edited" }`.

**Body (`EditMessageRequestSchema`):**
```typescript
export const EditMessageRequestSchema = z.object({
  content: z.string().min(1).max(4000)
});
```

**Behavior:**
1. Load message, verify membership + sender ownership + time window.
2. `UPDATE messages SET content = $1, edited_at = NOW(), edit_count = edit_count + 1 WHERE id = $2`
3. Re-hydrate the full message (reactions, readReceipts, replyTo) the same way `sendChatMessage` does.
4. Emit `message.edited` socket event to `chat:{chatId}`.
5. Return `EditMessageResponseSchema`.

**Response (`EditMessageResponseSchema`):**
```typescript
export const EditMessageResponseSchema = z.object({
  message: MessageSchema
});
```

**Socket event `message.edited` — add to `packages/contracts/src/events.ts`:**
```typescript
export const ServerMessageEditedEventSchema = z.object({
  type: z.literal('message.edited'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    content: z.string(),
    editedAt: z.string(),
    editCount: z.number().int()
  })
});
```

**`MessageSchema` update — add optional fields:**
```typescript
// In packages/contracts/src/api.ts, inside MessageSchema:
editedAt: z.string().nullable().optional(),
editCount: z.number().int().optional()
```

---

## 3. Delete for Everyone

### Migration 024 — `024_message_deletion.sql`
```sql
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at)
  WHERE deleted_at IS NOT NULL;
```

### Route: `DELETE /api/v1/chats/:chatId/messages/:messageId`

**Auth:** Authenticated.
- **Sender** can delete within 24 hours of `created_at`.
- **Admin/owner** (once group roles exist) can delete anytime. For now, only sender.

**Behavior:**
1. Verify membership, then verify `sender_id = req.user.id` OR user is admin.
2. Soft-delete: `UPDATE messages SET deleted_at = NOW(), deleted_by_user_id = $1, content = '' WHERE id = $2`.
3. Emit `message.deleted` socket event to `chat:{chatId}`.
4. Return 204 No Content.

**Read/history routes:** When returning messages, include `deleted_at` and `deletedByUserId`
in the response so the client can render "This message was deleted" placeholder.
Do NOT omit deleted messages from history — clients need to render the tombstone.

**`MessageSchema` update — add optional fields:**
```typescript
// In packages/contracts/src/api.ts, inside MessageSchema:
deletedAt: z.string().nullable().optional(),
deletedByUserId: z.string().nullable().optional()
```

**Socket event `message.deleted` — add to `packages/contracts/src/events.ts`:**
```typescript
export const ServerMessageDeletedEventSchema = z.object({
  type: z.literal('message.deleted'),
  payload: z.object({
    chatId: z.string(),
    messageId: z.string(),
    deletedAt: z.string(),
    deletedByUserId: z.string()
  })
});
```

---

## 4. Starred Messages

### Migration 025 — `025_starred_messages.sql`
```sql
CREATE TABLE IF NOT EXISTS starred_messages (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  starred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON starred_messages(user_id, starred_at DESC);
```

### Route A: `POST /api/v1/chats/:chatId/messages/:messageId/star`

**Auth:** Authenticated. Must be a member of `chatId`.

**Behavior:** `INSERT INTO starred_messages (user_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`. Return 204.

### Route B: `DELETE /api/v1/chats/:chatId/messages/:messageId/star`

**Auth:** Authenticated. Must be a member of `chatId`.

**Behavior:** `DELETE FROM starred_messages WHERE user_id = $1 AND message_id = $2`. Return 204.

### Route C: `GET /api/v1/me/starred`

**Auth:** Authenticated.

**Query params:** `limit` (default 30, max 50), `cursor` (starred_at UUID for pagination).

**Behavior:** Return the user's starred messages, newest first, with full message hydration
(sender display name, avatar, chat name, reactions) and the containing chat's name.

**Response (`StarredMessagesResponseSchema`):**
```typescript
export const StarredMessageEntrySchema = z.object({
  starredAt: z.string(),
  message: MessageSchema.extend({
    chatName: z.string(),         // the chat the message is in
    chatType: z.enum(['dm', 'channel'])
  })
});

export const StarredMessagesResponseSchema = z.object({
  items: z.array(StarredMessageEntrySchema),
  nextCursor: z.string().nullable()
});
```

Also expose whether a message is starred on the message itself when loading chat history.
Add to `MessageSchema`:
```typescript
starred: z.boolean().optional()  // true if the requesting user has starred this message
```
Populate this in the existing history query by LEFT JOINing `starred_messages` on
`(message_id = messages.id AND user_id = $requestingUserId)`.

---

## 5. Archive Conversations

### Migration 026 — `026_chat_archive.sql`
```sql
ALTER TABLE chat_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
```

### Route A: `POST /api/v1/chats/:chatId/archive`

**Auth:** Authenticated. Must be a member.

**Behavior:** `UPDATE chat_members SET archived_at = NOW() WHERE user_id = $1 AND chat_id = $2`. Return 204.

### Route B: `POST /api/v1/chats/:chatId/unarchive`

**Auth:** Authenticated. Must be a member.

**Behavior:** `UPDATE chat_members SET archived_at = NULL WHERE user_id = $1 AND chat_id = $2`. Return 204.

### `GET /api/v1/chats` — update filter behavior

Add optional query param `archived`:
- Default (`archived` absent or `false`): exclude chats where `chat_members.archived_at IS NOT NULL`.
- `?archived=true`: return ONLY archived chats.

**Auto-unarchive on new message:** In the existing `sendChatMessage` utility (or socket handler),
when a message is delivered to a chat, clear `archived_at` for all members of that chat:
```sql
UPDATE chat_members SET archived_at = NULL
WHERE chat_id = $1 AND archived_at IS NOT NULL;
```
This matches WhatsApp / Telegram behavior — new messages bring a chat back to the inbox.

**`ChatSummarySchema` update — add optional field:**
```typescript
// In packages/contracts/src/api.ts, inside ChatSummarySchema:
archivedAt: z.string().nullable().optional()
```

---

## Rate limits

Use the existing `CHAT_ROUTE_RATE_LIMITS` pattern in `chats.ts`. Suggested additions:

```typescript
messageEdits: { windowMs: 60_000, maxRequests: 20, error: 'Too many edits. Try again in a minute.' },
messageDeletes: { windowMs: 60_000, maxRequests: 10, error: 'Too many deletes. Try again in a minute.' },
stars: { windowMs: 60_000, maxRequests: 60, error: 'Too many star updates. Try again in a minute.' }
```

---

## Registration order

Implement and migrate in this order (each is independent, but contracts must be updated first):
1. Update `packages/contracts/src/api.ts` and `events.ts` — add all new schemas and export types
2. Migration 023 + message editing route
3. Migration 024 + delete route
4. Migration 025 + starred routes
5. Migration 026 + archive routes + GET filter update
6. Voice notes: update allowed MIME types in upload validation

---

## What Claude handles (do not implement)

- `apps/web/` entirely — all frontend UI, components, stores
- Voice note record/playback UI
- Edit/delete UI (hold message → context menu)
- Chat info panel (shared media, shared links, starred messages panel)
- Message formatting renderer (bold/italic/code)
- Archive section in chat list
- Starred messages panel accessible from chat info

---

## Definition of done (Codex side)

1. All 4 migrations run cleanly from scratch
2. All new routes registered in `src/app.ts`
3. All new/updated contracts exported from `packages/contracts/src/index.ts`
4. `npm run typecheck` clean in `services/api/` and `packages/contracts/`
5. Existing tests pass (`npm run test` in `services/api/`)
6. No files in `apps/web/` modified
