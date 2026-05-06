import { env } from '$env/dynamic/public';
import { sessionStore } from '$stores/session.svelte';
import type { AuthResponse } from '@penthouse/contracts';

const API_BASE = env.PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

// Deduplicate concurrent token refreshes
let _refreshPromise: Promise<AuthResponse> | null = null;

async function tryRefresh(): Promise<AuthResponse> {
	if (_refreshPromise) return _refreshPromise;

	const refreshToken = sessionStore.refreshToken;
	if (!refreshToken) throw new ApiError(401, 'AUTH_REQUIRED', 'No refresh token available');

	_refreshPromise = (async () => {
		try {
			const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
				credentials: 'include'
			});
			if (!res.ok) throw new ApiError(res.status, 'REFRESH_FAILED', 'Token refresh failed');
			const data = (await res.json()) as AuthResponse;
			sessionStore.set(data);
			return data;
		} finally {
			_refreshPromise = null;
		}
	})();

	return _refreshPromise;
}

async function doFetch<T>(method: string, path: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE}${path}`;
	const headers = new Headers(options?.headers);

	if (options?.body && typeof options.body === 'string') {
		headers.set('content-type', 'application/json');
	}

	const token = sessionStore.accessToken;
	if (token) headers.set('authorization', `Bearer ${token}`);

	let response = await fetch(url, { ...options, method, headers, credentials: 'include' });

	// Auto-refresh on 401 and retry once
	if (response.status === 401 && token) {
		try {
			const refreshed = await tryRefresh();
			headers.set('authorization', `Bearer ${refreshed.accessToken}`);
			response = await fetch(url, { ...options, method, headers, credentials: 'include' });
		} catch {
			sessionStore.clear();
		}
	}

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new ApiError(
			response.status,
			body.code ?? 'UNKNOWN_ERROR',
			body.message ?? `HTTP ${response.status}`
		);
	}

	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

export const api = {
	get: <T>(path: string, options?: RequestInit) => doFetch<T>('GET', path, options),
	post: <T>(path: string, body?: unknown, options?: RequestInit) =>
		doFetch<T>('POST', path, { ...options, body: body ? JSON.stringify(body) : undefined }),
	patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
		doFetch<T>('PATCH', path, { ...options, body: body ? JSON.stringify(body) : undefined }),
	delete: <T>(path: string, options?: RequestInit) => doFetch<T>('DELETE', path, options)
};
