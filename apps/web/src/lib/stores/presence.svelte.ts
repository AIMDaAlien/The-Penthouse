/**
 * Presence store — tracks current user's online/offline status + all users' presence.
 * OWNED BY: Claude (apps/web)
 * - Self: 60s inactivity timer, emits presence.update socket event
 * - Others: updated via presence.sync (on connect) and presence.update (on changes)
 */

import { socketStore } from './socket.svelte';

function createPresenceStore() {
	// Current user's online state
	let isOnline = $state(true);
	let inactivityTimer: NodeJS.Timeout | null = null;
	const INACTIVITY_TIMEOUT = 60000; // 60 seconds

	// All users' presence (including self)
	let userPresenceMap = $state<Map<string, boolean>>(new Map());

	function resetInactivityTimer() {
		if (inactivityTimer) clearTimeout(inactivityTimer);

		if (!isOnline) {
			setOnline(true);
		}

		inactivityTimer = setTimeout(() => {
			setOnline(false);
		}, INACTIVITY_TIMEOUT);
	}

	function setOnline(online: boolean) {
		if (isOnline === online) return;

		isOnline = online;
		const socket = socketStore.instance;
		if (socket) {
			socket.emit('presence.update', { online });
		}
	}

	function initializeSocketListeners() {
		const socket = socketStore.instance;
		if (!socket) return;

		// Initialize presence from sync event (all users' status)
		socket.on('presence.sync', (payload: { [userId: string]: boolean }) => {
			userPresenceMap = new Map(Object.entries(payload));
		});

		// Update individual user's presence
		socket.on('presence.update', (payload: { userId: string; online: boolean }) => {
			const nextMap = new Map(userPresenceMap);
			nextMap.set(payload.userId, payload.online);
			userPresenceMap = nextMap; // trigger reactivity
		});
	}

	// Listen for activity
	if (typeof window !== 'undefined') {
		const events = ['mousemove', 'keydown', 'touchstart'];
		const handleActivity = () => resetInactivityTimer();

		events.forEach(event => {
			window.addEventListener(event, handleActivity);
		});

		// Initial setup
		resetInactivityTimer();

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			events.forEach(event => {
				window.removeEventListener(event, handleActivity);
			});
			if (inactivityTimer) clearTimeout(inactivityTimer);
		});
	}

	return {
		get isOnline() {
			return isOnline;
		},
		setOnline,
		get userPresenceMap() {
			return userPresenceMap;
		},
		initializeSocketListeners
	};
}

export const presenceStore = createPresenceStore();
