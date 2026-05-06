import { io, type Socket } from 'socket.io-client';
import { env } from '$env/dynamic/public';
import { sessionStore } from './session.svelte';
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
	ServerChatSyncRequiredEvent
} from '@penthouse/contracts';

type SocketState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'failed';

const SOCKET_URL = env.PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
const RECONNECTION_ATTEMPTS = 10;

function createSocketStore() {
	let socket = $state<Socket | null>(null);
	let state = $state<SocketState>('idle');
	let error = $state<string | null>(null);

	// Auto-connect when authenticated, disconnect on logout
	$effect(() => {
		const token = sessionStore.accessToken;
		if (token && state === 'idle') {
			connect(token);
		} else if (!token && socket) {
			disconnect();
		}
	});

	function connect(accessToken: string) {
		if (socket?.connected) return;

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

	return {
		get instance() { return socket; },
		get state() { return state; },
		get error() { return error; },
		get isConnected() { return state === 'connected'; },
		connect,
		disconnect,
		emit,
		on
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
