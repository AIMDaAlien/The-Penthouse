<script lang="ts">
	import type { Message } from '@penthouse/contracts';
	import { sessionStore } from '$stores/session.svelte';

	interface Props {
		message: Message;
	}

	let { message }: Props = $props();

	const isMine = $derived(message.senderId === sessionStore.user?.id);
	const isDeleted = $derived(!!message.deletedAt);

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="bubble-row" class:mine={isMine}>
	<div class="bubble" class:deleted={isDeleted}>
		{#if !isMine}
			<span class="sender">{message.senderDisplayName ?? message.senderUsername}</span>
		{/if}
		{#if isDeleted}
			<span class="deleted-label">Message deleted</span>
		{:else}
			<p class="content">{message.content}</p>
		{/if}
		<span class="meta">{formatTime(message.createdAt)}</span>
	</div>
</div>

<style>
	.bubble-row {
		display: flex;
		padding: var(--space-xs) var(--space-lg);
	}

	.bubble-row.mine {
		justify-content: flex-end;
	}

	.bubble {
		max-width: 80%;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.bubble-row.mine .bubble {
		background: var(--color-accent);
		color: var(--color-bg);
		border-color: var(--color-accent);
	}

	.bubble.deleted {
		opacity: 0.5;
		font-style: italic;
	}

	.sender {
		font-size: var(--text-xs);
		color: var(--color-accent);
		font-weight: var(--weight-medium);
	}

	.content {
		font-size: var(--text-base);
		line-height: 1.4;
		word-wrap: break-word;
		margin: 0;
	}

	.deleted-label {
		font-size: var(--text-sm);
		font-style: italic;
		opacity: 0.6;
	}

	.meta {
		font-size: var(--text-xs);
		opacity: 0.6;
		align-self: flex-end;
	}


</style>
