/**
 * Socket store — single Socket.IO connection lifecycle.
 * Connect on login, disconnect on logout.
 * OWNED BY: Claude (apps/web)
 */
import { io, type Socket } from 'socket.io-client';
import { PUBLIC_SOCKET_URL } from '$env/static/public';

type SocketState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'failed';

function createSocketStore() {
	let socket = $state<Socket | null>(null);
	let state = $state<SocketState>('idle');

	function connect(accessToken: string) {
		if (socket?.connected) return;

		state = 'connecting';
		const s = io(PUBLIC_SOCKET_URL, {
			auth: { token: accessToken },
			transports: ['websocket', 'polling'],
			reconnectionAttempts: 10,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 15000
		});

		s.on('connect', () => {
			state = 'connected';
		});

		s.on('disconnect', (reason) => {
			if (reason === 'io server disconnect') {
				// Server closed the connection intentionally (e.g. token expired)
				state = 'failed';
			} else {
				state = 'degraded';
			}
		});

		s.on('connect_error', () => {
			state = 'degraded';
		});

		socket = s;
	}

	function disconnect() {
		socket?.disconnect();
		socket = null;
		state = 'idle';
	}

	return {
		get instance() {
			return socket;
		},
		get state() {
			return state;
		},
		get isConnected() {
			return state === 'connected';
		},
		connect,
		disconnect
	};
}

export const socketStore = createSocketStore();
