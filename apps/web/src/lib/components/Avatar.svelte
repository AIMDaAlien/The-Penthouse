<script lang="ts">
	interface Props {
		url?: string | null;
		name: string;
		size?: number;
	}

	let { url, name, size = 40 }: Props = $props();

	const initials = $derived(
		name
			.split(' ')
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	// Solid muted themed fallback — replaced per-name HSL hue per DND design handoff
	const fallbackBg = 'color-mix(in oklch, var(--p-accent) 30%, var(--p-surface-2))';

</script>

{#if url}
	<img src={url} alt={name} class="avatar" style:width="{size}px" style:height="{size}px" />
{:else}
	<div
		class="avatar fallback"
		style:width="{size}px"
		style:height="{size}px"
		style:background={fallbackBg}
	>
		{initials}
	</div>
{/if}

<style>
	.avatar {
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--p-text);
		font-size: calc(var(--size, 40px) * 0.4);
		font-weight: var(--weight-bold);
		font-family: var(--font-body);
		position: relative;
		overflow: hidden;
	}

	.fallback::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: var(--tex);
		mix-blend-mode: overlay;
		opacity: 0.45;
		pointer-events: none;
	}

	:global([data-mode="light"]) .fallback::after {
		opacity: 0.30;
	}
</style>
