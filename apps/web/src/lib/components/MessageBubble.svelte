<script lang="ts">
	import type { Message } from '@penthouse/contracts';
	import { sessionStore } from '$stores/session.svelte';
	import ReactionPill from './ReactionPill.svelte';
	import Icon from './Icon.svelte';
	import MarkdownText from './MarkdownText.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import AudioPlayer from './AudioPlayer.svelte';

	interface Emote {
		name: string;
		url: string;
	}

	interface Props {
		message: Message;
		onReply?: (message: Message) => void;
		onReact?: (messageId: string, emoji: string) => void;
		onEdit?: (message: Message) => void;
		onDelete?: (messageId: string) => void;
		onPin?: (messageId: string) => void;
		emotes?: Emote[];
	}

	let { message, onReply, onReact, onEdit, onDelete, onPin, emotes = [] }: Props = $props();

	const isMine = $derived(message.senderId === sessionStore.user?.id);
	const isDeleted = $derived(!!message.deletedAt);
	const canEdit = $derived(isMine && !isDeleted && (message.editCount ?? 0) < 10);
	const canDelete = $derived(!isDeleted);
	const isPending = $derived(!!message.clientMessageId && message.id === message.clientMessageId);

	let showMenu = $state(false);
	let showEmojiPicker = $state(false);

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function handleReact(emoji: string) {
		onReact?.(message.id, emoji);
	}

	const mediaUrl = $derived(
		message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
			? ((message.metadata as Record<string, unknown>).url ?? (message.metadata as Record<string, unknown>).audioUrl ?? (message.metadata as Record<string, unknown>).stickerUrl) as string | undefined
			: undefined
	);
</script>

<div class="bubble-row" class:mine={isMine}>
	<div class="bubble" class:deleted={isDeleted}>
		{#if !isMine}
			<span class="sender">{message.senderDisplayName ?? message.senderUsername}</span>
		{/if}

		{#if message.replyTo}
			<div class="reply-to">
				<span class="reply-name">{message.replyTo.senderDisplayName ?? 'Unknown'}</span>
				<p class="reply-content">{message.replyTo.content}</p>
			</div>
		{/if}

		{#if isDeleted}
			<span class="deleted-label">Message deleted</span>
		{:else if message.type === 'image' && mediaUrl}
			<img src={mediaUrl} alt="" class="media-image" loading="lazy" />
		{:else if message.type === 'video' && mediaUrl}
			<video src={mediaUrl} class="media-video" controls preload="metadata"><track kind="captions" /></video>
			{:else if message.type === 'audio' && mediaUrl}
				<AudioPlayer src={mediaUrl} />
			{:else if message.type === 'gif' && mediaUrl}
				<img src={mediaUrl} alt="GIF" class="media-gif" loading="lazy" />
			{:else if message.type === 'sticker' && mediaUrl}
				<img src={mediaUrl} alt="Sticker" class="media-sticker" loading="lazy" />
			{:else if message.type === 'file' && mediaUrl}
				<a href={mediaUrl} target="_blank" rel="noopener" class="file-link">
					<Icon name="image" size={16} />
					<span>Attachment</span>
				</a>
			{:else}
				<div class="content"><MarkdownText text={message.content} {emotes} /></div>

			{/if}
		<div class="meta-row">
			<span class="meta">{formatTime(message.createdAt)}</span>
			{#if message.editedAt}
				<span class="edited">edited</span>
			{/if}
			{#if isMine && !isDeleted}
				<span class="read-status">
					{#if isPending}
						<span class="pending-dot" title="Sending...">◌</span>
					{:else if message.readReceipts && message.readReceipts.length > 0}
						✓✓
					{:else}
						✓
					{/if}
				</span>
			{/if}
		</div>
	</div>

	{#if !isDeleted}
		<div class="actions">
			<button class="action-btn" onclick={() => onReply?.(message)} aria-label="Reply">
				<Icon name="arrowLeft" size={14} />
			</button>
			<button class="action-btn" onclick={() => { showEmojiPicker = !showEmojiPicker; showMenu = false; }} aria-label="React">
				<Icon name="emoji" size={14} />
			</button>
			<button class="action-btn" onclick={() => { showMenu = !showMenu; showEmojiPicker = false; }} aria-label="More">
				<Icon name="more" size={14} />
			</button>
		</div>

		{#if showEmojiPicker}
			<div class="emoji-picker-popup">
				<EmojiPicker onSelect={handleReact} onClose={() => showEmojiPicker = false} />
			</div>
		{/if}

		{#if showMenu}
			<div class="menu">
				<button onclick={() => { onPin?.(message.id); showMenu = false; }}>Pin</button>
				{#if canEdit}
					<button onclick={() => { onEdit?.(message); showMenu = false; }}>Edit</button>
				{/if}
				{#if canDelete}
					<button class="danger" onclick={() => { onDelete?.(message.id); showMenu = false; }}>Delete</button>
				{/if}
			</div>
		{/if}
	{/if}

	{#if message.reactions && message.reactions.length > 0}
		<div class="reactions">
			{#each message.reactions as reaction (reaction.emoji)}
				<ReactionPill {reaction} onToggle={(emoji) => handleReact(emoji)} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.bubble-row {
		display: flex;
		flex-direction: column;
		padding: var(--space-xs) var(--space-lg);
		position: relative;
	}

	.bubble-row.mine {
		align-items: flex-end;
	}

	.bubble {
		max-width: 80%;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.bubble-row.mine .bubble {
		background: var(--color-accent);
		color: var(--color-bg);
		border-color: var(--color-accent);
	}

	.bubble.deleted {
		opacity: 0.5;
		font-style: italic;
	}

	.sender {
		font-size: var(--text-xs);
		color: var(--color-accent);
		font-weight: var(--weight-medium);
	}

	.reply-to {
		padding: var(--space-xs) var(--space-sm);
		background: rgba(0, 0, 0, 0.15);
		border-radius: var(--radius-sm);
		border-left: 2px solid var(--color-accent);
	}

	.reply-name {
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		color: var(--color-accent);
	}

	.reply-content {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.content {
		font-size: var(--text-base);
		line-height: 1.4;
		word-wrap: break-word;
		margin: 0;
	}

	.deleted-label {
		font-size: var(--text-sm);
		font-style: italic;
		opacity: 0.6;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.meta {
		font-size: var(--text-xs);
		opacity: 0.6;
		align-self: flex-end;
	}

	.edited {
		font-size: var(--text-xs);
		opacity: 0.5;
		font-style: italic;
	}

	.read-status {
		font-size: var(--text-xs);
		opacity: 0.6;
		margin-left: auto;
		letter-spacing: -0.1em;
	}

	.pending-dot {
		display: inline-block;
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}

	.media-image, .media-gif {
		max-width: 100%;
		max-height: 300px;
		border-radius: var(--radius-md);
		object-fit: cover;
	}

	.media-video {
		max-width: 100%;
		max-height: 300px;
		border-radius: var(--radius-md);
	}

	.media-sticker {
		max-width: 160px;
		max-height: 160px;
		border-radius: var(--radius-md);
		object-fit: contain;
	}

	.file-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface-elevated);
		border-radius: var(--radius-md);
		color: var(--color-text);
		text-decoration: none;
		font-size: var(--text-sm);
	}

	.actions {
		display: flex;
		gap: var(--space-xs);
		margin-top: 2px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.bubble-row:hover .actions {
		opacity: 1;
	}

	.action-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		padding: 2px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.action-btn:hover {
		color: var(--color-text);
	}

	.menu {
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-xs);
		margin-top: var(--space-xs);
		max-width: 120px;
		box-shadow: var(--shadow-card);
	}

	.menu button {
		background: none;
		border: none;
		color: var(--color-text);
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		font-size: var(--text-sm);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background 0.1s;
	}

	.menu button:hover {
		background: var(--color-surface);
	}

	.menu button.danger {
		color: var(--color-error);
	}

	.emoji-picker-popup {
		position: absolute;
		z-index: 10;
		margin-top: 2px;
	}

	.bubble-row.mine .emoji-picker-popup {
		right: var(--space-lg);
	}

	.bubble-row:not(.mine) .emoji-picker-popup {
		left: var(--space-lg);
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-top: 2px;
	}
</style>
