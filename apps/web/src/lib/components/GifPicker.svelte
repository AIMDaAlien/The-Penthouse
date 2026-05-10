<script lang="ts">
	import { api } from '$services/api';

	interface Props {
		onSelect: (gif: { url: string; previewUrl: string; width?: number; height?: number }) => void;
		onClose: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	let query = $state('');
	let results = $state<Array<{ id: string; url: string; previewUrl: string; title: string; width?: number; height?: number }>>([]);
	let loading = $state(false);

	async function search() {
		loading = true;
		try {
			const data = await api.get<{ results: Array<Record<string, unknown>> }>(
				`/api/v1/gifs/search?q=${encodeURIComponent(query)}&limit=20`
			);
			results = data.results.map((r: Record<string, unknown>) => ({
				id: String(r.id),
				url: String(r.url),
				previewUrl: String(r.previewUrl),
				title: String(r.title ?? ''),
				width: typeof r.width === 'number' ? r.width : undefined,
				height: typeof r.height === 'number' ? r.height : undefined
			}));
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') search();
		if (e.key === 'Escape') onClose();
	}

	$effect(() => {
		search();
	});
</script>

<div class="gif-picker">
	<div class="header">
		<input
			type="text"
			placeholder="Search GIFs..."
			bind:value={query}
			onkeydown={handleKeydown}
		/>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M1 1l12 12M13 1L1 13" />
			</svg>
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else}
		<div class="grid">
			{#each results as gif (gif.id)}
				<button
					class="gif-btn"
					onclick={() => onSelect({ url: gif.url, previewUrl: gif.previewUrl, width: gif.width, height: gif.height })}
					aria-label={gif.title || 'GIF'}
				>
					<img src={gif.previewUrl} alt={gif.title} loading="lazy" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.gif-picker {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		width: 320px;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.header input {
		flex: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-text);
		font-size: var(--text-sm);
		outline: none;
	}
	.header input:focus { border-color: var(--color-accent); }

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background 0.1s;
	}
	.close-btn:hover { background: var(--color-surface); }

	.loading {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xs);
		padding: var(--space-sm);
		overflow-y: auto;
	}

	.gif-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: var(--radius-md);
		overflow: hidden;
		aspect-ratio: 16 / 9;
		transition: transform 0.1s;
	}
	.gif-btn:hover { transform: scale(1.02); }

	.gif-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
