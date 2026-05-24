<script lang="ts">
	import type { Message } from '@penthouse/contracts';
	import { sessionStore } from '$stores/session.svelte';
	import ReactionPill from './ReactionPill.svelte';
	import Icon from './Icon.svelte';
	import MarkdownText from './MarkdownText.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';
	import AudioPlayer from './AudioPlayer.svelte';
	import Avatar from './Avatar.svelte';

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
		showAvatar?: boolean;
		firstInCluster?: boolean;
		showClusterGap?: boolean;
		senderAvatar?: string | null;
	}

	let {
		message,
		onReply,
		onReact,
		onEdit,
		onDelete,
		onPin,
		emotes = [],
		showAvatar = true,
		firstInCluster = true,
		showClusterGap = false,
		senderAvatar = null
	}: Props = $props();

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

<div
	class="msg"
	class:own={isMine}
	class:msg-cluster-gap={showClusterGap}
	class:msg-with-time={showAvatar}
	data-message-id={message.id}
>
	<div class="row" class:own={isMine}>
		<div class="avatar-col">
			{#if showAvatar}
				<div class="avatar-wrap">
					<Avatar url={senderAvatar} name={message.senderDisplayName ?? message.senderUsername ?? 'Unknown'} size={36} />
				</div>
				<span class="time">{formatTime(message.createdAt)}</span>
			{:else}
				<div class="avatar-spacer"></div>
			{/if}
		</div>

		<div class="bubble" class:deleted={isDeleted}>
			{#if !isMine && firstInCluster}
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

			{#if !isDeleted}
				<div class="meta-row">
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
			{/if}

			{#if !isDeleted}
				<div class="actions">
					<button class="action-btn" onclick={() => onReply?.(message)} aria-label="Reply">
						<Icon name="arrowLeft" size={16} />
					</button>
					<button class="action-btn" onclick={() => { showEmojiPicker = !showEmojiPicker; showMenu = false; }} aria-label="React">
						<Icon name="emoji" size={16} />
					</button>
					<button class="action-btn" onclick={() => { showMenu = !showMenu; showEmojiPicker = false; }} aria-label="More">
						<Icon name="more" size={16} />
					</button>
				</div>

				{#if showEmojiPicker}
					<div class="emoji-picker-popup" use:focusTrap={{ onEscape: () => showEmojiPicker = false }}>
						<EmojiPicker onSelect={handleReact} onClose={() => showEmojiPicker = false} />
					</div>
				{/if}

				{#if showMenu}
					<div class="menu" use:focusTrap={{ onEscape: () => showMenu = false }}>
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
		</div>
	</div>

	{#if message.reactions && message.reactions.length > 0}
		<div class="reactions-row" class:own={isMine}>
			<div class="reactions">
				{#each message.reactions as reaction (reaction.emoji)}
					<ReactionPill {reaction} onToggle={(emoji) => handleReact(emoji)} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Message wrapper ── */
	.msg {
		display: flex;
		flex-direction: column;
	}
	.msg.msg-cluster-gap {
		margin-top: 14px;
	}
	.msg.msg-with-time {
		margin-bottom: 18px;
	}

	/* ── Row: avatar + bubble ── */
	.row {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		max-width: 100%;
		position: relative;
	}
	.row.own {
		flex-direction: row-reverse;
	}

	/* ── Avatar column ── */
	.avatar-col {
		position: relative;
		width: 36px;
		flex-shrink: 0;
	}
	.avatar-spacer {
		width: 36px;
		height: 0;
	}
	.avatar-wrap {
		width: 36px;
		height: 36px;
	}
	.time {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 1.2px;
		color: var(--p-muted);
		opacity: 0.75;
		white-space: nowrap;
	}

	/* ── Bubble ── */
	.bubble {
		position: relative;
		max-width: 70%;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.row.own .bubble {
		background: var(--p-accent);
		color: var(--p-bg);
		border-color: var(--p-accent);
	}
	:global([data-mode="light"]) .row.own .bubble {
		color: var(--p-text);
	}

	.bubble.deleted {
		opacity: 0.5;
		font-style: italic;
	}

	.sender {
		font-size: var(--text-xs);
		color: var(--p-accent);
		font-weight: var(--weight-medium);
	}

	.reply-to {
		padding: var(--space-xs) var(--space-sm);
		background: oklch(0 0 0 / 0.15);
		border-radius: var(--radius-sm);
		border-left: 2px solid var(--p-accent);
	}

	.reply-name {
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		color: var(--p-accent);
	}

	.reply-content {
		font-size: var(--text-sm);
		color: var(--p-text-2);
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
		justify-content: flex-end;
	}

	.edited {
		font-size: var(--text-xs);
		opacity: 0.5;
		font-style: italic;
	}

	.read-status {
		font-size: var(--text-xs);
		opacity: 0.6;
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
		max-width: 240px;
		max-height: 240px;
		border-radius: var(--radius-md);
		object-fit: contain;
	}

	.file-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--p-surface-2);
		border-radius: var(--radius-md);
		color: var(--p-text);
		text-decoration: none;
		font-size: var(--text-sm);
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		gap: var(--space-xs);
		opacity: 0;
		transition: opacity 0.15s;
		position: absolute;
		top: 4px;
		right: 4px;
		background: var(--p-surface-2);
		border-radius: var(--radius-sm);
		padding: 4px 6px;
	}
	.bubble:hover .actions {
		opacity: 1;
	}

	/* Always show actions on touch devices (no hover) */
	@media (hover: none) {
		.actions {
			opacity: 1;
		}
	}

	.action-btn {
		background: none;
		border: none;
		color: var(--p-muted);
		padding: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: color 0.15s;
		min-width: 44px;
		min-height: 44px;
		justify-content: center;
	}

	.action-btn:hover {
		color: var(--p-text);
	}

	/* ── Emoji picker popup ── */
	.emoji-picker-popup {
		position: absolute;
		z-index: 10;
		margin-top: 4px;
		top: 100%;
		right: 0;
	}

	/* ── Menu ── */
	.menu {
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		padding: var(--space-xs);
		max-width: 120px;
		box-shadow: var(--shadow-card);
		position: absolute;
		z-index: 10;
		margin-top: 4px;
		top: 100%;
		right: 0;
	}

	.menu button {
		background: none;
		border: none;
		color: var(--p-text);
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		font-size: var(--text-sm);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: background 0.1s;
	}

	.menu button:hover {
		background: var(--p-surface);
	}

	.menu button.danger {
		color: var(--p-error);
	}

	/* ── Reactions row (sibling of .row) ── */
	.reactions-row {
		display: flex;
		justify-content: flex-start;
		padding-left: 48px;
		margin-top: 6px;
	}
	.reactions-row.own {
		justify-content: flex-end;
		padding-left: 0;
		padding-right: 48px;
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}
</style>
