import axios from 'axios';
import type {
  AuthResponse,
  ChatSummary,
  Message,
  SendMessageResponse
} from '@penthouse/contracts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000
});

let accessToken = localStorage.getItem('accessToken') || '';
let refreshToken = localStorage.getItem('refreshToken') || '';

function setTokens(nextAccessToken: string, nextRefreshToken: string) {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  accessToken = '';
  refreshToken = '';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
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
    queuedResolvers.forEach((resolve) => resolve(response.data.accessToken));
    queuedResolvers = [];
    return response.data.accessToken;
  } catch {
    clearTokens();
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
    const original = error.config as any;
    if (!original || original._retry) throw error;

    if (error.response?.status === 401) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (!token) throw error;
      original.headers.Authorization = `Bearer ${token}`;
      return http(original);
    }

    throw error;
  }
);

export async function register(username: string, password: string, inviteCode: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/auth/register', { username, password, inviteCode });
  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/auth/login', { username, password });
  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data;
}

export async function logout(): Promise<void> {
  if (refreshToken) {
    await http.post('/api/v1/auth/logout', { refreshToken }).catch(() => undefined);
  }
  clearTokens();
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

export async function sendMessage(chatId: string, content: string, clientMessageId: string): Promise<SendMessageResponse> {
  const response = await http.post<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, {
    chatId,
    content,
    clientMessageId
  });
  return response.data;
}

export function getAccessToken(): string {
  return accessToken;
}

export function getStoredUser(): { id: string; username: string } | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: string; username?: string };
    if (typeof parsed?.id === 'string' && typeof parsed?.username === 'string') {
      return { id: parsed.id, username: parsed.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: string; username: string } | null): void {
  if (!user) return localStorage.removeItem('user');
  localStorage.setItem('user', JSON.stringify(user));
}
