<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import { emotesStore } from '$stores/emotes.svelte';
	import { media } from '$services/media';
	import { emotes as emotesApi } from '$services/emotes';
	import { searchNativeEmoji, NATIVE_EMOJI } from '$utils/emoji-data';

	interface Props {
		onSelect: (insertion: string) => void;
		onClose?: () => void;
		embedded?: boolean;
	}

	let { onSelect, onClose, embedded = false }: Props = $props();

	let query = $state('');
	let uploadLoading = $state(false);
	let uploadError = $state('');
	let fileInput: HTMLInputElement | null = null;

	$effect(() => {
		emotesStore.load();
	});

	const nativeResults = $derived(
		query.trim() ? searchNativeEmoji(query) : NATIVE_EMOJI.slice(0, 60)
	);
	const emoteResults = $derived(
		emotesStore.emotes.filter((e) =>
			!query.trim() || e.name.toLowerCase().includes(query.toLowerCase())
		)
	);

	function sanitizeName(input: string): string {
		return input
			.replace(/:/g, '')
			.replace(/[^a-zA-Z0-9_\-]/g, '')
			.slice(0, 32);
	}

	function deriveDefaultName(file: File): string {
		const base = file.name.replace(/\.[^.]+$/, '');
		return sanitizeName(base.replace(/\s+/g, '_'));
	}

	async function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		let name = window.prompt('Emote name:', deriveDefaultName(file));
		if (name === null) {
			target.value = '';
			return;
		}
		name = sanitizeName(name);
		if (!name) {
			uploadError = 'Emote name is required';
			target.value = '';
			return;
		}

		uploadLoading = true;
		uploadError = '';

		try {
			const uploadRes = await media.upload(file);
			const createRes = await emotesApi.create({ name, mediaUploadId: uploadRes.id });
			emotesStore.addEmote(createRes.emote);
			await emotesStore.load({ force: true });
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploadLoading = false;
			target.value = '';
		}
	}

	function handleNativeSelect(char: string) {
		onSelect(char);
		onClose?.();
	}

	function handleEmoteSelect(name: string) {
		onSelect(`:${name}:`);
		onClose?.();
	}
</script>

<div
	class="emote-picker"
	class:embedded
	role="dialog"
	aria-label="Emoji and emote picker"
	tabindex="-1"
	use:focusTrap={{ onEscape: () => onClose?.() }}
>
	{#if !embedded}
		<div class="header">
			<span class="title">Emoji & Emotes</span>
			{#if onClose}
				<button class="close-btn" onclick={onClose} aria-label="Close picker">
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 1l12 12M13 1L1 13" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	<div class="search-wrap">
		<input
			type="text"
			placeholder="Search emoji..."
			bind:value={query}
			aria-label="Search emoji and emotes"
		/>
	</div>

	<div class="scroll-area">
		{#if nativeResults.length > 0}
			{#if !query.trim()}
				<div class="section-label">Emoji</div>
			{/if}
			<div class="emoji-grid">
				{#each nativeResults as emoji (emoji.name)}
					<button
						class="emoji-btn"
						onclick={() => handleNativeSelect(emoji.char)}
						aria-label="Insert emoji :{emoji.name}:"
						title=":{emoji.name}:"
						type="button"
					>
						<span class="emoji-char">{emoji.char}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if emoteResults.length > 0}
			<div class="section-label">Custom Emotes</div>
			<div class="emote-grid">
				{#each emoteResults as emote (emote.id)}
					<button
						class="emote-btn"
						onclick={() => handleEmoteSelect(emote.name)}
						aria-label="Insert emote :{emote.name}:"
						type="button"
					>
						<img
							src={emote.url}
							alt=":{emote.name}:"
							loading="lazy"
							width="40"
							height="40"
						/>
					</button>
				{/each}
			</div>
		{/if}

		{#if nativeResults.length === 0 && emoteResults.length === 0}
			<div class="status">No matches</div>
		{:else if emoteResults.length === 0 && !query.trim() && emotesStore.loaded}
			<div class="status">No custom emotes yet. Upload one!</div>
		{/if}

		{#if uploadError}
			<div class="status error">{uploadError}</div>
		{/if}
	</div>

	<div class="footer">
		<input
			type="file"
			accept="image/*"
			class="file-input"
			bind:this={fileInput}
			onchange={handleFileChange}
		/>
		<button
			class="upload-btn"
			onclick={() => fileInput?.click()}
			disabled={uploadLoading}
			type="button"
		>
			{uploadLoading ? 'Uploading...' : 'Upload emote'}
		</button>
	</div>
</div>

<style>
	.emote-picker {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		max-height: 320px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		width: calc(100vw - 2 * var(--space-lg));
	}

	.emote-picker.embedded {
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0;
		width: 100%;
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
		color: var(--color-text);
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
	}
	.close-btn:hover {
		background: var(--color-surface);
	}

	.search-wrap {
		flex-shrink: 0;
		margin-bottom: var(--space-sm);
	}

	.search-wrap input {
		width: 100%;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		color: var(--color-text);
		font-size: var(--text-sm);
		outline: none;
		box-sizing: border-box;
	}
	.search-wrap input:focus {
		border-color: var(--color-accent);
	}

	.scroll-area {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		padding: var(--space-xs) 0;
		margin-top: var(--space-xs);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 2px;
	}

	.emoji-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
	}
	.emoji-btn:hover {
		background: var(--color-surface);
	}

	.emoji-char {
		font-size: 1.4rem;
		line-height: 1;
	}

	.emote-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-sm);
	}

	.emote-btn {
		background: none;
		border: none;
		padding: var(--space-xs);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
	}
	.emote-btn:hover {
		background: var(--color-surface);
	}

	.emote-btn img {
		width: 100%;
		height: auto;
		object-fit: contain;
		max-width: 48px;
		max-height: 48px;
	}

	.status {
		padding: var(--space-lg);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.error {
		color: var(--color-error, #ef4444);
	}

	.footer {
		margin-top: var(--space-sm);
		flex-shrink: 0;
	}

	.file-input {
		display: none;
	}

	.upload-btn {
		width: 100%;
		background: var(--color-accent);
		color: var(--color-bg);
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
		.emote-picker:not(.embedded) {
			width: 280px;
		}

		.emote-grid {
			grid-template-columns: repeat(6, 1fr);
		}

		.emote-btn img {
			max-width: 40px;
			max-height: 40px;
		}
	}
</style>
