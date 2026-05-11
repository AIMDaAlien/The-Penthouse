<script lang="ts">
	import type { Channel } from '@penthouse/contracts';
	import Icon from './Icon.svelte';

	interface Props {
		channels: Channel[];
		activeChannelId?: string;
		onSelect: (channelId: string) => void;
		onCreate: () => void;
	}

	let { channels, activeChannelId, onSelect, onCreate }: Props = $props();
</script>

<div class="channel-list" role="list">
	{#each channels as channel (channel.id)}
		<span role="listitem">
			<button
				class="channel"
				class:active={channel.id === activeChannelId}
				onclick={() => onSelect(channel.id)}
			>
				# {channel.name}
			</button>
		</span>
	{/each}
	<button class="channel create" onclick={onCreate} aria-label="Create channel">
		<Icon name="plus" size={14} />
		<span>New</span>
	</button>
</div>

<style>
	.channel-list {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		overflow-x: auto;
		min-height: 0;
	}

	.channel {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface-elevated);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s, color 0.1s;
	}

	.channel:hover,
	.channel.active {
		background: var(--color-accent);
		color: var(--color-bg);
		border-color: var(--color-accent);
	}

	.channel.create {
		background: transparent;
		border-style: dashed;
	}

	.channel.create:hover {
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border-color: var(--color-border);
	}
</style>
