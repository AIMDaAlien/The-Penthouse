# Typing Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder typing indicator with named user display ("Alice is typing…"), animated three-dot pulse, per-user timeouts, and a 3-second inactivity stop-emitter.

**Architecture:** Create a new `TypingIndicator.svelte` component that takes a pre-formatted label string and renders the animated dots. Update the chat page to use `Map<userId, displayName>` for state, fix per-user timeout logic, and add the inactivity stop-emitter.

**Tech Stack:** Svelte 5 runes (`$state`, `$derived`, `$props`), CSS `@keyframes`, Socket.IO

---

### Task 1: Create TypingIndicator.svelte

**Files:**
- Create: `apps/web/src/lib/components/TypingIndicator.svelte`

- [ ] **Step 1: Create the component file**

Create `apps/web/src/lib/components/TypingIndicator.svelte` with this exact content:

```svelte
<script lang="ts">
	interface Props {
		label: string;
	}
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
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.dots {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: currentColor;
		animation: typing-bounce 1.4s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing-bounce {
		0%,
		60%,
		100% {
			opacity: 0.3;
			transform: translateY(0);
		}
		30% {
			opacity: 1;
			transform: translateY(-2px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED" && npm --workspace apps/web run typecheck
```

Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED"
git add apps/web/src/lib/components/TypingIndicator.svelte
git commit -m "feat(ui): add TypingIndicator component with animated dots"
```

---

### Task 2: Wire typing indicators into the chat page

**Files:**
- Modify: `apps/web/src/routes/chat/[id]/+page.svelte`

**Context:** The chat page already has a basic typing indicator. These are the current pieces you'll replace/extend:

1. State at line ~84:
```typescript
let typingUserIds = $state<Set<string>>(new Set());
let typingTimeoutId: NodeJS.Timeout | null = null;
```

2. `getTypingLabel()` function at line ~118:
```typescript
function getTypingLabel(): string {
    if (typingUserIds.size === 0) return '';
    if (typingUserIds.size === 1) {
        return 'Someone is typing...';
    }
    return `${typingUserIds.size} people are typing...`;
}
```

3. `onTypingUpdate` handler inside the `$effect` block at line ~322:
```typescript
function onTypingUpdate(envelope: { type: string; payload: { chatId: string; userId: string; status: 'start' | 'stop' } }) {
    const { userId, status } = envelope.payload;
    if (status === 'start' && userId !== currentUserId) {
        typingUserIds.add(userId);
        if (typingTimeoutId) clearTimeout(typingTimeoutId);
        typingTimeoutId = setTimeout(() => {
            typingUserIds.delete(userId);
            typingUserIds = typingUserIds;
        }, 4000);
    } else {
        typingUserIds.delete(userId);
        typingUserIds = typingUserIds;
    }
}
```

4. `emitTypingStart` / `emitTypingStop` at line ~549:
```typescript
let typingStartTime = 0;

function emitTypingStart() {
    const socket = socketStore.instance;
    if (!socket) return;
    const now = Date.now();
    if (now - typingStartTime < 1000) return;
    typingStartTime = now;
    socket.emit('typing.start', { chatId });
}

function emitTypingStop() {
    const socket = socketStore.instance;
    if (!socket) return;
    socket.emit('typing.stop', { chatId });
    typingStartTime = 0;
}
```

5. `onDestroy` cleanup at line ~438 (inside `$effect` return):
```typescript
if (typingTimeoutId) clearTimeout(typingTimeoutId);
```

6. Template at line ~859:
```svelte
{#if typingUserIds.size > 0}
    <span class="typing-indicator">{getTypingLabel()}</span>
{/if}
```

7. CSS at line ~1222:
```css
.typing-indicator {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

- [ ] **Step 1: Add the TypingIndicator import**

At the top of the `<script>` block, after the existing component imports (after line ~19), add:

```typescript
import TypingIndicator from '$lib/components/TypingIndicator.svelte';
```

- [ ] **Step 2: Replace typing state declarations**

Replace:
```typescript
// Typing indicators
let typingUserIds = $state<Set<string>>(new Set());
let typingTimeoutId: NodeJS.Timeout | null = null;
```

With:
```typescript
// Typing indicators
// userId → displayName map; per-user timeout Map for fallback cleanup
let typingUsers = $state<Map<string, string>>(new Map());
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
let typingStopTimer: ReturnType<typeof setTimeout> | null = null;
```

- [ ] **Step 3: Replace getTypingLabel**

Replace the entire `getTypingLabel` function:
```typescript
function getTypingLabel(): string {
    if (typingUserIds.size === 0) return '';
    // This is a simplified version - in a real implementation,
    // we'd map userIds to display names from the message history or a user map
    // For now, just show a generic "typing..." indicator
    if (typingUserIds.size === 1) {
        return 'Someone is typing...';
    }
    return `${typingUserIds.size} people are typing...`;
}
```

With:
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

- [ ] **Step 4: Replace onTypingUpdate handler**

Replace:
```typescript
// typing.update payload: { chatId, userId, status: 'start' | 'stop', displayName, avatarUrl }
function onTypingUpdate(envelope: { type: string; payload: { chatId: string; userId: string; status: 'start' | 'stop' } }) {
    const { userId, status } = envelope.payload;
    if (status === 'start' && userId !== currentUserId) {
        typingUserIds.add(userId);
        if (typingTimeoutId) clearTimeout(typingTimeoutId);
        typingTimeoutId = setTimeout(() => {
            typingUserIds.delete(userId);
            typingUserIds = typingUserIds;
        }, 4000);
    } else {
        typingUserIds.delete(userId);
        typingUserIds = typingUserIds;
    }
}
```

With:
```typescript
function onTypingUpdate(envelope: { type: string; payload: { chatId: string; userId: string; status: 'start' | 'stop'; displayName: string } }) {
    const { userId, status, displayName } = envelope.payload;
    if (userId === currentUserId) return;

    if (status === 'start') {
        typingUsers.set(userId, displayName);
        typingUsers = typingUsers; // trigger reactivity

        const existing = typingTimeouts.get(userId);
        if (existing) clearTimeout(existing);

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

- [ ] **Step 5: Update the $effect cleanup (inside the $effect return)**

Replace:
```typescript
if (typingTimeoutId) clearTimeout(typingTimeoutId);
```

With:
```typescript
if (typingStopTimer) clearTimeout(typingStopTimer);
for (const t of typingTimeouts.values()) clearTimeout(t);
```

- [ ] **Step 6: Replace emitTypingStart and emitTypingStop**

Replace:
```typescript
let typingStartTime = 0;

function emitTypingStart() {
    const socket = socketStore.instance;
    if (!socket) return;

    const now = Date.now();
    // Only emit every 1 second to avoid spam
    if (now - typingStartTime < 1000) return;
    typingStartTime = now;

    socket.emit('typing.start', { chatId });
}

function emitTypingStop() {
    const socket = socketStore.instance;
    if (!socket) return;
    socket.emit('typing.stop', { chatId });
    typingStartTime = 0;
}
```

With:
```typescript
let typingStartTime = 0;

function emitTypingStart() {
    const socket = socketStore.instance;
    if (!socket) return;

    // Reset inactivity stop timer on every keystroke
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

- [ ] **Step 7: Update the template**

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

- [ ] **Step 8: Remove the old .typing-indicator CSS block**

In the `<style>` section, remove this block entirely:
```css
.typing-indicator {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
```

(The styles now live inside `TypingIndicator.svelte`.)

- [ ] **Step 9: Typecheck**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED" && npm --workspace apps/web run typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
cd "/Users/aim/Documents/THE PENTHOUSE OPTIMIZED"
git add apps/web/src/routes/chat/[id]/+page.svelte
git commit -m "feat(chat): wire named typing indicators with per-user timeouts and inactivity stop"
```
