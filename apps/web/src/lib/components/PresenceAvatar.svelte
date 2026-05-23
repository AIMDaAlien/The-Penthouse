<script lang="ts">
	import Avatar from './Avatar.svelte';
	import { presenceStore } from '$stores/presence.svelte';

	interface Props {
		url?: string | null;
		name: string;
		size?: number;
		userId?: string;
		showTooltip?: boolean;
	}

	let { url, name, size = 40, userId, showTooltip = true }: Props = $props();

	const presence = $derived(userId ? presenceStore.get(userId) : undefined);
	const dotColor = $derived(presenceStore.presenceColor(presence?.state));
	const statusClass = $derived.by(() => {
		if (!presence || presence.state === 'offline') return 'offline';
		if (presence.state === 'available') return 'online';
		return 'away';
	});
	const tooltipText = $derived(
		showTooltip && presence ? presenceStore.presenceLabel(presence.state, presence.note) : ''
	);
</script>

<div class="wrap" style:width="{size}px" style:height="{size}px" title={tooltipText} data-presence-state={presence?.state ?? 'unknown'}>
	<Avatar {url} {name} {size} />
	{#if presence}
		<span
			class="dot status-dot {statusClass}"
			data-presence-dot={presence.state}
			style:background={dotColor}
			style:--dot-size="{Math.max(10, size * 0.26)}px"
		></span>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
	}

	.dot {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: var(--dot-size, 10px);
		height: var(--dot-size, 10px);
		border-radius: 50%;
		border: 2px solid var(--p-surface);
		box-shadow: 0 0 0 1px color-mix(in oklch, var(--p-line) 50%, transparent);
	}
</style>
