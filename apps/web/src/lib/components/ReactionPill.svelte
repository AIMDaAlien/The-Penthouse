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
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.pill:hover {
		border-color: var(--color-accent);
	}

	.pill.mine {
		background: color-mix(in srgb, var(--color-accent) 15%, var(--color-surface));
		border-color: var(--color-accent);
	}

	.emoji {
		line-height: 1;
	}

	.count {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		font-weight: var(--weight-medium);
	}

	.pill.mine .count {
		color: var(--color-accent);
	}
</style>
