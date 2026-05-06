import { env } from '$env/dynamic/public';

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

async function request<T>(method: string, path: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE}${path}`;
	const headers = new Headers(options?.headers);

	if (options?.body && typeof options.body === 'string') {
		headers.set('content-type', 'application/json');
	}

	const response = await fetch(url, {
		...options,
		method,
		headers,
		credentials: 'include'
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new ApiError(
			response.status,
			body.code ?? 'UNKNOWN_ERROR',
			body.message ?? `HTTP ${response.status}`
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

export const api = {
	get: <T>(path: string, options?: RequestInit) => request<T>('GET', path, options),
	post: <T>(path: string, body: unknown, options?: RequestInit) =>
		request<T>('POST', path, { ...options, body: JSON.stringify(body) }),
	patch: <T>(path: string, body: unknown, options?: RequestInit) =>
		request<T>('PATCH', path, { ...options, body: JSON.stringify(body) }),
	delete: <T>(path: string, options?: RequestInit) => request<T>('DELETE', path, options)
};
