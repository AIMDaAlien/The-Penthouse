# Typing Indicators — Design Spec

**Date:** 2026-04-17
**Branch:** `pwa`
**Target version:** v2.2.0-alpha

## Summary

Upgrade the existing typing indicator skeleton to show named indicators ("Alice is typing…"), animated three-dot pulse, per-user timeout correctness, and a 3-second inactivity stop-emitter.

Backend is complete — no socket protocol changes needed.

## Architecture

One new component (`TypingIndicator.svelte`) renders the label and animated dots. The chat page is updated to fix state management. No store changes — typing state stays local to the chat page.

## Files

| File | Action |
|---|---|
| `apps/web/src/lib/components/TypingIndicator.svelte` | Create |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Modify |

## State Changes

Replace:
```typescript
let typingUserIds = $state<Set<string>>(new Set());
let typingTimeoutId: NodeJS.Timeout | null = null;
```

With:
```typescript
// userId → displayName
let typingUsers = $state<Map<string, string>>(new Map());
// userId → per-user fallback timeout
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
// inactivity timer — emits typing.stop after 3s of no input
let typingStopTimer: ReturnType<typeof setTimeout> | null = null;
```

## onTypingUpdate handler

```typescript
function onTypingUpdate(envelope: { type: string; payload: { chatId: string; userId: string; status: 'start' | 'stop'; displayName: string } }) {
    const { userId, status, displayName } = envelope.payload;
    if (userId === currentUserId) return;

    if (status === 'start') {
        typingUsers.set(userId, displayName);
        typingUsers = typingUsers; // trigger reactivity

        // Clear any existing per-user timeout
        const existing = typingTimeouts.get(userId);
        if (existing) clearTimeout(existing);

        // 3-second fallback (in case typing.stop never arrives)
        typingTimeouts.set(userId, setTimeout(() => {
            typingUsers.delete(userId);
            typingUsers = typingUsers;
            typingTimeouts.delete(userId);
        }, 3000));
    } else {
        typingUsers.delete(userId);
        typingUsers = typingUsers;
        const t = typingTimeouts.get(userId);
        if (t) { clearTimeout(t); typingTimeouts.delete(userId); }
    }
}
```

## Inactivity stop-emitter

Replace the current throttle-only emit with:

```typescript
let typingStartTime = 0;

function emitTypingStart() {
    const socket = socketStore.instance;
    if (!socket) return;

    // Reset the inactivity stop timer on every keystroke
    if (typingStopTimer) clearTimeout(typingStopTimer);
    typingStopTimer = setTimeout(() => {
        emitTypingStop();
    }, 3000);

    const now = Date.now();
    if (now - typingStartTime < 1000) return; // throttle re-emits
    typingStartTime = now;
    socket.emit('typing.start', { chatId });
}

function emitTypingStop() {
    const socket = socketStore.instance;
    if (!socket) return;
    if (typingStopTimer) { clearTimeout(typingStopTimer); typingStopTimer = null; }
    socket.emit('typing.stop', { chatId });
    typingStartTime = 0;
}
```

Also add `typingStopTimer` cleanup to `onDestroy`:
```typescript
if (typingStopTimer) clearTimeout(typingStopTimer);
for (const t of typingTimeouts.values()) clearTimeout(t);
```

## Label logic

```typescript
function getTypingLabel(users: Map<string, string>): string {
    const names = Array.from(users.values());
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]} are typing`;
    return 'Several people are typing';
}
```

## TypingIndicator.svelte

Props: `{ label: string }`

Renders only when label is non-empty. Three animated dots after the label text.

```svelte
<script lang="ts">
    interface Props { label: string; }
    let { label }: Props = $props();
</script>

{#if label}
    <span class="typing-indicator" aria-live="polite" aria-label="{label}...">
        {label}
        <span class="dots" aria-hidden="true">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </span>
    </span>
{/if}

<style>
    .typing-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--text-xs);
        color: var(--color-accent);
        opacity: 0.75;
        font-style: italic;
    }

    .dots {
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .dot {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: currentColor;
        animation: typing-bounce 1.4s infinite;
    }

    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing-bounce {
        0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
        30% { opacity: 1; transform: translateY(-2px); }
    }

    @media (prefers-reduced-motion: reduce) {
        .dot { animation: none; opacity: 0.6; }
    }
</style>
```

## Chat page template change

Replace:
```svelte
{#if typingUserIds.size > 0}
    <span class="typing-indicator">{getTypingLabel()}</span>
{/if}
```

With:
```svelte
<TypingIndicator label={getTypingLabel(typingUsers)} />
```

And remove the old `.typing-indicator` CSS block from the chat page `<style>` section (it now lives in the component).

## Definition of Done

1. "Alice is typing…" shows with animated dots within 100ms of typing in another client
2. Disappears 3 seconds after last keystroke
3. Shows up to 3 names; 4+ shows "Several people are typing"
4. Per-user timeouts don't interfere with each other
5. `prefers-reduced-motion` disables the animation
6. TypeScript compiles clean
