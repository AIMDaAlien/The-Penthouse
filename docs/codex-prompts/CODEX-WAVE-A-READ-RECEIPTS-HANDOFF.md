# Wave A Handoff: Read Receipts (message.read Socket Event)

**To**: Codex (backend implementation)  
**From**: Claude (frontend waiting on backend)  
**Date**: 2026-04-07  
**Feature**: Read receipts — show who has read each message via socket events  
**Timeline**: Before Claude wires frontend read receipt UI

---

## Context

Wave A is the first milestone release of The Penthouse PWA (v2.1.0-alpha). It includes typing indicators, presence tracking, and now **read receipts** — a way for users to see who has read their messages.

Frontend is ready and waiting. The `message.read` socket event schema already exists in contracts. Your job is to:
1. Track when users read messages (implement read receipt persistence)
2. Broadcast `message.read` socket events when users scroll to bottom of a chat
3. Support both DMs and group chats with appropriate response shapes

---

## What Frontend Already Has

### Socket Listener (Frontend)
Frontend is listening for the `message.read` socket event (defined in `packages/contracts/src/events.ts`):

```typescript
export const ServerMessageReadEventSchema = z.object({
  type: z.literal('message.read'),
  payload: z.object({
    chatId: z.string(),
    readerUserId: z.string(),
    seenAt: z.string(),
    seenThroughMessageId: z.string().nullable().optional()
  })
});
```

Frontend will listen to this event and update a React/Svelte store with who has read what. Your job is to emit it.

### Message Schema Already Updated
The `Message` type in contracts already has `seenAt` field:

```typescript
export const MessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  senderUsername: z.string(),
  senderDisplayName: z.string().nullable().optional(),
  content: z.string(),
  type: z.enum(['text', 'image', 'video', 'gif', 'file']).default('text'),
  createdAt: z.string(),
  clientMessageId: z.string().optional(),
  seenAt: z.string().nullable().optional(),  // ← Already here, but not populated
  hidden: z.boolean().optional()
});
```

Currently `seenAt` is `null` for all messages. You'll need to populate it.

---

## What You Must Implement

### 1. Database Schema for Read Receipts

**Option A (Recommended): New `message_reads` Table**

Create a new migration (e.g., `019_message_reads.sql`):

```sql
CREATE TABLE IF NOT EXISTS message_reads (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id, user_id) REFERENCES chat_members(chat_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_reads_chat_user ON message_reads(chat_id, user_id);
```

This tracks: "In chat X, user Y has read up to message Z as of timestamp T"

**Option B (Alternative): Update `chat_members` Table**

Add columns to existing `chat_members` table:

```sql
ALTER TABLE chat_members
ADD COLUMN IF NOT EXISTS last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;
```

This stores read receipt data in the existing chat membership record (simpler schema, but less flexible for per-message tracking).

**Recommendation**: Go with **Option A** for now. It allows future expansion to reaction tracking, pins per user, etc.

---

### 2. Backend Logic: Track Read Receipts on Message Fetch

When the frontend fetches messages via `GET /api/v1/chats/:chatId/messages`, it automatically marks the latest message as read.

**Current flow**:
```
Frontend: GET /api/v1/chats/:chatId/messages
Backend: Return messages
Frontend: (client automatically marks read on scroll-to-bottom)
```

**New flow**:
```
Frontend: GET /api/v1/chats/:chatId/messages?beforeCursor=msgId (pagination)
Backend: 
  1. Return messages
  2. Update message_reads table: set last_read_message_id = messages[messages.length-1].id
  3. Return with read status populated
```

**Changes needed in `services/api/src/routes/chats.ts`**:

```typescript
app.get('/api/v1/chats/:chatId/messages', 
  { preHandler: [app.authenticate, app.requireFullAccess] }, 
  async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const { before, limit = 20 } = request.query as { before?: string; limit?: number };

    // Existing: fetch messages with cursor pagination
    const messages = await getMessagesForChat(pool, chatId, before, limit);

    // NEW: Mark latest message as read by this user
    if (messages.length > 0) {
      const latestMessageId = messages[messages.length - 1].id;
      await markMessageAsRead(pool, chatId, userId, latestMessageId);
      
      // NEW: Emit socket event to notify all users that this user read up to latestMessageId
      io.to(`chat:${chatId}`).emit('message.read', {
        type: 'message.read',
        payload: {
          chatId,
          readerUserId: userId,
          seenAt: new Date().toISOString(),
          seenThroughMessageId: latestMessageId
        }
      });
    }

    // Return messages with seenAt populated
    return reply.send({
      messages: messages.map(msg => populateSeenAt(msg, userId, chatId))
    });
  }
);
```

---

### 3. Mark Message as Read Function

Create a new utility in `services/api/src/utils/chatMessages.ts` or similar:

```typescript
export async function markMessageAsRead(
  pool: Pool,
  chatId: string,
  userId: string,
  messageId: string
): Promise<void> {
  await pool.query(
    `UPDATE message_reads 
     SET last_read_message_id = $1, read_at = NOW()
     WHERE chat_id = $2 AND user_id = $3`,
    [messageId, chatId, userId]
  );
}

export async function getLastReadMessageId(
  pool: Pool,
  chatId: string,
  userId: string
): Promise<string | null> {
  const result = await pool.query(
    `SELECT last_read_message_id FROM message_reads 
     WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );
  return result.rows[0]?.last_read_message_id ?? null;
}

export async function getReadReceiptsForMessage(
  pool: Pool,
  messageId: string
): Promise<Array<{ userId: string; readAt: string }>> {
  const result = await pool.query(
    `SELECT user_id, read_at FROM message_reads 
     WHERE last_read_message_id = $1 OR (
       -- Also include users who have read messages AFTER this one
       last_read_message_id IN (
         SELECT id FROM messages 
         WHERE chat_id = (SELECT chat_id FROM messages WHERE id = $1)
         AND created_at > (SELECT created_at FROM messages WHERE id = $1)
       )
     )
     ORDER BY read_at DESC`,
    [messageId]
  );
  return result.rows;
}
```

---

### 4. Populate Read Status in Message Response

When returning messages from the API, include who has read each message:

```typescript
async function populateMessageReadReceipts(
  pool: Pool,
  messages: Message[],
  currentUserId: string
): Promise<Message[]> {
  const receipts: Record<string, Array<{ userId: string; readAt: string }>> = {};
  
  for (const msg of messages) {
    // Only populate read receipts for messages sent by the current user
    if (msg.senderId === currentUserId) {
      receipts[msg.id] = await getReadReceiptsForMessage(pool, msg.id);
    }
  }

  return messages.map(msg => ({
    ...msg,
    readReceipts: receipts[msg.id] ?? []
  }));
}
```

Add `readReceipts` to the Message contract if not already there:

```typescript
export const MessageSchema = z.object({
  // ... existing fields
  readReceipts: z.array(z.object({
    userId: z.string(),
    readAt: z.string()
  })).optional()
});
```

---

### 5. Socket Event Timing

The `message.read` socket event should be emitted in two scenarios:

#### Scenario A: On Message Fetch (User Opens Chat)
```typescript
// When user calls GET /api/v1/chats/:chatId/messages
// Emit immediately so other users know
io.to(`chat:${chatId}`).emit('message.read', {
  type: 'message.read',
  payload: {
    chatId,
    readerUserId: userId,
    seenAt: new Date().toISOString(),
    seenThroughMessageId: latestMessageId
  }
});
```

#### Scenario B: On Manual Read Mark (Optional Frontend API)
If frontend calls a specific "mark as read" endpoint (e.g., `POST /api/v1/chats/:chatId/markRead`):

```typescript
app.post('/api/v1/chats/:chatId/markRead',
  { preHandler: [app.authenticate, app.requireFullAccess] },
  async (request, reply) => {
    const userId = request.user.userId;
    const { chatId } = request.params as { chatId: string };
    const { throughMessageId } = request.body as { throughMessageId: string };

    // Validate user is member of chat
    // Mark as read
    await markMessageAsRead(pool, chatId, userId, throughMessageId);

    // Emit socket event
    io.to(`chat:${chatId}`).emit('message.read', {
      type: 'message.read',
      payload: {
        chatId,
        readerUserId: userId,
        seenAt: new Date().toISOString(),
        seenThroughMessageId: throughMessageId
      }
    });

    return reply.send({ success: true });
  }
);
```

Frontend already calls `chats.markRead(chatId)` on scroll-to-bottom, so implement Scenario A first.

---

### 6. Existing Chat Member Last Seen Integration

There's an existing `last_seen_at` column on `chat_members` (migration 017). You may want to update this at the same time you mark messages as read:

```typescript
export async function markChatAsRead(
  pool: Pool,
  chatId: string,
  userId: string
): Promise<void> {
  // Update chat membership last_seen_at
  await pool.query(
    `UPDATE chat_members 
     SET last_seen_at = NOW()
     WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId]
  );

  // Update message read receipt
  const latestMsg = await pool.query(
    `SELECT id FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [chatId]
  );
  
  if (latestMsg.rows[0]) {
    await markMessageAsRead(pool, chatId, userId, latestMsg.rows[0].id);
  }
}
```

---

## Testing Checklist

You're done when:

- [ ] Migration `019_message_reads.sql` created and runs cleanly
- [ ] `markMessageAsRead()` utility works (inserts/updates correctly)
- [ ] `getReadReceiptsForMessage()` returns correct user list
- [ ] `GET /api/v1/chats/:chatId/messages` emits `message.read` socket event
- [ ] Socket event payload matches `ServerMessageReadEventSchema`
- [ ] Read receipts are tracked across multiple users simultaneously
- [ ] Opening a chat marks all messages as read for that user
- [ ] `seenAt` field is populated in message responses
- [ ] No database errors on rapid read mark updates (high concurrency)
- [ ] TypeScript clean: `npm run typecheck` → 0 errors
- [ ] Tests pass: `npm run test` → all pass (should be 77/77 still)

---

## Frontend Expectations

Once you're done, the frontend will:

1. **Receive** the `message.read` socket event and update a `readReceiptsMap` store
2. **Display** read receipts below messages:
   - **DMs**: "Seen" text pill (if other user has read)
   - **Group chats**: Stack up to 3 tiny avatars with "+N" if more
3. **Only show** read receipts for messages the current user sent

Frontend will NOT depend on the `readReceipts` array in the message response for real-time updates — it will use the socket event. But the array helps with hydration on page load.

---

## Database Constraints

- **Foreign keys**: All references back to `chats(id)` and `users(id)` with CASCADE
- **Indexes**: Add index on `(chat_id, user_id)` for fast lookups
- **Uniqueness**: Primary key `(chat_id, user_id)` — one read-receipt record per user per chat
- **Timestamps**: Always `TIMESTAMPTZ` for UTC consistency

---

## Migration Safety

When you create the migration:
1. Use `IF NOT EXISTS` for table creation (idempotent)
2. Test migration on a fresh database: `npm run db:migrate`
3. Verify the new columns/table exist afterward
4. Do not modify existing migrations (018 or earlier)

---

## Edge Cases to Handle

1. **User not member of chat**: `markMessageAsRead` should fail gracefully (return early)
2. **Message doesn't exist**: Query should handle null gracefully
3. **Multiple rapid reads**: Concurrent updates to same `(chatId, userId)` — use `UPSERT` (ON CONFLICT) pattern:

```sql
INSERT INTO message_reads (chat_id, user_id, last_read_message_id, read_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (chat_id, user_id) DO UPDATE
SET last_read_message_id = EXCLUDED.last_read_message_id, read_at = NOW();
```

4. **User reads then gets removed from chat**: Foreign key CASCADE will clean up their read receipt
5. **Message is deleted**: Set `last_read_message_id` to NULL (ON DELETE SET NULL already handles this)

---

## File Changes Required

You'll need to modify/create:

1. **New Migration**: `services/api/src/db/migrations/019_message_reads.sql`
2. **Utilities**: `services/api/src/utils/chatMessages.ts` (add read receipt functions)
3. **Routes**: `services/api/src/routes/chats.ts` (update `GET /messages` endpoint, optional `POST /markRead`)
4. **Socket**: `services/api/src/realtime/socket.ts` (ensure io is accessible for broadcast)
5. **Contracts**: `packages/contracts/src/api.ts` (add `readReceipts` to Message if needed)

---

## Success Criteria

This handoff is complete when:
1. ✅ Read receipt data persists in database
2. ✅ `message.read` socket events broadcast to all chat members
3. ✅ Frontend receives and processes events without errors
4. ✅ Multiple simultaneous users' read statuses tracked correctly
5. ✅ No TypeScript errors
6. ✅ All tests pass
7. ✅ Socket event payload matches contract schema exactly

---

## Handoff Notes

- **Frontend is ready**: Socket listener already wired in chat page component
- **No frontend changes needed**: Claude will handle UI rendering once socket events come through
- **No contract changes needed**: `message.read` event schema already exists
- **Database-first approach**: Get data persistence right first, socket events second

Questions? Ask before implementing. Once done, Claude will wire the frontend read receipt UI and we'll verify end-to-end with E2E tests.

**Timeline**: Target completion by end of today so Claude can wire frontend by 2026-04-08.

---

**Codex**: You're implementing one of the most important social presence features. Users expect to know if their message was read. Get the backend rock-solid and the frontend will sing. Good luck! 🚀
