<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Message } from '@penthouse/contracts';

	interface Props {
		message: Message;
		onDismiss: () => void;
	}

	let { message, onDismiss }: Props = $props();

	// Truncate long content for the preview
	const previewContent = $derived(
		message.content.length > 80 ? message.content.slice(0, 80) + '…' : message.content
	);
</script>

<div class="reply-bar" role="status" aria-label="Replying to {message.senderDisplayName}">
	<span class="reply-icon" aria-hidden="true">
		<Icon name="reply" size={14} />
	</span>
	<div class="reply-preview">
		<span class="reply-sender">{message.senderDisplayName ?? 'Someone'}</span>
		<span class="reply-text">{previewContent}</span>
	</div>
	<button class="dismiss-btn" onclick={onDismiss} aria-label="Cancel reply">
		<Icon name="close" size={16} />
	</button>
</div>

<style>
	.reply-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface-2);
		border-top: 1px solid var(--color-border);
		border-left: 3px solid var(--color-accent);
		min-width: 0;
	}

	.reply-icon {
		color: var(--color-accent);
		flex-shrink: 0;
		display: flex;
	}

	.reply-preview {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.reply-sender {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-accent);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reply-text {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dismiss-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: none;
		border: none;
		border-radius: var(--radius-full);
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s, background 0.15s;
	}

	.dismiss-btn:hover {
		color: var(--color-text-primary);
		background: rgba(255, 255, 255, 0.08);
	}
</style>
