<script lang="ts">
	import type { PinnedMessage } from '@penthouse/contracts';
	import { sessionStore } from '$stores/session.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		pinned: PinnedMessage | null;
		onUnpin: () => void;
	}

	let { pinned, onUnpin }: Props = $props();

	const canUnpin = $derived(
		pinned ? sessionStore.user?.id === pinned.pinnedByUserId : false
	);
</script>

{#if pinned}
	<div class="banner">
		<Icon name="pin" size={16} />
		<div class="content">
			<span class="sender">{pinned.senderDisplayName ?? 'Unknown'}</span>
			<span class="text">{pinned.content}</span>
		</div>
		{#if canUnpin}
			<button class="unpin-btn" onclick={onUnpin} type="button">Unpin</button>
		{/if}
	</div>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--p-surface-2);
		border-bottom: 1px solid var(--p-line);
	}
	.content {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		gap: 2px;
	}
	.sender {
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		color: var(--p-accent);
	}
	.text {
		font-size: var(--text-sm);
		color: var(--p-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.unpin-btn {
		background: none;
		border: 1px solid var(--p-line);
		color: var(--p-text-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
		flex-shrink: 0;
	}
	.unpin-btn:hover {
		background: var(--p-surface);
		color: var(--p-text);
	}
</style>
