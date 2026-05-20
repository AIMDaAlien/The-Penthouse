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
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay;
		opacity: 0.45;
		pointer-events: none;
	}

	:global([data-mode="light"]) .fallback::after {
		opacity: 0.30;
	}
</style>
