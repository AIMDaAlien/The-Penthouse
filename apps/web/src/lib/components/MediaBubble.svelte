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
		Array.isArray(message.metadata?.attachments)
			? (message.metadata.attachments as BubbleAttachment[]).filter(
					(a): a is BubbleAttachment =>
						a !== null &&
						typeof a === 'object' &&
						typeof a.url === 'string' &&
						typeof a.mediaKind === 'string'
				)
			: []
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

	function resolveUrl(url: string): string {
		if (url.startsWith('blob:') || url.startsWith('http')) return url;
		return `${PUBLIC_API_URL}${url}`;
	}

	// ── Audio voice note ──────────────────────────────────────────────────────
	const isAudio = $derived(message.type === 'audio');
	const audioUrl = $derived(
		isAudio ? resolveUrl((message.metadata?.audioUrl as string) ?? '') : null
	);
	const audioDurationSec = $derived(
		isAudio ? ((message.metadata?.durationSeconds as number) ?? 0) : 0
	);

	let audioEl = $state<HTMLAudioElement | null>(null);
	let audioPlaying = $state(false);
	let audioProgress = $state(0); // 0-1
	let audioCurrent = $state(0);  // seconds
	let audioRate = $state(1);

	const RATES = [1, 1.5, 2];

	function formatDuration(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function togglePlay() {
		if (!audioEl) return;
		if (audioPlaying) {
			audioEl.pause();
		} else {
			audioEl.play();
		}
	}

	function onTimeUpdate() {
		if (!audioEl) return;
		audioCurrent = audioEl.currentTime;
		audioProgress = audioEl.duration ? audioEl.currentTime / audioEl.duration : 0;
	}

	function onEnded() {
		audioPlaying = false;
		audioProgress = 0;
		audioCurrent = 0;
		if (audioEl) audioEl.currentTime = 0;
	}

	function seekAudio(e: MouseEvent) {
		if (!audioEl) return;
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		audioEl.currentTime = pct * audioEl.duration;
	}

	function cycleRate() {
		const next = RATES[(RATES.indexOf(audioRate) + 1) % RATES.length];
		audioRate = next;
		if (audioEl) audioEl.playbackRate = next;
	}
</script>

{#if isAudio && audioUrl}
	<div class="audio-bubble">
		<!-- Hidden native audio element -->
		<audio
			bind:this={audioEl}
			src={audioUrl}
			bind:paused={audioPlaying}
			ontimeupdate={onTimeUpdate}
			onended={onEnded}
			onplay={() => (audioPlaying = false)}
			onpause={() => (audioPlaying = true)}
		></audio>

		<button class="audio-play" onclick={togglePlay} aria-label={audioPlaying ? 'Pause' : 'Play'}>
			<Icon name={audioPlaying ? 'square' : 'send'} size={16} />
		</button>

		<div class="audio-track">
			<div
				class="audio-bar"
				role="slider"
				aria-label="Seek"
				aria-valuenow={Math.round(audioProgress * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				tabindex="0"
				onclick={seekAudio}
				onkeydown={(e) => {
					if (!audioEl) return;
					if (e.key === 'ArrowRight') audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 5);
					if (e.key === 'ArrowLeft') audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
				}}
			>
				<div class="audio-fill" style="width: {audioProgress * 100}%"></div>
				<div class="audio-thumb" style="left: {audioProgress * 100}%"></div>
			</div>
			<span class="audio-time">{audioPlaying ? formatDuration(audioDurationSec) : formatDuration(audioCurrent)}</span>
		</div>

		<button class="audio-rate" onclick={cycleRate} aria-label="Playback speed {audioRate}x">
			{audioRate}x
		</button>
	</div>
{:else if attachments.length > 0}
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

	/* ── Audio voice note ── */
	.audio-bubble {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		min-width: 200px;
	}

	.audio-play {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--color-accent);
		color: white;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}

	.audio-play:active { opacity: 0.75; }

	.audio-track {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.audio-bar {
		position: relative;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-full);
		cursor: pointer;
		outline: none;
	}

	.audio-bar:focus-visible { box-shadow: 0 0 0 2px var(--color-accent); }

	.audio-fill {
		position: absolute;
		inset-block: 0;
		left: 0;
		background: var(--color-accent);
		border-radius: var(--radius-full);
		pointer-events: none;
	}

	.audio-thumb {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		border-radius: var(--radius-full);
		background: white;
		pointer-events: none;
	}

	.audio-time {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}

	.audio-rate {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-secondary);
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: var(--radius-sm);
		padding: 2px 6px;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.12s;
	}

	.audio-rate:active { background: rgba(255, 255, 255, 0.2); }
</style>
