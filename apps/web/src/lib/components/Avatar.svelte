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

	const hue = $derived(
		name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360
	);
</script>

{#if url}
	<img src={url} alt={name} class="avatar" style:width="{size}px" style:height="{size}px" />
{:else}
	<div
		class="avatar fallback"
		style:width="{size}px"
		style:height="{size}px"
		style:background={`hsl(${hue} 50% 35%)`}
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
		color: #fff;
		font-size: calc(var(--size, 40px) * 0.4);
		font-weight: var(--weight-bold);
		font-family: var(--font-body);
	}
</style>
