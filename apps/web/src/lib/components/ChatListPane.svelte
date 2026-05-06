<script lang="ts">
	import ChatListItem from './ChatListItem.svelte';
	import Icon from './Icon.svelte';
	import type { ChatSummary } from '@penthouse/contracts';

	interface Props {
		chats: ChatSummary[];
		activeChatId?: string;
		onSelectChat?: (chatId: string) => void;
	}

	let { chats, activeChatId, onSelectChat }: Props = $props();
</script>

<div class="pane">
	<header class="header">
		<h2>Messages</h2>
		<button class="icon-btn" aria-label="New chat">
			<Icon name="plus" size={20} />
		</button>
	</header>

	<div class="list" role="list">
		{#if chats.length === 0}
			<div class="empty">
				<Icon name="message" size={32} />
				<p>No conversations yet</p>
			</div>
		{:else}
			{#each chats as chat (chat.id)}
				<ChatListItem
					chat={chat}
					active={chat.id === activeChatId}
					onclick={() => onSelectChat?.(chat.id)}
				/>
			{/each}
		{/if}
	</div>
</div>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		background: var(--color-bg);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	h2 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text);
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: var(--color-surface-elevated);
	}

	.list {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-xl);
		color: var(--color-text-muted);
		min-height: 200px;
	}

	.empty p {
		font-size: var(--text-sm);
	}
</style>
