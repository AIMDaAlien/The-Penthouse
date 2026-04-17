# Read Receipts Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "Seen HH:MM" / avatar-stack with a three-state indicator: Sent → Received in Xms → Read after Xh Ym. Accent color, 75% opacity, no checkmarks.

**Architecture:** Redesign `ReadReceipts.svelte` to a single-label three-state component. Extend the chat page to store `clientSendTime` on optimistic messages and `deliveredAt` from the `message.ack` socket event. Compute `isLastOwnMessage` for group chats.

**Tech Stack:** Svelte 5 runes (`$state`, `$derived`, `$props`), `readReceiptsStore`, Socket.IO `message.ack`

---

### Task 1: Redesign ReadReceipts.svelte

**Files:**
- Modify: `apps/web/src/lib/components/ReadReceipts.svelte`

**Context:** The current `ReadReceipts.svelte` shows "Seen HH:MM" for DMs and an avatar stack for channels. You are replacing the entire component logic and template. The file is at `apps/web/src/lib/components/ReadReceipts.svelte`.

The current props are:
```typescript
interface Props {
    chatId: string;
    messageId: string;
    isSentByMe: boolean;
    chatType?: 'dm' | 'channel';
    userMap?: Map<string, { displayName: string; avatarUrl?: string | null }>;
}
```

You will replace the entire file with the new design below.

- [ ] **Step 1: Overwrite ReadReceipts.svelte**

Replace the entire file with:

```svelte
<script lang="ts">
	import { readReceiptsStore } from '$stores/readReceipts.svelte';

	interface Props {
		messageId: string;
		chatId: string;
		isSentByMe: boolean;
		isPending: boolean;
		deliveredAt?: string | null;
		clientSendTime?: number;
		isLastOwnMessage?: boolean;
	}

	let {
		messageId,
		chatId,
		isSentByMe,
		isPending,
		deliveredAt = null,
		clientSendTime,
		isLastOwnMessage = true
	}: Props = $props();

	const receipts = $derived(isSentByMe ? readReceiptsStore.getReadReceipts(chatId, messageId) : []);
	const isRead = $derived(receipts.length > 0);

	const latencyMs = $derived(
		deliveredAt && clientSendTime != null
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

	const state = $derived(
		!isSentByMe
			? null
			: isRead
				? 'read'
				: deliveredAt
					? 'received'
					: 'sent'
	);

	const label = $derived(
		state === 'read' && readAt
			? `Read after ${formatElapsed(readAt)}`
			: state === 'received' && latencyMs !== null
				? `Received${formatLatency(latencyMs) ? ` in ${formatLatency(latencyMs)}` : ''}`
				: state === 'sent'
					? 'Sent'
					: ''
	);
</script>

{#if label && isLastOwnMessage}
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

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED" && npm --workspace apps/web run typecheck
```

Expected: TypeScript errors will appear because the chat page still passes old props to `<ReadReceipts>`. That's expected — Task 2 fixes those. Verify only that `ReadReceipts.svelte` itself has no internal errors (the component's own script should be error-free).

- [ ] **Step 3: Commit**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED"
git add apps/web/src/lib/components/ReadReceipts.svelte
git commit -m "feat(ui): redesign ReadReceipts to three-state Sent/Received/Read indicator"
```

---

### Task 2: Wire read receipts into the chat page

**Files:**
- Modify: `apps/web/src/routes/chat/[id]/+page.svelte`

**Context:** You need to make three changes to `apps/web/src/routes/chat/[id]/+page.svelte`:

1. Add `clientSendTime: Date.now()` to optimistic messages in `handleSend`, `handleSelectGif`, and `handleMediaSend`
2. Update `onMessageAck` to also store `deliveredAt` and preserve `clientSendTime`
3. Add `lastOwnMessageId` derived value and update the `<ReadReceipts>` call in the template

**Exact current code to reference:**

`onMessageAck` at line ~312:
```typescript
function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
    const payload = envelope.payload;
    if (payload.chatId !== chatId) return;
    const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
    if (idx !== -1) {
        messages[idx] = { ...messages[idx], id: payload.messageId };
    }
}
```

Optimistic in `handleSend` at line ~467:
```typescript
const optimistic: PendingMessage = {
    id: `pending-${clientMessageId}`,
    chatId,
    senderId: currentUserId,
    senderUsername: sessionStore.current?.user.username ?? undefined,
    senderDisplayName: sessionStore.current?.user.displayName,
    content,
    type: 'text',
    createdAt: new Date().toISOString(),
    clientMessageId,
    replyTo: replyTarget
        ? {
                id: replyTarget.id,
                content: replyTarget.content,
                senderDisplayName: replyTarget.senderDisplayName ?? replyTarget.senderUsername ?? null
            }
        : undefined,
    pending: true
};
```

Optimistic in `handleSelectGif` at line ~577:
```typescript
const optimistic: PendingMessage = {
    id: `pending-${clientMessageId}`,
    chatId,
    senderId: currentUserId,
    senderUsername: sessionStore.current?.user.username ?? undefined,
    content: gif.url, // Store the GIF URL in content for now
    type: 'gif',
    metadata: {
        url: gif.url,
        previewUrl: gif.previewUrl,
        width: gif.width,
        height: gif.height,
        title: gif.title
    },
    createdAt: new Date().toISOString(),
    clientMessageId,
    pending: true
};
```

Optimistic in `handleMediaSend` at line ~633:
```typescript
const optimistic: PendingMessage = {
    id: `pending-${clientMessageId}`,
    chatId,
    senderId: currentUserId,
    senderUsername: sessionStore.current?.user.username ?? undefined,
    senderDisplayName: sessionStore.current?.user.displayName,
    content: payload.caption || '\u00A0',
    type: payload.primaryKind,
    metadata: {
        attachments: payload.attachments.map((a) => ({
            uploadId: a.uploadId,
            url: a.previewUrl,     // blob: URL for instant preview
            previewUrl: a.previewUrl,
            mediaKind: a.mediaKind,
            fileName: a.fileName,
            size: a.size
        }))
    },
    createdAt: new Date().toISOString(),
    clientMessageId,
    pending: true
};
```

Current `<ReadReceipts>` usage in template at line ~1032:
```svelte
<ReadReceipts {chatId} messageId={msg.id} isSentByMe={true} {chatType} />
```

- [ ] **Step 1: Update onMessageAck to preserve clientSendTime and store deliveredAt**

Replace:
```typescript
function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
    const payload = envelope.payload;
    if (payload.chatId !== chatId) return;
    const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
    if (idx !== -1) {
        messages[idx] = { ...messages[idx], id: payload.messageId };
    }
}
```

With:
```typescript
function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
    const payload = envelope.payload;
    if (payload.chatId !== chatId) return;
    const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
    if (idx !== -1) {
        messages[idx] = {
            ...messages[idx],
            id: payload.messageId,
            ...(payload.deliveredAt ? { deliveredAt: payload.deliveredAt } : {}),
            ...((messages[idx] as any).clientSendTime == null ? {} : {})
        } as any;
    }
}
```

Wait — that's messy. Use this cleaner version instead:
```typescript
function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
    const payload = envelope.payload;
    if (payload.chatId !== chatId) return;
    const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
    if (idx !== -1) {
        const prev = messages[idx] as any;
        messages[idx] = {
            ...prev,
            id: payload.messageId,
            deliveredAt: payload.deliveredAt ?? prev.deliveredAt ?? null
        } as any;
    }
}
```

- [ ] **Step 2: Add clientSendTime to the handleSend optimistic message**

In `handleSend`, add `clientSendTime: Date.now()` to the optimistic object. Replace:
```typescript
    pending: true
};
```
(the closing `};` of the optimistic object in handleSend, which has `replyTo` just above it)

With:
```typescript
    clientSendTime: Date.now(),
    pending: true
} as any;
```

Note: The `as any` is needed because `clientSendTime` is not on the `Message` type — it's ephemeral chat-page state. The existing `pending: true` also uses this pattern.

Actually, `PendingMessage = Message & { pending: true }` — the `pending` property IS on the type. The `clientSendTime` property is not, so cast is needed. Alternatively you can keep the type as is and just use `(optimistic as any).clientSendTime = Date.now()` after the object literal. Use whichever approach keeps the code cleaner.

Preferred approach — add after the optimistic object is created, before `messages.push`:

In `handleSend`, after:
```typescript
};
messages.push(optimistic);
```

Change to:
```typescript
};
(optimistic as any).clientSendTime = Date.now();
messages.push(optimistic);
```

- [ ] **Step 3: Add clientSendTime to handleSelectGif optimistic message**

In `handleSelectGif`, after the closing `};` of the optimistic object and before `messages.push(optimistic)`, add:
```typescript
(optimistic as any).clientSendTime = Date.now();
```

- [ ] **Step 4: Add clientSendTime to handleMediaSend optimistic message**

In `handleMediaSend`, after the closing `};` of the optimistic object and before `messages.push(optimistic)`, add:
```typescript
(optimistic as any).clientSendTime = Date.now();
```

- [ ] **Step 5: Add lastOwnMessageId derived value**

In the `// ─── State ────` section, after the existing state declarations (after `let userPresenceMap`), add:

```typescript
// For group chats — track the last non-pending message sent by the current user
const lastOwnMessageId = $derived(
    [...messages].reverse().find((m) => m.senderId === currentUserId && !isPending(m))?.id ?? null
);
```

- [ ] **Step 6: Update the ReadReceipts call in the template**

Replace:
```svelte
<ReadReceipts {chatId} messageId={msg.id} isSentByMe={true} {chatType} />
```

With:
```svelte
<ReadReceipts
    messageId={msg.id}
    {chatId}
    isSentByMe={msg.senderId === currentUserId}
    isPending={isPending(msg)}
    deliveredAt={(msg as any).deliveredAt}
    clientSendTime={(msg as any).clientSendTime}
    isLastOwnMessage={chatType !== 'dm' ? msg.id === lastOwnMessageId : true}
/>
```

- [ ] **Step 7: Typecheck**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED" && npm --workspace apps/web run typecheck
```

Expected: no errors.

- [ ] **Step 8: Run tests**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED" && npm --workspace apps/web run test
```

Expected: all existing tests pass (no tests touch read receipts or chat page directly, so this is a regression check).

- [ ] **Step 9: Commit**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED"
git add apps/web/src/routes/chat/[id]/+page.svelte
git commit -m "feat(chat): wire three-state read receipts with clientSendTime and deliveredAt tracking"
```
