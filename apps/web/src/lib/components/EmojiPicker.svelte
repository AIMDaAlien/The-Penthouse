<script lang="ts">
	interface Props {
		onSelect: (emoji: string) => void;
		onClose?: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	const emojis = [
		'👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉',
		'🔥', '👏', '🙌', '🤔', '👀', '✅', '❌', '⭐',
		'🚀', '💯', '🤷', '🤦', '🙏', '💪', '🤝', '👋',
		'😍', '🥳', '😭', '🤯', '🫡', '🥹', '🫶', '💀',
		'✨', '🍀', '🎯', '📌', '🔔', '💡', '📎', '🗑️'
	];
</script>

<div class="picker">
	<div class="grid">
		{#each emojis as emoji}
			<button
				class="emoji-btn"
				onclick={() => { onSelect(emoji); onClose?.(); }}
				aria-label="React with {emoji}"
				type="button"
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>

<style>
	.picker {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		box-shadow: var(--shadow-card);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: var(--space-xs);
	}
	.emoji-btn {
		background: none;
		border: none;
		font-size: var(--text-lg);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		transition: background 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.emoji-btn:hover {
		background: var(--color-surface);
	}
</style>
