<script lang="ts">
	import { emotesStore } from '$stores/emotes.svelte';
	import { searchNativeEmoji, type NativeEmoji } from '$utils/emoji-data';
	import { focusTrap } from '$lib/actions/focusTrap';

	interface Props {
		query: string;
		onSelect: (replacement: string) => void;
		onClose: () => void;
	}

	let { query, onSelect, onClose }: Props = $props();

	let selectedIndex = $state(0);
	let listRef = $state<HTMLDivElement | null>(null);

	const nativeResults = $derived(searchNativeEmoji(query));
	const emoteResults = $derived(
		emotesStore.emotes.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
	);
	const totalResults = $derived(nativeResults.length + emoteResults.length);

	$effect(() => {
		// Reset selection when query changes
		selectedIndex = 0;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % totalResults;
			scrollSelectedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + totalResults) % totalResults;
			scrollSelectedIntoView();
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			selectCurrent();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	function scrollSelectedIntoView() {
		requestAnimationFrame(() => {
			const el = listRef?.querySelector(`[data-index="${selectedIndex}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	function selectCurrent() {
		if (selectedIndex < nativeResults.length) {
			const emoji = nativeResults[selectedIndex];
			onSelect(emoji.char);
		} else {
			const emote = emoteResults[selectedIndex - nativeResults.length];
			onSelect(`:${emote.name}:`);
		}
	}

	function isSelected(index: number) {
		return index === selectedIndex;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="autocomplete-popup"
	use:focusTrap={{ onEscape: onClose }}
	onkeydown={handleKeydown}
	role="listbox"
	aria-label="Emoji and emote suggestions"
>
	{#if totalResults === 0}
		<div class="empty">No matches</div>
	{:else}
		<div class="results" bind:this={listRef}>
			{#if nativeResults.length > 0}
				<div class="section-label">Emoji</div>
				{#each nativeResults as emoji, i (emoji.name)}
					<button
						class="result-row"
						class:selected={isSelected(i)}
						data-index={i}
						role="option"
						aria-selected={isSelected(i)}
						onclick={() => { selectedIndex = i; selectCurrent(); }}
						onmouseenter={() => selectedIndex = i}
						type="button"
					>
						<span class="result-char">{emoji.char}</span>
						<span class="result-name">:{emoji.name}:</span>
					</button>
				{/each}
			{/if}

			{#if emoteResults.length > 0}
				<div class="section-label">Custom Emotes</div>
				{#each emoteResults as emote, i (emote.id)}
					{@const idx = nativeResults.length + i}
					<button
						class="result-row"
						class:selected={isSelected(idx)}
						data-index={idx}
						role="option"
						aria-selected={isSelected(idx)}
						onclick={() => { selectedIndex = idx; selectCurrent(); }}
						onmouseenter={() => selectedIndex = idx}
						type="button"
					>
						<img src={emote.url} alt={emote.name} class="result-img" loading="lazy" />
						<span class="result-name">:{emote.name}:</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.autocomplete-popup {
		position: absolute;
		bottom: calc(100% + var(--space-xs));
		left: 0;
		z-index: 30;
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-lg);
		padding: var(--space-sm);
		min-width: 240px;
		max-width: 320px;
		max-height: 280px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
	}

	.empty {
		padding: var(--space-md);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		text-align: center;
	}

	.results {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--p-text-2);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		padding: var(--space-xs) var(--space-sm);
		position: sticky;
		top: 0;
		background: var(--p-surface-2);
		z-index: 1;
	}

	.result-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border: none;
		background: none;
		color: var(--p-text);
		font-size: var(--text-sm);
		cursor: pointer;
		border-radius: var(--radius-md);
		width: 100%;
		text-align: left;
		transition: background 0.08s;
	}

	.result-row:hover,
	.result-row.selected {
		background: var(--p-accent);
		color: var(--p-bg);
	}

	.result-char {
		font-size: var(--text-lg);
		width: 24px;
		text-align: center;
		flex-shrink: 0;
	}

	.result-img {
		width: 20px;
		height: 20px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.result-name {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
		opacity: 0.8;
	}

	.result-row.selected .result-name,
	.result-row:hover .result-name {
		opacity: 1;
	}

	@media (max-width: 767px) {
		.autocomplete-popup {
			left: var(--space-sm);
			right: var(--space-sm);
			max-width: none;
		}
	}
</style>
