import type { AuthResponse, AuthUser } from '@penthouse/contracts';

type Session = AuthResponse | null;

function loadPersistedSession(): Session {
	if (typeof window === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem('penthouse_session');
		return raw ? (JSON.parse(raw) as Session) : null;
	} catch {
		return null;
	}
}

function createSessionStore() {
	let session = $state<Session>(loadPersistedSession());

	function persist(value: Session) {
		if (typeof window === 'undefined') return;
		if (value) {
			sessionStorage.setItem('penthouse_session', JSON.stringify(value));
		} else {
			sessionStorage.removeItem('penthouse_session');
		}
	}

	return {
		get current() { return session; },
		get user() { return session?.user ?? null; },
		get accessToken() { return session?.accessToken ?? null; },
		get refreshToken() { return session?.refreshToken ?? null; },
		get isAuthenticated() { return session !== null; },
		set(value: Session) {
			session = value;
			persist(value);
		},
		clear() {
			session = null;
			persist(null);
		},
		updateUser(partial: Partial<AuthUser>) {
			if (!session) return;
			session = { ...session, user: { ...session.user, ...partial } };
			persist(session);
		}
	};
}

export const sessionStore = createSessionStore();
