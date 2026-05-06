import type { AuthUser, AuthResponse } from '@penthouse/contracts';

function createSessionStore() {
	let user = $state<AuthUser | null>(null);
	let accessToken = $state<string | null>(null);
	let loading = $state(true);

	return {
		get user() { return user; },
		get accessToken() { return accessToken; },
		get isAuthenticated() { return user !== null && accessToken !== null; },
		get loading() { return loading; },
		setAuth(response: AuthResponse) {
			user = response.user;
			accessToken = response.accessToken;
		},
		clear() {
			user = null;
			accessToken = null;
		},
		setLoading(value: boolean) {
			loading = value;
		}
	};
}

export const session = createSessionStore();
