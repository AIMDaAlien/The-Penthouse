<script lang="ts">
	import Avatar from './Avatar.svelte';
	import type { ChatSummary } from '@penthouse/contracts';

	interface Props {
		chat: ChatSummary;
		active?: boolean;
		onclick?: () => void;
	}

	let { chat, active = false, onclick }: Props = $props();

	const timeLabel = $derived(() => {
		if (!chat.updatedAt) return '';
		const d = new Date(chat.updatedAt);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	});
</script>

<button class="item" class:active onclick={onclick} aria-label={`Open chat ${chat.name}`}>
	<Avatar url={chat.counterpartAvatarUrl} name={chat.name} size={48} />
	<div class="content">
		<div class="row">
			<span class="name">{chat.name}</span>
			<span class="time">{timeLabel()}</span>
		</div>
		<div class="row">
			<span class="preview">{chat.type === 'dm' ? 'Direct message' : 'Channel'}</span>
			{#if chat.unreadCount > 0}
				<span class="badge">{chat.unreadCount}</span>
			{/if}
		</div>
	</div>
</button>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-lg);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
	}

	.item:hover, .item.active {
		background: var(--color-surface-elevated);
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		min-width: 0;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.name {
		font-weight: var(--weight-medium);
		font-size: var(--text-base);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.preview {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.badge {
		background: var(--color-accent);
		color: var(--color-bg);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		flex-shrink: 0;
		min-width: 18px;
		text-align: center;
	}
</style>
