<script lang="ts">
	import { gifsStore } from '$stores/gifs.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';

	interface Props {
		onSelect: (gif: { url: string; previewUrl: string; width?: number; height?: number }) => void;
		onClose?: () => void;
		embedded?: boolean;
	}

	let { onSelect, onClose, embedded = false }: Props = $props();

	let query = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function performSearch() {
		gifsStore.load(query, 20);
	}

	function debouncedSearch() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			performSearch();
		}, 300);
	}

	function handleSelect(gif: { url: string; previewUrl: string; width?: number; height?: number; title?: string | null }) {
		onSelect({ url: gif.url, previewUrl: gif.previewUrl, width: gif.width ?? undefined, height: gif.height ?? undefined });
		onClose?.();
	}

	$effect(() => {
		void query;
		debouncedSearch();
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	$effect(() => {
		gifsStore.load('', 20);
	});
</script>

<div
	class="gif-picker"
	class:embedded
	aria-label="GIF picker"
	use:focusTrap={{ onEscape: onClose, initialFocus: true }}
>
	{#if !embedded}
		<div class="header">
			<input
				type="text"
				placeholder="Search GIFs..."
				bind:value={query}
				aria-label="Search GIFs"
			/>
			<button class="close-btn" onclick={() => onClose?.()} aria-label="Close GIF picker">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M1 1l12 12M13 1L1 13" />
				</svg>
			</button>
		</div>
	{:else}
		<div class="search-wrap">
			<input
				type="text"
				placeholder="Search GIFs..."
				bind:value={query}
				aria-label="Search GIFs"
			/>
		</div>
	{/if}

	<div class="content">
		{#if gifsStore.loading}
			<div class="spinner-wrap">
				<div class="spinner" aria-hidden="true"></div>
				<span class="spinner-text">Loading...</span>
			</div>
		{:else if gifsStore.loaded && gifsStore.results.length === 0}
			<div class="empty">No results</div>
		{:else}
			<div class="grid" role="list">
				{#each gifsStore.results as gif (gif.id)}
					<button
						class="gif-btn"
						onclick={() =>
							handleSelect({
								url: gif.url,
								previewUrl: gif.previewUrl,
								width: gif.width ?? undefined,
								height: gif.height ?? undefined,
								title: gif.title
							})}
						aria-label="Select GIF: {gif.title ?? 'Untitled'}"
						type="button"
					>
						<img
							src={gif.previewUrl}
							alt={gif.title ?? ''}
							loading="lazy"
						/>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.gif-picker {
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		width: 320px;
	}

	.gif-picker.embedded {
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0;
		width: 100%;
		max-height: 360px;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
		flex-shrink: 0;
	}

	.header input,
	.search-wrap input {
		flex: 1;
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		color: var(--p-text);
		font-size: var(--text-sm);
		outline: none;
	}

	.header input:focus,
	.search-wrap input:focus {
		border-color: var(--p-accent);
	}

	.search-wrap {
		margin-bottom: var(--space-md);
		flex-shrink: 0;
	}

	.search-wrap input {
		width: 100%;
		box-sizing: border-box;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: var(--p-surface);
	}

	.content {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
	}

	.gif-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: var(--radius-md);
		overflow: hidden;
		aspect-ratio: 16 / 10;
		transition: transform 0.1s;
	}

	.gif-btn:hover {
		transform: scale(1.02);
	}

	.gif-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.spinner-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		gap: var(--space-sm);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--p-line);
		border-top-color: var(--p-accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinner-text {
		color: var(--p-text-2);
		font-size: var(--text-sm);
	}

	.empty {
		padding: var(--space-lg);
		text-align: center;
		color: var(--p-text-2);
		font-size: var(--text-sm);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 767px) {
		.gif-picker:not(.embedded) {
			width: calc(100vw - 2 * var(--space-lg));
		}

		.grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
</style>
