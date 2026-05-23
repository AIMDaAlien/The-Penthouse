<script lang="ts">
	import type { Channel } from '@penthouse/contracts';
	import Icon from './Icon.svelte';

	interface Props {
		channels: Channel[];
		activeChannelId?: string;
		onSelect: (channelId: string) => void;
		onCreate: () => void;
		onDelete?: (channelId: string) => void;
		onRename?: (channelId: string, newName: string) => void;
		canManage?: boolean;
	}

	let {
		channels,
		activeChannelId,
		onSelect,
		onCreate,
		onDelete,
		onRename,
		canManage = false
	}: Props = $props();

	let editingChannelId = $state<string | null>(null);
	let editingName = $state('');
</script>

<div class="channel-list" role="list">
	{#each channels as channel (channel.id)}
		<span class="channel-row" role="listitem">
			{#if editingChannelId === channel.id}
				<form
					class="channel channel-edit"
					onsubmit={(e) => {
						e.preventDefault();
						onRename?.(channel.id, editingName.trim());
						editingChannelId = null;
					}}
				>
					<input type="text" bind:value={editingName} />
					<button type="submit" aria-label="Save"><Icon name="check" size={14} /></button>
					<button type="button" aria-label="Cancel" onclick={() => (editingChannelId = null)}>
						<Icon name="x" size={14} />
					</button>
				</form>
			{:else}
				<button
					class="channel"
					class:active={channel.id === activeChannelId}
					onclick={() => onSelect(channel.id)}
				>
					# {channel.name}
				</button>
				{#if canManage}
					<button
						class="channel-action"
						aria-label="Rename"
						onclick={(e) => {
							e.stopPropagation();
							editingChannelId = channel.id;
							editingName = channel.name;
						}}
					>
						<Icon name="edit" size={12} />
					</button>
					<button
						class="channel-action danger"
						aria-label="Delete"
						onclick={(e) => {
							e.stopPropagation();
							if (confirm(`Delete channel #${channel.name}?`)) onDelete?.(channel.id);
						}}
					>
						<Icon name="trash" size={12} />
					</button>
				{/if}
			{/if}
		</span>
	{/each}
	{#if canManage}
		<button class="channel create" onclick={onCreate} aria-label="Create channel">
			<Icon name="plus" size={14} />
			<span>New</span>
		</button>
	{/if}
</div>

<style>
	.channel-list {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
		background: var(--p-surface);
		overflow-x: auto;
		min-height: 0;
	}

	.channel-row {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.channel {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		background: var(--p-surface-2);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s, color 0.1s;
	}

	.channel:hover,
	.channel.active {
		background: var(--p-accent);
		color: var(--p-bg);
		border-color: var(--p-accent);
	}

	.channel.create {
		background: transparent;
		border-style: dashed;
	}

	.channel.create:hover {
		background: var(--p-surface-2);
		color: var(--p-text);
		border-color: var(--p-line);
	}

	.channel-edit {
		background: var(--p-bg);
		border-color: var(--p-accent);
		color: var(--p-text);
		padding: 2px var(--space-xs);
		gap: var(--space-xs);
	}

	.channel-edit input {
		background: transparent;
		border: none;
		color: var(--p-text);
		font-size: var(--text-sm);
		outline: none;
		width: 120px;
		padding: 2px;
	}

	.channel-edit button {
		background: none;
		border: none;
		color: var(--p-muted);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		border-radius: var(--radius-sm);
	}

	.channel-edit button:hover {
		color: var(--p-text);
	}

	.channel-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		background: none;
		border: none;
		color: var(--p-muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.channel-row:hover .channel-action,
	.channel-action:focus {
		opacity: 1;
	}

	.channel-action:hover {
		color: var(--p-text);
	}

	.channel-action.danger:hover {
		color: var(--p-warning);
	}
</style>
