<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { chats } from '$services/chats';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore, onMessageNew, onMessageAck, onTypingUpdate, joinChat, leaveChat, typingStart, typingStop } from '$stores/socket.svelte';
	import MessageBubble from '$components/MessageBubble.svelte';
	import MessageComposer from '$components/MessageComposer.svelte';
	import Icon from '$components/Icon.svelte';
	import type { Message } from '@penthouse/contracts';

	const chatId = $derived($page.params.id ?? '');
	let messages = $state<Message[]>([]);
	let loading = $state(true);
	let error = $state('');
	let scrollContainer = $state<HTMLDivElement | null>(null);
	let typingUser = $state<string | null>(null);
	let typingTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	// Generate a client message ID
	function genClientId(): string {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	// Fetch messages
	async function loadMessages() {
		loading = true;
		error = '';
		try {
			const res = await chats.messages(chatId);
			messages = res.messages;
			scrollToBottom();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	function scrollToBottom() {
		requestAnimationFrame(() => {
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		});
	}

	// Join chat room when connected
	$effect(() => {
		if (socketStore.isConnected && chatId) {
			joinChat(chatId);
			return () => { if (chatId) leaveChat(chatId); };
		}
	});

	// Load messages on mount / chat change
	$effect(() => {
		if (chatId) {
			loadMessages();
		}
	});

	// Listen for new messages
	$effect(() => {
		const unsub = onMessageNew((event) => {
			const msg = event.payload;
			if (msg.chatId !== chatId) return;
			messages = [...messages, msg];
			scrollToBottom();
		});
		return unsub;
	});

	// Listen for message acks (dedup)
	$effect(() => {
		const unsub = onMessageAck((event) => {
			const ack = event.payload;
			if (ack.chatId !== chatId) return;
			// Replace optimistic message with confirmed
			messages = messages.map((m) =>
				m.clientMessageId === ack.clientMessageId ? { ...m, id: ack.messageId } : m
			);
		});
		return unsub;
	});

	// Typing indicator
	$effect(() => {
		const unsub = onTypingUpdate((event) => {
			const data = event.payload;
			if (data.chatId !== chatId) return;
			if (data.status === 'start') {
				typingUser = data.displayName ?? 'Someone';
				if (typingTimer) clearTimeout(typingTimer);
				typingTimer = setTimeout(() => { typingUser = null; }, 3000);
			} else {
				typingUser = null;
				if (typingTimer) clearTimeout(typingTimer);
			}
		});
		return unsub;
	});

	function handleSend(content: string) {
		const clientMessageId = genClientId();
		const optimistic: Message = {
			id: clientMessageId,
			chatId,
			senderId: sessionStore.user?.id ?? '',
			senderDisplayName: sessionStore.user?.displayName ?? '',
			content,
			type: 'text',
			createdAt: new Date().toISOString(),
			clientMessageId
		};
		messages = [...messages, optimistic];
		scrollToBottom();

		socketStore.emit('message.send', {
			chatId,
			content,
			clientMessageId,
			messageType: 'text'
		});
	}

	function handleTypingStart() {
		typingStart(chatId);
	}

	function handleTypingStop() {
		typingStop(chatId);
	}
</script>

<div class="thread">
	<header class="header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<Icon name="arrowLeft" size={20} />
		</button>
		<h1>Chat</h1>
	</header>

	<div class="messages" bind:this={scrollContainer}>
		{#if loading}
			<p class="state">Loading messages...</p>
		{:else if error}
			<p class="state error">{error}</p>
		{:else if messages.length === 0}
			<p class="state">No messages yet. Say something.</p>
		{:else}
			{#each messages as message (message.id)}
				<MessageBubble {message} />
			{/each}
		{/if}
		{#if typingUser}
			<p class="typing">{typingUser} is typing...</p>
		{/if}
	</div>

	<MessageComposer
		onSend={handleSend}
		onTypingStart={handleTypingStart}
		onTypingStop={handleTypingStop}
		disabled={!socketStore.isConnected}
	/>
</div>

<style>
	.thread {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.back-btn:hover { background: var(--color-surface-elevated); }

	h1 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		min-height: 0;
	}

	.state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state.error {
		color: var(--color-error);
	}

	.typing {
		padding: 0 var(--space-lg);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		font-style: italic;
	}
</style>
