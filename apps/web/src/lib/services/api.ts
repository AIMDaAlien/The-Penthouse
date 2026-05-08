import { env } from '$env/dynamic/public';
import { sessionStore } from '$stores/session.svelte';
import type { AuthResponse } from '@penthouse/contracts';

const API_BASE = env.PUBLIC_API_URL ?? 'http://localhost:3000';
const AUTHLESS_PATHS = new Set([
	'/api/v1/auth/challenge',
	'/api/v1/auth/config',
	'/api/v1/auth/login',
	'/api/v1/auth/refresh',
	'/api/v1/auth/register',
	'/api/v1/auth/reset-password'
]);

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
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new ApiError(
					res.status,
					body.code ?? 'REFRESH_FAILED',
					body.message ?? `Token refresh failed with HTTP ${res.status}`
				);
			}
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
	// Let browser set multipart boundary for FormData
	if (options?.body instanceof FormData) {
		headers.delete('content-type');
	}

	const isAuthless = AUTHLESS_PATHS.has(path);
	const token = isAuthless ? null : sessionStore.accessToken;
	if (token) headers.set('authorization', `Bearer ${token}`);

	let response: Response;
	try {
		response = await fetch(url, { ...options, method, headers, credentials: 'include' });
	} catch (err) {
		throw new ApiError(
			0,
			'API_UNREACHABLE',
			`API server is unreachable at ${API_BASE}. Check that services/api is running on port 3000.`
		);
	}

	// Auto-refresh on 401 and retry once
	if (response.status === 401 && token && !isAuthless) {
		try {
			const refreshed = await tryRefresh();
			headers.set('authorization', `Bearer ${refreshed.accessToken}`);
			try {
				response = await fetch(url, { ...options, method, headers, credentials: 'include' });
			} catch {
				throw new ApiError(
					0,
					'API_UNREACHABLE',
					`API server became unreachable at ${API_BASE} after refreshing your token.`
				);
			}
		} catch (err) {
			sessionStore.clear();
			if (err instanceof ApiError) {
				throw new ApiError(
					err.status,
					`SESSION_REFRESH_${err.code}`,
					`Saved login could not be refreshed: ${err.message}`
				);
			}
			throw new ApiError(401, 'SESSION_REFRESH_FAILED', 'Saved login could not be refreshed. Sign in again.');
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
		doFetch<T>('POST', path, { ...options, body: body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer ? body : body ? JSON.stringify(body) : undefined }),
	patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
		doFetch<T>('PATCH', path, { ...options, body: body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer ? body : body ? JSON.stringify(body) : undefined }),
	delete: <T>(path: string, options?: RequestInit) => doFetch<T>('DELETE', path, options)
};
