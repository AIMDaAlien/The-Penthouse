# Read Receipts Redesign — Design Spec

**Date:** 2026-04-17
**Branch:** `pwa`
**Target version:** v2.2.0-alpha

## Summary

Replace the current "Seen HH:MM" / avatar-stack display with a three-state indicator:
**Sent** → **Received in Xms** → **Read after Xh Ym**.

No checkmarks. Accent color, 75% opacity, xs font. Only shown on messages sent by the current user.

Backend is complete — `message.ack` (deliveredAt), `message.read` (readAt), `readReceiptsStore` all exist.

## Architecture

Two file changes:

| File | Action |
|---|---|
| `apps/web/src/lib/components/ReadReceipts.svelte` | Redesign |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Store deliveredAt + clientSendTime on ack |

## States

| State | Condition | Display |
|---|---|---|
| Sent | `pending: true` on the message | `Sent` |
| Received | `message.ack` fired — `deliveredAt` stored | `Received in 72ms` |
| Read | `readReceiptsStore` has receipts for messageId | `Read after 5m` |

Priority: Read > Received > Sent. Only the highest state shows.

## Data needed per message

The chat page stores on message objects (or in a local Map):
- `clientSendTime: number` — `Date.now()` at the moment `chats.send()` is called
- `deliveredAt: string | null` — ISO string from `message.ack` payload

### onMessageAck change

Current handler only updates `messages[idx].id`. Extend to also store delivered info:

```typescript
function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
    const payload = envelope.payload;
    if (payload.chatId !== chatId) return;
    const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
    if (idx !== -1) {
        messages[idx] = {
            ...messages[idx],
            id: payload.messageId,
            deliveredAt: payload.deliveredAt,
            clientSendTime: (messages[idx] as any).clientSendTime ?? Date.now()
        };
    }
}
```

### Optimistic message — store clientSendTime

In `handleSend` and `handleMediaSend`, add `clientSendTime: Date.now()` to the optimistic message object.

### For GIF sends (handleSelectGif)

Same — add `clientSendTime: Date.now()`.

## ReadReceipts.svelte redesign

Props:
```typescript
interface Props {
    messageId: string;
    chatId: string;
    isSentByMe: boolean;
    isPending: boolean;
    deliveredAt?: string | null;
    clientSendTime?: number;
    isLastOwnMessage?: boolean; // group chats: only show on last sent message
}
```

Logic:
```typescript
const receipts = $derived(isSentByMe ? readReceiptsStore.getReadReceipts(chatId, messageId) : []);
const isRead = $derived(receipts.length > 0);

const latencyMs = $derived(
    deliveredAt && clientSendTime
        ? new Date(deliveredAt).getTime() - clientSendTime
        : null
);

function formatLatency(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return ''; // unusually slow — just show "Received"
}

const readAt = $derived(receipts[0]?.readAt ?? null);

function formatElapsed(iso: string): string {
    const elapsed = Date.now() - new Date(iso).getTime();
    const m = Math.floor(elapsed / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h < 24) return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

// Determine which state to show
const state = $derived(
    !isSentByMe ? null :
    isRead ? 'read' :
    deliveredAt ? 'received' :
    isPending ? 'sent' :
    'sent'
);

const label = $derived(
    state === 'read' && readAt ? `Read after ${formatElapsed(readAt)}` :
    state === 'received' && latencyMs !== null
        ? `Received${formatLatency(latencyMs) ? ` in ${formatLatency(latencyMs)}` : ''}` :
    state === 'sent' ? 'Sent' :
    ''
);
```

Template:
```svelte
{#if label && (isLastOwnMessage !== false)}
    <span class="receipt-label">{label}</span>
{/if}

<style>
    .receipt-label {
        display: block;
        text-align: right;
        font-size: var(--text-xs);
        color: var(--color-accent);
        opacity: 0.75;
        margin-top: var(--space-1);
    }
</style>
```

## Chat page wiring

In the message rendering loop, for `.mine` bubbles, pass the new props to `<ReadReceipts>`:

```svelte
<ReadReceipts
    messageId={msg.id}
    {chatId}
    isSentByMe={msg.senderId === currentUserId}
    isPending={isPending(msg)}
    deliveredAt={(msg as any).deliveredAt}
    clientSendTime={(msg as any).clientSendTime}
    isLastOwnMessage={...}
/>
```

### isLastOwnMessage logic

For group chats, only show receipt on the last message sent by the current user:

```typescript
const lastOwnMessageId = $derived(
    [...messages].reverse().find((m) => m.senderId === currentUserId && !isPending(m))?.id ?? null
);
```

Pass `isLastOwnMessage={chatType !== 'dm' ? msg.id === lastOwnMessageId : true}` to `<ReadReceipts>`.

## Definition of Done

1. Optimistic message shows "Sent"
2. After server ack: shows "Received in 72ms" (or whatever the actual latency is)
3. After recipient reads: shows "Read after 5m"
4. Accent color, 75% opacity, no checkmarks
5. Group chats: only last own message shows receipt
6. DMs: all own messages show receipt
7. TypeScript compiles clean
8. No regressions in existing receipt display
