<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Message } from '@penthouse/contracts';

	interface Props {
		message: Message;
		currentUserId: string;
		onReact: (emoji: string) => void;
		onReply: () => void;
		onCopy: () => void;
		onPin: () => void;
		onUnpin: () => void;
		onDelete: () => void;
		onEdit: () => void;
		onStar: () => void;
		onClose: () => void;
		isPinned?: boolean;
		isStarred?: boolean;
	}

	let {
		message,
		currentUserId,
		onReact,
		onReply,
		onCopy,
		onPin,
		onUnpin,
		onDelete,
		onEdit,
		onStar,
		onClose,
		isPinned = false,
		isStarred = false
	}: Props = $props();

	const isOwn = $derived(message.senderId === currentUserId);

	// 6 quick-access emoji
	const QUICK_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

	// Extended emoji grid (~80 common emoji)
	const EMOJI_GRID = [
		'😀','😁','😂','🤣','😃','😄','😅','😆','😇','😉',
		'😊','😋','😌','😍','🥰','😘','😗','😙','😚','🙂',
		'🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣',
		'😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛',
		'😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲',
		'🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨',
		'😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
		'🥴','😠','😡','🤬','💀','💩','🤡','👹','👺','👻',
	];

	let showAllEmoji = $state(false);

	function handleReact(emoji: string) {
		onReact(emoji);
		onClose();
	}

	function handleAction(fn: () => void) {
		fn();
		onClose();
	}
</script>

<!-- Backdrop -->
<div
	class="backdrop"
	role="button"
	tabindex="-1"
	aria-label="Close menu"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
></div>

<!-- Sheet -->
<div class="sheet" role="dialog" aria-modal="true" aria-label="Message actions">
	<div class="sheet-handle" aria-hidden="true"></div>

	<!-- Quick reactions -->
	<div class="quick-reactions" role="group" aria-label="Quick reactions">
		{#each QUICK_EMOJI as emoji}
			<button
				class="emoji-btn quick"
				onclick={() => handleReact(emoji)}
				aria-label="React with {emoji}"
			>
				{emoji}
			</button>
		{/each}
		<button
			class="emoji-btn more-btn"
			onclick={() => (showAllEmoji = !showAllEmoji)}
			aria-expanded={showAllEmoji}
			aria-label="Show all emoji"
		>
			<Icon name="plus" size={16} />
		</button>
	</div>

	<!-- Full emoji grid (expanded) -->
	{#if showAllEmoji}
		<div class="emoji-grid" role="group" aria-label="All emoji">
			{#each EMOJI_GRID as emoji}
				<button
					class="emoji-btn"
					onclick={() => handleReact(emoji)}
					aria-label="React with {emoji}"
				>
					{emoji}
				</button>
			{/each}
		</div>
	{/if}

	<div class="divider" aria-hidden="true"></div>

	<!-- Action list -->
	<div class="actions" role="group" aria-label="Message actions">
		<button class="action-btn" onclick={() => handleAction(onReply)}>
			<Icon name="reply" size={18} />
			<span>Reply</span>
		</button>

		<button class="action-btn" onclick={() => handleAction(onCopy)}>
			<Icon name="copy" size={18} />
			<span>Copy text</span>
		</button>

		{#if !message.deletedAt}
			<button class="action-btn" onclick={() => handleAction(onStar)}>
				<Icon name={isStarred ? 'star-filled' : 'star'} size={18} />
				<span>{isStarred ? 'Unstar' : 'Star'}</span>
			</button>
		{/if}

		{#if isOwn && !message.deletedAt && message.type === 'text'}
			<button class="action-btn" onclick={() => handleAction(onEdit)}>
				<Icon name="edit" size={18} />
				<span>Edit</span>
			</button>
		{/if}

		{#if isPinned}
			<button class="action-btn" onclick={() => handleAction(onUnpin)}>
				<Icon name="pin" size={18} />
				<span>Unpin</span>
			</button>
		{:else}
			<button class="action-btn" onclick={() => handleAction(onPin)}>
				<Icon name="pin" size={18} />
				<span>Pin</span>
			</button>
		{/if}

		{#if isOwn && !message.deletedAt}
			<button class="action-btn danger" onclick={() => handleAction(onDelete)}>
				<Icon name="trash" size={18} />
				<span>Delete for everyone</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 200;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--color-surface-2);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		border-top: 1px solid var(--color-border);
		padding: var(--space-2) 0 max(var(--space-4), env(safe-area-inset-bottom));
		z-index: 201;
		animation: slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
		to   { transform: translateY(0); }
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-full);
		margin: 0 auto var(--space-3);
	}

	.quick-reactions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-4);
	}

	.emoji-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		font-size: 22px;
		line-height: 1;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid transparent;
		border-radius: var(--radius-full);
		cursor: pointer;
		transition: background 0.12s, transform 0.1s;
		-webkit-tap-highlight-color: transparent;
	}

	.emoji-btn:active {
		transform: scale(0.88);
		background: rgba(255, 255, 255, 0.12);
	}

	.emoji-btn.more-btn {
		color: var(--color-text-secondary);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 2px;
		padding: var(--space-2) var(--space-3);
		max-height: 200px;
		overflow-y: auto;
	}

	.emoji-grid .emoji-btn {
		width: 100%;
		height: 36px;
		font-size: 19px;
		border-radius: var(--radius-md);
	}

	.divider {
		height: 1px;
		background: var(--color-border);
		margin: var(--space-2) 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-5);
		background: none;
		border: none;
		color: var(--color-text-primary);
		font-size: var(--text-base);
		font-family: var(--font-sans);
		text-align: left;
		cursor: pointer;
		transition: background 0.12s;
		-webkit-tap-highlight-color: transparent;
	}

	.action-btn:active {
		background: rgba(255, 255, 255, 0.06);
	}

	.action-btn.danger {
		color: var(--color-error, #e57373);
	}
</style>
