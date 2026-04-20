<script module lang="ts">
	// Module-level cache — survives component unmount/remount within the same
	// page session.
	//
	// `trendingPromise` replaces the boolean in-flight flag. When a request is
	// already in progress, new instances await the same promise rather than
	// returning early with an empty list. Once resolved, all waiters receive
	// the same result and the cache is populated.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let trendingCache: { gifs: any[]; timestamp: number } | null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let trendingPromise: Promise<any[]> | null = null;
	const TRENDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
</script>

<script lang="ts">
	import { gifs } from '$services/api';
	import type { GifResult, GifProvider } from '@penthouse/contracts';

	interface Props {
		onSelect?: (gif: GifResult) => void;
		onClose?: () => void;
	}

	let { onSelect, onClose } = $props();

	// ── State ──────────────────────────────────────────────────────────────────
	let activeTab = $state<'trending' | 'search'>('trending');
	let searchQuery = $state('');
	let trendingGifs = $state<GifResult[]>([]);
	let searchResults = $state<GifResult[]>([]);
	let loading = $state(false);
	let searchLoading = $state(false);
	let error = $state('');

	let searchTimeoutId: NodeJS.Timeout | null = null;
	let latestSearchId = 0;

	// ── Effects ────────────────────────────────────────────────────────────────
	// Load trending GIFs on mount with module-level cache + shared promise.
	// If a request is already in flight, new instances await the same promise
	// instead of returning early with an empty list — so fast open/close/reopen
	// cycles still populate the picker when the request eventually resolves.
	$effect(() => {
		const loadTrending = async () => {
			const now = Date.now();
			const isCacheValid = trendingCache && now - trendingCache.timestamp < TRENDING_CACHE_TTL;

			if (isCacheValid) {
				trendingGifs = trendingCache!.gifs;
				return;
			}

			loading = true;
			error = '';

			try {
				if (!trendingPromise) {
					trendingPromise = gifs.trending('giphy', 30).then((r) => {
						trendingCache = { gifs: r.results, timestamp: Date.now() };
						trendingPromise = null;
						return r.results;
					});
				}

				// All concurrent openers await the same promise
				const result = await trendingPromise;
				trendingGifs = result;
			} catch (err: unknown) {
				trendingPromise = null;
				error = err instanceof Error ? err.message : 'Failed to load trending GIFs';
			} finally {
				loading = false;
			}
		};
		loadTrending();
	});

	// Debounced search with request sequencing.
	// Returns a cleanup function so Svelte cancels the pending timeout on unmount
	// and on each re-run (query change), preventing stale results after the input
	// is cleared or the picker is closed mid-request.
	$effect(() => {
		if (searchTimeoutId) clearTimeout(searchTimeoutId);

		if (!searchQuery.trim()) {
			// Bump the sequence so any in-flight request is ignored when it resolves
			latestSearchId++;
			searchResults = [];
			searchLoading = false;
			return () => {
				if (searchTimeoutId) clearTimeout(searchTimeoutId);
			};
		}

		searchLoading = true;
		error = '';

		const capturedSearchId = ++latestSearchId;
		searchTimeoutId = setTimeout(async () => {
			try {
				const result = await gifs.search(searchQuery.trim(), 'giphy', 30);
				if (capturedSearchId === latestSearchId) {
					searchResults = result.results;
					searchLoading = false;
				}
			} catch (err: unknown) {
				if (capturedSearchId === latestSearchId) {
					error = err instanceof Error ? err.message : 'Search failed';
					searchResults = [];
					searchLoading = false;
				}
			}
		}, 400);

		return () => {
			if (searchTimeoutId) clearTimeout(searchTimeoutId);
		};
	});

	// ── Handlers ───────────────────────────────────────────────────────────────
	function handleGifSelect(gif: GifResult) {
		onSelect?.(gif);
		onClose?.();
	}

	// Focus trap — keep keyboard focus inside the modal.
	let modalEl = $state<HTMLElement | null>(null);

	function getFocusable(): HTMLElement[] {
		if (!modalEl) return [];
		return Array.from(
			modalEl.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose?.();
			return;
		}

		// Trap Tab focus inside the modal
		if (e.key === 'Tab') {
			const focusable = getFocusable();
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}

	// Auto-focus the close button when the modal mounts
	$effect(() => {
		if (modalEl) {
			const closeBtn = modalEl.querySelector<HTMLElement>('.picker-close');
			closeBtn?.focus();
		}
	});

	// Display state based on active tab
	const displayGifs = $derived(activeTab === 'trending' ? trendingGifs : searchResults);
	const displayLoading = $derived(activeTab === 'trending' ? loading : searchLoading);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="picker-container">
	<!-- Backdrop -->
	<button
		class="picker-backdrop"
		onclick={onClose}
		aria-label="Close GIF picker"
		type="button"
	></button>

	<!-- Modal -->
	<div
		class="picker-modal"
		role="dialog"
		aria-modal="true"
		aria-label="GIF Picker"
		bind:this={modalEl}
	>
		<!-- Header -->
		<div class="picker-header">
			<h3 id="gif-picker-title">Find a GIF</h3>
			<button class="picker-close" onclick={onClose} aria-label="Close GIF picker">✕</button>
		</div>

		<!-- Tabs -->
		<div class="picker-tabs" role="tablist" aria-label="GIF categories">
			<button
				class="tab"
				class:active={activeTab === 'trending'}
				onclick={() => (activeTab = 'trending')}
				role="tab"
				aria-selected={activeTab === 'trending'}
				aria-controls="gif-panel"
			>
				Trending
			</button>
			<button
				class="tab"
				class:active={activeTab === 'search'}
				onclick={() => (activeTab = 'search')}
				role="tab"
				aria-selected={activeTab === 'search'}
				aria-controls="gif-panel"
			>
				Search
			</button>
		</div>

		<!-- Search Input (shown when on search tab) -->
		{#if activeTab === 'search'}
			<div class="search-container">
				<input
					type="text"
					class="search-input"
					placeholder="Search GIFs..."
					bind:value={searchQuery}
					/>
			</div>
		{/if}

		<!-- Content -->
		<div class="picker-content" id="gif-panel" role="tabpanel" aria-label={activeTab === 'trending' ? 'Trending GIFs' : 'Search results'}>
			{#if displayLoading}
				<div class="picker-state">Loading GIFs...</div>
			{:else if error}
				<div class="picker-state error">{error}</div>
			{:else if displayGifs.length === 0}
				<div class="picker-state">
					{activeTab === 'trending' ? 'No trending GIFs' : 'No results found'}
				</div>
			{:else}
				<div class="gif-grid">
					{#each displayGifs as gif (gif.id)}
						<button
							class="gif-item"
							onclick={() => handleGifSelect(gif)}
							title={gif.title || 'GIF'}
							aria-label={gif.title || 'Select GIF'}
						>
							<img src={gif.previewUrl} alt={gif.title || 'GIF'} loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.picker-container {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
	}

	.picker-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		cursor: pointer;
		border: none;
		padding: 0;
	}

	.picker-modal {
		position: relative;
		z-index: 31;
		margin-top: auto;
		width: 100%;
		max-height: 75dvh;
		background: rgba(26, 26, 36, 0.92);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		border-top: 1px solid var(--color-border-solid);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.picker-header h3 {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.picker-close {
		background: var(--color-surface-glass);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255,255,255,0.05);
		border-radius: var(--radius-full);
		color: var(--color-text-secondary);
		font-size: var(--text-lg);
		padding: var(--space-1);
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.picker-close:hover {
		color: var(--color-text-primary);
	}

	.picker-tabs {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-pill);
		transition: color 0.15s, background 0.15s;
		font-family: var(--font-sans);
	}

	.tab:hover {
		color: var(--color-text-primary);
	}

	.tab.active {
		color: #fff;
		background: var(--color-accent);
	}

	.search-container {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.search-input {
		width: 100%;
		background: var(--color-surface-glass);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-base);
		outline: none;
		transition: border-color 0.15s;
		font-family: var(--font-sans);
	}

	.search-input:focus {
		border-color: var(--color-accent);
	}

	.search-input:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.picker-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
	}

	.gif-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: var(--space-2);
	}

	.gif-item {
		position: relative;
		aspect-ratio: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		transition: transform 0.15s, border-color 0.15s;
		padding: 0;
	}

	.gif-item:hover {
		transform: scale(1.05);
		border-color: var(--color-accent);
	}

	.gif-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.picker-state {
		padding: var(--space-8) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.picker-state.error {
		color: var(--color-danger);
	}
</style>
