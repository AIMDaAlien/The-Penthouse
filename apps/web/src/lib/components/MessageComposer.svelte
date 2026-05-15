<script lang="ts">
	import Icon from './Icon.svelte';
	import ReplyBar from './ReplyBar.svelte';
	import AudioRecorder from './AudioRecorder.svelte';
	import UnifiedPicker from './UnifiedPicker.svelte';
	import EmojiEmoteAutocomplete from './EmojiEmoteAutocomplete.svelte';

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
	let showPicker = $state(false);
	let showAutocomplete = $state(false);
	let autocompleteQuery = $state('');
	let textInput = $state<HTMLInputElement | null>(null);

	function insertAtCursor(insertion: string) {
		const input = textInput;
		if (!input) {
			content += insertion;
			return;
		}
		const start = input.selectionStart ?? content.length;
		const end = input.selectionEnd ?? content.length;
		content = content.slice(0, start) + insertion + content.slice(end);
		const newPos = start + insertion.length;
		requestAnimationFrame(() => {
			input.selectionStart = newPos;
			input.selectionEnd = newPos;
			input.focus();
		});
	}

	function closePicker() {
		showPicker = false;
	}

	function updateAutocomplete() {
		const input = textInput;
		if (!input) { showAutocomplete = false; return; }
		const cursorPos = input.selectionStart ?? content.length;
		const textBeforeCursor = content.slice(0, cursorPos);
		const match = textBeforeCursor.match(/:([a-zA-Z0-9_+-]*)$/);
		if (match && match[1].length >= 1) {
			autocompleteQuery = match[1];
			showAutocomplete = true;
		} else {
			showAutocomplete = false;
		}
	}

	function handleAutocompleteSelect(replacement: string) {
		const input = textInput;
		if (!input) return;
		const cursorPos = input.selectionStart ?? content.length;
		const textBeforeCursor = content.slice(0, cursorPos);
		const textAfterCursor = content.slice(cursorPos);
		const match = textBeforeCursor.match(/:([a-zA-Z0-9_+-]*)$/);
		if (match) {
			const newTextBefore = textBeforeCursor.slice(0, -match[0].length) + replacement;
			content = newTextBefore + textAfterCursor;
			const newCursorPos = newTextBefore.length;
			requestAnimationFrame(() => {
				input.selectionStart = newCursorPos;
				input.selectionEnd = newCursorPos;
				input.focus();
			});
		}
		showAutocomplete = false;
	}

	function closeAutocomplete() {
		showAutocomplete = false;
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
			oninput={() => { handleInput(); updateAutocomplete(); }}
			disabled={disabled}
			bind:this={textInput}
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
		<button
			type="button"
			class="tool-btn"
			onclick={() => (showPicker = !showPicker)}
			disabled={disabled}
			aria-label="Open media picker"
			aria-expanded={showPicker}
		>
			<Icon name="plus" size={20} />
		</button>
		<AudioRecorder onRecord={onAudioRecord} />
		<button type="submit" disabled={disabled || (!content.trim() && !selectedFile)} aria-label="Send message">
			<Icon name="send" size={20} />
		</button>
	</form>

	{#if showPicker}
		<div class="picker-popup">
			<UnifiedPicker
				onEmojiSelect={(char) => insertAtCursor(char)}
				onEmoteSelect={(name) => insertAtCursor(name)}
				onGifSelect={(gif) => {
					onGifSelect?.(gif);
					closePicker();
				}}
				onStickerSelect={(sticker) => {
					onStickerSelect?.(sticker);
					closePicker();
				}}
				onClose={closePicker}
			/>
		</div>
	{/if}

	{#if showAutocomplete}
		<div class="autocomplete-wrapper">
			<EmojiEmoteAutocomplete
				query={autocompleteQuery}
				onSelect={handleAutocompleteSelect}
				onClose={closeAutocomplete}
			/>
		</div>
	{/if}
</div>

<style>
	.composer-shell {
		border-top: 1px solid var(--p-line);
		background: var(--p-surface);
		position: relative;
	}

	.composer {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom));
	}

	input[type="text"] {
		flex: 1;
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		color: var(--p-text);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-base);
		font-family: inherit;
		outline: none;
	}

	input[type="text"]:focus { border-color: var(--p-accent); }
	input[type="text"]:disabled { opacity: 0.5; }

	button[type="submit"] {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	button[type="submit"]:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	button[type="submit"]:not(:disabled):hover {
		opacity: 0.85;
	}

	.hidden-input {
		display: none;
	}

	.attach-btn, .tool-btn {
		background: none;
		color: var(--p-text-2);
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
		background: var(--p-surface-2);
		opacity: 1;
	}

	.file-preview {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
	}

	.preview-img {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border-radius: var(--radius-md);
	}

	.file-name {
		font-size: var(--text-sm);
		color: var(--p-text-2);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.clear-file {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		transition: background 0.15s;
	}

	.clear-file:hover {
		background: var(--p-surface-2);
	}

	.picker-popup {
		position: absolute;
		bottom: calc(100% + var(--space-sm));
		left: var(--space-lg);
		z-index: 20;
	}

	.autocomplete-wrapper {
		position: absolute;
		bottom: calc(100% + var(--space-xs));
		left: var(--space-lg);
		z-index: 30;
	}

	@media (max-width: 767px) {
		.picker-popup {
			left: var(--space-sm);
			right: var(--space-sm);
		}

		.autocomplete-wrapper {
			left: var(--space-sm);
			right: var(--space-sm);
		}
	}
</style>
