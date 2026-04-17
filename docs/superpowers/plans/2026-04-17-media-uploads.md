# Media Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-file media uploads (images, videos, documents) to the chat composer, rendering as a tight grid bubble in the conversation.

**Architecture:** Two new components — `MediaComposer.svelte` (file picker, preview strip, parallel XHR upload queue) and `MediaBubble.svelte` (grid renderer for media messages) — are mounted in the existing chat page. Pure utility functions live in a separate `MediaComposer.utils.ts` so they can be unit-tested without Svelte. The chat page adds an attach button and delegates the entire upload+preview flow to `MediaComposer`, receiving a `MediaSendPayload` callback once all uploads complete, at which point it appends an optimistic message and calls `chats.send`.

**Tech Stack:** SvelteKit 2.x, Svelte 5 runes (`$state`, `$derived`, `$effect`), `XMLHttpRequest` (upload progress), Vitest, `@penthouse/contracts` types, `PUBLIC_API_URL` env var.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/lib/components/MediaComposer.utils.ts` | Create | Pure functions: `classifyMediaKind`, `computeColumns`, `formatFileSize`, `getTotalSize`, `getPrimaryKind`. Also exports shared types `MediaKind`, `MediaAttachment`, `MediaSendPayload`, `FileEntry`. |
| `apps/web/src/lib/components/MediaComposer.utils.test.ts` | Create | Vitest unit tests for all utility functions. |
| `apps/web/src/lib/components/Icon.svelte` | Modify | Add `file` and `rotate-ccw` to `IconName` union and SVG switch. `paperclip` and `download` already exist. |
| `apps/web/src/lib/components/MediaComposer.svelte` | Create | File picker UI, real-thumbnail preview grid, caption field, XHR parallel upload queue with per-file progress arcs, error/retry states. Emits `onSend(MediaSendPayload)` when all uploads resolve. |
| `apps/web/src/lib/components/MediaBubble.svelte` | Create | Renders `message.metadata.attachments` as a tight grid (images + video inline, file chips with download). Caption from `message.content.trim()`. Supports +N overflow expand toggle. `blob:` URLs pass through for optimistic messages; `/uploads/` paths are prefixed with `PUBLIC_API_URL`. |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Modify | Add attach button + hidden file input to composer bar. Add `mediaFiles` state. Conditionally mount `<MediaComposer>` when files are queued. Add `handleMediaSend` for optimistic insert + `chats.send`. Update message rendering loop to use `<MediaBubble>` for non-text, non-gif, non-poll types. |

---

## Task 1: Utility Functions, Tests, and Icon Additions

**Files:**
- Create: `apps/web/src/lib/components/MediaComposer.utils.ts`
- Create: `apps/web/src/lib/components/MediaComposer.utils.test.ts`
- Modify: `apps/web/src/lib/components/Icon.svelte`

---

- [ ] **Step 1.1: Write the failing tests**

Create `apps/web/src/lib/components/MediaComposer.utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  classifyMediaKind,
  computeColumns,
  formatFileSize,
  getTotalSize,
  getPrimaryKind
} from './MediaComposer.utils';

describe('classifyMediaKind', () => {
  it('classifies image MIME types as image', () => {
    expect(classifyMediaKind({ type: 'image/jpeg', name: 'photo.jpg' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/png', name: 'photo.png' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/webp', name: 'photo.webp' })).toBe('image');
    expect(classifyMediaKind({ type: 'image/gif', name: 'anim.gif' })).toBe('image');
  });

  it('classifies video MIME types as video', () => {
    expect(classifyMediaKind({ type: 'video/mp4', name: 'clip.mp4' })).toBe('video');
    expect(classifyMediaKind({ type: 'video/webm', name: 'clip.webm' })).toBe('video');
    expect(classifyMediaKind({ type: 'video/quicktime', name: 'clip.mov' })).toBe('video');
  });

  it('classifies all other MIME types as file', () => {
    expect(classifyMediaKind({ type: 'application/pdf', name: 'doc.pdf' })).toBe('file');
    expect(classifyMediaKind({ type: 'text/plain', name: 'notes.txt' })).toBe('file');
    expect(classifyMediaKind({ type: 'text/csv', name: 'data.csv' })).toBe('file');
    expect(classifyMediaKind({ type: '', name: 'unknown' })).toBe('file');
  });
});

describe('computeColumns', () => {
  it('returns 1 for 0 or 1 visual items', () => {
    expect(computeColumns(0)).toBe(1);
    expect(computeColumns(1)).toBe(1);
  });

  it('returns 2 for 2–4 visual items', () => {
    expect(computeColumns(2)).toBe(2);
    expect(computeColumns(3)).toBe(2);
    expect(computeColumns(4)).toBe(2);
  });

  it('returns 3 for 5–10 visual items', () => {
    expect(computeColumns(5)).toBe(3);
    expect(computeColumns(8)).toBe(3);
    expect(computeColumns(10)).toBe(3);
  });
});

describe('formatFileSize', () => {
  it('formats byte values', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobyte values', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('2 KB');
    expect(formatFileSize(102_400)).toBe('100 KB');
  });

  it('formats megabyte values', () => {
    expect(formatFileSize(1_048_576)).toBe('1.0 MB');
    expect(formatFileSize(2_621_440)).toBe('2.5 MB');
    expect(formatFileSize(26_214_400)).toBe('25.0 MB');
  });
});

describe('getTotalSize', () => {
  it('sums sizes of all entries', () => {
    expect(getTotalSize([{ size: 100 }, { size: 200 }, { size: 300 }])).toBe(600);
  });

  it('returns 0 for an empty array', () => {
    expect(getTotalSize([])).toBe(0);
  });

  it('handles single entry', () => {
    expect(getTotalSize([{ size: 1_000_000 }])).toBe(1_000_000);
  });
});

describe('getPrimaryKind', () => {
  it('returns image when any attachment is an image', () => {
    expect(getPrimaryKind([
      { mediaKind: 'image' },
      { mediaKind: 'video' },
      { mediaKind: 'file' }
    ])).toBe('image');
  });

  it('returns video when no image but video present', () => {
    expect(getPrimaryKind([
      { mediaKind: 'video' },
      { mediaKind: 'file' }
    ])).toBe('video');
  });

  it('returns file when only file attachments', () => {
    expect(getPrimaryKind([{ mediaKind: 'file' }, { mediaKind: 'file' }])).toBe('file');
  });

  it('handles single image attachment', () => {
    expect(getPrimaryKind([{ mediaKind: 'image' }])).toBe('image');
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd apps/web && npm run test -- MediaComposer.utils
```

Expected: FAIL with import error (file does not exist yet).

- [ ] **Step 1.3: Create the utility module**

Create `apps/web/src/lib/components/MediaComposer.utils.ts`:

```typescript
export type MediaKind = 'image' | 'video' | 'file';

export type FileEntry = {
  id: string;
  file: File;
  previewUrl: string;   // blob: URL for images/video; '' for file attachments
  mediaKind: MediaKind;
  progress: number;     // 0–100
  uploadId: string | null;
  url: string | null;   // relative path from server, e.g. /uploads/abc.jpg
  error: string | null;
};

export type MediaAttachment = {
  uploadId: string;
  url: string;        // /uploads/abc.jpg (server) or blob: URL (optimistic)
  previewUrl: string; // blob: URL — always present for optimistic rendering
  mediaKind: MediaKind;
  fileName: string;
  size: number;
};

export type MediaSendPayload = {
  caption: string;
  primaryKind: MediaKind;
  attachments: MediaAttachment[];
};

/**
 * Classify a file's media kind from its MIME type.
 * Accepts any object with a `type` string — avoids importing File in tests.
 */
export function classifyMediaKind(file: { type: string; name: string }): MediaKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

/**
 * Number of grid columns based on the count of visual (image/video) items.
 * 1 item → 1 col, 2–4 items → 2 cols, 5–10 items → 3 cols.
 */
export function computeColumns(visualCount: number): 1 | 2 | 3 {
  if (visualCount <= 1) return 1;
  if (visualCount <= 4) return 2;
  return 3;
}

/**
 * Human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Sum of sizes for an array of objects with a `size` number field.
 */
export function getTotalSize(files: { size: number }[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * Determine the `MessageType` to use for a message based on what was attached.
 * Priority: image > video > file. Matches the MessageTypeSchema enum.
 */
export function getPrimaryKind(attachments: { mediaKind: MediaKind }[]): MediaKind {
  if (attachments.some((a) => a.mediaKind === 'image')) return 'image';
  if (attachments.some((a) => a.mediaKind === 'video')) return 'video';
  return 'file';
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd apps/web && npm run test -- MediaComposer.utils
```

Expected output includes:
```
✓ MediaComposer.utils.test.ts (17)
  ✓ classifyMediaKind (4)
  ✓ computeColumns (3)
  ✓ formatFileSize (3)
  ✓ getTotalSize (3)
  ✓ getPrimaryKind (4)
Test Files  1 passed (1)
```

- [ ] **Step 1.5: Add `file` and `rotate-ccw` icons to Icon.svelte**

`paperclip` and `download` already exist in the component. Only two icons need adding.

In `apps/web/src/lib/components/Icon.svelte`, find the `IconName` type and extend it:

```typescript
// Change this line:
	| 'copy';

// To:
	| 'copy'
	| 'file'
	| 'rotate-ccw';
```

Then add the SVG branches at the end of the `{#if ...}` chain, just before the closing `</svg>`:

```svelte
	{:else if name === 'file'}
		<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
		<polyline points="14 2 14 8 20 8" />
	{:else if name === 'rotate-ccw'}
		<polyline points="1 4 1 10 7 10" />
		<path d="M3.51 15a9 9 0 1 0 .49-3.51" />
```

- [ ] **Step 1.6: Verify TypeScript compiles clean**

```bash
cd apps/web && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 1.7: Commit**

```bash
cd apps/web && git add src/lib/components/MediaComposer.utils.ts src/lib/components/MediaComposer.utils.test.ts src/lib/components/Icon.svelte
git commit -m "feat(media): add upload utilities, tests, and file/rotate-ccw icons"
```

---

## Task 2: MediaComposer Component

**Files:**
- Create: `apps/web/src/lib/components/MediaComposer.svelte`

---

- [ ] **Step 2.1: Create the component**

Create `apps/web/src/lib/components/MediaComposer.svelte` with the full implementation below.

Key behaviours:
- `initialFiles` prop receives the `File[]` from the chat page's file picker.
- `onSend(payload)` is called after all uploads succeed; the chat page performs the socket send.
- `onCancel()` is called when the user clears all files or clicks cancel; the chat page hides the composer.
- `onAddMore()` is a callback used by the internal "Add" button to re-open the chat page's file input.
- XHR upload runs in parallel via `Promise.allSettled`. Progress is tracked per `FileEntry` inside the reactive proxy.
- Object URLs are revoked on `ondestroy` and after a successful send.
- `content.min(1)` backend constraint: when caption is empty, a single non-breaking space `'\u00A0'` is used. `MediaBubble` renders caption only when `message.content.trim()` is non-empty.

```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';
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
	const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB

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

	$effect(() => {
		// Runs once when the component mounts (initialFiles won't change after mount)
		initFiles(initialFiles);
	});

	async function initFiles(incoming: File[]) {
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
		const entries: FileEntry[] = toAdd.map((file) => {
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
		files = [...files, ...entries];
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
				// Cap at 95% during transfer; jump to 100 on success response
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

		// If there are pending uploads (user clicked send before auto-upload ran),
		// upload everything now
		const pending = files.filter((f) => f.progress === 0 && f.error === null);
		if (pending.length > 0) {
			sending = true;
			await Promise.allSettled(pending.map((e) => uploadFile(e)));
			sending = false;
		}

		// Re-check after uploads
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

			// Clean up object URLs after successful send
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

	// ── Auto-upload on mount ───────────────────────────────────────────────────

	// Start uploads immediately when files are initialised so they're done
	// uploading by the time the user writes a caption and hits send.
	$effect(() => {
		const toUpload = files.filter((f) => f.progress === 0 && f.error === null && !f.uploadId);
		if (toUpload.length > 0) {
			Promise.allSettled(toUpload.map((e) => uploadFile(e)));
		}
	});

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
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
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
		background: rgba(255, 140, 166, 0.25);
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
		border-radius: var(--radius-lg);
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
```

- [ ] **Step 2.2: Verify TypeScript compiles clean**

```bash
cd apps/web && npm run typecheck
```

Expected: 0 errors. If you see "Cannot find module '$stores/session.svelte'" — this is a SvelteKit path alias resolved at build time; `typecheck` may still pass because SvelteKit generates the ambient types. If it fails, check that `sessionStore.accessToken` is typed as `string | null` in `session.svelte.ts`.

- [ ] **Step 2.3: Commit**

```bash
git add apps/web/src/lib/components/MediaComposer.svelte
git commit -m "feat(media): add MediaComposer component with parallel XHR upload queue"
```

---

## Task 3: MediaBubble Component

**Files:**
- Create: `apps/web/src/lib/components/MediaBubble.svelte`

---

- [ ] **Step 3.1: Create the component**

Create `apps/web/src/lib/components/MediaBubble.svelte`:

```svelte
<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import Icon from './Icon.svelte';
	import { computeColumns, formatFileSize } from './MediaComposer.utils';
	import type { Message } from '@penthouse/contracts';

	interface Props {
		message: Message;
	}

	let { message }: Props = $props();

	// The attachment schema stored in message.metadata.attachments.
	// Uses the same shape as MediaAttachment from MediaComposer.utils but
	// we define it locally so MediaBubble has no compile-time dependency
	// on unreleased fields — future-proof against schema evolution.
	type BubbleAttachment = {
		uploadId: string;
		url: string;       // /uploads/abc.jpg or blob: URL (optimistic)
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

	// Max cells to show before the +N overflow button:
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
	// An '\u00A0' (non-breaking space) fallback used when no caption is given
	// trims to '' and is therefore hidden.
	const caption = $derived(message.content.trim());

	/**
	 * Resolve an attachment URL to an absolute URL the browser can load.
	 * - blob: URLs are local object URLs for optimistic/pending messages — pass through.
	 * - Absolute http(s) URLs — pass through.
	 * - Relative paths (/uploads/...) — prefix with PUBLIC_API_URL.
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
							<!-- Video: autoplay muted loop — tap to unmute via native controls -->
							<video
								src={resolveUrl(att.url)}
								autoplay
								muted
								loop
								playsinline
							></video>
						{/if}

						<!-- +N overflow cell — only on the last visible cell -->
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
```

- [ ] **Step 3.2: Verify TypeScript compiles clean**

```bash
cd apps/web && npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3.3: Commit**

```bash
git add apps/web/src/lib/components/MediaBubble.svelte
git commit -m "feat(media): add MediaBubble grid renderer with +N overflow and file download chips"
```

---

## Task 4: Wire into Chat Page

**Files:**
- Modify: `apps/web/src/routes/chat/[id]/+page.svelte`

This task makes four surgical changes to the chat page:
1. Import the two new components.
2. Add `mediaFiles` state + hidden file input management.
3. Add `handleMediaSend` function (parallel to the existing `handleSend`).
4. Update the composer area to show `MediaComposer` when files are queued and add the attach button to the normal composer bar.
5. Update the message rendering loop to use `<MediaBubble>` for media message types.

---

- [ ] **Step 4.1: Add imports and new state**

At the top of `apps/web/src/routes/chat/[id]/+page.svelte`, in the existing import block (around line 8–17), add:

```svelte
	import MediaComposer from '$lib/components/MediaComposer.svelte';
	import MediaBubble from '$lib/components/MediaBubble.svelte';
```

In the state section (after line 40 where `sending` is declared), add:

```svelte
	// Media upload state
	let mediaFiles = $state<File[]>([]);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let mediaComposerEl = $state<MediaComposer | null>(null);
```

- [ ] **Step 4.2: Add `handleMediaSend` function**

Add this function after the existing `handleSelectGif` function (around line 617):

```svelte
	// ─── Media send ───────────────────────────────────────────────────────────

	import type { MediaSendPayload } from '$lib/components/MediaComposer.utils';

	async function handleMediaSend(payload: MediaSendPayload) {
		const clientMessageId = crypto.randomUUID();

		// Optimistic: insert a pending media bubble immediately.
		// Use previewUrl (blob:) for optimistic rendering; server confirms with /uploads/ path.
		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			senderDisplayName: sessionStore.current?.user.displayName,
			// '\u00A0' is used when no caption — satisfies content.min(1) on backend.
			// MediaBubble renders caption only when content.trim() is non-empty.
			content: payload.caption || '\u00A0',
			type: payload.primaryKind,
			metadata: {
				attachments: payload.attachments.map((a) => ({
					uploadId: a.uploadId,
					url: a.previewUrl, // blob: URL for instant local preview
					mediaKind: a.mediaKind,
					fileName: a.fileName,
					size: a.size
				}))
			},
			createdAt: new Date().toISOString(),
			clientMessageId,
			pending: true
		};

		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const res = await chats.send(chatId, {
				chatId,
				content: payload.caption || '\u00A0',
				type: payload.primaryKind,
				clientMessageId,
				metadata: {
					attachments: payload.attachments.map((a) => ({
						uploadId: a.uploadId,
						url: a.url, // server path for the confirmed message
						mediaKind: a.mediaKind,
						fileName: a.fileName,
						size: a.size
					}))
				}
			});
			// Replace optimistic with confirmed message from server
			const idx = messages.findIndex((m) => m.clientMessageId === clientMessageId);
			if (idx !== -1) messages[idx] = res.message;
		} catch (err: unknown) {
			// Remove optimistic on failure
			messages = messages.filter((m) => m.clientMessageId !== clientMessageId);
			error = err instanceof Error ? err.message : 'Failed to send media.';
			setTimeout(() => (error = ''), 4000);
		}
	}
```

> **Note on the import:** `import type { MediaSendPayload }` inside the `<script>` block is valid TypeScript; place it at the top of the `<script>` block with the other imports instead if you prefer — TypeScript does not enforce import ordering.

- [ ] **Step 4.3: Add file picker handlers**

Add these two functions alongside the other helper functions:

```svelte
	function openFilePicker() {
		fileInputEl?.click();
	}

	function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const selected = Array.from(input.files ?? []);
		input.value = ''; // reset so same file can be picked again

		if (selected.length === 0) return;

		// Validate total count
		const currentCount = mediaFiles.length;
		const MAX = 10;
		if (currentCount + selected.length > MAX) {
			const allowed = MAX - currentCount;
			if (allowed <= 0) { error = 'Max 10 files per message'; setTimeout(() => (error = ''), 3000); return; }
			selected.splice(allowed); // truncate
		}

		// Validate total size
		const MAX_BYTES = 25 * 1024 * 1024;
		const newTotal = selected.reduce((s, f) => s + f.size, 0);
		if (newTotal > MAX_BYTES) {
			error = 'Total size exceeds 25 MB';
			setTimeout(() => (error = ''), 3000);
			return;
		}

		if (mediaFiles.length === 0) {
			// First pick — mount MediaComposer with these files
			mediaFiles = selected;
		} else {
			// Already composing — append to the existing queue via the component ref
			mediaComposerEl?.appendFiles(selected);
		}
	}
```

- [ ] **Step 4.4: Update the composer area in the template**

Find the `<!-- Composer area -->` block (around line 939). Replace the entire `<div class="composer-area">` section with the version below.

The `{#if mediaFiles.length > 0}` branch shows `MediaComposer` and hides the normal text composer. The `{:else}` branch is the normal composer with the attach button added.

```svelte
	<!-- Composer area -->
	<div class="composer-area">
		{#if mediaFiles.length > 0}
			<MediaComposer
				bind:this={mediaComposerEl}
				initialFiles={mediaFiles}
				onSend={handleMediaSend}
				onCancel={() => (mediaFiles = [])}
				onAddMore={openFilePicker}
			/>
		{:else}
			{#if showCommandPicker && filteredCommands.length > 0}
				<CommandPicker
					commands={filteredCommands}
					selectedIndex={commandSelectedIndex}
					onSelect={handleCommandSelect}
					onHover={(i) => (commandSelectedIndex = i)}
				/>
			{/if}

			{#if replyToMsg}
				<ReplyBar message={replyToMsg} onDismiss={() => (replyToMsg = null)} />
			{/if}

			<div class="composer">
				<textarea
					class="composer-input"
					placeholder="Message..."
					bind:value={inputText}
					onkeydown={handleKeydown}
					disabled={sending}
					rows="1"
				></textarea>
				<button
					class="composer-btn attach-btn"
					onclick={openFilePicker}
					disabled={sending}
					aria-label="Attach files"
					title="Attach files"
				>
					<Icon name="paperclip" size={18} />
				</button>
				<button
					class="composer-btn gif-btn"
					onclick={() => (showGifPicker = true)}
					disabled={sending}
					aria-label="Send a GIF"
					title="GIF"
				>
					<Icon name="gif" size={18} />
				</button>
				<button
					class="send-btn"
					onclick={handleSend}
					disabled={!inputText.trim() || sending}
					aria-label="Send message"
				>
					<Icon name="send" size={16} />
				</button>
			</div>
		{/if}

		<!-- Hidden file input — always rendered so it can be referenced -->
		<input
			type="file"
			bind:this={fileInputEl}
			accept="image/*,video/*,.pdf,.txt,.md,.json,.csv,.log,.yaml,.yml,.xml"
			multiple
			onchange={handleFileInputChange}
			style="display:none"
			aria-hidden="true"
		/>
	</div>
```

- [ ] **Step 4.5: Update the message rendering loop**

In the message loop, find the two identical content switch blocks (one inside `<!-- Other user's message -->` for `.theirs` bubbles, one for `.mine` bubbles). Both currently have the pattern:

```svelte
{:else if msg.type === 'poll' && msg.metadata}
    <PollCard ... />
{:else}
    {msg.content}
{/if}
```

In **both** blocks, change the final `{:else}` branch to handle media types:

```svelte
{:else if msg.type === 'poll' && msg.metadata}
    <PollCard
        poll={msg.metadata as unknown as PollData}
        {currentUserId}
        onVote={(idx) => handleVotePoll((msg.metadata as unknown as PollData).id, idx)}
        isPending={isPending(msg)}
    />
{:else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file') && msg.metadata?.attachments}
    <MediaBubble message={msg} />
{:else}
    {msg.content}
{/if}
```

Apply this change to **both** the `theirs` and `mine` bubble blocks.

- [ ] **Step 4.6: Add attach-btn style**

In the `<style>` block of the chat page, add the attach button style alongside the existing `.gif-btn` style. Find where `.composer-btn` or `.gif-btn` is styled and add:

```css
	.attach-btn {
		/* Inherits .composer-btn layout — just needs no extra override */
	}
```

(If the existing `.composer-btn` class already applies to all buttons in the composer row, no additional CSS is needed. Check the existing style for `.composer-btn` and confirm it covers the new button.)

- [ ] **Step 4.7: Verify TypeScript compiles clean and tests pass**

```bash
cd apps/web && npm run typecheck && npm run test
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 4.8: Manual browser test**

Start the dev server:
```bash
cd apps/web && npm run dev
```

Log in and open any chat thread. Verify:

1. **Attach button** appears in the composer bar (paperclip icon, no emoji).
2. Click attach → file picker opens filtered to images/video/documents.
3. Select 1 image → `MediaComposer` appears with thumbnail preview and caption field.
4. Upload progress arc animates on the thumbnail cell.
5. After upload completes, the send button becomes active.
6. Type a caption, click send → message appears in thread with caption above image grid.
7. The recipient side (open same chat in another tab or browser) shows `MediaBubble` with the same grid.
8. Select 6+ images → 3-column grid appears; last visible cell shows `+N` overlay; clicking it expands.
9. Select a PDF alongside images → image grid appears, PDF renders as a file chip with download button below.
10. Click download on file chip → file downloads correctly.
11. Force a network error (DevTools → Network → Offline before clicking send) → affected cells show red tint with retry icon.
12. Click retry → upload resumes.
13. Normal text messages still work unchanged.

- [ ] **Step 4.9: Commit**

```bash
git add "apps/web/src/routes/chat/[id]/+page.svelte"
git commit -m "feat(media): wire MediaComposer and MediaBubble into chat thread"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Covered in |
|---|---|
| File picker filtered to image/video/doc | Task 4 — `accept` attribute on hidden input |
| Up to 10 files, 25 MB total | Task 4 — `handleFileInputChange` validation; Task 2 — `appendFiles` validation |
| Preview strip with real thumbnails | Task 2 — `URL.createObjectURL` in `initFiles` |
| Caption field above the grid | Task 2 — `<textarea class="caption-input">`, `MediaBubble` shows `caption` first |
| Parallel XHR uploads with progress | Task 2 — `uploadFile` + `$effect` auto-start + `Promise.allSettled` in `handleSend` |
| Per-file error state with retry | Task 2 — `error-overlay`, `retry-btn`, `retryFile()` |
| Rate limit 429 toast | Task 2 — XHR `onload` branch → `showToast(msg)` where `msg` comes from server |
| 413 / 415 toasts | Task 2 — same XHR `onload` branch |
| Grid: 1→2→3 columns | Tasks 1 + 2 — `computeColumns`, `preview-grid.cols-{n}` |
| Grid: +N overflow expand | Task 3 — `overflow`, `expanded`, `overflow-btn` |
| File chips for documents | Tasks 2 + 3 — `fileChips`, `file-chip` |
| File chip download | Task 3 — `<a href download>` |
| Optimistic bubble (local preview) | Task 4 — `previewUrl` used in optimistic `metadata.attachments` |
| `resolveUrl` for blob vs /uploads/ | Task 3 — `resolveUrl()` |
| `URL.revokeObjectURL` cleanup | Task 2 — `onDestroy` and after successful send |
| No regression on text messages | Task 4 — `{:else}` branch unchanged; MediaBubble only rendered when `msg.metadata?.attachments` exists |
| SVG icons only (no emoji) | All tasks — uses `<Icon name="...">` exclusively |
| Adding more files after initial pick | Task 2 — `appendFiles()`; Task 4 — `onAddMore={openFilePicker}` |
| `content.min(1)` backend constraint | Task 4 — `payload.caption || '\u00A0'` |
| TypeScript clean | Verified in each task |
