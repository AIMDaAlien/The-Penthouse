import axios from 'axios';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  ChatSummary,
  GifProvider,
  GifSearchResponse,
  MeResponse,
  MarkChatReadResponse,
  MemberDetail,
  MemberSummary,
  Message,
  MessageMetadata,
  MessageType,
  PasswordResetRequest,
  RotateRecoveryCodeResponse,
  SendMessageResponse,
  UploadResponse,
  UpdateProfileRequest
} from '@penthouse/contracts';
import {
  normalizeInviteCode,
  normalizeRecoveryCode,
  normalizeUsername
} from '@penthouse/contracts';
import type { Session } from '../types';
import {
  clearStoredSessionState,
  loadStoredSessionState,
  persistStoredTokens,
  persistStoredUser
} from './sessionStorage';
import { resolveApiBase } from './runtime';

const API_BASE = resolveApiBase();

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000
});

let accessToken = '';
let refreshToken = '';
let cachedUser: AuthUser | null = null;
let hydrated = false;
let hydratingPromise: Promise<Session | null> | null = null;

function decodeJwtExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const payload = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenNeedsRefresh(token: string, minValidityMs: number): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return exp <= Date.now() + minValidityMs;
}

function persistTokens(): void {
  void persistStoredTokens(accessToken, refreshToken);
}

function setTokens(nextAccessToken: string, nextRefreshToken: string): void {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
  hydrated = true;
  persistTokens();
}

function clearTokens(): void {
  accessToken = '';
  refreshToken = '';
  hydrated = true;
  persistTokens();
}

export function setStoredUser(user: AuthUser | null): void {
  cachedUser = user;
  hydrated = true;
  void persistStoredUser(user);
}

async function clearStoredAuthState(): Promise<void> {
  accessToken = '';
  refreshToken = '';
  cachedUser = null;
  hydrated = true;
  await clearStoredSessionState();
}

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing = false;
let queuedResolvers: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;

  if (refreshing) {
    return new Promise((resolve) => {
      queuedResolvers.push(resolve);
    });
  }

  refreshing = true;
  try {
    const response = await axios.post<AuthResponse>(`${API_BASE}/api/v1/auth/refresh`, {
      refreshToken
    });
    setTokens(response.data.accessToken, response.data.refreshToken);
    setStoredUser(response.data.user);
    queuedResolvers.forEach((resolve) => resolve(response.data.accessToken));
    queuedResolvers = [];
    return response.data.accessToken;
  } catch (error: any) {
    const status = typeof error?.response?.status === 'number' ? error.response.status : 0;
    if (status >= 400 && status < 500) {
      await clearStoredAuthState();
    }
    queuedResolvers.forEach((resolve) => resolve(null));
    queuedResolvers = [];
    return null;
  } finally {
    refreshing = false;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as Record<string, any> | undefined;
    if (!original || original._retry) throw error;

    if (error.response?.status === 401) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (!token) throw error;
      original.headers = {
        ...(original.headers ?? {}),
        Authorization: `Bearer ${token}`
      };
      return http(original);
    }

    throw error;
  }
);

function buildCurrentSession(): Session | null {
  if (!cachedUser || !accessToken || !refreshToken) {
    return null;
  }

  return {
    user: cachedUser,
    accessToken,
    refreshToken
  };
}

export async function hydrateStoredSession(): Promise<Session | null> {
  if (hydrated && !hydratingPromise) {
    return buildCurrentSession();
  }

  if (hydratingPromise) {
    return hydratingPromise;
  }

  hydratingPromise = (async () => {
    const stored = await loadStoredSessionState();
    accessToken = stored.accessToken;
    refreshToken = stored.refreshToken;
    cachedUser = stored.user;
    hydrated = true;

    if (!accessToken && !refreshToken && !cachedUser) {
      return null;
    }

    if (refreshToken && (tokenNeedsRefresh(accessToken, 60_000) || !cachedUser)) {
      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken || !cachedUser) {
        return null;
      }
    }

    if (!cachedUser || !accessToken || !refreshToken) {
      return null;
    }

    return {
      user: cachedUser,
      accessToken,
      refreshToken
    };
  })();

  try {
    return await hydratingPromise;
  } finally {
    hydratingPromise = null;
  }
}

export async function register(username: string, password: string, inviteCode: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/auth/register', {
    username: normalizeUsername(username),
    password,
    inviteCode: normalizeInviteCode(inviteCode)
  });
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/auth/login', {
    username: normalizeUsername(username),
    password
  });
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function resetPassword(
  username: string,
  recoveryCode: string,
  newPassword: string
): Promise<AuthResponse> {
  const payload: PasswordResetRequest = {
    username: normalizeUsername(username),
    recoveryCode: normalizeRecoveryCode(recoveryCode),
    newPassword
  };
  const response = await http.post<AuthResponse>('/api/v1/auth/password-reset', payload);
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function logout(): Promise<void> {
  if (refreshToken) {
    await http.post('/api/v1/auth/logout', { refreshToken }).catch(() => undefined);
  }
  await clearStoredAuthState();
}

export async function getChats(): Promise<ChatSummary[]> {
  const response = await http.get<ChatSummary[]>('/api/v1/chats');
  return response.data;
}

export async function getMessages(chatId: string, cursor?: string): Promise<Message[]> {
  const response = await http.get<Message[]>(`/api/v1/chats/${chatId}/messages`, {
    params: cursor ? { cursor } : undefined
  });
  return response.data;
}

export async function markChatRead(chatId: string): Promise<MarkChatReadResponse> {
  const response = await http.post<MarkChatReadResponse>(`/api/v1/chats/${chatId}/read`);
  return response.data;
}

export async function sendMessage(chatId: string, content: string, clientMessageId: string): Promise<SendMessageResponse> {
  const response = await http.post<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, {
    chatId,
    content,
    type: 'text',
    metadata: null,
    clientMessageId
  });
  return response.data;
}

export async function sendStructuredMessage(
  chatId: string,
  payload: {
    content: string;
    type: MessageType;
    metadata?: MessageMetadata | null;
    clientMessageId: string;
  }
): Promise<SendMessageResponse> {
  const response = await http.post<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, {
    chatId,
    content: payload.content,
    type: payload.type,
    metadata: payload.metadata ?? null,
    clientMessageId: payload.clientMessageId
  });
  return response.data;
}

export async function getMe(): Promise<MeResponse> {
  const response = await http.get<MeResponse>('/api/v1/me');
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<MeResponse> {
  const response = await http.patch<MeResponse>('/api/v1/me/profile', data);
  return response.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/me/password', data);
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function rotateRecoveryCode(): Promise<RotateRecoveryCodeResponse> {
  const response = await http.post<RotateRecoveryCodeResponse>('/api/v1/me/recovery-code/rotate');
  return response.data;
}

export async function getMembers(q = ''): Promise<MemberSummary[]> {
  const response = await http.get<MemberSummary[]>('/api/v1/members', {
    params: q.trim() ? { q: q.trim() } : undefined
  });
  return response.data;
}

export async function getMember(memberId: string): Promise<MemberDetail> {
  const response = await http.get<MemberDetail>(`/api/v1/members/${memberId}`);
  return response.data;
}

export async function uploadMedia(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const response = await http.post<UploadResponse>('/api/v1/media/upload', form);
  return response.data;
}

export async function getTrendingGifs(provider: GifProvider): Promise<GifSearchResponse> {
  const response = await http.get<GifSearchResponse>(`/api/v1/gifs/${provider}/trending`);
  return response.data;
}

export async function searchGifs(provider: GifProvider, query: string): Promise<GifSearchResponse> {
  const response = await http.get<GifSearchResponse>(`/api/v1/gifs/${provider}/search`, {
    params: { q: query.trim() }
  });
  return response.data;
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

export function getAccessToken(): string {
  return accessToken;
}

export async function ensureRealtimeAccessToken(minValidityMs = 60_000): Promise<string | null> {
  if (!accessToken) {
    return refreshAccessToken();
  }

  if (!tokenNeedsRefresh(accessToken, minValidityMs)) {
    return accessToken;
  }

  const refreshed = await refreshAccessToken();
  return refreshed ?? accessToken;
}

export function getStoredUser(): AuthUser | null {
  return cachedUser;
}
