<script lang="ts">
	import { api } from '$services/api';

	interface Emote {
		id: string;
		name: string;
		url: string;
		width: number;
		height: number;
		isAnimated: boolean;
	}

	interface Props {
		onSelect: (name: string) => void;
		onClose: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	let emotes = $state<Emote[]>([]);
	let loading = $state(true);

	$effect(() => {
		api.get<{ emotes?: Array<Record<string, unknown>> }>('/api/v1/emotes')
			.then((data) => {
				emotes = (data.emotes ?? []).map((e: Record<string, unknown>) => ({
					id: String(e.id),
					name: String(e.name),
					url: String(e.url),
					width: Number(e.width ?? 48),
					height: Number(e.height ?? 48),
					isAnimated: Boolean(e.isAnimated)
				}));
			})
			.finally(() => loading = false);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<div class="emote-picker" onkeydown={handleKeydown} role="dialog" tabindex="-1">
	<div class="header">
		<span class="title">Emotes</span>
		<button class="close-btn" onclick={onClose} aria-label="Close">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M1 1l12 12M13 1L1 13" />
			</svg>
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if emotes.length === 0}
		<div class="empty">No custom emotes yet.</div>
	{:else}
		<div class="grid">
			{#each emotes as emote (emote.id)}
				<button
					class="emote-btn"
					onclick={() => onSelect(`:${emote.name}:`)}
					title={`:${emote.name}:`}
					aria-label={`Emote :${emote.name}:`}
				>
					<img src={emote.url} alt={`:${emote.name}:`} width={32} height={32} loading="lazy" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.emote-picker {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		width: 280px;
		max-height: 320px;
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

	.grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: var(--space-xs);
		padding: var(--space-sm);
		overflow-y: auto;
	}

	.emote-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.emote-btn:hover { background: var(--color-surface); }

	.emote-btn img {
		object-fit: contain;
	}
</style>
