<script lang="ts">
	interface Props {
		onSelect: (emoji: string) => void;
		onClose?: () => void;
	}

	let { onSelect, onClose }: Props = $props();

	let customEmoji = $state('');

	const emojis = [
		'👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉',
		'🔥', '👏', '🙌', '🤔', '👀', '✅', '❌', '⭐',
		'🚀', '💯', '🤷', '🤦', '🙏', '💪', '🤝', '👋',
		'😍', '🥳', '😭', '🤯', '🫡', '🥹', '🫶', '💀',
		'✨', '🍀', '🎯', '📌', '🔔', '💡', '📎', '🗑️'
	];

	function handleCustomInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		// Extract the first emoji character if present
		const emojiMatch = value.match(/\p{Emoji_Presentation}/u);
		if (emojiMatch) {
			onSelect(emojiMatch[0]);
			customEmoji = '';
			onClose?.();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

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
	<div class="custom-row">
		<input
			type="text"
			placeholder="Paste any emoji…"
			bind:value={customEmoji}
			oninput={handleCustomInput}
			aria-label="Custom emoji reaction"
		/>
	</div>
</div>

<style>
	.picker {
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		box-shadow: var(--shadow-card);
		min-width: 240px;
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
		background: var(--p-surface);
	}
	.custom-row {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--p-line);
	}
	.custom-row input {
		width: 100%;
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		padding: var(--space-xs) var(--space-sm);
		color: var(--p-text);
		font-size: var(--text-base);
		outline: none;
	}
	.custom-row input:focus {
		border-color: var(--p-accent);
	}
	.custom-row input::placeholder {
		color: var(--p-muted);
		font-size: var(--text-sm);
	}
</style>
