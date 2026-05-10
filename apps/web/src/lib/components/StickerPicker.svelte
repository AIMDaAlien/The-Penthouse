<script lang="ts">
	import { api } from '$services/api';

	interface Sticker {
		id: string;
		packId: string;
		name: string;
		url: string;
	}

	interface StickerPack {
		id: string;
		name: string;
		thumbnailUrl: string | null;
		isPublic: boolean;
	}

	interface Props {
		onSelect: (sticker: { url: string; name: string }) => void;
		onClose: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	let packs = $state<StickerPack[]>([]);
	let stickersByPack = $state<Record<string, Sticker[]>>({});
	let activePackId = $state<string | null>(null);
	let loading = $state(true);

	$effect(() => {
		api.get<{ packs?: Array<Record<string, unknown>> }>('/api/v1/sticker-packs')
			.then((data) => {
				packs = (data.packs ?? []).map((p: Record<string, unknown>) => ({
					id: String(p.id),
					name: String(p.name),
					thumbnailUrl: p.thumbnailUrl ? String(p.thumbnailUrl) : null,
					isPublic: Boolean(p.isPublic)
				}));
				if (packs.length > 0) {
					activePackId = packs[0].id;
					loadStickers(packs[0].id);
				}
			})
			.finally(() => loading = false);
	});

	async function loadStickers(packId: string) {
		if (stickersByPack[packId]) return;
		const data = await api.get<{ stickers?: Array<Record<string, unknown>> }>(`/api/v1/sticker-packs/${packId}/stickers`);
		stickersByPack[packId] = (data.stickers ?? []).map((s: Record<string, unknown>) => ({
			id: String(s.id),
			packId: String(s.packId),
			name: String(s.name),
			url: String(s.url)
		}));
	}

	function setActivePack(packId: string) {
		activePackId = packId;
		loadStickers(packId);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<div class="sticker-picker" onkeydown={handleKeydown} role="dialog" tabindex="-1">
	<div class="header">
		<span class="title">Stickers</span>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M1 1l12 12M13 1L1 13" />
			</svg>
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if packs.length === 0}
		<div class="empty">No sticker packs yet.</div>
	{:else}
		<div class="pack-tabs">
			{#each packs as pack (pack.id)}
				<button
					class="pack-tab"
					class:active={activePackId === pack.id}
					onclick={() => setActivePack(pack.id)}
					aria-label={pack.name}
				>
					{#if pack.thumbnailUrl}
						<img src={pack.thumbnailUrl} alt={pack.name} width={28} height={28} />
					{:else}
						<span class="tab-label">{pack.name.slice(0, 2)}</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="grid">
			{#if activePackId && stickersByPack[activePackId]}
				{#each stickersByPack[activePackId] as sticker (sticker.id)}
					<button
						class="sticker-btn"
						onclick={() => onSelect({ url: sticker.url, name: sticker.name })}
						aria-label={`Sticker ${sticker.name}`}
					>
						<img src={sticker.url} alt={sticker.name} loading="lazy" />
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.sticker-picker {
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
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.title {
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}

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

	.loading, .empty {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.pack-tabs {
		display: flex;
		gap: var(--space-xs);
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}

	.pack-tab {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: none;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: border-color 0.15s;
	}
	.pack-tab.active {
		border-color: var(--color-accent);
	}
	.pack-tab img {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: var(--radius-sm);
	}
	.tab-label {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		font-weight: var(--weight-medium);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-xs);
		padding: var(--space-sm);
		overflow-y: auto;
	}

	.sticker-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background 0.1s, transform 0.1s;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.sticker-btn:hover {
		background: var(--color-surface);
		transform: scale(1.05);
	}

	.sticker-btn img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
</style>
