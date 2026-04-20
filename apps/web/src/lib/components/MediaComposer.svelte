<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { sessionStore } from '$stores/session.svelte';
	import Icon from './Icon.svelte';
	import {
		classifyMediaKind,
		computeColumns,
		formatFileSize,
		getTotalSize,
		getPrimaryKind,
		type FileEntry,
		type MediaSendPayload,
		type MediaAttachment
	} from './MediaComposer.utils';
	import type { UploadResponse } from '@penthouse/contracts';

	interface Props {
		initialFiles: File[];
		onSend: (payload: MediaSendPayload) => Promise<void>;
		onCancel: () => void;
		onAddMore: () => void;
	}

	let { initialFiles, onSend, onCancel, onAddMore }: Props = $props();

	// ── State ──────────────────────────────────────────────────────────────────

	let files = $state<FileEntry[]>([]);
	let caption = $state('');
	let sending = $state(false);
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	const MAX_FILES = 10;
	const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

	// ── Derived ────────────────────────────────────────────────────────────────

	const visualFiles = $derived(
		files.filter((f) => f.mediaKind === 'image' || f.mediaKind === 'video')
	);
	const fileChips = $derived(files.filter((f) => f.mediaKind === 'file'));
	const columns = $derived(computeColumns(visualFiles.length));
	const totalSize = $derived(getTotalSize(files.map((f) => f.file)));
	const hasError = $derived(files.some((f) => f.error !== null));
	const allUploaded = $derived(files.every((f) => f.progress === 100 && f.error === null));
	const canSend = $derived(!sending && allUploaded && !hasError && files.length > 0);

	// ── Initialise from prop ───────────────────────────────────────────────────

	onMount(() => {
		initFiles(initialFiles);
	});

	function initFiles(incoming: File[]) {
		const entries: FileEntry[] = incoming.map((file) => {
			const mediaKind = classifyMediaKind(file);
			return {
				id: crypto.randomUUID(),
				file,
				previewUrl: mediaKind !== 'file' ? URL.createObjectURL(file) : '',
				mediaKind,
				progress: 0,
				uploadId: null,
				url: null,
				error: null
			};
		});
		files = entries;
		// Start uploads immediately — no $effect needed
		Promise.allSettled(entries.map((e) => uploadFile(e)));
	}

	// ── Add more files ─────────────────────────────────────────────────────────

	export function appendFiles(incoming: File[]) {
		const remaining = MAX_FILES - files.length;
		if (remaining <= 0) {
			showToast('Max 10 files per message');
			return;
		}
		const toAdd = incoming.slice(0, remaining);
		if (toAdd.length < incoming.length) {
			showToast(`Only ${remaining} more file${remaining === 1 ? '' : 's'} allowed — extra files skipped`);
		}
		const newTotal = getTotalSize([...files.map((f) => f.file), ...toAdd]);
		if (newTotal > MAX_TOTAL_BYTES) {
			showToast('Total size would exceed 25 MB');
			return;
		}
		const newEntries: FileEntry[] = toAdd.map((file) => {
			const mediaKind = classifyMediaKind(file);
			return {
				id: crypto.randomUUID(),
				file,
				previewUrl: mediaKind !== 'file' ? URL.createObjectURL(file) : '',
				mediaKind,
				progress: 0,
				uploadId: null,
				url: null,
				error: null
			};
		});
		files = [...files, ...newEntries];
		// Start uploads for new entries immediately
		Promise.allSettled(newEntries.map((e) => uploadFile(e)));
	}

	// ── Remove a file ──────────────────────────────────────────────────────────

	function removeFile(id: string) {
		const entry = files.find((f) => f.id === id);
		if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
		files = files.filter((f) => f.id !== id);
		if (files.length === 0) onCancel();
	}

	// ── Upload ─────────────────────────────────────────────────────────────────

	function uploadFile(entry: FileEntry): Promise<void> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			const formData = new FormData();
			formData.append('file', entry.file);

			xhr.upload.addEventListener('progress', (e) => {
				if (!e.lengthComputable) return;
				const idx = files.findIndex((f) => f.id === entry.id);
				if (idx !== -1) files[idx].progress = Math.round((e.loaded / e.total) * 95);
			});

			xhr.addEventListener('load', () => {
				const idx = files.findIndex((f) => f.id === entry.id);
				if (xhr.status === 201) {
					let data: UploadResponse;
					try {
						data = JSON.parse(xhr.responseText) as UploadResponse;
					} catch {
						if (idx !== -1) files[idx].error = 'Invalid server response';
						reject(new Error('Invalid server response'));
						return;
					}
					if (idx !== -1) {
						files[idx].progress = 100;
						files[idx].uploadId = data.id;
						files[idx].url = data.url;
						files[idx].error = null;
					}
					resolve();
				} else {
					let msg = `Upload failed (${xhr.status})`;
					try { msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg; } catch { /* keep default */ }
					if (idx !== -1) files[idx].error = msg;
					reject(new Error(msg));
				}
			});

			xhr.addEventListener('error', () => {
				const idx = files.findIndex((f) => f.id === entry.id);
				const msg = 'Network error — check your connection';
				if (idx !== -1) files[idx].error = msg;
				reject(new Error(msg));
			});

			xhr.open('POST', `${PUBLIC_API_URL}/api/v1/media/upload`);
			xhr.setRequestHeader('Authorization', `Bearer ${sessionStore.accessToken ?? ''}`);
			xhr.send(formData);
		});
	}

	async function retryFile(id: string) {
		const idx = files.findIndex((f) => f.id === id);
		if (idx === -1) return;
		files[idx].error = null;
		files[idx].progress = 0;
		await uploadFile(files[idx]);
	}

	// ── Send ───────────────────────────────────────────────────────────────────

	async function handleSend() {
		if (!canSend) return;

		if (hasError) return;
		if (!files.every((f) => f.uploadId && f.url)) return;

		sending = true;
		try {
			const attachments: MediaAttachment[] = files.map((f) => ({
				uploadId: f.uploadId!,
				url: f.url!,
				previewUrl: f.previewUrl,
				mediaKind: f.mediaKind,
				fileName: f.file.name,
				size: f.file.size
			}));

			await onSend({
				caption: caption.trim(),
				primaryKind: getPrimaryKind(attachments),
				attachments
			});

			files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
			files = [];
			caption = '';
			onCancel();
		} catch {
			showToast('Failed to send — tap to retry');
		} finally {
			sending = false;
		}
	}

	// ── Toast ──────────────────────────────────────────────────────────────────

	function showToast(msg: string) {
		toast = msg;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 4000);
	}

	// ── Cleanup ────────────────────────────────────────────────────────────────

	onDestroy(() => {
		files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
		if (toastTimer) clearTimeout(toastTimer);
	});
</script>

<div class="media-composer">
	<!-- Caption field -->
	<textarea
		class="caption-input"
		placeholder="Add a caption..."
		bind:value={caption}
		disabled={sending}
		rows="1"
	></textarea>

	<!-- Visual grid -->
	{#if visualFiles.length > 0}
		<div class="preview-grid" class:cols-2={columns === 2} class:cols-3={columns === 3}>
			{#each visualFiles as entry (entry.id)}
				<div class="preview-cell" class:has-error={entry.error !== null}>
					{#if entry.mediaKind === 'image'}
						<img src={entry.previewUrl} alt={entry.file.name} />
					{:else}
						<video src={entry.previewUrl} muted playsinline></video>
					{/if}

					<!-- Progress arc (shown while uploading) -->
					{#if entry.progress < 100 && entry.error === null}
						<div class="progress-overlay" aria-hidden="true">
							<svg class="progress-ring" viewBox="0 0 40 40">
								<circle class="track" cx="20" cy="20" r="16" />
								<circle
									class="fill"
									cx="20" cy="20" r="16"
									stroke-dasharray={`${(entry.progress / 100) * 100.53} 100.53`}
									transform="rotate(-90 20 20)"
								/>
							</svg>
						</div>
					{/if}

					<!-- Error overlay -->
					{#if entry.error !== null}
						<div class="error-overlay">
							<button
								class="retry-btn"
								onclick={() => retryFile(entry.id)}
								aria-label="Retry upload"
								title={entry.error}
							>
								<Icon name="rotate-ccw" size={18} />
							</button>
						</div>
					{/if}

					<!-- Remove button -->
					{#if !sending}
						<button
							class="remove-btn"
							onclick={() => removeFile(entry.id)}
							aria-label="Remove {entry.file.name}"
						>
							<Icon name="close" size={14} />
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- File chips (non-visual attachments) -->
	{#each fileChips as entry (entry.id)}
		<div class="file-chip-preview" class:has-error={entry.error !== null}>
			<Icon name="file" size={16} />
			<div class="chip-meta">
				<span class="chip-name">{entry.file.name}</span>
				<span class="chip-size">
					{#if entry.error}
						<span class="chip-error">{entry.error}</span>
					{:else if entry.progress < 100}
						{entry.progress}%
					{:else}
						{formatFileSize(entry.file.size)}
					{/if}
				</span>
			</div>
			{#if entry.error !== null}
				<button class="retry-btn-chip" onclick={() => retryFile(entry.id)} aria-label="Retry">
					<Icon name="rotate-ccw" size={14} />
				</button>
			{/if}
			{#if !sending}
				<button class="remove-btn-chip" onclick={() => removeFile(entry.id)} aria-label="Remove">
					<Icon name="close" size={14} />
				</button>
			{/if}
		</div>
	{/each}

	<!-- Footer bar -->
	<div class="composer-footer">
		<span class="file-summary">
			{files.length} file{files.length === 1 ? '' : 's'} · {formatFileSize(totalSize)}
		</span>

		<div class="footer-actions">
			{#if files.length < MAX_FILES}
				<button
					class="add-btn"
					onclick={onAddMore}
					disabled={sending}
					aria-label="Add more files"
					title="Add more files"
				>
					<Icon name="plus" size={16} />
				</button>
			{/if}

			<button
				class="cancel-btn"
				onclick={onCancel}
				disabled={sending}
				aria-label="Cancel"
			>
				Cancel
			</button>

			<button
				class="send-btn"
				onclick={handleSend}
				disabled={!canSend}
				aria-label="Send"
			>
				<Icon name="send" size={16} />
			</button>
		</div>
	</div>

	{#if toast}
		<div class="composer-toast" role="alert">{toast}</div>
	{/if}
</div>

<style>
	.media-composer {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4) var(--space-3);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-glass);
		backdrop-filter: blur(16px) saturate(1.4);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
	}

	/* ── Caption ── */
	.caption-input {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		padding: var(--space-1) 0 var(--space-2);
		resize: none;
		outline: none;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.caption-input::placeholder { color: var(--color-text-secondary); }

	/* ── Visual preview grid ── */
	.preview-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2px;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.preview-grid.cols-2 { grid-template-columns: 1fr 1fr; }
	.preview-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }

	.preview-cell {
		position: relative;
		aspect-ratio: 1;
		background: var(--color-surface);
		overflow: hidden;
	}

	.preview-cell img,
	.preview-cell video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.preview-cell.has-error {
		outline: 2px solid var(--color-danger);
		outline-offset: -2px;
	}

	/* ── Progress ring ── */
	.progress-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.progress-ring {
		width: 40px;
		height: 40px;
	}

	.progress-ring .track {
		fill: none;
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 3;
	}

	.progress-ring .fill {
		fill: none;
		stroke: white;
		stroke-width: 3;
		stroke-linecap: round;
		transition: stroke-dasharray 0.15s linear;
	}

	/* ── Error overlay ── */
	.error-overlay {
		position: absolute;
		inset: 0;
		background: rgba(214, 90, 74, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.retry-btn {
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		border-radius: var(--radius-full);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		text-shadow: none;
	}

	/* ── Remove button (top-right corner of each cell) ── */
	.remove-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 22px;
		height: 22px;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		border-radius: var(--radius-full);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		text-shadow: none;
		z-index: 2;
	}

	/* ── File chips ── */
	.file-chip-preview {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--color-accent-dim);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.file-chip-preview.has-error {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}

	.chip-meta {
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

	.chip-error { color: var(--color-danger); }

	.retry-btn-chip,
	.remove-btn-chip {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		text-shadow: none;
	}

	.retry-btn-chip:hover,
	.remove-btn-chip:hover { color: var(--color-text-primary); }

	/* ── Footer ── */
	.composer-footer {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.file-summary {
		flex: 1;
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.add-btn {
		width: 32px;
		height: 32px;
		background: var(--color-accent-dim);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		color: var(--color-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		text-shadow: none;
	}

	.cancel-btn {
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-3);
		height: 32px;
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		border-radius: var(--radius-pill);
		text-shadow: none;
	}

	.send-btn {
		width: 36px;
		height: 36px;
		background: var(--color-accent);
		border: none;
		border-radius: var(--radius-full);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		text-shadow: none;
		transition: opacity 0.15s;
	}

	.send-btn:disabled {
		opacity: 0.35;
		pointer-events: none;
	}

	/* ── Toast ── */
	.composer-toast {
		font-size: var(--text-xs);
		color: var(--color-danger);
		text-align: center;
		padding: var(--space-1) 0;
	}
</style>
