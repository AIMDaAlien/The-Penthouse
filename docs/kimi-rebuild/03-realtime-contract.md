# Realtime Contract — Socket.IO Event Mapping

**Date:** 2026-05-06  
**Basis:** `packages/contracts/src/events.ts` (204 lines) + incumbent `socket.ts` hardening  
**Transport:** Socket.IO 4 (no change from incumbent)

---

## 1. Handshake & auth

### Connection
```ts
// Client
const socket = io(WS_URL, {
  auth: { token: accessToken }, // JWT, refreshed from cookie
  transports: ['websocket', 'polling'], // polling fallback for mobile
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

### Server middleware (Fastify Socket.IO plugin)
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('AUTH_REQUIRED'));
  try {
    const payload = await fastify.jwt.verify(token);
    socket.data.userId = payload.userId;
    socket.data.username = payload.username;
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});
```

**Change from incumbent:** Token is only in `auth` handshake. No cookie fallback on WebSocket (cookies are not sent with WS upgrade in some mobile contexts). Refresh token rotation is handled via REST before reconnection.

---

## 2. Room management

### Room naming
| Room | Pattern | Joined on | Left on |
|---|---|---|---|
| User personal | `user:${userId}` | Connection | Disconnect |
| Chat | `chat:${chatId}` | `chat.join` | `chat.leave` or disconnect |

### Server room tracking
```ts
// On connection
socket.join(`user:${socket.data.userId}`);

// On chat.join
socket.join(`chat:${chatId}`);

// On disconnect
// Socket.IO auto-leaves all rooms
```

**No change from incumbent.** Room-per-chat model is correct for 20–200 users.

---

## 3. Client → server events

### `chat.join`
```ts
// Contract
const ChatJoinSchema = z.object({ chatId: z.string().uuid() });

// Server handler
socket.on('chat.join', async ({ chatId }) => {
  const membership = await db.select()
    .from(chatMembers)
    .where(and(
      eq(chatMembers.chatId, chatId),
      eq(chatMembers.userId, socket.data.userId)
    ));
  if (!membership.length) throw new Error('FORBIDDEN');
  socket.join(`chat:${chatId}`);
  socket.emit('chat.joined', { chatId });
});
```

### `chat.leave`
```ts
const ChatLeaveSchema = z.object({ chatId: z.string().uuid() });
socket.on('chat.leave', ({ chatId }) => {
  socket.leave(`chat:${chatId}`);
});
```

### `typing.start` / `typing.stop`
```ts
const TypingStartSchema = z.object({ chatId: z.string().uuid() });
const TypingStopSchema = z.object({ chatId: z.string().uuid() });

// Server handler (both)
socket.on('typing.start', async ({ chatId }) => {
  socket.to(`chat:${chatId}`).emit('typing.update', {
    chatId,
    userId: socket.data.userId,
    username: socket.data.username,
    isTyping: true,
  });
});

socket.on('typing.stop', async ({ chatId }) => {
  socket.to(`chat:${chatId}`).emit('typing.update', {
    chatId,
    userId: socket.data.userId,
    username: socket.data.username,
    isTyping: false,
  });
});
```

**Change:** Combined into single `typing.update` server event (incumbent had separate start/stop broadcasts). Reduces event surface.

### `presence.update`
```ts
const PresenceUpdateSchema = z.object({
  status: z.enum(['online', 'away', 'dnd', 'offline']),
});

socket.on('presence.update', async ({ status }) => {
  await db.update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, socket.data.userId));

  socket.to(`user:${socket.data.userId}`)
    .emit('presence.update', {
      userId: socket.data.userId,
      status,
      lastSeenAt: new Date(),
    });
});
```

### `message.send`
```ts
const MessageSendSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().max(4000).optional(),
  clientMessageId: z.string().min(8).max(128),
  type: z.enum(['text', 'image', 'video', 'gif', 'file', 'poll', 'audio']).default('text'),
  metadata: z.record(z.unknown()).optional(), // mediaUrl, pollId, etc.
  replyToMessageId: z.string().uuid().optional(),
});

// Audio loophole: if type === 'audio', content is optional but metadata.audioUrl required
// Enforced at server validation layer, not in Zod (Zod .refine would work too)
```

**Server handler (simplified):**
```ts
socket.on('message.send', async (payload) => {
  const { chatId, content, clientMessageId, type, metadata, replyToMessageId } = payload;

  // 1. Auth check
  const member = await db.select()
    .from(chatMembers)
    .where(and(
      eq(chatMembers.chatId, chatId),
      eq(chatMembers.userId, socket.data.userId)
    ));
  if (!member.length) throw new Error('FORBIDDEN');

  // 2. Audio validation
  if (type === 'audio' && !metadata?.audioUrl) {
    throw new Error('AUDIO_URL_REQUIRED');
  }

  // 3. Insert message
  const [message] = await db.insert(messages)
    .values({
      chatId,
      senderId: socket.data.userId,
      content: content ?? '',
      clientMessageId,
      messageType: type,
      metadata: metadata ?? null,
      replyToMessageId: replyToMessageId ?? null,
    })
    .returning();

  // 4. Update chat updated_at
  await db.update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));

  // 5. Fetch sender for broadcast
  const [sender] = await db.select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, socket.data.userId));

  // 6. Broadcast to room
  const broadcast = {
    ...message,
    senderName: sender.displayName,
  };
  socket.to(`chat:${chatId}`).emit('message.new', broadcast);

  // 7. Ack sender
  socket.emit('message.ack', {
    clientMessageId,
    messageId: message.id,
    chatId,
    status: 'delivered',
  });

  // 8. Push delivery (async, non-blocking)
  deliverPushNotifications(chatId, message, sender.displayName);
});
```

---

## 4. Server → client events

### `message.new`
```ts
const MessageNewSchema = MessageSchema.extend({
  senderName: z.string(),
});

// Payload: full message object + sender display name
// Receiver: all members of chat:${chatId} except sender
```

### `message.ack`
```ts
const MessageAckSchema = z.object({
  clientMessageId: z.string(),
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  status: z.enum(['delivered', 'failed']),
  error: z.string().optional(),
});

// Receiver: sender only
```

### `message.read`
```ts
const MessageReadSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  seenThroughMessageId: z.string().uuid(),
  seenAt: z.string().datetime(),
});

// Receiver: all members of chat:${chatId}
// Triggered by: scroll-visible read receipt (NOT socket-lifecycle auto-read)
```

**Critical semantic (no change from incumbent):**
- `seenThroughMessageId` = furthest physically visible message in scroll viewport.
- Opening chat does NOT clear unread.
- Backend must not auto-mark-read on `chat.join`.

### `message.edited`
```ts
const MessageEditedSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  newContent: z.string(),
  editedAt: z.string().datetime(),
  editCount: z.number().int().positive(),
});

// Receiver: all members of chat:${chatId}
```

### `message.deleted`
```ts
const MessageDeletedSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  deletedAt: z.string().datetime(),
  deletedByUserId: z.string().uuid(),
});

// Receiver: all members of chat:${chatId}
```

### `message.moderated`
```ts
const MessageModeratedSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  action: z.enum(['hide', 'unhide']),
  reason: z.string(),
  actorUserId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

// Receiver: all members of chat:${chatId}
```

### `message.pinned` / `message.unpinned`
```ts
const MessagePinnedSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  pinnedBy: z.string().uuid(),
  pinnedAt: z.string().datetime(),
  contentSnapshot: z.string(),
  senderDisplayNameSnapshot: z.string().optional(),
});

const MessageUnpinnedSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  unpinnedBy: z.string().uuid(),
});

// Receiver: all members of chat:${chatId}
```

### `reaction.add` / `reaction.remove`
```ts
const ReactionAddSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
  createdAt: z.string().datetime(),
});

const ReactionRemoveSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  emoji: z.string(),
});

// Receiver: all members of chat:${chatId}
```

### `poll.voted`
```ts
const PollVotedSchema = z.object({
  pollId: z.string().uuid(),
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  optionId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

// Receiver: all members of chat:${chatId}
```

### `typing.update`
```ts
const TypingUpdateSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string(),
  isTyping: z.boolean(),
});

// Receiver: all members of chat:${chatId} except typer
```

### `presence.update`
```ts
const PresenceUpdateServerSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'dnd', 'offline']),
  lastSeenAt: z.string().datetime().optional(),
});

// Receiver: all sockets watching this user's presence
// Broadcast from: user:${userId} room
```

### `presence.sync`
```ts
const PresenceSyncSchema = z.array(z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'dnd', 'offline']),
  lastSeenAt: z.string().datetime().optional(),
}));

// Receiver: client on demand (e.g., after reconnect)
// Triggered by: client emits 'presence.request_sync'
```

### `chat.sync_required`
```ts
const ChatSyncRequiredSchema = z.object({
  chatId: z.string().uuid(),
  reason: z.enum(['member_added', 'member_removed', 'chat_updated']),
});

// Receiver: all members of chat:${chatId}
// Triggered by: chat metadata or membership changes
```

---

## 5. Event matrix

| Event | Direction | Zod schema | Room | Sender ack? |
|---|---|---|---|---|
| `chat.join` | C→S | `ChatJoinSchema` | — | `chat.joined` |
| `chat.leave` | C→S | `ChatLeaveSchema` | — | No |
| `typing.start` | C→S | `TypingStartSchema` | — | No |
| `typing.stop` | C→S | `TypingStopSchema` | — | No |
| `presence.update` | C→S | `PresenceUpdateSchema` | `user:${id}` | No |
| `presence.request_sync` | C→S | `z.object({ userIds: z.array(z.string().uuid()) })` | — | `presence.sync` |
| `message.send` | C→S | `MessageSendSchema` | `chat:${id}` | `message.ack` |
| `message.edit` | C→S | `z.object({ messageId, content })` | `chat:${id}` | `message.edited` |
| `message.delete` | C→S | `z.object({ messageId })` | `chat:${id}` | `message.deleted` |
| `message.react` | C→S | `z.object({ messageId, emoji })` | `chat:${id}` | `reaction.add` |
| `message.unreact` | C→S | `z.object({ messageId, emoji })` | `chat:${id}` | `reaction.remove` |
| `message.pin` | C→S | `z.object({ messageId })` | `chat:${id}` | `message.pinned` |
| `message.unpin` | C→S | `z.object({ messageId })` | `chat:${id}` | `message.unpinned` |
| `message.moderate` | C→S | `z.object({ messageId, action, reason })` | `chat:${id}` | `message.moderated` |
| `poll.vote` | C→S | `z.object({ pollId, optionId })` | `chat:${id}` | `poll.voted` |
| `message.new` | S→C | `MessageNewSchema` | `chat:${id}` | N/A |
| `message.ack` | S→C | `MessageAckSchema` | sender only | N/A |
| `message.read` | S→C | `MessageReadSchema` | `chat:${id}` | N/A |
| `message.edited` | S→C | `MessageEditedSchema` | `chat:${id}` | N/A |
| `message.deleted` | S→C | `MessageDeletedSchema` | `chat:${id}` | N/A |
| `message.moderated` | S→C | `MessageModeratedSchema` | `chat:${id}` | N/A |
| `message.pinned` | S→C | `MessagePinnedSchema` | `chat:${id}` | N/A |
| `message.unpinned` | S→C | `MessageUnpinnedSchema` | `chat:${id}` | N/A |
| `reaction.add` | S→C | `ReactionAddSchema` | `chat:${id}` | N/A |
| `reaction.remove` | S→C | `ReactionRemoveSchema` | `chat:${id}` | N/A |
| `poll.voted` | S→C | `PollVotedSchema` | `chat:${id}` | N/A |
| `typing.update` | S→C | `TypingUpdateSchema` | `chat:${id}` | N/A |
| `presence.update` | S→C | `PresenceUpdateServerSchema` | `user:${id}` | N/A |
| `presence.sync` | S→C | `PresenceSyncSchema` | requester only | N/A |
| `chat.sync_required` | S→C | `ChatSyncRequiredSchema` | `chat:${id}` | N/A |

---

## 6. Push delivery coordination

Push notifications are NOT sent via Socket.IO. They are delivered via Web Push (VAPID) independently.

However, Socket.IO presence state (`online`/`offline`) is used to suppress push:

```ts
// In deliverPushNotifications()
const onlineUserIds = await getOnlineUserIdsInChat(chatId); // from Socket.IO adapter

for (const member of chatMembers) {
  if (onlineUserIds.has(member.userId)) continue; // skip push for online users
  await sendWebPush(member.userId, message, senderName);
}
```

**Change from incumbent:** Explicit `online` check. Incumbent may have relied on implicit behavior. This is explicit and testable.

---

## 7. Error handling

### Client-side
```ts
socket.on('connect_error', (err) => {
  if (err.message === 'AUTH_INVALID') {
    // Trigger token refresh via REST, then reconnect
    refreshToken().then(newToken => {
      socket.auth = { token: newToken };
      socket.connect();
    });
  }
});

socket.on('error', (err) => {
  // Log to Sentry or console; show toast if user-visible
  console.error('Socket error:', err);
});
```

### Server-side
All event handlers wrapped in try/catch. On error:
1. Log with request ID (pino).
2. Emit `error` to sender socket only with sanitized message.
3. Do NOT crash the connection for non-fatal errors.

```ts
socket.on('message.send', async (payload) => {
  try {
    // ... handler
  } catch (err) {
    fastify.log.error({ err, userId: socket.data.userId }, 'message.send failed');
    socket.emit('error', {
      event: 'message.send',
      code: err instanceof AppError ? err.code : 'INTERNAL_ERROR',
      message: err instanceof AppError ? err.message : 'Something went wrong',
    });
  }
});
```

---

## 8. Reconnection semantics

| Scenario | Behavior |
|---|---|
| Token expired mid-session | Server emits `connect_error` with `AUTH_INVALID`. Client refreshes token via REST, updates `socket.auth`, reconnects. |
| Network drop | Socket.IO auto-reconnect with exponential backoff (1s–5s). On reconnect, client re-joins all visible chat rooms. |
| Server restart | Same as network drop. Client re-joins rooms, server sends `chat.sync_required` if chat state changed during disconnect. |
| Multiple tabs | Each tab is a separate socket. Same `user:${userId}` room. Presence shows `online` as long as ≥1 tab connected. |

---

## 9. Contract evolution

All events are versioned implicitly by the `packages/contracts` package version. Breaking changes require:
1. New event name (e.g., `message.send.v2`) OR
2. Feature flag in payload (`version: 2`) with server-side backward compatibility.

Non-breaking additions (new optional fields) are free.
