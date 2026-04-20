<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, tick } from 'svelte';
	import type { PageData } from './$types';
	import { chats, me, polls, reactions, pins } from '$services/api';
	import { formatMessageContent } from '$lib/utils/messageFormat';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ReadReceipts from '$lib/components/ReadReceipts.svelte';
	import GifPicker from '$lib/components/GifPicker.svelte';
	import CommandPicker from '$lib/components/CommandPicker.svelte';
	import PollBuilder from '$lib/components/PollBuilder.svelte';
	import PollCard from '$lib/components/PollCard.svelte';
	import ReplyBar from '$lib/components/ReplyBar.svelte';
	import MessageContextMenu from '$lib/components/MessageContextMenu.svelte';
	import MediaComposer from '$lib/components/MediaComposer.svelte';
	import MediaBubble from '$lib/components/MediaBubble.svelte';
	import TypingIndicator from '$lib/components/TypingIndicator.svelte';
	import type { MediaSendPayload } from '$lib/components/MediaComposer.utils';
	import type { Message, GifResult, PollData, MessageReaction } from '@penthouse/contracts';

	// ─── Props / route data ───────────────────────────────────────────────────

	const { data } = $props<{ data: PageData }>();

	// ─── State ────────────────────────────────────────────────────────────────

	const chatId = $derived(data.chatId ?? '');
	const currentUserId = $derived(sessionStore.current?.user.id ?? '');

	// Connection status
	const connectionStatus = $derived(socketStore.state);

	type PendingMessage = Message & { pending: true };
	type ChatMessage = Message | PendingMessage;

	let messages = $state<ChatMessage[]>([]);
	let chatName = $state('');
	let counterpartMemberId = $state<string | null>(null);
	let counterpartAvatarUrl = $state<string | null>(null);
	let chatType = $state<'dm' | 'channel'>('dm');
	let loading = $state(true);
	let error = $state('');
	let inputText = $state('');
	let sending = $state(false);
	let scrollEl = $state<HTMLDivElement | null>(null);

	// ── Media upload state ──────────────────────────────────────────────────
	let mediaFiles = $state<File[]>([]);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let mediaComposerEl = $state<any>(null);

	// GIF picker
	let showGifPicker = $state(false);

	// Slash command picker
	const SLASH_COMMANDS = [
		{ name: 'poll', description: 'Create a poll for the group', icon: 'bar-chart' as const }
	];
	let showCommandPicker = $state(false);
	let commandQuery = $state('');
	let commandSelectedIndex = $state(0);

	const filteredCommands = $derived(
		commandQuery
			? SLASH_COMMANDS.filter((c) => c.name.startsWith(commandQuery))
			: SLASH_COMMANDS
	);

	// Poll builder
	let showPollBuilder = $state(false);
	let pollSubmitting = $state(false);

	// Reply-to
	let replyToMsg = $state<Message | null>(null);

	// Context menu (long-press)
	let contextMenuMsg = $state<Message | null>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressStartX = 0;
	let longPressStartY = 0;

	// Pins
	let pinnedMessageIds = $state<Set<string>>(new Set());

	// Typing indicators — userId → displayName map; per-user timeouts for fallback cleanup
	let typingUsers = $state<Map<string, string>>(new Map());
	const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
	let typingStopTimer: ReturnType<typeof setTimeout> | null = null;

	// Pagination
	let loadingOlder = $state(false);
	let hasMoreMessages = $state(true);
	let oldestMessageId = $state<string | null>(null);
	let lastScrollCheckTime = 0;

	// Presence
	let userPresenceMap = $state<Map<string, boolean>>(new Map());

	// Editing
	let editingMsgId = $state<string | null>(null);
	let editingContent = $state('');
	let editSaving = $state(false);

	// Starring
	let starredMessageIds = $state<Set<string>>(new Set());

	// Send button fly-away animation
	let sendFlyActive = $state(false);

	// Voice recording
	let isRecording = $state(false);
	let recordingDuration = $state(0);
	let recordingTimer: ReturnType<typeof setInterval> | null = null;
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];

	// ─── Helpers ──────────────────────────────────────────────────────────────

	function isPending(m: ChatMessage): m is PendingMessage {
		return 'pending' in m && m.pending === true;
	}

	// Last non-pending message sent by the current user — used for group chat receipt display
	const lastOwnMessageId = $derived(
		[...messages].reverse().find((m) => m.senderId === currentUserId && !isPending(m))?.id ?? null
	);

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const isToday = d.toDateString() === new Date().toDateString();
		if (isToday) {
			return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		}
		// Older than today: full datetime "04/06/2026 4:32 PM"
		const datePart = d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
		const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		return `${datePart} ${timePart}`;
	}

	function getSenderLabel(m: ChatMessage): string {
		return m.senderDisplayName ?? m.senderUsername ?? 'Unknown';
	}

	function getTypingLabel(users: Map<string, string>): string {
		const names = Array.from(users.values());
		if (names.length === 0) return '';
		if (names.length === 1) return `${names[0]} is typing`;
		if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
		if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]} are typing`;
		return 'Several people are typing';
	}

	async function scrollToBottom(smooth = false) {
		await tick();
		if (scrollEl) {
			scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
		}
	}

	// ── Slash command detection ────────────────────────────────────────────────

	$effect(() => {
		const val = inputText;
		if (val.startsWith('/') && !val.includes(' ') && val.length > 0) {
			commandQuery = val.slice(1).toLowerCase();
			showCommandPicker = filteredCommands.length > 0;
			// Clamp selected index when list shrinks
			if (commandSelectedIndex >= filteredCommands.length) commandSelectedIndex = 0;
		} else {
			showCommandPicker = false;
			commandQuery = '';
			commandSelectedIndex = 0;
		}
	});

	function handleCommandSelect(commandName: string) {
		inputText = '';
		showCommandPicker = false;
		commandQuery = '';
		commandSelectedIndex = 0;
		if (commandName === 'poll') showPollBuilder = true;
	}

	// ── Poll creation ──────────────────────────────────────────────────────────

	async function handleCreatePoll(data: {
		question: string;
		options: string[];
		expiresAt?: string;
	}) {
		pollSubmitting = true;
		try {
			const res = await polls.create(chatId, data);
			// The confirmed message will arrive via message.new socket event
			// Optimistic insert not needed here — the server will broadcast it
			const _ = res; // suppress unused warning until backend is live
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to create poll.';
			setTimeout(() => (error = ''), 5000);
		} finally {
			pollSubmitting = false;
			showPollBuilder = false;
		}
	}

	// ── Poll voting ────────────────────────────────────────────────────────────

	async function handleVotePoll(pollId: string, optionIndex: number) {
		try {
			const updated = await polls.vote(pollId, optionIndex);
			// Update the poll metadata in the matching message
			messages = messages.map((m) => {
				if (m.type === 'poll' && (m.metadata as PollData | null)?.id === pollId) {
					return { ...m, metadata: updated as unknown as Record<string, unknown> };
				}
				return m;
			});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to record vote.';
			setTimeout(() => (error = ''), 4000);
		}
	}

	async function loadOlderMessages() {
		if (loadingOlder || !hasMoreMessages || !oldestMessageId) return;

		loadingOlder = true;
		try {
			const older = await chats.messages(chatId, { before: oldestMessageId, limit: 20 });
			if (older.length === 0) {
				hasMoreMessages = false;
			} else {
				// Save scroll height before prepending
				const previousScrollHeight = scrollEl?.scrollHeight || 0;
				// Prepend older messages
				messages = [...older, ...messages];
				oldestMessageId = older[0]?.id ?? oldestMessageId;
				// Restore scroll position to maintain visual position
				await tick();
				if (scrollEl) {
					const newScrollHeight = scrollEl.scrollHeight;
					const scrollDifference = newScrollHeight - previousScrollHeight;
					scrollEl.scrollTop += scrollDifference;
				}
			}
		} catch (err: unknown) {
			console.error('Failed to load older messages:', err);
		} finally {
			loadingOlder = false;
		}
	}

	function handleScroll() {
		const now = Date.now();
		// Debounce scroll check to avoid excessive calls
		if (now - lastScrollCheckTime < 300) return;
		lastScrollCheckTime = now;

		if (!scrollEl) return;

		// Check if scrolled to top
		if (scrollEl.scrollTop < 100) {
			loadOlderMessages();
		}

		// Check if scrolled to bottom
		const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 100;
		if (isAtBottom) {
			chats.markRead(chatId).catch(() => {});
		}
	}

	// ─── Load messages ────────────────────────────────────────────────────────

	$effect(() => {
		if (!browser) return;
		const id = chatId;
		const initialName = page.url.searchParams.get('name') ?? 'Chat';
		let cancelled = false;

		messages = [];
		loading = true;
		error = '';
		hasMoreMessages = true;
		oldestMessageId = null;
		pinnedMessageIds = new Set();

		(async () => {
			try {
				const [msgList, chatList, pinList] = await Promise.all([
					chats.messages(id),
					chats.list(),
					pins.list(id).catch(() => [] as Awaited<ReturnType<typeof pins.list>>),
					chats.markRead(id).catch(() => {})
				]);
				if (cancelled) return;
				messages = msgList;
				oldestMessageId = msgList.length > 0 ? msgList[0].id : null;
				pinnedMessageIds = new Set(pinList.map((p) => p.messageId));
				chatName = initialName;

				const chatSummary = chatList.find(c => c.id === id);
				if (chatSummary) {
					chatType = chatSummary.type;
					if (chatSummary.type === 'dm' && chatSummary.counterpartMemberId) {
						counterpartMemberId = chatSummary.counterpartMemberId;
						counterpartAvatarUrl = chatSummary.counterpartAvatarUrl ?? null;
					}
				}
			} catch (err: unknown) {
				if (cancelled) return;
				error = err instanceof Error ? err.message : 'Failed to load messages.';
			} finally {
				if (!cancelled) {
					loading = false;
					await scrollToBottom();
				}
			}
		})();

		return () => { cancelled = true; };
	});

	// ─── Socket events (from @penthouse/contracts/src/events.ts) ───────────────

	$effect(() => {
		const socket = socketStore.instance;
		if (!socket) return;

		// Backend wraps realtime events in { type, payload } envelopes.
		// presence.update and presence.sync are emitted raw (no envelope).

		function onMessageNew(envelope: { type: string; payload: Message }) {
			const message = envelope.payload;
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

		interface MessageAckPayload {
			clientMessageId: string;
			messageId: string;
			chatId: string;
			deliveredAt: string;
		}

		function onMessageAck(envelope: { type: string; payload: MessageAckPayload }) {
			const payload = envelope.payload;
			if (payload.chatId !== chatId) return;
			const idx = messages.findIndex((m) => m.clientMessageId === payload.clientMessageId);
			if (idx !== -1) {
				const prev = messages[idx] as any;
				messages[idx] = {
					...prev,
					id: payload.messageId,
					deliveredAt: payload.deliveredAt ?? prev.deliveredAt ?? null
				} as any;
			}
		}

		function onTypingUpdate(envelope: { type: string; payload: { chatId: string; userId: string; status: 'start' | 'stop'; displayName: string } }) {
			const { userId, status, displayName } = envelope.payload;
			if (userId === currentUserId) return;

			if (status === 'start') {
				typingUsers.set(userId, displayName);
				typingUsers = typingUsers; // trigger reactivity

				const existing = typingTimeouts.get(userId);
				if (existing) clearTimeout(existing);

				typingTimeouts.set(userId, setTimeout(() => {
					typingUsers.delete(userId);
					typingUsers = typingUsers;
					typingTimeouts.delete(userId);
				}, 3000));
			} else {
				typingUsers.delete(userId);
				typingUsers = typingUsers;
				const t = typingTimeouts.get(userId);
				if (t) { clearTimeout(t); typingTimeouts.delete(userId); }
			}
		}

		function onPresenceUpdate(payload: { userId: string; online: boolean }) {
			userPresenceMap.set(payload.userId, payload.online);
			userPresenceMap = userPresenceMap; // trigger reactivity
		}

		function onPresenceSync(payload: { [userId: string]: boolean }) {
			userPresenceMap = new Map(Object.entries(payload));
		}

		// HANDOFF: poll.voted fires after Codex wires backend
		function onPollVoted(envelope: { type: string; payload: { chatId: string; pollId: string; poll: PollData } }) {
			const { chatId: evtChatId, pollId, poll } = envelope.payload;
			if (evtChatId !== chatId) return;
			messages = messages.map((m) => {
				if (m.type === 'poll' && (m.metadata as PollData | null)?.id === pollId) {
					return { ...m, metadata: poll as unknown as Record<string, unknown> };
				}
				return m;
			});
		}

		type ReactionPayload = { chatId: string; messageId: string; userId: string; emoji: string; createdAt?: string };

		function onReactionAdd(envelope: { type: string; payload: ReactionPayload }) {
			const { chatId: evtChatId, messageId, userId, emoji } = envelope.payload;
			if (evtChatId !== chatId) return;
			messages = messages.map((m) => {
				if (m.id !== messageId) return m;
				const existing = m.reactions ?? [];
				const idx = existing.findIndex((r) => r.emoji === emoji);
				let updated: MessageReaction[];
				if (idx !== -1) {
					if (existing[idx].userIds.includes(userId)) return m; // already present
					updated = existing.map((r) =>
						r.emoji === emoji ? { ...r, userIds: [...r.userIds, userId] } : r
					);
				} else {
					updated = [...existing, { emoji, userIds: [userId] }];
				}
				return { ...m, reactions: updated };
			});
		}

		function onReactionRemove(envelope: { type: string; payload: ReactionPayload }) {
			const { chatId: evtChatId, messageId, userId, emoji } = envelope.payload;
			if (evtChatId !== chatId) return;
			messages = messages.map((m) => {
				if (m.id !== messageId) return m;
				const existing = m.reactions ?? [];
				const updated = existing
					.map((r) => (r.emoji === emoji ? { ...r, userIds: r.userIds.filter((id) => id !== userId) } : r))
					.filter((r) => r.userIds.length > 0);
				return { ...m, reactions: updated };
			});
		}

		type PinnedPayload = { chatId: string; messageId: string; pinnedByUserId?: string; pinnedAt?: string };

		function onMessagePinned(envelope: { type: string; payload: PinnedPayload }) {
			const { chatId: evtChatId, messageId } = envelope.payload;
			if (evtChatId !== chatId) return;
			pinnedMessageIds = new Set([...pinnedMessageIds, messageId]);
		}

		function onMessageUnpinned(envelope: { type: string; payload: { chatId: string; messageId: string } }) {
			const { chatId: evtChatId, messageId } = envelope.payload;
			if (evtChatId !== chatId) return;
			pinnedMessageIds = new Set([...pinnedMessageIds].filter((id) => id !== messageId));
		}

		function onMessageModerated(envelope: { type: string; payload: { chatId: string; messageId: string; message: Message } }) {
			const { chatId: evtChatId, message } = envelope.payload;
			if (evtChatId !== chatId) return;
			const idx = messages.findIndex((m) => m.id === message.id);
			if (idx !== -1) messages[idx] = message;
		}

		function onMessageEdited(envelope: { type: string; payload: { chatId: string; messageId: string; content: string; editedAt: string; editCount: number } }) {
			const { chatId: evtChatId, messageId, content, editedAt, editCount } = envelope.payload;
			if (evtChatId !== chatId) return;
			const idx = messages.findIndex((m) => m.id === messageId);
			if (idx !== -1) messages[idx] = { ...messages[idx], content, editedAt, editCount } as any;
		}

		function onMessageDeleted(envelope: { type: string; payload: { chatId: string; messageId: string; deletedAt: string; deletedByUserId: string } }) {
			const { chatId: evtChatId, messageId, deletedAt } = envelope.payload;
			if (evtChatId !== chatId) return;
			const idx = messages.findIndex((m) => m.id === messageId);
			if (idx !== -1) messages[idx] = { ...messages[idx], deletedAt, content: '' } as any;
		}

		socket.on('message.new', onMessageNew);
		socket.on('message.ack', onMessageAck);
		socket.on('typing.update', onTypingUpdate);
		socket.on('presence.update', onPresenceUpdate);
		socket.on('presence.sync', onPresenceSync);
		socket.on('poll.voted', onPollVoted);
		socket.on('reaction.add', onReactionAdd);
		socket.on('reaction.remove', onReactionRemove);
		socket.on('message.pinned', onMessagePinned);
		socket.on('message.unpinned', onMessageUnpinned);
		socket.on('message.moderated', onMessageModerated);
		socket.on('message.edited', onMessageEdited);
		socket.on('message.deleted', onMessageDeleted);

		return () => {
			socket.off('message.new', onMessageNew);
			socket.off('message.ack', onMessageAck);
			socket.off('typing.update', onTypingUpdate);
			socket.off('presence.update', onPresenceUpdate);
			socket.off('presence.sync', onPresenceSync);
			socket.off('poll.voted', onPollVoted);
			socket.off('reaction.add', onReactionAdd);
			socket.off('reaction.remove', onReactionRemove);
			socket.off('message.pinned', onMessagePinned);
			socket.off('message.unpinned', onMessageUnpinned);
			socket.off('message.moderated', onMessageModerated);
			socket.off('message.edited', onMessageEdited);
			socket.off('message.deleted', onMessageDeleted);
			if (typingStopTimer) clearTimeout(typingStopTimer);
			for (const t of typingTimeouts.values()) clearTimeout(t);
		};
	});

	onDestroy(() => {
		// mark read on exit (best-effort)
		chats.markRead(chatId).catch(() => {});
		// clear long-press timer if user navigates away mid-press
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	});

	// ─── Send ─────────────────────────────────────────────────────────────────

	async function handleSend() {
		const content = inputText.trim();
		if (!content || sending) return;

		sendFlyActive = true;
		setTimeout(() => { sendFlyActive = false; }, 300);

		const clientMessageId = crypto.randomUUID();
		inputText = '';
		sending = true;

		// Capture and clear reply target before sending
		const replyTarget = replyToMsg;
		replyToMsg = null;

		// Optimistic: append immediately
		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			senderDisplayName: sessionStore.current?.user.displayName,
			content,
			type: 'text',
			createdAt: new Date().toISOString(),
			clientMessageId,
			replyTo: replyTarget
				? {
						id: replyTarget.id,
						content: replyTarget.content,
						senderDisplayName: replyTarget.senderDisplayName ?? replyTarget.senderUsername ?? null
					}
				: undefined,
			pending: true
		};
		(optimistic as any).clientSendTime = Date.now();
		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const res = await chats.send(chatId, {
				chatId,
				content,
				type: 'text',
				clientMessageId,
				...(replyTarget ? { replyToMessageId: replyTarget.id } : {})
			});
			// Replace optimistic with confirmed message
			const idx = messages.findIndex((m) => m.clientMessageId === clientMessageId);
			if (idx !== -1) {
				messages[idx] = res.message;
			}
		} catch (err: unknown) {
			// Mark failed — remove optimistic and restore input + reply
			messages = messages.filter((m) => m.clientMessageId !== clientMessageId);
			inputText = content;
			replyToMsg = replyTarget;
			error = err instanceof Error ? err.message : 'Failed to send message.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Slash command picker intercepts navigation keys
		if (showCommandPicker && filteredCommands.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				commandSelectedIndex = Math.min(commandSelectedIndex + 1, filteredCommands.length - 1);
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				commandSelectedIndex = Math.max(commandSelectedIndex - 1, 0);
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				handleCommandSelect(filteredCommands[commandSelectedIndex].name);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				showCommandPicker = false;
				inputText = '';
				return;
			}
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
			emitTypingStop();
		} else {
			emitTypingStart();
		}
	}

	let typingStartTime = 0;

	function emitTypingStart() {
		const socket = socketStore.instance;
		if (!socket) return;

		// Reset inactivity stop timer on every keystroke
		if (typingStopTimer) clearTimeout(typingStopTimer);
		typingStopTimer = setTimeout(() => {
			emitTypingStop();
		}, 3000);

		const now = Date.now();
		if (now - typingStartTime < 1000) return; // throttle re-emits
		typingStartTime = now;
		socket.emit('typing.start', { chatId });
	}

	function emitTypingStop() {
		const socket = socketStore.instance;
		if (!socket) return;
		if (typingStopTimer) { clearTimeout(typingStopTimer); typingStopTimer = null; }
		socket.emit('typing.stop', { chatId });
		typingStartTime = 0;
	}

	// ─── GIF Picker ────────────────────────────────────────────────────────────

	async function handleSelectGif(gif: GifResult) {
		const clientMessageId = crypto.randomUUID();
		sending = true;

		// Optimistic: append immediately as GIF message
		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			content: gif.url, // Store the GIF URL in content for now
			type: 'gif',
			metadata: {
				url: gif.url,
				previewUrl: gif.previewUrl,
				width: gif.width,
				height: gif.height,
				title: gif.title
			},
			createdAt: new Date().toISOString(),
			clientMessageId,
			pending: true
		};
		(optimistic as any).clientSendTime = Date.now();
		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const res = await chats.send(chatId, {
				chatId,
				content: gif.url,
				type: 'gif',
				clientMessageId,
				metadata: {
					url: gif.url,
					previewUrl: gif.previewUrl,
					width: gif.width,
					height: gif.height,
					title: gif.title
				}
			});
			// Replace optimistic with confirmed message
			const idx = messages.findIndex((m) => m.clientMessageId === clientMessageId);
			if (idx !== -1) {
				messages[idx] = res.message;
			}
		} catch (err: unknown) {
			// Mark failed — remove optimistic
			messages = messages.filter((m) => m.clientMessageId !== clientMessageId);
			error = err instanceof Error ? err.message : 'Failed to send GIF.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			sending = false;
		}
	}

	// ── Media send ──────────────────────────────────────────────────────────────

	async function handleMediaSend(payload: MediaSendPayload) {
		sending = true;
		const clientMessageId = crypto.randomUUID();

		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			senderDisplayName: sessionStore.current?.user.displayName,
			content: payload.caption || '\u00A0',
			type: payload.primaryKind,
			metadata: {
				attachments: payload.attachments.map((a) => ({
					uploadId: a.uploadId,
					url: a.previewUrl,     // blob: URL for instant preview
					previewUrl: a.previewUrl,
					mediaKind: a.mediaKind,
					fileName: a.fileName,
					size: a.size
				}))
			},
			createdAt: new Date().toISOString(),
			clientMessageId,
			pending: true
		};
		(optimistic as any).clientSendTime = Date.now();

		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const res = await chats.send(chatId, {
				chatId,
				content: payload.caption || '\u00A0',
				type: payload.primaryKind,
				clientMessageId,
				metadata: {
					attachments: payload.attachments.map((a) => ({
						uploadId: a.uploadId,
						url: a.url,          // server /uploads/ path
						previewUrl: a.previewUrl,
						mediaKind: a.mediaKind,
						fileName: a.fileName,
						size: a.size
					}))
				}
			});
			// Replace optimistic with confirmed message
			const idx = messages.findIndex((m) => (m as any).clientMessageId === clientMessageId);
			if (idx !== -1) messages[idx] = res.message as any;
		} catch (err: unknown) {
			messages = messages.filter((m) => (m as any).clientMessageId !== clientMessageId);
			error = err instanceof Error ? err.message : 'Failed to send media.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			sending = false;
		}
	}

	function openFilePicker() {
		fileInputEl?.click();
	}

	function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const selected = Array.from(input.files ?? []);
		input.value = ''; // allow re-picking same file

		if (selected.length === 0) return;

		if (mediaFiles.length === 0) {
			// Initial pick — validate count and total size before mounting the composer
			const MAX = 10;
			if (selected.length > MAX) {
				error = 'Max 10 files per message';
				setTimeout(() => (error = ''), 3000);
				return;
			}
			const MAX_BYTES = 25 * 1024 * 1024;
			const totalSize = selected.reduce((s, f) => s + f.size, 0);
			if (totalSize > MAX_BYTES) {
				error = 'Total size exceeds 25 MB';
				setTimeout(() => (error = ''), 3000);
				return;
			}
			mediaFiles = selected;
		} else {
			// "Add More" path — appendFiles has the authoritative live-count guard
			mediaComposerEl?.appendFiles(selected);
		}
	}

	// ─── Long-press detection ─────────────────────────────────────────────────

	function startLongPress(msg: ChatMessage, e: PointerEvent) {
		if (isPending(msg)) return;
		longPressStartX = e.clientX;
		longPressStartY = e.clientY;
		longPressTimer = setTimeout(() => {
			longPressTimer = null;
			contextMenuMsg = msg as Message;
		}, 500);
	}

	function moveLongPress(e: PointerEvent) {
		if (!longPressTimer) return;
		const dx = e.clientX - longPressStartX;
		const dy = e.clientY - longPressStartY;
		if (Math.sqrt(dx * dx + dy * dy) > 10) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function endLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	// ─── Reactions ────────────────────────────────────────────────────────────

	async function handleReact(messageId: string, emoji: string) {
		const msgIdx = messages.findIndex((m) => m.id === messageId);
		if (msgIdx === -1) return;

		const msg = messages[msgIdx];
		const existing = msg.reactions ?? [];
		const rIdx = existing.findIndex((r) => r.emoji === emoji);
		const isRemoving = rIdx !== -1 && existing[rIdx].userIds.includes(currentUserId);

		// Optimistic update
		let newReactions: MessageReaction[];
		if (isRemoving) {
			newReactions = existing
				.map((r) => (r.emoji === emoji ? { ...r, userIds: r.userIds.filter((id) => id !== currentUserId) } : r))
				.filter((r) => r.userIds.length > 0);
		} else if (rIdx !== -1) {
			newReactions = existing.map((r) =>
				r.emoji === emoji ? { ...r, userIds: [...r.userIds, currentUserId] } : r
			);
		} else {
			newReactions = [...existing, { emoji, userIds: [currentUserId] }];
		}
		messages[msgIdx] = { ...msg, reactions: newReactions };

		try {
			if (isRemoving) {
				await reactions.remove(chatId, messageId, emoji);
			} else {
				await reactions.add(chatId, messageId, emoji);
			}
		} catch {
			// Revert on failure
			messages[msgIdx] = msg;
			error = 'Failed to update reaction.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	// ─── Delete message ───────────────────────────────────────────────────────

	async function handleDeleteMessage(messageId: string) {
		const msgIdx = messages.findIndex((m) => m.id === messageId);
		if (msgIdx === -1) return;

		const original = messages[msgIdx];
		const tombstone = { ...original, deletedAt: new Date().toISOString(), content: '' } as any;
		messages[msgIdx] = tombstone;

		try {
			await chats.deleteMessage(chatId, messageId);
		} catch {
			messages[msgIdx] = original;
			error = 'Failed to delete message.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	// ─── Edit message ─────────────────────────────────────────────────────────

	function startEditing(msg: Message) {
		editingMsgId = msg.id;
		editingContent = msg.content;
	}

	function cancelEdit() {
		editingMsgId = null;
		editingContent = '';
	}

	async function submitEdit() {
		if (!editingMsgId || !editingContent.trim() || editSaving) return;
		const msgId = editingMsgId;
		const content = editingContent.trim();
		const msgIdx = messages.findIndex((m) => m.id === msgId);
		if (msgIdx === -1) { cancelEdit(); return; }

		const original = messages[msgIdx];
		editSaving = true;
		messages[msgIdx] = { ...original, content, editedAt: new Date().toISOString() } as any;
		cancelEdit();

		try {
			const res = await chats.editMessage(chatId, msgId, content);
			messages[msgIdx] = { ...messages[msgIdx], ...res } as any;
		} catch {
			messages[msgIdx] = original;
			error = 'Failed to edit message.';
			setTimeout(() => (error = ''), 3000);
		} finally {
			editSaving = false;
		}
	}

	// ─── Star message ──────────────────────────────────────────────────────────

	async function handleStarMessage(messageId: string) {
		const isStarred = starredMessageIds.has(messageId);
		if (isStarred) {
			starredMessageIds = new Set([...starredMessageIds].filter((id) => id !== messageId));
		} else {
			starredMessageIds = new Set([...starredMessageIds, messageId]);
		}
		try {
			if (isStarred) {
				await chats.unstarMessage(chatId, messageId);
			} else {
				await chats.starMessage(chatId, messageId);
			}
		} catch {
			// Revert
			if (isStarred) {
				starredMessageIds = new Set([...starredMessageIds, messageId]);
			} else {
				starredMessageIds = new Set([...starredMessageIds].filter((id) => id !== messageId));
			}
			error = 'Failed to update star.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	// ─── Voice recording ──────────────────────────────────────────────────────

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioChunks = [];
			mediaRecorder = new MediaRecorder(stream);
			mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
			mediaRecorder.start();
			isRecording = true;
			recordingDuration = 0;
			recordingTimer = setInterval(() => { recordingDuration++; }, 1000);
		} catch {
			error = 'Microphone access denied.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	function stopRecording(): Promise<Blob> {
		return new Promise((resolve) => {
			if (!mediaRecorder) return;
			mediaRecorder.onstop = () => {
				const blob = new Blob(audioChunks, { type: 'audio/webm' });
				mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
				resolve(blob);
			};
			mediaRecorder.stop();
		});
	}

	async function finishRecording() {
		if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
		const duration = recordingDuration;
		isRecording = false;
		const blob = await stopRecording();
		await sendVoiceNote(blob, duration);
	}

	function cancelRecording() {
		if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
		if (mediaRecorder) {
			mediaRecorder.stream.getTracks().forEach((t) => t.stop());
			mediaRecorder = null;
		}
		isRecording = false;
		recordingDuration = 0;
		audioChunks = [];
	}

	async function sendVoiceNote(blob: Blob, durationSeconds: number) {
		sending = true;
		const clientMessageId = crypto.randomUUID();
		const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' });

		const optimistic: PendingMessage = {
			id: `pending-${clientMessageId}`,
			chatId,
			senderId: currentUserId,
			senderUsername: sessionStore.current?.user.username ?? undefined,
			senderDisplayName: sessionStore.current?.user.displayName,
			content: '',
			type: 'audio',
			metadata: { audioUrl: URL.createObjectURL(blob), durationSeconds },
			createdAt: new Date().toISOString(),
			clientMessageId,
			pending: true
		};
		(optimistic as any).clientSendTime = Date.now();
		messages.push(optimistic);
		await scrollToBottom(true);

		try {
			const { media } = await import('$services/api');
			const upload = await media.upload(file);
			const res = await chats.send(chatId, {
				chatId,
				content: '',
				type: 'audio',
				clientMessageId,
				metadata: { audioUploadId: upload.id, audioUrl: upload.url, durationSeconds }
			});
			const idx = messages.findIndex((m) => m.clientMessageId === clientMessageId);
			if (idx !== -1) messages[idx] = res.message;
		} catch (err: unknown) {
			messages = messages.filter((m) => m.clientMessageId !== clientMessageId);
			error = err instanceof Error ? err.message : 'Failed to send voice note.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			sending = false;
		}
	}

	// ─── Pin / Unpin ──────────────────────────────────────────────────────────

	async function handlePin(messageId: string) {
		try {
			await pins.add(chatId, messageId);
			pinnedMessageIds = new Set([...pinnedMessageIds, messageId]);
		} catch {
			error = 'Failed to pin message.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	async function handleUnpin(messageId: string) {
		try {
			await pins.remove(chatId, messageId);
			pinnedMessageIds = new Set([...pinnedMessageIds].filter((id) => id !== messageId));
		} catch {
			error = 'Failed to unpin message.';
			setTimeout(() => (error = ''), 3000);
		}
	}

	// ─── Copy text ────────────────────────────────────────────────────────────

	async function handleCopyText(content: string) {
		try {
			await navigator.clipboard.writeText(content);
		} catch {
			// Clipboard API unavailable — silently skip
		}
	}
</script>

<div class="thread-shell">
	<!-- Header -->
	<header class="thread-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back to chat list">
			<Icon name="arrow-left" size={20} />
		</button>
		{#if counterpartMemberId}
			<Avatar
				userId={counterpartMemberId}
				displayName={chatName}
				avatarUrl={counterpartAvatarUrl}
				size="sm"
				showPresence={true}
			/>
		{/if}
		<div class="header-content">
			<h2 class="thread-name">{chatName}</h2>
			<TypingIndicator label={getTypingLabel(typingUsers)} />
		</div>
		<span
			class="conn-dot"
			class:connected={connectionStatus === 'connected'}
			class:degraded={connectionStatus === 'connecting' || connectionStatus === 'degraded'}
			class:failed={connectionStatus === 'failed'}
			title={connectionStatus}
		></span>
	</header>

	<!-- Messages -->
	<div class="messages-scroll" bind:this={scrollEl} onscroll={handleScroll}>
		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if loadingOlder}
			<div class="state-msg">Loading older messages...</div>
		{:else if error && messages.length === 0}
			<div class="state-msg error">{error}</div>
		{:else if messages.length === 0}
			<div class="thread-empty">
				<div class="thread-empty-book">
					<span class="thread-empty-label">NO MESSAGES YET</span>
					<blockquote class="thread-empty-quote">Begin here.<br>Say something true.</blockquote>
				</div>
			</div>
		{:else}
			<div class="messages-inner">
				{#each messages as msg (msg.id)}
					{@const isMine = msg.senderId === currentUserId}
					{@const isHidden = msg.hidden === true}
					{@const isDeleted = !!(msg as any).deletedAt}
					{@const isEditing = editingMsgId === msg.id}

					<div class="msg-row" class:mine={isMine} class:theirs={!isMine}>
						{#if !isMine}
							<!-- Other user's message: avatar + bubble side by side -->
							<div class="theirs-layout">
								<div class="msg-avatar">
									<Avatar
										userId={msg.senderId}
										displayName={getSenderLabel(msg)}
										avatarUrl={msg.senderAvatarUrl ?? null}
										size="sm"
										showPresence={false}
									/>
								</div>
								<div class="msg-body">
									<span class="sender-name">{getSenderLabel(msg)}</span>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="bubble theirs"
										class:pending={isPending(msg)}
										class:hidden-msg={isHidden || isDeleted}
										class:gif-bubble={msg.type === 'gif'}
										onpointerdown={(e) => startLongPress(msg, e)}
										onpointermove={moveLongPress}
										onpointerup={endLongPress}
										onpointercancel={endLongPress}
									>
										{#if msg.replyTo && !isHidden && !isDeleted}
											<div class="reply-quote">
												<span class="reply-quote-sender">{msg.replyTo.senderDisplayName ?? 'Message'}</span>
												<span class="reply-quote-text">{msg.replyTo.content.length > 60 ? msg.replyTo.content.slice(0, 60) + '…' : msg.replyTo.content}</span>
											</div>
										{/if}
										{#if isHidden}
											<span class="tombstone">Message removed</span>
										{:else if isDeleted}
											<span class="tombstone">This message was deleted</span>
										{:else if msg.type === 'gif' && msg.metadata}
											{#if typeof msg.metadata?.previewUrl === 'string'}
												<img
													src={msg.metadata.previewUrl}
													alt={typeof msg.metadata?.title === 'string' ? msg.metadata.title : 'GIF'}
													class="gif-message"
													loading="lazy"
													style={typeof msg.metadata?.width === 'number' && typeof msg.metadata?.height === 'number'
														? `aspect-ratio: ${msg.metadata.width} / ${msg.metadata.height}`
														: undefined}
												/>
											{/if}
										{:else if msg.type === 'poll' && msg.metadata}
											<PollCard
												poll={msg.metadata as unknown as PollData}
												{currentUserId}
												onVote={(idx) => handleVotePoll((msg.metadata as unknown as PollData).id, idx)}
												isPending={isPending(msg)}
											/>
										{:else if msg.type === 'audio'}
											<MediaBubble message={msg as Message} />
										{:else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file') && msg.metadata?.attachments}
											<MediaBubble message={msg as Message} />
										{:else}
											{@html formatMessageContent(msg.content)}
											{#if (msg as any).editedAt}
												<span class="edited-label">edited</span>
											{/if}
										{/if}
									</div>
									{#if msg.reactions && msg.reactions.length > 0}
										<div class="reaction-bar theirs-reactions">
											{#each msg.reactions as reaction}
												<button
													class="reaction-pill"
													class:reacted={reaction.userIds.includes(currentUserId)}
													onclick={() => handleReact(msg.id, reaction.emoji)}
													aria-label="React with {reaction.emoji}"
												>
													{reaction.emoji} <span class="reaction-count">{reaction.userIds.length}</span>
												</button>
											{/each}
										</div>
									{/if}
									<span class="msg-meta">{formatTime(msg.createdAt)}</span>
								</div>
							</div>
						{:else}
							<!-- My message: bubble right-aligned -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							{#if isEditing}
								<div class="edit-area">
									<textarea
										class="edit-input"
										bind:value={editingContent}
										onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') cancelEdit(); }}
										rows="2"
										autofocus
									></textarea>
									<div class="edit-actions">
										<button class="edit-cancel-btn" onclick={cancelEdit}>Cancel</button>
										<button class="edit-save-btn" onclick={submitEdit} disabled={editSaving}>Save</button>
									</div>
								</div>
							{:else}
							<div
								class="bubble mine"
								class:pending={isPending(msg)}
								class:hidden-msg={isHidden || isDeleted}
								class:gif-bubble={msg.type === 'gif'}
								onpointerdown={(e) => startLongPress(msg, e)}
								onpointermove={moveLongPress}
								onpointerup={endLongPress}
								onpointercancel={endLongPress}
							>
								{#if msg.replyTo && !isHidden && !isDeleted}
									<div class="reply-quote mine-quote">
										<span class="reply-quote-sender">{msg.replyTo.senderDisplayName ?? 'Message'}</span>
										<span class="reply-quote-text">{msg.replyTo.content.length > 60 ? msg.replyTo.content.slice(0, 60) + '…' : msg.replyTo.content}</span>
									</div>
								{/if}
								{#if isHidden}
									<span class="tombstone">Message removed</span>
								{:else if isDeleted}
									<span class="tombstone">This message was deleted</span>
								{:else if msg.type === 'gif' && msg.metadata}
									{#if typeof msg.metadata?.previewUrl === 'string'}
										<img
											src={msg.metadata.previewUrl}
											alt={typeof msg.metadata?.title === 'string' ? msg.metadata.title : 'GIF'}
											class="gif-message"
											loading="lazy"
											style={typeof msg.metadata?.width === 'number' && typeof msg.metadata?.height === 'number'
												? `aspect-ratio: ${msg.metadata.width} / ${msg.metadata.height}`
												: undefined}
										/>
									{/if}
								{:else if msg.type === 'poll' && msg.metadata}
									<PollCard
										poll={msg.metadata as unknown as PollData}
										{currentUserId}
										onVote={(idx) => handleVotePoll((msg.metadata as unknown as PollData).id, idx)}
										isPending={isPending(msg)}
									/>
								{:else if msg.type === 'audio'}
									<MediaBubble message={msg as Message} />
								{:else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file') && msg.metadata?.attachments}
									<MediaBubble message={msg as Message} />
								{:else}
									{@html formatMessageContent(msg.content)}
									{#if (msg as any).editedAt}
										<span class="edited-label">edited</span>
									{/if}
								{/if}
							</div>
							{/if}
							{#if msg.reactions && msg.reactions.length > 0}
								<div class="reaction-bar mine-reactions">
									{#each msg.reactions as reaction}
										<button
											class="reaction-pill"
											class:reacted={reaction.userIds.includes(currentUserId)}
											onclick={() => handleReact(msg.id, reaction.emoji)}
											aria-label="React with {reaction.emoji}"
										>
											{reaction.emoji} <span class="reaction-count">{reaction.userIds.length}</span>
										</button>
									{/each}
								</div>
							{/if}
							<span class="msg-meta">
								{formatTime(msg.createdAt)}
								{#if isPending(msg)}
									<span class="send-status pending-dot" title="Sending"></span>
								{:else}
									<Icon name="check" size={11} class="send-status sent-check" />
								{/if}
							</span>
							<ReadReceipts
									messageId={msg.id}
									{chatId}
									isSentByMe={msg.senderId === currentUserId}
									isPending={isPending(msg)}
									deliveredAt={(msg as any).deliveredAt}
									clientSendTime={(msg as any).clientSendTime}
									isLastOwnMessage={chatType !== 'dm' ? msg.id === lastOwnMessageId : true}
								/>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Send error toast -->
	{#if error && messages.length > 0}
		<div class="send-error">{error}</div>
	{/if}

	<!-- Composer area (command picker + reply bar + input) -->
	<div class="composer-area">
		{#if mediaFiles.length > 0}
			<MediaComposer
				bind:this={mediaComposerEl}
				initialFiles={mediaFiles}
				onSend={async (payload) => { await handleMediaSend(payload); mediaFiles = []; }}
				onCancel={() => (mediaFiles = [])}
				onAddMore={openFilePicker}
			/>
		{:else if isRecording}
			<div class="composer recording-bar">
				<span class="recording-dot"></span>
				<span class="recording-timer">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
				<span class="recording-label">Recording...</span>
				<button class="composer-btn" onclick={cancelRecording} aria-label="Cancel recording" title="Cancel">
					<Icon name="close" size={18} />
				</button>
				<button class="composer-btn" onclick={finishRecording} aria-label="Send voice note">
					<Icon name="send" size={16} />
				</button>
			</div>
		{:else}
			{#if showCommandPicker && filteredCommands.length > 0}
				<CommandPicker
					commands={filteredCommands}
					selectedIndex={commandSelectedIndex}
					onSelect={handleCommandSelect}
					onHover={(i) => (commandSelectedIndex = i)}
				/>
			{/if}

			{#if replyToMsg}
				<ReplyBar message={replyToMsg} onDismiss={() => (replyToMsg = null)} />
			{/if}

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
					class="composer-btn attach-btn"
					onclick={openFilePicker}
					disabled={sending}
					aria-label="Attach files"
					title="Attach files"
				>
					<Icon name="paperclip" size={18} />
				</button>
				<button
					class="composer-btn gif-btn"
					onclick={() => (showGifPicker = true)}
					disabled={sending}
					aria-label="Send a GIF"
					title="GIF"
				>
					<Icon name="gif" size={18} />
				</button>
				{#if !inputText.trim()}
					<button
						class="composer-btn mic-btn"
						onclick={startRecording}
						disabled={sending}
						aria-label="Record voice note"
						title="Voice note"
					>
						<Icon name="mic" size={18} />
					</button>
				{:else}
					<button
						class="send-btn"
						class:fly={sendFlyActive}
						onclick={handleSend}
						disabled={!inputText.trim() || sending}
						aria-label="Send message"
					>
						<Icon name="send" size={16} />
					</button>
				{/if}
			</div>
		{/if}

		<input
			type="file"
			bind:this={fileInputEl}
			accept="image/*,video/*,.pdf,.txt,.md,.json,.csv,.log,.yaml,.yml,.xml"
			multiple
			onchange={handleFileInputChange}
			style="display:none"
			aria-hidden="true"
		/>
	</div>

	<!-- GIF Picker Modal -->
	{#if showGifPicker}
		<GifPicker onSelect={handleSelectGif} onClose={() => (showGifPicker = false)} />
	{/if}

	<!-- Poll Builder Modal -->
	{#if showPollBuilder}
		<PollBuilder
			onSubmit={handleCreatePoll}
			onClose={() => (showPollBuilder = false)}
			submitting={pollSubmitting}
		/>
	{/if}

	<!-- Message context menu (long-press) -->
	{#if contextMenuMsg}
		<MessageContextMenu
			message={contextMenuMsg}
			{currentUserId}
			isPinned={pinnedMessageIds.has(contextMenuMsg.id)}
			isStarred={starredMessageIds.has(contextMenuMsg.id)}
			onReact={(emoji) => handleReact(contextMenuMsg!.id, emoji)}
			onReply={() => { replyToMsg = contextMenuMsg; }}
			onCopy={() => handleCopyText(contextMenuMsg!.content)}
			onPin={() => handlePin(contextMenuMsg!.id)}
			onUnpin={() => handleUnpin(contextMenuMsg!.id)}
			onDelete={() => handleDeleteMessage(contextMenuMsg!.id)}
			onEdit={() => startEditing(contextMenuMsg!)}
			onStar={() => handleStarMessage(contextMenuMsg!.id)}
			onClose={() => (contextMenuMsg = null)}
		/>
	{/if}
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
		background: rgba(18, 18, 28, 0.80);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		flex-shrink: 0;
	}

	.back-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-accent);
		padding: 0;
		border-radius: var(--radius-pill);
		transition: background 0.15s;
		flex-shrink: 0;
		text-shadow: none;
	}

	.back-btn:hover {
		background: var(--color-accent-dim);
	}

	.conn-dot {
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		background: var(--color-text-secondary);
		opacity: 0.35;
		flex-shrink: 0;
		transition: background 0.3s, opacity 0.3s;
	}

	.conn-dot.connected { background: var(--color-success); opacity: 1; }
	.conn-dot.degraded  { background: #f59e0b; opacity: 1; }
	.conn-dot.failed    { background: var(--color-danger); opacity: 1; }

	.header-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.thread-name {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	/* ── Messages ── */
	.messages-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--space-4) var(--space-4) var(--space-2);
		/* display:flex makes margin-top:auto on .messages-inner push content to bottom,
		   so the view starts at the newest message without JS scroll in compact mode */
		display: flex;
		flex-direction: column;
	}

	.messages-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: auto; /* stick messages to the bottom of the scroll container */
	}

	:global([data-density='compact']) .messages-inner {
		gap: var(--space-1);
	}

	.msg-row {
		display: flex;
		flex-direction: column;
	}

	.msg-row.mine {
		align-self: flex-end;
		align-items: flex-end;
		max-width: 80%;
	}

	.msg-row.theirs {
		align-self: flex-start;
		max-width: 85%;
	}

	/* Theirs: avatar + bubble side by side */
	.theirs-layout {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.msg-avatar {
		flex-shrink: 0;
		margin-top: 18px; /* align with bubble, below sender-name */
	}

	.msg-body {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.sender-name {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-bottom: 3px;
		padding-left: var(--space-1);
		font-weight: 500;
	}

	.bubble {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		line-height: 1.5;
		word-break: break-word;
		overflow-wrap: anywhere; /* break long URLs that have no spaces */
		white-space: pre-wrap;
		max-width: 100%; /* never exceed the msg-row max-width */
	}

	.bubble.mine {
		background: var(--color-surface-elevated);
		color: var(--color-text-primary);
		border-left: 2px solid rgba(112, 112, 218, 0.4);
		border-bottom-right-radius: var(--radius-sm);
	}

	.bubble.theirs {
		background: var(--color-surface);
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

	:global(.send-status) {
		color: var(--color-success);
	}

	.pending-dot {
		width: 5px;
		height: 5px;
		border-radius: var(--radius-full);
		background: var(--color-text-secondary);
		opacity: 0.5;
		animation: pulse 1s ease-in-out infinite;
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

	/* ── Composer area ── */
	.composer-area {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}

	/* ── Composer ── */
	.composer {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: transparent;
	}

	.composer-input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		color: var(--color-text-primary);
		padding: var(--space-2) var(--space-1) var(--space-2) 0;
		resize: none;
		max-height: 120px;
		overflow-y: auto;
		line-height: 1.5;
		outline: none;
		transition: border-color 0.2s;
	}

	.composer-input:focus {
		border-color: var(--color-accent);
	}

	.send-btn {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		color: #fff;
		border: none;
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

	.send-btn.fly {
		animation: send-fly 0.25s cubic-bezier(0.4, 0, 1, 1) both;
	}

	@keyframes send-fly {
		0%   { transform: scale(1) translate(0, 0); opacity: 1; }
		100% { transform: scale(0.6) translate(8px, -8px); opacity: 0; }
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

	/* ── Thread empty state (Left-Aligned Book) ── */
	.thread-empty {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 0 var(--space-8);
	}

	.thread-empty-book {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 280px;
	}

	.thread-empty-label {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: var(--weight-medium);
		letter-spacing: 0.12em;
		color: var(--color-text-secondary);
		opacity: 0.5;
	}

	.thread-empty-quote {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-lg);
		line-height: 1.45;
		background: linear-gradient(180deg, var(--color-text-primary) 40%, transparent 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	/* ── GIF Message ── */
	.bubble.gif-bubble {
		padding: 0;
		overflow: hidden;
	}

	.gif-message {
		width: 100%;
		max-width: 240px;
		height: auto;
		display: block;
		object-fit: contain;
		border-radius: var(--radius-md);
	}

	/* ── Reply quote (inside bubble) ── */
	.reply-quote {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-2) var(--space-2);
		margin-bottom: var(--space-2);
		background: rgba(0, 0, 0, 0.18);
		border-left: 2px solid rgba(255, 255, 255, 0.4);
		border-radius: var(--radius-sm);
		min-width: 0;
	}

	.bubble.mine .reply-quote {
		border-left-color: rgba(112, 112, 218, 0.5);
		background: rgba(0, 0, 0, 0.2);
	}

	.reply-quote-sender {
		font-size: var(--text-xs);
		font-weight: 700;
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reply-quote-text {
		font-size: var(--text-xs);
		opacity: 0.7;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Reaction bar ── */
	.reaction-bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: 3px;
	}

	.mine-reactions {
		justify-content: flex-end;
	}

	.reaction-pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		font-size: 13px;
		line-height: 1;
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s;
		-webkit-tap-highlight-color: transparent;
	}

	.reaction-pill:active {
		transform: scale(0.92);
	}

	.reaction-pill.reacted {
		background: var(--color-accent-dim);
		border-color: var(--color-accent);
	}

	.reaction-count {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}

	.reaction-pill.reacted .reaction-count {
		color: var(--color-accent);
	}

	/* ── Composer Buttons ── */
	.composer-btn {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--color-surface-glass);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--color-text-secondary);
		border: 1px solid rgba(255, 255, 255, 0.05);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
		cursor: pointer;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.composer-btn:hover:not(:disabled) {
		background: var(--color-accent-dim);
		color: var(--color-accent);
	}

	.composer-btn:disabled {
		opacity: 0.35;
		pointer-events: none;
	}

	/* ── Edit area ── */
	.edit-area {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		align-self: flex-end;
		width: 100%;
		max-width: 80%;
	}

	.edit-input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		color: var(--color-text-primary);
		padding: var(--space-2) 0;
		resize: none;
		line-height: 1.5;
		outline: none;
		font-size: var(--text-sm);
		font-family: var(--font-sans);
		transition: border-color 0.2s;
	}

	.edit-input:focus {
		border-bottom-color: var(--color-accent);
	}

	.edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.edit-cancel-btn, .edit-save-btn {
		padding: 4px 12px;
		font-size: var(--text-xs);
		border-radius: var(--radius-pill);
		border: none;
		cursor: pointer;
		font-family: var(--font-sans);
	}

	.edit-cancel-btn {
		background: rgba(255, 255, 255, 0.08);
		color: var(--color-text-secondary);
	}

	.edit-save-btn {
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}

	.edit-save-btn:disabled { opacity: 0.5; }

	/* ── Edited label ── */
	.edited-label {
		font-size: 10px;
		color: var(--color-text-secondary);
		opacity: 0.65;
		margin-left: 4px;
		font-style: italic;
	}

	/* ── Recording bar ── */
	.recording-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
		background: transparent;
	}

	.recording-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-danger);
		animation: pulse 1s ease-in-out infinite;
		flex-shrink: 0;
	}

	.recording-timer {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-danger);
		font-variant-numeric: tabular-nums;
	}

	.recording-label {
		flex: 1;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	/* ── Desktop: fill the right pane instead of full viewport ── */
	@media (hover: hover) and (pointer: fine) {
		.thread-shell {
			height: 100%;
		}

		/* Back button has no meaning when both panes are always visible */
		.back-btn {
			display: none;
		}
	}
</style>
