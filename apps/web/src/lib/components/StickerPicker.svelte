<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import { stickersStore } from '$stores/stickers.svelte';
	import { media } from '$services/media';
	import type { StickerPack } from '@penthouse/contracts';

	interface Props {
		onSelect: (sticker: { url: string; name: string }) => void;
		onClose?: () => void;
		embedded?: boolean;
	}

	let { onSelect, onClose, embedded = false }: Props = $props();

	let activePackId = $state<string | null>(null);
	let uploadLoading = $state(false);
	let uploadError = $state('');
	let fileInput: HTMLInputElement | null = null;
	let uploadTargetPackId = $state<string | null>(null);

	$effect(() => {
		stickersStore.loadPacks().then(() => {
			const first = stickersStore.packs[0];
			if (first) {
				activePackId = first.id;
				stickersStore.loadStickers(first.id);
			}
		});
	});

	function setActivePack(packId: string) {
		activePackId = packId;
		stickersStore.loadStickers(packId);
	}

	function handleSelect(sticker: { url: string; name: string }) {
		onSelect(sticker);
		onClose?.();
	}

	async function handleCreatePack() {
		const name = window.prompt('Pack name:');
		if (!name || !name.trim()) return;
		try {
			const pack = await stickersStore.createPack(name.trim());
			activePackId = pack.id;
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Failed to create pack';
		}
	}

	function triggerUpload(packId: string) {
		uploadTargetPackId = packId;
		fileInput?.click();
	}

	async function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !uploadTargetPackId) return;

		const name = window.prompt('Sticker name:', file.name.replace(/\.[^.]+$/, ''));
		if (!name || !name.trim()) {
			target.value = '';
			return;
		}

		uploadLoading = true;
		uploadError = '';

		try {
			const uploadRes = await media.upload(file);
			await stickersStore.addSticker(uploadTargetPackId, { name: name.trim(), mediaUploadId: uploadRes.id });
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploadLoading = false;
			target.value = '';
			uploadTargetPackId = null;
		}
	}

	function activePackStickers(): import('@penthouse/contracts').Sticker[] {
		return activePackId ? stickersStore.stickersByPack[activePackId] ?? [] : [];
	}

	function activePack(): StickerPack | undefined {
		return stickersStore.packs.find((p) => p.id === activePackId);
	}
</script>

<div
	class="sticker-picker"
	class:embedded
	role="dialog"
	aria-label="Sticker picker"
	tabindex="-1"
	use:focusTrap={{ onEscape: () => onClose?.() }}
>
	{#if !embedded}
		<div class="header">
			<span class="title">Stickers</span>
			{#if onClose}
				<button class="close-btn" onclick={onClose} aria-label="Close sticker picker" type="button">
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 1l12 12M13 1L1 13" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	{#if stickersStore.loading}
		<div class="status">Loading...</div>
	{:else if stickersStore.error}
		<div class="status error">{stickersStore.error}</div>
	{:else if stickersStore.packs.length === 0}
		<div class="status">No sticker packs yet.</div>
	{:else}
		<div class="tab-bar" role="tablist" aria-label="Sticker packs">
			{#each stickersStore.packs as pack (pack.id)}
				<button
					class="tab"
					class:active={activePackId === pack.id}
					role="tab"
					aria-selected={activePackId === pack.id}
					id="tab-{pack.id}"
					aria-controls="panel-{pack.id}"
					onclick={() => setActivePack(pack.id)}
					type="button"
				>
					{pack.name}
				</button>
			{/each}
			<button class="tab add-tab" onclick={handleCreatePack} type="button" aria-label="Create new pack">+</button>
		</div>

		{#if activePackId}
			<div
				class="tabpanel"
				role="tabpanel"
				id="panel-{activePackId}"
				aria-labelledby="tab-{activePackId}"
			>
				{#if activePackStickers().length === 0}
					<div class="status">No stickers in this pack yet.</div>
				{:else}
					<div class="grid">
						{#each activePackStickers() as sticker (sticker.id)}
							<button
								class="sticker-btn"
								onclick={() => handleSelect({ url: sticker.url, name: sticker.name })}
								aria-label="Send sticker {sticker.name}"
								type="button"
							>
								<img src={sticker.url} alt={sticker.name} loading="lazy" />
							</button>
						{/each}
					</div>
				{/if}

				<input
					type="file"
					accept="image/*"
					class="file-input"
					bind:this={fileInput}
					onchange={handleFileChange}
				/>
				<button
					class="upload-btn"
					onclick={() => activePackId && triggerUpload(activePackId)}
					disabled={uploadLoading}
					type="button"
				>
					{uploadLoading ? 'Uploading...' : 'Upload sticker'}
				</button>
			</div>
		{/if}
	{/if}

	{#if uploadError}
		<div class="status error">{uploadError}</div>
	{/if}
</div>

<style>
	.sticker-picker {
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		width: calc(100vw - 2 * var(--space-lg));
	}

	.sticker-picker.embedded {
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
		justify-content: space-between;
		margin-bottom: var(--space-sm);
		flex-shrink: 0;
	}

	.title {
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		color: var(--p-text);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.close-btn:hover {
		background: var(--p-surface);
	}

	.tab-bar {
		display: flex;
		gap: var(--space-xs);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--p-line);
		margin-bottom: var(--space-sm);
		overflow-x: auto;
		flex-shrink: 0;
	}

	.tab {
		background: transparent;
		color: var(--p-text-2);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.1s, color 0.1s;
		flex-shrink: 0;
	}
	.tab.active {
		background: var(--p-accent);
		color: var(--p-bg);
	}
	.tab:hover:not(.active) {
		background: var(--p-surface);
	}

	.add-tab {
		font-weight: var(--weight-bold);
		min-width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tabpanel {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
	}

	.sticker-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background 0.1s;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.sticker-btn:hover {
		background: var(--p-surface);
	}

	.sticker-btn img {
		width: 100%;
		height: auto;
		object-fit: contain;
	}

	.status {
		padding: var(--space-lg);
		text-align: center;
		color: var(--p-text-2);
		font-size: var(--text-sm);
	}

	.error {
		color: var(--p-error);
	}

	.file-input {
		display: none;
	}

	.upload-btn {
		width: 100%;
		margin-top: var(--space-sm);
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: opacity 0.1s;
	}
	.upload-btn:hover {
		opacity: 0.9;
	}
	.upload-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (min-width: 768px) {
		.sticker-picker:not(.embedded) {
			width: 360px;
		}

		.grid {
			grid-template-columns: repeat(4, 1fr);
		}

		.sticker-btn img {
			max-width: 72px;
			max-height: 72px;
		}
	}

	@media (max-width: 767px) {
		.sticker-btn img {
			max-width: 80px;
			max-height: 80px;
		}
	}
</style>
