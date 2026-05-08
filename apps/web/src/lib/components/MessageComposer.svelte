<script lang="ts">
	import Icon from './Icon.svelte';
	import ReplyBar from './ReplyBar.svelte';
	import AudioRecorder from './AudioRecorder.svelte';

	interface Props {
		onSend?: (content: string) => void;
		onTypingStart?: () => void;
		onTypingStop?: () => void;
		onAudioRecord?: (blob: Blob, mimeType: string) => void;
		disabled?: boolean;
		replyTo?: { senderName: string; content: string } | null;
		onCancelReply?: () => void;
	}

	let { onSend, onTypingStart, onTypingStop, onAudioRecord, disabled = false, replyTo = null, onCancelReply }: Props = $props();

	let content = $state('');
	let typingTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	function handleInput() {
		onTypingStart?.();
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			onTypingStop?.();
		}, 2000);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || disabled) return;
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
	<form class="composer" onsubmit={handleSubmit}>
		<input
			type="text"
			placeholder={replyTo ? 'Reply...' : 'Message...'}
			bind:value={content}
			oninput={handleInput}
			disabled={disabled}
		/>
		<AudioRecorder onRecord={onAudioRecord} />
		<button type="submit" disabled={disabled || !content.trim()} aria-label="Send message">
			<Icon name="send" size={20} />
		</button>
	</form>
</div>

<style>
	.composer-shell {
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
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
</style>
