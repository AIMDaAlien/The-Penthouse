<script lang="ts">
	import type { MessageReaction } from '@penthouse/contracts';
	import { sessionStore } from '$stores/session.svelte';

	interface Props {
		reaction: MessageReaction;
		onToggle?: (emoji: string) => void;
	}

	let { reaction, onToggle }: Props = $props();

	const isMine = $derived(
		sessionStore.user?.id ? reaction.userIds.includes(sessionStore.user.id) : false
	);
</script>

<button class="pill" class:mine={isMine} onclick={() => onToggle?.(reaction.emoji)}>
	<span class="emoji">{reaction.emoji}</span>
	<span class="count">{reaction.userIds.length}</span>
</button>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 2px 6px;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		color: var(--p-text);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.pill:hover {
		border-color: var(--p-accent);
	}

	.pill.mine {
		background: var(--p-accent-soft);
		border-color: var(--p-accent);
	}

	.emoji {
		line-height: 1;
	}

	.count {
		font-size: var(--text-xs);
		color: var(--p-text-2);
		font-weight: var(--weight-medium);
	}

	.pill.mine .count {
		color: var(--p-accent);
	}
</style>
