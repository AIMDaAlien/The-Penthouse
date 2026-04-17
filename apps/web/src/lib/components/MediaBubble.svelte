<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import Icon from './Icon.svelte';
	import { computeColumns, formatFileSize } from './MediaComposer.utils';
	import type { Message } from '@penthouse/contracts';

	interface Props {
		message: Message;
	}

	let { message }: Props = $props();

	// Local type for attachment objects stored in message.metadata.attachments.
	// Defined locally so MediaBubble doesn't depend on MediaComposer internals.
	type BubbleAttachment = {
		uploadId: string;
		url: string;
		previewUrl: string;
		mediaKind: 'image' | 'video' | 'file';
		fileName: string;
		size: number;
	};

	const attachments = $derived(
		(message.metadata?.attachments as BubbleAttachment[] | undefined) ?? []
	);

	const visualAttachments = $derived(
		attachments.filter((a) => a.mediaKind === 'image' || a.mediaKind === 'video')
	);

	const fileAttachments = $derived(attachments.filter((a) => a.mediaKind === 'file'));

	const columns = $derived(computeColumns(visualAttachments.length));

	// Max cells to show before the +N overflow:
	// 1-col → 1, 2-col → 4, 3-col → 6
	const maxVisible = $derived(columns === 3 ? 6 : columns === 2 ? 4 : 1);
	const overflow = $derived(Math.max(0, visualAttachments.length - maxVisible));

	let expanded = $state(false);

	const displayedVisual = $derived(
		expanded ? visualAttachments : visualAttachments.slice(0, maxVisible)
	);
	const displayColumns = $derived(
		expanded && visualAttachments.length > maxVisible ? 3 : columns
	);

	// Caption: only shown when content has non-whitespace characters.
	const caption = $derived(message.content.trim());

	/**
	 * Resolve an attachment URL to an absolute URL the browser can load.
	 * - blob: and http(s): URLs pass through unchanged.
	 * - Relative paths (/uploads/...) are prefixed with PUBLIC_API_URL.
	 */
	function resolveUrl(url: string): string {
		if (url.startsWith('blob:') || url.startsWith('http')) return url;
		return `${PUBLIC_API_URL}${url}`;
	}
</script>

{#if attachments.length > 0}
	<div class="media-bubble">
		{#if caption}
			<p class="caption">{caption}</p>
		{/if}

		{#if visualAttachments.length > 0}
			<div
				class="media-grid"
				class:cols-2={displayColumns === 2}
				class:cols-3={displayColumns === 3}
			>
				{#each displayedVisual as att, i (att.uploadId || att.url)}
					<div class="media-cell">
						{#if att.mediaKind === 'image'}
							<img
								src={resolveUrl(att.url)}
								alt={att.fileName}
								loading="lazy"
							/>
						{:else}
							<video
								src={resolveUrl(att.url)}
								autoplay
								muted
								loop
								playsinline
							></video>
						{/if}

						<!-- +N overflow button — only on the last visible cell when there are hidden items -->
						{#if !expanded && i === displayedVisual.length - 1 && overflow > 0}
							<button
								class="overflow-btn"
								onclick={() => (expanded = true)}
								aria-label="Show {overflow} more"
							>
								+{overflow}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#each fileAttachments as att (att.uploadId || att.url)}
			<div class="file-chip">
				<Icon name="file" size={16} />
				<div class="chip-info">
					<span class="chip-name">{att.fileName}</span>
					<span class="chip-size">{formatFileSize(att.size)}</span>
				</div>
				<a
					href={resolveUrl(att.url)}
					download={att.fileName}
					class="download-link"
					aria-label="Download {att.fileName}"
				>
					<Icon name="download" size={16} />
				</a>
			</div>
		{/each}
	</div>
{/if}

<style>
	.media-bubble {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		/* Negative margin collapses the bubble padding so the grid goes edge-to-edge */
		margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-3));
		overflow: hidden;
	}

	/* ── Caption ── */
	.caption {
		padding: var(--space-2) var(--space-3) 0;
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	/* ── Grid ── */
	.media-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2px;
	}

	.media-grid.cols-2 { grid-template-columns: 1fr 1fr; }
	.media-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }

	.media-cell {
		position: relative;
		aspect-ratio: 1;
		background: var(--color-surface);
		overflow: hidden;
	}

	.media-cell img,
	.media-cell video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* ── +N overflow button ── */
	.overflow-btn {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		color: white;
		font-size: 1.25rem;
		font-weight: 700;
		border: none;
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
		padding: 0;
	}

	/* ── File chips ── */
	.file-chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		border-top: 1px solid var(--color-border);
	}

	.chip-info {
		flex: 1;
		min-width: 0;
	}

	.chip-name {
		display: block;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: var(--text-sm);
	}

	.chip-size {
		font-size: var(--text-xs);
	}

	.download-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		color: var(--color-accent);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: background 0.15s;
		flex-shrink: 0;
	}

	.download-link:hover { background: var(--color-accent-dim); }
</style>
