<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import GifPicker from './GifPicker.svelte';
	import EmotePicker from './EmotePicker.svelte';
	import StickerPicker from './StickerPicker.svelte';

	type Tab = 'emoji' | 'gif' | 'sticker';

	interface Props {
		onEmojiSelect: (char: string) => void;
		onEmoteSelect: (name: string) => void;
		onGifSelect: (gif: { url: string; previewUrl: string; width?: number; height?: number }) => void;
		onStickerSelect: (sticker: { url: string; name: string }) => void;
		onClose: () => void;
	}

	let { onEmojiSelect, onEmoteSelect, onGifSelect, onStickerSelect, onClose }: Props = $props();

	let activeTab = $state<Tab>('emoji');

	const tabs: { key: Tab; label: string }[] = [
		{ key: 'emoji', label: 'Emoji' },
		{ key: 'gif', label: 'GIF' },
		{ key: 'sticker', label: 'Stickers' },
	];
</script>

<div
	class="unified-picker"
	role="dialog"
	aria-label="Media picker"
	use:focusTrap={{ onEscape: onClose }}
>
	<div class="tab-bar" role="tablist" aria-label="Media picker tabs">
		{#each tabs as tab (tab.key)}
			<button
				class="tab"
				class:active={activeTab === tab.key}
				role="tab"
				aria-selected={activeTab === tab.key}
				id="tab-{tab.key}"
				aria-controls="panel-{tab.key}"
				onclick={() => (activeTab = tab.key)}
				type="button"
			>
				{tab.label}
			</button>
		{/each}
		<button class="close-btn" onclick={onClose} aria-label="Close media picker" type="button">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M1 1l12 12M13 1L1 13" />
			</svg>
		</button>
	</div>

	<div class="panel-wrap">
		{#if activeTab === 'emoji'}
			<div
				role="tabpanel"
				id="panel-emoji"
				aria-labelledby="tab-emoji"
			>
				<EmotePicker
					embedded
					onSelect={(insertion) => {
						// Custom emotes are :name:, native emoji are everything else
						if (insertion.startsWith(':') && insertion.endsWith(':')) {
							onEmoteSelect(insertion);
						} else {
							onEmojiSelect(insertion);
						}
						onClose();
					}}
				/>
			</div>
		{:else if activeTab === 'gif'}
			<div
				role="tabpanel"
				id="panel-gif"
				aria-labelledby="tab-gif"
			>
				<GifPicker
					embedded
					onSelect={(gif) => {
						onGifSelect(gif);
						onClose();
					}}
				/>
			</div>
		{:else if activeTab === 'sticker'}
			<div
				role="tabpanel"
				id="panel-sticker"
				aria-labelledby="tab-sticker"
			>
				<StickerPicker
					embedded
					onSelect={(sticker) => {
						onStickerSelect(sticker);
						onClose();
					}}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.unified-picker {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		width: calc(100vw - 2 * var(--space-lg));
		max-height: 420px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.tab-bar {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		flex-shrink: 0;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--space-sm);
	}

	.tab {
		background: transparent;
		color: var(--color-text-secondary);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s, color 0.1s;
		flex-shrink: 0;
	}
	.tab.active {
		background: var(--color-accent);
		color: var(--color-bg);
	}
	.tab:hover:not(.active) {
		background: var(--color-surface);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: auto;
	}
	.close-btn:hover {
		background: var(--color-surface);
	}

	.panel-wrap {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	@media (min-width: 768px) {
		.unified-picker {
			width: 360px;
		}
	}
</style>
