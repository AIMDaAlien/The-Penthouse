<script lang="ts">
	import Icon from './Icon.svelte';
	import ReplyBar from './ReplyBar.svelte';
	import AudioRecorder from './AudioRecorder.svelte';
	import GifPicker from './GifPicker.svelte';
	import EmotePicker from './EmotePicker.svelte';
	import StickerPicker from './StickerPicker.svelte';

	interface Props {
		onSend?: (content: string) => void;
		onTypingStart?: () => void;
		onTypingStop?: () => void;
		onAudioRecord?: (blob: Blob, mimeType: string) => void;
		onMediaSend?: (file: File) => void;
		onGifSelect?: (gif: { url: string; previewUrl: string; width?: number; height?: number }) => void;
		onStickerSelect?: (sticker: { url: string; name: string }) => void;
		disabled?: boolean;
		replyTo?: { senderName: string; content: string } | null;
		onCancelReply?: () => void;
	}

	let { onSend, onTypingStart, onTypingStop, onAudioRecord, onMediaSend, onGifSelect, onStickerSelect, disabled = false, replyTo = null, onCancelReply }: Props = $props();

	let content = $state('');
	let typingTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let selectedFile = $state<File | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let previewUrl = $state<string | null>(null);
	let showGifPicker = $state(false);
	let showEmotePicker = $state(false);
	let showStickerPicker = $state(false);

	function insertAtCursor(insertion: string) {
		// Simple append for now; could be enhanced with cursor position
		content += insertion;
	}

	function closePickers() {
		showGifPicker = false;
		showEmotePicker = false;
		showStickerPicker = false;
	}

	function togglePicker(name: 'gif' | 'emote' | 'sticker') {
		showGifPicker = name === 'gif' ? !showGifPicker : false;
		showEmotePicker = name === 'emote' ? !showEmotePicker : false;
		showStickerPicker = name === 'sticker' ? !showStickerPicker : false;
	}

	function handleInput() {
		onTypingStart?.();
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			onTypingStop?.();
		}, 2000);
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		selectedFile = file;
		if (file.type.startsWith('image/')) {
			previewUrl = URL.createObjectURL(file);
		} else {
			previewUrl = null;
		}
		input.value = '';
	}

	function clearFile() {
		selectedFile = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (disabled) return;
		if (selectedFile) {
			onMediaSend?.(selectedFile);
			clearFile();
			if (typingTimer) clearTimeout(typingTimer);
			onTypingStop?.();
			return;
		}
		const trimmed = content.trim();
		if (!trimmed) return;
		onSend?.(trimmed);
		content = '';
		if (typingTimer) clearTimeout(typingTimer);
		onTypingStop?.();
	}
</script>

<div class="composer-shell">
	{#if replyTo}
		<ReplyBar
			senderName={replyTo.senderName}
			content={replyTo.content}
			onCancel={onCancelReply}
		/>
	{/if}
	{#if selectedFile}
		<div class="file-preview">
			{#if previewUrl}
				<img src={previewUrl} alt="Preview" class="preview-img" />
			{:else}
				<span class="file-name">{selectedFile.name}</span>
			{/if}
			<button type="button" class="clear-file" onclick={clearFile} aria-label="Remove attachment">
				<Icon name="close" size={14} />
			</button>
		</div>
	{/if}
	<form class="composer" onsubmit={handleSubmit}>
		<input
			type="text"
			placeholder={replyTo ? 'Reply...' : 'Message...'}
			bind:value={content}
			oninput={handleInput}
			disabled={disabled}
		/>
		<input
			type="file"
			accept="image/*,video/*"
			bind:this={fileInput}
			onchange={handleFileSelect}
			class="hidden-input"
		/>
		<button type="button" class="attach-btn" onclick={() => fileInput?.click()} disabled={disabled} aria-label="Attach media">
			<Icon name="image" size={20} />
		</button>
		<button type="button" class="tool-btn" onclick={() => togglePicker('gif')} disabled={disabled} aria-label="Choose GIF">
			<Icon name="play" size={18} />
		</button>
		<button type="button" class="tool-btn" onclick={() => togglePicker('emote')} disabled={disabled} aria-label="Choose emote">
			<Icon name="emoji" size={20} />
		</button>
		<button type="button" class="tool-btn" onclick={() => togglePicker('sticker')} disabled={disabled} aria-label="Choose sticker">
			<Icon name="square" size={18} />
		</button>
		<AudioRecorder onRecord={onAudioRecord} />
		<button type="submit" disabled={disabled || (!content.trim() && !selectedFile)} aria-label="Send message">
			<Icon name="send" size={20} />
		</button>
	</form>

	{#if showGifPicker}
		<div class="picker-popup">
			<GifPicker
				onSelect={(gif) => {
					onGifSelect?.(gif);
					closePickers();
				}}
				onClose={closePickers}
			/>
		</div>
	{/if}
	{#if showEmotePicker}
		<div class="picker-popup">
			<EmotePicker
				onSelect={(name) => {
					insertAtCursor(name);
					showEmotePicker = false;
				}}
				onClose={closePickers}
			/>
		</div>
	{/if}
	{#if showStickerPicker}
		<div class="picker-popup">
			<StickerPicker
				onSelect={(sticker) => {
					onStickerSelect?.(sticker);
					closePickers();
				}}
				onClose={closePickers}
			/>
		</div>
	{/if}
</div>

<style>
	.composer-shell {
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		position: relative;
	}

	.composer {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom));
	}

	input {
		flex: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-base);
		font-family: inherit;
		outline: none;
	}

	input:focus { border-color: var(--color-accent); }
	input:disabled { opacity: 0.5; }

	button {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-accent);
		color: var(--color-bg);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	button:not(:disabled):hover {
		opacity: 0.85;
	}

	.hidden-input {
		display: none;
	}

	.attach-btn, .tool-btn {
		background: none;
		color: var(--color-text-secondary);
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s, background 0.15s;
		flex-shrink: 0;
	}

	.attach-btn:hover:not(:disabled), .tool-btn:hover:not(:disabled) {
		background: var(--color-surface-elevated);
		opacity: 1;
	}

	.file-preview {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.preview-img {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border-radius: var(--radius-md);
	}

	.file-name {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.clear-file {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: var(--space-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		transition: background 0.15s;
	}

	.clear-file:hover {
		background: var(--color-surface-elevated);
	}

	.picker-popup {
		position: absolute;
		bottom: calc(100% + var(--space-sm));
		left: var(--space-lg);
		z-index: 20;
	}
</style>
