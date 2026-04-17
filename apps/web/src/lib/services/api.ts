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
	MarkChatReadResponse,
	ChatPreferencesRequest,
	ChatPreferencesResponse,
	MemberDetail,
	UserSearchResponse,
	ListUsersResponse,
	UpdateProfileRequest,
	UploadResponse,
	GifSearchResponse,
	GifProvider,
	PollData,
	PinnedMessage
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

// ── Token refresh ─────────────────────────────────────────────────────────────
// One shared promise deduplicates concurrent 401s so we don't flood the
// refresh endpoint when multiple requests fail simultaneously.
let _refreshPromise: Promise<AuthResponse> | null = null;

async function tryRefresh(): Promise<AuthResponse> {
	if (_refreshPromise) return _refreshPromise;

	const refreshToken = sessionStore.current?.refreshToken;
	if (!refreshToken) throw new ApiError(401, 'No refresh token available');

	_refreshPromise = (async () => {
		try {
			// Raw fetch — can't call request() here or we risk infinite recursion.
			const res = await fetch(`${PUBLIC_API_URL}/api/v1/auth/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken })
			});
			if (!res.ok) throw new ApiError(res.status, 'Token refresh failed');
			const newSession = (await res.json()) as AuthResponse;
			sessionStore.set(newSession);
			return newSession;
		} finally {
			_refreshPromise = null;
		}
	})();

	return _refreshPromise;
}

// ── Core request ──────────────────────────────────────────────────────────────

async function doFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	return fetch(`${PUBLIC_API_URL}${path}`, { ...options, headers });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	let res = await doFetch(path, options, sessionStore.accessToken);

	// Auto-refresh on 401, then retry once
	if (res.status === 401) {
		try {
			const newSession = await tryRefresh();
			res = await doFetch(path, options, newSession.accessToken);
		} catch {
			// Refresh failed — drop session; layout auth guard will redirect to /auth
			sessionStore.clear();
			throw new ApiError(401, 'Session expired. Please sign in again.');
		}
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, body.error ?? res.statusText);
	}

	// 204 No Content — return undefined rather than calling .json() on an empty body
	if (res.status === 204) return undefined as unknown as T;

	return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
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

// ── Chats ─────────────────────────────────────────────────────────────────────
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

	markRead: (chatId: string, throughMessageId?: string) =>
		request<MarkChatReadResponse>(`/api/v1/chats/${chatId}/read`, {
			method: 'POST',
			body: JSON.stringify(throughMessageId ? { throughMessageId } : {})
		}),

	deleteMessage: (chatId: string, messageId: string) =>
		request<void>(`/api/v1/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }),

	getPreferences: (chatId: string) =>
		request<ChatPreferencesResponse>(`/api/v1/chats/${chatId}/preferences`),

	setPreferences: (chatId: string, body: ChatPreferencesRequest) =>
		request<ChatPreferencesResponse>(`/api/v1/chats/${chatId}/preferences`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	self: () =>
		request<ChatSummary>('/api/v1/chats/self', { method: 'POST' })
};

// ── Users ─────────────────────────────────────────────────────────────────────
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

// ── Media uploads ─────────────────────────────────────────────────────────────
export const media = {
	upload: async (file: File): Promise<UploadResponse> => {
		// Multipart upload — must not set Content-Type (browser sets it with boundary)
		const makeUpload = async (token: string | null) => {
			const formData = new FormData();
			formData.append('file', file);
			return fetch(`${PUBLIC_API_URL}/api/v1/media/upload`, {
				method: 'POST',
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				body: formData
			});
		};

		let res = await makeUpload(sessionStore.accessToken);

		if (res.status === 401) {
			try {
				const newSession = await tryRefresh();
				res = await makeUpload(newSession.accessToken);
			} catch {
				sessionStore.clear();
				throw new ApiError(401, 'Session expired. Please sign in again.');
			}
		}

		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: res.statusText }));
			throw new ApiError(res.status, body.error ?? res.statusText);
		}

		return res.json() as Promise<UploadResponse>;
	}
};

// ── GIFs ──────────────────────────────────────────────────────────────────────
export const gifs = {
	trending: (provider: GifProvider = 'giphy', limit = 30) =>
		request<GifSearchResponse>(`/api/v1/gifs/${provider}/trending?limit=${limit}`),

	search: (q: string, provider: GifProvider = 'giphy', limit = 30) =>
		request<GifSearchResponse>(
			`/api/v1/gifs/${provider}/search?q=${encodeURIComponent(q)}&limit=${limit}`
		)
};

// ── Polls ─────────────────────────────────────────────────────────────────────
export const polls = {
	create: (
		chatId: string,
		body: { question: string; options: string[]; multiSelect?: boolean; expiresAt?: string }
	) =>
		request<SendMessageResponse>(`/api/v1/chats/${chatId}/polls`, {
			method: 'POST',
			body: JSON.stringify(body)
		}),

	vote: (pollId: string, optionIndex: number) =>
		request<PollData>(`/api/v1/polls/${pollId}/vote`, {
			method: 'POST',
			body: JSON.stringify({ optionIndex })
		})
};

// ── Reactions ─────────────────────────────────────────────────────────────────
export const reactions = {
	add: (chatId: string, messageId: string, emoji: string) =>
		request<void>(`/api/v1/chats/${chatId}/messages/${messageId}/reactions`, {
			method: 'POST',
			body: JSON.stringify({ emoji })
		}),

	remove: (chatId: string, messageId: string, emoji: string) =>
		request<void>(`/api/v1/chats/${chatId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
			method: 'DELETE'
		})
};

// ── Pins ──────────────────────────────────────────────────────────────────────
export const pins = {
	list: (chatId: string) =>
		request<PinnedMessage[]>(`/api/v1/chats/${chatId}/pins`),

	add: (chatId: string, messageId: string) =>
		request<PinnedMessage>(`/api/v1/chats/${chatId}/pins`, {
			method: 'POST',
			body: JSON.stringify({ messageId })
		}),

	remove: (chatId: string, messageId: string) =>
		request<void>(`/api/v1/chats/${chatId}/pins/${messageId}`, { method: 'DELETE' })
};

export { ApiError };
