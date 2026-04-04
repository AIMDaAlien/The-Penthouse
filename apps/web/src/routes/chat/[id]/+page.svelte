<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, onDestroy, tick } from 'svelte';
	import { chats } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import type { Message } from '@penthouse/contracts';

	// ─── State ────────────────────────────────────────────────────────────────

	// Route always provides id — non-null assert is safe here
	const chatId = $derived(page.params.id ?? '');
	const currentUserId = $derived(sessionStore.current?.user.id ?? '');

	type PendingMessage = Message & { pending: true };
	type ChatMessage = Message | PendingMessage;

	let messages = $state<ChatMessage[]>([]);
	let chatName = $state('');
	let loading = $state(true);
	let error = $state('');
	let inputText = $state('');
	let sending = $state(false);
	let scrollEl = $state<HTMLDivElement | null>(null);

	// ─── Helpers ──────────────────────────────────────────────────────────────

	function isPending(m: ChatMessage): m is PendingMessage {
		return 'pending' in m && m.pending === true;
	}

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const isToday =
			d.getDate() === now.getDate() &&
			d.getMonth() === now.getMonth() &&
			d.getFullYear() === now.getFullYear();

		if (isToday) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function getSenderLabel(m: ChatMessage): string {
		return m.senderDisplayName ?? m.senderUsername ?? 'Unknown';
	}

	async function scrollToBottom(smooth = false) {
		await tick();
		if (scrollEl) {
			scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
		}
	}

	// ─── Load messages ────────────────────────────────────────────────────────

	onMount(async () => {
		try {
			const [msgList] = await Promise.all([
				chats.messages(chatId),
				chats.markRead(chatId).catch(() => {}) // non-fatal
			]);
			messages = msgList;
			chatName = page.url.searchParams.get('name') ?? 'Chat';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load messages.';
		} finally {
			loading = false;
			await scrollToBottom();
		}
	});

	// ─── Socket events (from @penthouse/contracts/src/events.ts) ───────────────

	$effect(() => {
		const socket = socketStore.instance;
		if (!socket) return;

		/** ServerMessageNewEventSchema payload */
		function onMessageNew(message: Message) {
			if (message.chatId !== chatId) return;
			// Replace optimistic message if clientMessageId matches
			const idx = messages.findIndex(
				(m) => m.clientMessageId && m.clientMessageId === message.clientMessageId
			);
			if (idx !== -1) {
				messages[idx] = message;
			} else {
				messages.push(message);
			}
			scrollToBottom(true);
		}

		/** ServerMessageAckEventSchema payload */
		interface MessageAckPayload {
			clientMessageId: string;
			messageId: string;
			chatId: string;
			deliveredAt: string;
		}

		function onMessageAck(payload: MessageAckPayload) {
			if (payload.chatId !== chatId) return;
			const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
			if (idx !== -1) {
				// Confirm delivery: swap pending id for real id
				messages[idx] = { ...messages[idx], id: payload.messageId };
			}
		}

		socket.on('message.new', onMessageNew);
		socket.on('message.ack', onMessageAck);

		return () => {
			socket.off('message.new', onMessageNew);
			socket.off('message.ack', onMessageAck);
		};
	});

	onDestroy(() => {
		// mark read on exit (best-effort)
		chats.markRead(chatId).catch(() => {});
	});

	// ─── Send ─────────────────────────────────────────────────────────────────

	async function handleSend() {
		const content = inputText.trim();
		if (!content || sending) return;

		const clientMessageId = crypto.randomUUID();
		inputText = '';
		sending = true;

		// Optimistic: append immediately
		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			content,
			type: 'text',
			createdAt: new Date().toISOString(),
			clientMessageId,
			pending: true
		};
		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const res = await chats.send(chatId, { chatId, content, type: 'text', clientMessageId });
			// Replace optimistic with confirmed message
			const idx = messages.findIndex((m) => m.clientMessageId === clientMessageId);
			if (idx !== -1) {
				messages[idx] = res.message;
			}
		} catch (err: unknown) {
			// Mark failed — remove optimistic and restore input
			messages = messages.filter((m) => m.clientMessageId !== clientMessageId);
			inputText = content;
			error = err instanceof Error ? err.message : 'Failed to send message.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="thread-shell">
	<!-- Header -->
	<header class="thread-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back to chat list">
			←
		</button>
		<h2 class="thread-name">{chatName}</h2>
	</header>

	<!-- Messages -->
	<div class="messages-scroll" bind:this={scrollEl}>
		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if error && messages.length === 0}
			<div class="state-msg error">{error}</div>
		{:else if messages.length === 0}
			<div class="state-msg">No messages yet. Say hello!</div>
		{:else}
			<div class="messages-inner">
				{#each messages as msg (msg.id)}
					{@const isMine = msg.senderId === currentUserId}
					{@const isHidden = msg.hidden === true}

					<div class="msg-row" class:mine={isMine} class:theirs={!isMine}>
						{#if !isMine}
							<span class="sender-name">{getSenderLabel(msg)}</span>
						{/if}

						<div
							class="bubble"
							class:mine={isMine}
							class:theirs={!isMine}
							class:pending={isPending(msg)}
							class:hidden-msg={isHidden}
						>
							{#if isHidden}
								<span class="tombstone">Message removed</span>
							{:else}
								{msg.content}
							{/if}
						</div>

						<span class="msg-meta">
							{formatTime(msg.createdAt)}
							{#if isMine && isPending(msg)}
								<span class="status-dot sending" title="Sending">·</span>
							{:else if isMine}
								<span class="status-dot sent" title="Sent">✓</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Send error toast -->
	{#if error && messages.length > 0}
		<div class="send-error">{error}</div>
	{/if}

	<!-- Composer -->
	<div class="composer">
		<textarea
			class="composer-input"
			placeholder="Message..."
			bind:value={inputText}
			onkeydown={handleKeydown}
			disabled={sending}
			rows="1"
		></textarea>
		<button
			class="send-btn"
			onclick={handleSend}
			disabled={!inputText.trim() || sending}
			aria-label="Send message"
		>
			↑
		</button>
	</div>
</div>

<style>
	.thread-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
	}

	/* ── Header ── */
	.thread-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		flex-shrink: 0;
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		font-size: var(--text-xl);
		padding: var(--space-2);
		line-height: 1;
		border-radius: var(--radius-sm);
	}

	.thread-name {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Messages ── */
	.messages-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--space-4) var(--space-4) var(--space-2);
		scroll-behavior: smooth;
	}

	.messages-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.msg-row {
		display: flex;
		flex-direction: column;
		max-width: 80%;
	}

	.msg-row.mine {
		align-self: flex-end;
		align-items: flex-end;
	}

	.msg-row.theirs {
		align-self: flex-start;
		align-items: flex-start;
	}

	.sender-name {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-bottom: 2px;
		padding-left: var(--space-2);
	}

	.bubble {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		line-height: 1.5;
		word-break: break-word;
		white-space: pre-wrap;
	}

	.bubble.mine {
		background: var(--color-accent);
		color: #000;
		border-bottom-right-radius: var(--radius-sm);
	}

	.bubble.theirs {
		background: var(--color-surface-raised);
		color: var(--color-text-primary);
		border-bottom-left-radius: var(--radius-sm);
	}

	.bubble.pending {
		opacity: 0.6;
	}

	.bubble.hidden-msg {
		background: var(--color-surface);
		border: 1px dashed var(--color-border);
	}

	.tombstone {
		color: var(--color-text-secondary);
		font-style: italic;
		font-size: var(--text-xs);
	}

	.msg-meta {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-top: 2px;
		padding: 0 var(--space-2);
	}

	.status-dot {
		font-size: var(--text-xs);
	}

	.status-dot.sending {
		color: var(--color-text-secondary);
		animation: pulse 1s ease-in-out infinite;
	}

	.status-dot.sent {
		color: var(--color-success);
	}

	/* ── Send error ── */
	.send-error {
		margin: 0 var(--space-4);
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		font-size: var(--text-xs);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	/* ── Composer ── */
	.composer {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		flex-shrink: 0;
	}

	.composer-input {
		flex: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		resize: none;
		max-height: 120px;
		overflow-y: auto;
		line-height: 1.5;
		outline: none;
		transition: border-color 0.15s;
	}

	.composer-input:focus {
		border-color: var(--color-accent);
	}

	.send-btn {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--color-accent);
		color: #000;
		border: none;
		font-size: var(--text-lg);
		font-weight: 700;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s;
	}

	.send-btn:disabled {
		opacity: 0.35;
	}

	.send-btn:not(:disabled):hover {
		opacity: 0.85;
	}

	.state-msg {
		padding: var(--space-8) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state-msg.error {
		color: var(--color-danger);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
</style>
