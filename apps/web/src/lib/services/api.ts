/**
 * REST API client.
 * All requests go through here. Types imported from @penthouse/contracts.
 * OWNED BY: Claude (apps/web)
 */
import { PUBLIC_API_URL } from '$env/static/public';
import type {
	AuthResponse,
	LoginRequest,
	RegisterRequest,
	ChatSummary,
	Message,
	SendMessageRequest,
	SendMessageResponse,
	MemberDetail,
	UserSearchResponse,
	ListUsersResponse,
	UpdateProfileRequest
} from '@penthouse/contracts';
import { sessionStore } from '$stores/session.svelte';

class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function request<T>(
	path: string,
	options: RequestInit = {}
): Promise<T> {
	const token = sessionStore.accessToken;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(`${PUBLIC_API_URL}${path}`, {
		...options,
		headers
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, body.error ?? res.statusText);
	}

	return res.json() as Promise<T>;
}

// Auth
export const auth = {
	login: (body: LoginRequest) =>
		request<AuthResponse>('/api/v1/auth/login', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	register: (body: RegisterRequest) =>
		request<AuthResponse>('/api/v1/auth/register', {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	logout: () =>
		request<void>('/api/v1/auth/logout', { method: 'POST' }),

	refresh: (refreshToken: string) =>
		request<AuthResponse>('/api/v1/auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refreshToken })
		})
};

// Chats
export const chats = {
	list: () => request<ChatSummary[]>('/api/v1/chats'),

	createDm: (memberId: string) =>
		request<{ id: string }>('/api/v1/chats/dm', {
			method: 'POST',
			body: JSON.stringify({ memberId })
		}),

	messages: (chatId: string, params?: { before?: string; limit?: number }) => {
		const qs = new URLSearchParams();
		if (params?.before) qs.set('before', params.before);
		if (params?.limit) qs.set('limit', String(params.limit));
		const query = qs.toString() ? `?${qs}` : '';
		return request<Message[]>(`/api/v1/chats/${chatId}/messages${query}`);
	},

	send: (chatId: string, body: SendMessageRequest) =>
		request<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	markRead: (chatId: string) =>
		request<void>(`/api/v1/chats/${chatId}/read`, { method: 'POST' })
};

// Users (Tier 1)
export const users = {
	search: (q: string, limit?: number) => {
		const qs = new URLSearchParams({ q });
		if (limit) qs.set('limit', String(limit));
		return request<UserSearchResponse>(`/api/v1/users/search?${qs}`);
	},

	list: (params?: { offset?: number; limit?: number }) => {
		const qs = new URLSearchParams();
		if (params?.offset !== undefined) qs.set('offset', String(params.offset));
		if (params?.limit !== undefined) qs.set('limit', String(params.limit));
		const query = qs.toString() ? `?${qs}` : '';
		return request<ListUsersResponse>(`/api/v1/users${query}`);
	},

	getProfile: (userId: string) =>
		request<MemberDetail>(`/api/v1/users/${userId}`),

	updateProfile: (body: UpdateProfileRequest) =>
		request<AuthResponse>('/api/v1/auth/me', {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
};

export { ApiError };
