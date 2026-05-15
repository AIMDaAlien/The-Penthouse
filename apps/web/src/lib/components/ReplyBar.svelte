<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		senderName?: string;
		content?: string;
		onCancel?: () => void;
	}

	let { senderName = '', content = '', onCancel }: Props = $props();
</script>

<div class="reply-bar">
	<div class="reply-info">
		<span class="reply-label">Replying to {senderName}</span>
		<p class="reply-preview">{content}</p>
	</div>
	<button class="cancel-btn" onclick={onCancel} aria-label="Cancel reply">
		<Icon name="close" size={16} />
	</button>
</div>

<style>
	.reply-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		background: var(--p-surface-2);
		border-top: 1px solid var(--p-line);
	}

	.reply-info {
		flex: 1;
		min-width: 0;
	}

	.reply-label {
		font-size: var(--text-xs);
		color: var(--p-accent);
		font-weight: var(--weight-medium);
	}

	.reply-preview {
		font-size: var(--text-sm);
		color: var(--p-text-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	.cancel-btn {
		background: none;
		border: none;
		color: var(--p-muted);
		padding: var(--space-xs);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: color 0.15s;
		flex-shrink: 0;
	}

	.cancel-btn:hover {
		color: var(--p-text);
	}
</style>
