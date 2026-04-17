/**
 * Session store — holds the authenticated user state.
 * Persisted to sessionStorage so a page refresh doesn't force re-login.
 * OWNED BY: Claude (apps/web)
 */
import type { AuthResponse } from '@penthouse/contracts';

type Session = AuthResponse | null;

function createSessionStore() {
	let session = $state<Session>(loadPersistedSession());

	function loadPersistedSession(): Session {
		if (typeof window === 'undefined') return null;
		try {
			const raw = sessionStorage.getItem('penthouse_session');
			return raw ? (JSON.parse(raw) as Session) : null;
		} catch {
			return null;
		}
	}

	function set(value: Session) {
		session = value;
		if (typeof window === 'undefined') return;
		if (value) {
			sessionStorage.setItem('penthouse_session', JSON.stringify(value));
		} else {
			sessionStorage.removeItem('penthouse_session');
		}
	}

	function clear() {
		set(null);
	}

	return {
		get current() {
			return session;
		},
		get isAuthenticated() {
			return session !== null;
		},
		get accessToken() {
			return session?.accessToken ?? null;
		},
		set,
		clear
	};
}

export const sessionStore = createSessionStore();
