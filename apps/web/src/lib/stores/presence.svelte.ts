import { onPresenceSync, onPresenceUpdate } from '$stores/socket.svelte';

type PresenceState = 'available' | 'busy' | 'dnd' | 'afk' | 'offline';

type UserPresence = {
	state: PresenceState;
	note?: string;
	lastSeenAt?: string;
};

function createPresenceStore() {
	let map = $state<Record<string, UserPresence>>({});
	let initialized = false;

	function init() {
		if (initialized) return () => {};
		initialized = true;

		const unsubs = [
			onPresenceSync((sync) => {
				const merged = { ...map };
				for (const [userId, data] of Object.entries(sync)) {
					merged[userId] = {
						state: data.state,
						note: data.note,
						lastSeenAt: data.lastSeenAt
					};
				}
				map = merged;
			}),
			onPresenceUpdate((update) => {
				map = {
					...map,
					[update.userId]: {
						state: update.state,
						note: update.note,
						lastSeenAt: update.timestamp
					}
				};
			})
		];

		return () => {
			unsubs.forEach((u) => u());
			initialized = false;
		};
	}

	function get(userId: string): UserPresence | undefined {
		return map[userId];
	}

	function presenceColor(state: PresenceState | undefined): string {
		switch (state) {
			case 'available':
				return 'var(--p-success)';
			case 'busy':
			case 'dnd':
				return 'var(--p-error)';
			case 'afk':
				return 'var(--p-warning)';
			default:
				return 'var(--p-muted)';
		}
	}

	function presenceLabel(state: PresenceState | undefined, note?: string): string {
		if (note) return note;
		if (!state || state === 'offline') return 'Offline';
		return state.charAt(0).toUpperCase() + state.slice(1);
	}

	return {
		init,
		get,
		presenceColor,
		presenceLabel
	};
}

export const presenceStore = createPresenceStore();
