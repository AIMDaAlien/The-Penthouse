import { io, type Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';
import type {
	ClientMessageSendEvent,
	ServerMessageNewEvent,
	ServerMessageAckEvent,
	ServerMessageReadEvent,
	ServerMessageEditedEvent,
	ServerMessageDeletedEvent,
	ServerReactionAddEvent,
	ServerReactionRemoveEvent,
	ServerTypingUpdateEvent,
	ServerPresenceUpdateEvent,
	ServerPresenceSyncEvent,
	ServerChatSyncRequiredEvent,
	ServerMessagePinnedEvent,
	ServerMessageUnpinnedEvent
} from '@penthouse/contracts';

type SocketState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'failed';
type PresenceState = 'available' | 'busy' | 'dnd' | 'afk' | 'offline';

const SOCKET_URL = env.PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
const RECONNECTION_ATTEMPTS = 10;
const AFK_TIMEOUT_MS = 5 * 60 * 1000;

function createSocketStore() {
	let socket = $state<Socket | null>(null);
	let state = $state<SocketState>('idle');
	let error = $state<string | null>(null);
	let presenceState = $state<PresenceState>('available');
	let presenceNote = $state('');
	let autoAfkEnabled = $state(true);
	let isAutoAfk = false;
	let basePresenceState: Exclude<PresenceState, 'afk'> = 'available';
	let idleTimer: ReturnType<typeof setTimeout> | null = null;

	// Note: auto-connect/disconnect logic lives in +layout.svelte
	// because $effect can only run inside components, not at module level

	function connect(accessToken: string) {
		if (socket?.connected || state === 'connecting') return;

		state = 'connecting';
		error = null;

		const s = io(SOCKET_URL, {
			auth: { token: accessToken },
			transports: ['websocket', 'polling'],
			reconnectionAttempts: RECONNECTION_ATTEMPTS,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 15000
		});

		s.on('connect', () => {
			state = 'connected';
			error = null;
		});

		s.on('disconnect', (reason) => {
			if (reason === 'io server disconnect') {
				state = 'failed';
			} else {
				state = 'degraded';
			}
		});

		s.on('connect_error', (err) => {
			if (err.message === 'AUTH_INVALID') {
				state = 'failed';
				error = 'AUTH_INVALID';
			} else {
				state = 'degraded';
				error = err.message;
			}
		});

		socket = s;
	}

	function disconnect() {
		socket?.disconnect();
		socket = null;
		state = 'idle';
		error = null;
	}

	function emit<T>(event: string, payload: T) {
		socket?.emit(event, payload);
	}

	function on<T>(event: string, handler: (data: T) => void) {
		socket?.on(event, handler);
		return () => socket?.off(event, handler);
	}

	function setPresence(newState: PresenceState, note?: string, options: { automatic?: boolean } = {}) {
		if (!options.automatic) {
			isAutoAfk = false;
			if (newState !== 'afk') {
				basePresenceState = newState;
			}
		}
		presenceState = newState;
		if (note !== undefined) presenceNote = note;
		emit('presence.update', { state: newState, ...(note ? { note } : {}) });
	}

	function setAutoAfkEnabled(enabled: boolean) {
		autoAfkEnabled = enabled;
		if (!enabled && isAutoAfk) {
			isAutoAfk = false;
			setPresence(basePresenceState, undefined, { automatic: true });
		}
	}

	// AFK auto-detection
	if (typeof document !== 'undefined') {
		function goAfk() {
			if (autoAfkEnabled && !isAutoAfk && presenceState !== 'offline' && presenceState !== 'afk') {
				basePresenceState = presenceState;
				isAutoAfk = true;
				setPresence('afk', undefined, { automatic: true });
			}
		}

		function onActivity() {
			if (autoAfkEnabled && isAutoAfk) {
				isAutoAfk = false;
				setPresence(basePresenceState, undefined, { automatic: true });
			}
			resetIdleTimer();
		}

		function resetIdleTimer() {
			if (idleTimer) clearTimeout(idleTimer);
			idleTimer = setTimeout(goAfk, AFK_TIMEOUT_MS);
		}

		const activityEvents = ['mousemove', 'keydown', 'touchstart'];
		activityEvents.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));

		document.addEventListener('visibilitychange', () => {
			if (!autoAfkEnabled) return;
			if (document.hidden) {
				if (!isAutoAfk && presenceState !== 'offline' && presenceState !== 'afk') {
					basePresenceState = presenceState;
					isAutoAfk = true;
					setPresence('afk', undefined, { automatic: true });
				}
				if (idleTimer) clearTimeout(idleTimer);
			} else {
				if (isAutoAfk) {
					isAutoAfk = false;
					setPresence(basePresenceState, undefined, { automatic: true });
				}
				resetIdleTimer();
			}
		});

		resetIdleTimer();
	}

	return {
		get instance() { return socket; },
		get state() { return state; },
		get error() { return error; },
		get isConnected() { return state === 'connected'; },
		get presenceState() { return presenceState; },
		get presenceNote() { return presenceNote; },
		get autoAfkEnabled() { return autoAfkEnabled; },
		set autoAfkEnabled(v: boolean) { setAutoAfkEnabled(v); },
		connect,
		disconnect,
		emit,
		on,
		setPresence
	};
}

export const socketStore = createSocketStore();

// Typed event helpers
export function onMessageNew(handler: (data: ServerMessageNewEvent) => void) {
	return socketStore.on<ServerMessageNewEvent>('message.new', handler);
}

export function onMessageAck(handler: (data: ServerMessageAckEvent) => void) {
	return socketStore.on<ServerMessageAckEvent>('message.ack', handler);
}

export function onMessageRead(handler: (data: ServerMessageReadEvent) => void) {
	return socketStore.on<ServerMessageReadEvent>('message.read', handler);
}

export function onMessageEdited(handler: (data: ServerMessageEditedEvent) => void) {
	return socketStore.on<ServerMessageEditedEvent>('message.edited', handler);
}

export function onTypingUpdate(handler: (data: ServerTypingUpdateEvent) => void) {
	return socketStore.on<ServerTypingUpdateEvent>('typing.update', handler);
}

export function onMessageDeleted(handler: (data: ServerMessageDeletedEvent) => void) {
	return socketStore.on<ServerMessageDeletedEvent>('message.deleted', handler);
}

export function onReactionAdd(handler: (data: ServerReactionAddEvent) => void) {
	return socketStore.on<ServerReactionAddEvent>('reaction.add', handler);
}

export function onReactionRemove(handler: (data: ServerReactionRemoveEvent) => void) {
	return socketStore.on<ServerReactionRemoveEvent>('reaction.remove', handler);
}

export function onChatSyncRequired(handler: (data: ServerChatSyncRequiredEvent) => void) {
	return socketStore.on<ServerChatSyncRequiredEvent>('chat.sync_required', handler);
}

export function onMessagePinned(handler: (data: ServerMessagePinnedEvent) => void) {
	return socketStore.on<ServerMessagePinnedEvent>('message.pinned', handler);
}

export function onMessageUnpinned(handler: (data: ServerMessageUnpinnedEvent) => void) {
	return socketStore.on<ServerMessageUnpinnedEvent>('message.unpinned', handler);
}

export function onPresenceUpdate(handler: (data: ServerPresenceUpdateEvent) => void) {
	return socketStore.on<ServerPresenceUpdateEvent>('presence.update', handler);
}

export function onPresenceSync(handler: (data: ServerPresenceSyncEvent) => void) {
	return socketStore.on<ServerPresenceSyncEvent>('presence.sync', handler);
}

export function updatePresence(state: PresenceState, note?: string) {
	socketStore.setPresence(state, note);
}

export function sendMessage(payload: Omit<ClientMessageSendEvent, 'type'>) {
	socketStore.emit('message.send', payload);
}

export function joinChat(chatId: string) {
	socketStore.emit('chat.join', { chatId });
}

export function leaveChat(chatId: string) {
	socketStore.emit('chat.leave', { chatId });
}

export function typingStart(chatId: string) {
	socketStore.emit('typing.start', { chatId });
}

export function typingStop(chatId: string) {
	socketStore.emit('typing.stop', { chatId });
}

export function joinPresence() {
	socketStore.emit('presence.join', {});
}
