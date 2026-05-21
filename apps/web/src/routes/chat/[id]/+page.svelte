<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { chats } from '$services/chats';
	import { sessionStore } from '$stores/session.svelte';
	import {
		socketStore,
		onMessageNew,
		onMessageAck,
		onMessageRead,
		onMessageEdited,
		onMessageDeleted,
		onReactionAdd,
		onReactionRemove,
		onTypingUpdate,
		onChatSyncRequired,
		onMessagePinned,
		onMessageUnpinned,
		joinChat,
		leaveChat,
		typingStart,
		typingStop
	} from '$stores/socket.svelte';
	import MessageBubble from '$components/MessageBubble.svelte';
	import MessageComposer from '$components/MessageComposer.svelte';
	import ChannelList from '$components/ChannelList.svelte';
	import ReadReceipts from '$components/ReadReceipts.svelte';
	import TypingIndicator from '$components/TypingIndicator.svelte';
	import Icon from '$components/Icon.svelte';
	import ChatMembersModal from '$components/ChatMembersModal.svelte';
	import { channelsStore } from '$stores/channels.svelte';
	import { chatsStore } from '$stores/chats.svelte';
	import { readReceiptsStore } from '$stores/readReceipts.svelte';
	import { outboxStore, MAX_RETRIES } from '$stores/outbox.svelte';
	import { media } from '$services/media';
	import { env } from '$env/dynamic/public';
	import { voiceStore } from '$stores/voice.svelte';
	import { emotesStore } from '$stores/emotes.svelte';
	import { stickersStore } from '$stores/stickers.svelte';
	import type { Message } from '@penthouse/contracts';

	const EMPTY_MAP = new Map();
	const chatId = $derived($page.params.id ?? '');
	let messages = $state<Message[]>([]);
	const orderedMessageIds = $derived(messages.map((m) => m.id));
	let loading = $state(true);
	let error = $state('');
	let scrollContainer = $state<HTMLDivElement | null>(null);
	let observer = $state<IntersectionObserver | null>(null);
	let typingUsers = $state<Map<string, string>>(new Map());
	let typingTimers = $state<Map<string, ReturnType<typeof setTimeout>>>(new Map());
	let replyToMessage = $state<Message | null>(null);
	let creatingChannel = $state(false);
	let newChannelName = $state('');
	let pinnedMessages = $state<{ messageId: string; content: string; senderDisplayName: string | null }[]>([]);
	let showSearch = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Message[]>([]);
	let searching = $state(false);
	let showChatMenu = $state(false);
	let showMembersModal = $state(false);

	// PTT keyboard handler
	$effect(() => {
		if (typeof window === 'undefined') return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.code === 'Space' && voiceStore.pttMode && !e.repeat && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
				e.preventDefault();
				voiceStore.setPttActive(true);
			}
		}
		function onKeyUp(e: KeyboardEvent) {
			if (e.code === 'Space' && voiceStore.pttMode) {
				e.preventDefault();
				voiceStore.setPttActive(false);
			}
		}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});

	// Read receipt tracking
	let visibleMessageIds = $state<Set<string>>(new Set());
	let markReadTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let lastMarkedMessageId = $state<string | null>(null);

	// Cleanup timers on unmount
	$effect(() => {
		return () => {
			for (const timer of typingTimers.values()) {
				clearTimeout(timer);
			}
			if (markReadTimer) clearTimeout(markReadTimer);
		};
	});

	function genClientId(): string {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	async function loadMessages(targetChatId = chatId) {
		loading = true;
		error = '';
		try {
			const res = await chats.messages(targetChatId);
			let loaded = res.messages;

			// Merge pending outbox messages for this chat
			const pending = outboxStore.items
				.filter((item) => item.chatId === targetChatId && item.retries < MAX_RETRIES)
				.map((item) => outboxToMessage(item));

			if (pending.length > 0) {
				loaded = [...loaded, ...pending];
				loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
			}

			messages = loaded;
			readReceiptsStore.seedFromMessages(targetChatId, messages);
			scrollToBottom();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	async function loadPins(targetChatId = chatId) {
		try {
			const res = await chats.listPins(targetChatId);
			pinnedMessages = res.pins.map((p) => ({
				messageId: p.messageId,
				content: p.content,
				senderDisplayName: p.senderDisplayName ?? null
			}));
		} catch {
			pinnedMessages = [];
		}
	}

	function outboxToMessage(item: typeof outboxStore.items[number]): Message {
		return {
			id: item.clientMessageId,
			chatId: item.chatId,
			senderId: sessionStore.user?.id ?? '',
			senderDisplayName: sessionStore.user?.displayName ?? '',
			content: item.content,
			type: item.messageType as Message['type'],
			createdAt: new Date(item.timestamp).toISOString(),
			clientMessageId: item.clientMessageId,
			...(item.replyToMessageId ? {
				replyTo: { id: item.replyToMessageId, content: '', senderDisplayName: null }
			} : {})
		};
	}

	function scrollToBottom() {
		requestAnimationFrame(() => {
			if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
		});
	}

	const SCROLL_THRESHOLD = 100; // px from bottom to trigger auto-scroll

	function isNearBottom(): boolean {
		if (!scrollContainer) return true;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
	}

	// IntersectionObserver for read receipts
	function debouncedMarkRead() {
		if (markReadTimer) clearTimeout(markReadTimer);
		markReadTimer = setTimeout(() => {
			markFurthestVisibleRead();
		}, 500);
	}

	async function markFurthestVisibleRead() {
		const myId = sessionStore.user?.id;
		if (!myId || !chatId) return;

		// Find the furthest visible message sent by someone else
		let furthestMessage: Message | null = null;
		for (const msg of messages) {
			if (visibleMessageIds.has(msg.id) && msg.senderId !== myId && !msg.deletedAt) {
				if (!furthestMessage || new Date(msg.createdAt) > new Date(furthestMessage.createdAt)) {
					furthestMessage = msg;
				}
			}
		}

		if (!furthestMessage) return;
		if (furthestMessage.id === lastMarkedMessageId) return;

		lastMarkedMessageId = furthestMessage.id;
		try {
			await chats.markRead(chatId, { throughMessageId: furthestMessage.id });
		} catch {
			// Silently fail — read receipts are best-effort
		}
	}

	// Create observer once when scrollContainer is available
	$effect(() => {
		if (!scrollContainer) return;
		
		const _observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const id = entry.target.getAttribute('data-message-id');
					if (!id) return;
					if (entry.isIntersecting) {
						visibleMessageIds.add(id);
					} else {
						visibleMessageIds.delete(id);
					}
				});
				debouncedMarkRead();
			},
			{ root: scrollContainer, threshold: 0.5 }
		);
		observer = _observer;
		
		return () => {
			_observer.disconnect();
			observer = null;
		};
	});

	// Observe new message bubbles as they appear
	$effect(() => {
		if (!observer || messages.length === 0) return;
		const bubbles = scrollContainer?.querySelectorAll('[data-message-id]');
		bubbles?.forEach((el) => observer!.observe(el));
	});

	$effect(() => {
		if (socketStore.isConnected && chatId) {
			joinChat(chatId);
			return () => { if (chatId) leaveChat(chatId); };
		}
	});

	$effect(() => {
		if (!showChatMenu) return;
		function onWindowClick(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if (!target.closest('.chat-menu') && !target.closest('.menu-toggle')) {
				showChatMenu = false;
			}
		}
		window.addEventListener('mousedown', onWindowClick);
		return () => window.removeEventListener('mousedown', onWindowClick);
	});

	$effect(() => {
		const currentChatId = chatId;
		if (!currentChatId) return;
		untrack(() => {
			loadMessages(currentChatId);
			loadPins(currentChatId);
			channelsStore.load(currentChatId);
			emotesStore.load();
			stickersStore.loadPacks();
		});
	});

	$effect(() => {
		const currentChatId = chatId;
		const socket = socketStore.instance;
		if (!socket || !currentChatId) return;
		return onChatSyncRequired((event) => {
			const eventChatId = event.payload.chatId;
			const isCurrentParent = eventChatId === currentChatId;
			const isCurrentChannel = channelsStore.channels.some(
				(channel) => channel.id === currentChatId && channel.parentChatId === eventChatId
			);
			if (isCurrentParent || isCurrentChannel) {
				channelsStore.load(currentChatId, { force: true });
			}
		});
	});

	// Drain outbox when socket connects
	$effect(() => {
		if (!socketStore.isConnected || chatId !== $page.params.id) return;
		const pending = outboxStore.items.filter(
			(item) => item.chatId === chatId && item.retries < MAX_RETRIES
		);
		for (const item of pending) {
			socketStore.emit('message.send', {
				chatId: item.chatId,
				content: item.content,
				clientMessageId: item.clientMessageId,
				messageType: item.messageType,
				...(item.replyToMessageId ? { replyToMessageId: item.replyToMessageId } : {})
			});
			outboxStore.markRetry(item.clientMessageId);
		}
	});

	// Socket event listeners — reattach on reconnect
	$effect(() => {
		const s = socketStore.instance;
		const currentChatId = chatId;
		if (!s || !currentChatId) return;

		const unsubs = [
			onMessageNew((event) => {
				const msg = event.payload;
				if (msg.chatId !== currentChatId) return;
				messages = [...messages, msg];
				// Auto-scroll only if user is near bottom or the message is from current user
				if (isNearBottom() || msg.senderId === sessionStore.user?.id) {
					scrollToBottom();
				}
			}),
			onMessageAck((event) => {
				const ack = event.payload;
				if (ack.chatId !== currentChatId) return;
				outboxStore.remove(ack.clientMessageId);
				messages = messages.map((m) =>
					m.clientMessageId === ack.clientMessageId ? { ...m, id: ack.messageId } : m
				);
			}),
			onMessageRead((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				// Update read receipts for all messages up to seenThroughMessageId
				messages = messages.map((m) => {
					if (m.id === data.seenThroughMessageId || m.createdAt <= data.seenAt) {
						const receipts = m.readReceipts ?? [];
						if (!receipts.find((r) => r.userId === data.readerUserId)) {
							return {
								...m,
								readReceipts: [...receipts, { userId: data.readerUserId, readAt: data.seenAt }]
							};
						}
					}
					return m;
				});
			}),
			onMessageEdited((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				messages = messages.map((m) =>
					m.id === data.messageId
						? { ...m, content: data.content, editedAt: data.editedAt, editCount: data.editCount }
						: m
				);
			}),
			onMessageDeleted((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				messages = messages.map((m) =>
					m.id === data.messageId
						? { ...m, deletedAt: data.deletedAt, deletedByUserId: data.deletedByUserId }
						: m
				);
			}),
			onReactionAdd((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				messages = messages.map((m) => {
					if (m.id !== data.messageId) return m;
					const reactions = m.reactions ?? [];
					const existing = reactions.find((r) => r.emoji === data.emoji);
					if (existing) {
						return {
							...m,
							reactions: reactions.map((r) =>
								r.emoji === data.emoji ? { ...r, userIds: [...r.userIds, data.userId] } : r
							)
						};
					}
					return { ...m, reactions: [...reactions, { emoji: data.emoji, userIds: [data.userId] }] };
				});
			}),
			onReactionRemove((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				messages = messages.map((m) => {
					if (m.id !== data.messageId) return m;
					const reactions = (m.reactions ?? [])
						.map((r) =>
							r.emoji === data.emoji
								? { ...r, userIds: r.userIds.filter((id) => id !== data.userId) }
								: r
						)
						.filter((r) => r.userIds.length > 0);
					return { ...m, reactions };
				});
			}),
			onMessagePinned((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				pinnedMessages = [...pinnedMessages, {
					messageId: data.messageId,
					content: data.content,
					senderDisplayName: data.senderDisplayName ?? null
				}];
			}),
			onMessageUnpinned((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				pinnedMessages = pinnedMessages.filter((p) => p.messageId !== data.messageId);
			}),
			onTypingUpdate((event) => {
				const data = event.payload;
				if (data.chatId !== currentChatId) return;
				if (data.status === 'start') {
					const next = new Map(typingUsers);
					next.set(data.userId, data.displayName ?? 'Someone');
					typingUsers = next;
					const existing = typingTimers.get(data.userId);
					if (existing) clearTimeout(existing);
					const timer = setTimeout(() => {
						typingUsers = new Map(typingUsers);
						typingUsers.delete(data.userId);
						typingTimers = new Map(typingTimers);
						typingTimers.delete(data.userId);
					}, 3000);
					typingTimers = new Map(typingTimers);
					typingTimers.set(data.userId, timer);
				} else {
					const next = new Map(typingUsers);
					next.delete(data.userId);
					typingUsers = next;
					const existing = typingTimers.get(data.userId);
					if (existing) clearTimeout(existing);
					typingTimers = new Map(typingTimers);
					typingTimers.delete(data.userId);
				}
			})
		];
		return () => unsubs.forEach((u) => u());
	});

	function handleSend(content: string) {
		sendMessage(content, 'text');
	}

	function handleGifSelect(gif: { url: string; previewUrl: string; width?: number; height?: number }) {
		sendMessage('', 'gif', { url: gif.url });
	}

	function handleStickerSelect(sticker: { url: string; name: string }) {
		sendMessage('', 'sticker', { url: sticker.url });
	}

	async function handleAudioRecord(blob: Blob, mimeType: string) {
		const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
		const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
		try {
			const upload = await media.upload(file);
			const audioUrl = upload.url.startsWith('http') ? upload.url : `${env.PUBLIC_API_URL ?? 'http://localhost:3000'}${upload.url}`;
			sendMessage('', 'audio', { audioUrl });
		} catch {
			// Non-critical: audio upload failed
		}
	}

	function sendMessage(content: string, messageType: Message['type'], metadata?: Record<string, unknown>) {
		const clientMessageId = genClientId();
		const optimistic: Message = {
			id: clientMessageId,
			chatId,
			senderId: sessionStore.user?.id ?? '',
			senderDisplayName: sessionStore.user?.displayName ?? '',
			content,
			type: messageType,
			metadata: metadata ?? null,
			createdAt: new Date().toISOString(),
			clientMessageId,
			...(replyToMessage ? {
				replyTo: {
					id: replyToMessage.id,
					content: replyToMessage.content,
					senderDisplayName: replyToMessage.senderDisplayName ?? null
				}
			} : {})
		};
		messages = [...messages, optimistic];
		scrollToBottom();

		if (!socketStore.isConnected) {
			outboxStore.add({
				clientMessageId,
				chatId,
				content,
				messageType,
				metadata,
				...(replyToMessage ? { replyToMessageId: replyToMessage.id } : {})
			});
			replyToMessage = null;
			return;
		}

		socketStore.emit('message.send', {
			chatId,
			content,
			clientMessageId,
			messageType,
			metadata,
			...(replyToMessage ? { replyToMessageId: replyToMessage.id } : {})
		});

		replyToMessage = null;
	}

	function handleReply(message: Message) {
		replyToMessage = message;
	}

	function handleReact(messageId: string, emoji: string) {
		const userId = sessionStore.user?.id;
		if (!userId) return;
		messages = messages.map((m) => {
			if (m.id !== messageId) return m;
			const reactions = m.reactions ?? [];
			const existing = reactions.find((r) => r.emoji === emoji);
			if (existing?.userIds.includes(userId)) {
				socketStore.emit('message.unreact', { messageId, emoji });
				return {
					...m,
					reactions: reactions
						.map((r) =>
							r.emoji === emoji
								? { ...r, userIds: r.userIds.filter((id) => id !== userId) }
								: r
						)
						.filter((r) => r.userIds.length > 0)
				};
			}
			socketStore.emit('message.react', { messageId, emoji });
			if (existing) {
				return {
					...m,
					reactions: reactions.map((r) =>
						r.emoji === emoji ? { ...r, userIds: [...r.userIds, userId] } : r
					)
				};
			}
			return { ...m, reactions: [...reactions, { emoji, userIds: [userId] }] };
		});
	}

	async function handleEdit(message: Message) {
		const newContent = prompt('Edit message:', message.content);
		if (!newContent || newContent.trim() === message.content) return;
		try {
			await chats.editMessage(message.id, { content: newContent.trim() });
			messages = messages.map((m) =>
				m.id === message.id
					? { ...m, content: newContent.trim(), editedAt: new Date().toISOString() }
					: m
			);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to edit');
		}
	}

	async function handleDelete(messageId: string) {
		if (!confirm('Delete this message?')) return;
		try {
			await chats.deleteMessage(messageId);
			messages = messages.map((m) =>
				m.id === messageId
					? { ...m, deletedAt: new Date().toISOString(), deletedByUserId: sessionStore.user?.id }
					: m
			);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to delete');
		}
	}

	async function handlePin(messageId: string) {
		try {
			await chats.pinMessage(chatId, { messageId });
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to pin');
		}
	}

	async function handleUnpin(messageId: string) {
		try {
			await chats.unpinMessage(chatId, messageId);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to unpin');
		}
	}

	function handleTypingStart() { typingStart(chatId); }
	function handleTypingStop() { typingStop(chatId); }

	async function handleSearch() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			const res = await chats.searchMessages(chatId, searchQuery.trim());
			searchResults = res.messages;
		} catch (err) {
			searchResults = [];
		} finally {
			searching = false;
		}
	}

	function closeSearch() {
		showSearch = false;
		searchQuery = '';
		searchResults = [];
	}

	async function handleCreateChannel() {
		const name = newChannelName.trim();
		if (!name) return;
		await channelsStore.create(chatId, name);
		newChannelName = '';
		creatingChannel = false;
	}

	async function handleLeaveChat() {
		if (!confirm('Leave this chat?')) return;
		try {
			await chats.leave(chatId);
			goto('/');
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to leave chat');
		}
	}

	async function handleArchiveChat() {
		try {
			await chats.archive(chatId);
			const chat = chatsStore.chats.find(c => c.id === chatId);
			if (chat) chatsStore.updateChat(chatId, { archivedAt: new Date().toISOString() });
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to archive');
		}
	}

	async function handleDeleteChat() {
		const prompt = rootChat?.type === 'dm'
			? 'Hide this DM from your chat list?'
			: activeChannel
				? 'Delete this channel? This cannot be undone.'
				: 'Delete this group? This cannot be undone.';
		if (!confirm(prompt)) return;
		try {
			await chats.deleteChat(chatId);
			chatsStore.removeChat(chatId);
			goto('/');
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to update chat');
		}
	}

	const chatName = $derived(
		chatsStore.chats.find((c) => c.id === chatId)?.name ??
		channelsStore.channels.find((c) => c.id === chatId)?.name ??
		'Chat'
	);
	const activeChannel = $derived(channelsStore.channels.find((channel) => channel.id === chatId));
	const rootChatId = $derived(activeChannel?.parentChatId ?? chatId);
	const rootChat = $derived(chatsStore.chats.find((chat) => chat.id === rootChatId));
	const canManageChat = $derived(
		sessionStore.user?.role === 'admin' ||
		rootChat?.role === 'owner' ||
		rootChat?.role === 'admin'
	);
	const canLeaveChat = $derived(rootChat?.type === 'group');

</script>

<div class="thread">
	<header class="header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<Icon name="arrowLeft" size={20} />
		</button>
		<h1>{chatName}</h1>
		<button
			class="search-toggle"
			onclick={() => showSearch = !showSearch}
			aria-label="Search messages"
			aria-expanded={showSearch}
		>
			<Icon name="search" size={18} />
		</button>
		<button
			class="menu-toggle"
			onclick={(e) => { e.stopPropagation(); showChatMenu = !showChatMenu; }}
			aria-label="Chat actions"
			aria-expanded={showChatMenu}
		>
			<Icon name="more" size={18} />
		</button>
		{#if showChatMenu}
			<div class="chat-menu" role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<button role="menuitem" onclick={() => { showChatMenu = false; showMembersModal = true; }}>
					<Icon name="users" size={16} /> Members
				</button>
				<button role="menuitem" onclick={() => { showChatMenu = false; handleArchiveChat(); }}>
					<Icon name="archive" size={16} /> Archive
				</button>
				{#if canLeaveChat}
					<button role="menuitem" onclick={() => { showChatMenu = false; handleLeaveChat(); }}>
						<Icon name="logOut" size={16} /> Leave
					</button>
				{/if}
				<div class="menu-divider"></div>
				{#if rootChat?.type === 'dm' || canManageChat}
					<button role="menuitem" class="danger" onclick={() => { showChatMenu = false; handleDeleteChat(); }}>
						<Icon name="trash" size={16} /> {rootChat?.type === 'dm' ? 'Hide' : 'Delete'}
					</button>
				{/if}
			</div>
		{/if}
		{#if voiceStore.joined}
			<div class="voice-controls">
				<button
					class="voice-btn"
					onclick={() => voiceStore.setMuted(!voiceStore.muted)}
					aria-label={voiceStore.muted ? 'Unmute' : 'Mute'}
					title={voiceStore.muted ? 'Unmute' : 'Mute'}
				>
					<Icon name={voiceStore.muted ? 'mute' : 'mic'} size={18} />
				</button>
				<button
					class="voice-btn"
					class:active={voiceStore.deafened}
					onclick={() => voiceStore.setDeafened(!voiceStore.deafened)}
					aria-label={voiceStore.deafened ? 'Undeafen' : 'Deafen'}
					title={voiceStore.deafened ? 'Undeafen' : 'Deafen'}
				>
					<Icon name={voiceStore.deafened ? 'deafen' : 'headphones'} size={18} />
				</button>
				<button
					class="voice-btn"
					class:active={voiceStore.pttMode}
					onclick={() => voiceStore.setPttMode(!voiceStore.pttMode)}
					aria-label={voiceStore.pttMode ? 'Switch to open mic' : 'Switch to push-to-talk'}
					title={voiceStore.pttMode ? 'PTT on (Spacebar to talk)' : 'PTT off'}
				>
					<Icon name="ptt" size={18} />
				</button>
				<button
					class="voice-btn voice-leave"
					onclick={() => voiceStore.leave()}
					aria-label="Leave voice"
				>
					<Icon name="close" size={18} />
				</button>
			</div>
		{:else}
			<button
				class="voice-btn"
				onclick={() => voiceStore.join(chatId)}
				aria-label="Join voice"
			>
				<Icon name="mic" size={18} />
				<span>Voice</span>
			</button>
		{/if}
	</header>

	<ChatMembersModal
		chatId={chatId}
		canManage={canManageChat}
		open={showMembersModal}
		onClose={() => showMembersModal = false}
	/>

	<ChannelList
		channels={channelsStore.channels}
		activeChannelId={chatId}
		onSelect={(channelId) => goto(`/chat/${channelId}`)}
		onCreate={() => creatingChannel = true}
		onDelete={(channelId) => channelsStore.delete(channelId)}
		onRename={(channelId, newName) => channelsStore.update(channelId, { name: newName })}
		canManage={canManageChat}
	/>

	{#if creatingChannel}
		<form class="channel-form" onsubmit={(e) => { e.preventDefault(); handleCreateChannel(); }}>
				<label for="new-channel-name" class="visually-hidden">Channel name</label>
			<input
					id="new-channel-name"
					type="text"
				placeholder="Channel name"
				bind:value={newChannelName}
			/>
			<button type="submit">Create</button>
			<button type="button" onclick={() => { creatingChannel = false; newChannelName = ''; }}>Cancel</button>
		</form>
	{/if}

	{#if voiceStore.joined}
		<div class="voice-participants">
			<span
				class="voice-pill self"
				class:speaking={voiceStore.speaking}
				class:muted={voiceStore.muted}
				class:ptt-active={voiceStore.pttMode && voiceStore.pttActive}
			>
				You {#if voiceStore.muted}(muted){/if}
				{#if voiceStore.pttMode}(PTT){/if}
			</span>
			{#each voiceStore.participants as p (p.userId)}
				<span
					class="voice-pill"
					class:speaking={p.speaking}
					class:muted={p.muted}
					class:deafened={p.deafened}
				>
					{p.displayName}
					{#if p.muted}(muted){/if}
					{#if p.deafened}(deafened){/if}
				</span>
			{/each}
		</div>
	{/if}

	{#if pinnedMessages.length > 0}
		<div class="pinned-banner" role="region" aria-label="Pinned messages">
			{#each pinnedMessages as pin (pin.messageId)}
				<div class="pinned-item">
					<span class="pinned-icon">📌</span>
					<span class="pinned-text">{pin.content}</span>
					<button
						class="pinned-unpin"
						onclick={() => handleUnpin(pin.messageId)}
						aria-label="Unpin message"
						type="button"
					>
						<Icon name="x" size={14} />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if showSearch}
		<div class="search-panel">
			<div class="search-header">
				<input
					type="text"
					placeholder="Search messages..."
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button onclick={handleSearch} aria-label="Search">
					<Icon name="search" size={16} />
				</button>
				<button onclick={closeSearch} aria-label="Close search">
					<Icon name="close" size={16} />
				</button>
			</div>
			{#if searching}
				<p class="state">Searching...</p>
			{:else if searchResults.length === 0 && searchQuery.trim()}
				<p class="state">No results</p>
			{:else}
				<div class="search-results">
					{#each searchResults as message (message.id)}
						<div class="search-result">
							<MessageBubble
								{message}
								onReply={handleReply}
								onReact={handleReact}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onPin={handlePin}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="messages" bind:this={scrollContainer}>
		{#if loading}
			<p class="state">Loading messages...</p>
		{:else if error}
			<p class="state error">{error}</p>
		{:else if messages.length === 0}
			<p class="state">No messages yet. Say something.</p>
		{:else}
			{#each messages as message, i (message.id)}
				{@const showAvatar = i === messages.length - 1 || messages[i + 1].senderId !== message.senderId}
				{@const firstInCluster = i === 0 || messages[i - 1].senderId !== message.senderId}
				<MessageBubble
					{message}
					onReply={handleReply}
					onReact={handleReact}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onPin={handlePin}
					{showAvatar}
					{firstInCluster}
					showClusterGap={firstInCluster && i !== 0}
					senderAvatar={message.senderAvatarUrl ?? null}
				/>
				{#if showAvatar}
					<ReadReceipts
						messageId={message.id}
						{chatId}
						isSentByMe={message.senderId === sessionStore.user?.id}
						isPending={!!message.clientMessageId && message.id === message.clientMessageId}
						chatType={rootChat?.type ?? 'dm'}
						usersMap={EMPTY_MAP}
						{orderedMessageIds}
					/>
				{/if}
			{/each}
		{/if}
		<div class="typing-zone">
			<TypingIndicator users={typingUsers} chatType="dm" />
		</div>
	</div>

	<MessageComposer
		onSend={handleSend}
		onTypingStart={handleTypingStart}
		onTypingStop={handleTypingStop}
		onAudioRecord={handleAudioRecord}
		replyTo={replyToMessage ? {
			senderName: replyToMessage.senderDisplayName ?? 'Unknown',
			content: replyToMessage.content
		} : null}
		onCancelReply={() => replyToMessage = null}
	/>
</div>

<style>
	.thread {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		height: 100%;
	}

	.header {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
		background: var(--p-surface);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--p-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.back-btn:hover { background: var(--p-surface-2); }

	h1 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.voice-controls {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-left: auto;
	}

	.voice-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		background: var(--p-surface-2);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}

	.voice-btn:hover {
		background: var(--p-accent);
		color: var(--p-bg);
		border-color: var(--p-accent);
	}

	.voice-btn.active {
		background: var(--p-accent);
		color: var(--p-bg);
		border-color: var(--p-accent);
	}

	.voice-btn.voice-leave {
		background: var(--p-error);
		color: var(--p-bg);
		border-color: var(--p-error);
	}

	.voice-btn.voice-leave:hover {
		opacity: 0.85;
	}

	.voice-participants {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
		background: var(--p-surface);
		overflow-x: auto;
	}

	.channel-form {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
		background: var(--p-surface);
	}

	.channel-form input {
		flex: 1;
		min-width: 0;
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		color: var(--p-text);
		font-size: var(--text-sm);
		padding: var(--space-sm) var(--space-md);
	}

	.channel-form input:focus {
		outline: none;
		border-color: var(--p-accent);
	}

	.channel-form button {
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		background: var(--p-surface-2);
		color: var(--p-text);
		font-size: var(--text-sm);
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
	}

	.channel-form button[type="submit"] {
		background: var(--p-accent);
		border-color: var(--p-accent);
		color: var(--p-bg);
		font-weight: var(--weight-bold);
	}

	.voice-pill {
		display: inline-flex;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-pill);
		background: var(--p-accent);
		color: var(--p-bg);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
		transition: box-shadow 0.15s;
	}

	.voice-pill.muted {
		background: var(--p-surface-2);
		color: var(--p-muted);
	}

	.voice-pill.deafened {
		opacity: 0.5;
		text-decoration: line-through;
	}

	.voice-pill.speaking {
		animation: voice-pulse 1s ease-in-out infinite;
		box-shadow: 0 0 8px var(--p-success);
	}

	.voice-pill.ptt-active {
		box-shadow: 0 0 6px var(--p-accent);
	}

	@keyframes voice-pulse {
		0%, 100% { box-shadow: 0 0 4px var(--p-success); }
		50% { box-shadow: 0 0 12px var(--p-success); }
	}

	.pinned-banner {
		background: var(--p-surface-2);
		border-bottom: 1px solid var(--p-line);
		padding: var(--space-sm) var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.pinned-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-sm);
		color: var(--p-text-2);
	}

	.pinned-icon {
		flex-shrink: 0;
	}

	.pinned-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pinned-unpin {
		background: none;
		border: none;
		color: var(--p-muted);
		cursor: pointer;
		padding: var(--space-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.pinned-unpin:hover {
		color: var(--p-error);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-height: 0;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--p-text-2);
		font-size: var(--text-sm);
	}

	.state.error {
		color: var(--p-error);
	}

	.typing-zone {
		padding: 0 var(--space-lg);
		min-height: 28px;
	}

	.search-toggle {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
		margin-left: auto;
	}
	.search-toggle:hover {
		background: var(--p-surface-2);
		color: var(--p-text);
	}

	.search-panel {
		background: var(--p-surface);
		border-bottom: 1px solid var(--p-line);
		display: flex;
		flex-direction: column;
		max-height: 60vh;
		min-height: 0;
	}

	.search-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
	}

	.search-header input {
		flex: 1;
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		color: var(--p-text);
		font-size: var(--text-base);
		font-family: inherit;
		outline: none;
	}
	.search-header input:focus {
		border-color: var(--p-accent);
	}

	.search-header button {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
	}
	.search-header button:hover {
		background: var(--p-surface-2);
		color: var(--p-text);
	}

	.search-results {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
		padding: var(--space-sm) var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.search-result {
		border-radius: var(--radius-md);
	}

	.menu-toggle {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
	}
	.menu-toggle:hover {
		background: var(--p-surface-2);
		color: var(--p-text);
	}

	.chat-menu {
		position: absolute;
		right: var(--space-sm);
		top: 100%;
		z-index: 100;
		background: var(--p-surface);
		border: 1px solid var(--p-line-2);
		border-radius: var(--radius-md);
		padding: var(--space-xs);
		min-width: 160px;
	}

	.chat-menu button {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		color: var(--p-text);
		font-size: var(--text-sm);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.chat-menu button:hover {
		background: var(--p-accent-soft);
	}

	.chat-menu button.danger {
		color: var(--p-error);
	}

	.menu-divider {
		height: 1px;
		background: var(--p-line);
		margin: var(--space-xs) 0;
	}


</style>
