import axios from 'axios';
import type {
  AuthResponse,
  ChatSummary,
  Message,
  PasswordResetRequest,
  SendMessageResponse,
  RefreshRequest,
  RefreshRequest,
  RotateRecoveryCodeResponse,
  MemberSummary,
  MemberDetail,
  UpdateProfileRequest,
  ChangePasswordRequest,
  MeResponse,
  AuthUser
} from '@penthouse/contracts';
import {
  normalizeInviteCode,
  normalizeRecoveryCode,
  normalizeUsername
} from '@penthouse/contracts';
import { resolveApiBase } from './runtime';

const API_BASE = resolveApiBase();

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
  const response = await http.post<AuthResponse>('/api/v1/auth/register', {
    username: normalizeUsername(username),
    password,
    inviteCode: normalizeInviteCode(inviteCode)
  });
  setTokens(response.data.accessToken, response.data.refreshToken);
  return response.data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/auth/login', {
    username: normalizeUsername(username),
    password
  });
  setTokens(response.data.accessToken, response.data.refreshToken);
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

export async function getMe(): Promise<MeResponse> {
  const response = await http.get<MeResponse>('/api/v1/me');
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<MeResponse> {
  const response = await http.patch<MeResponse>('/api/v1/me/profile', data);
  return response.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await http.post('/api/v1/me/password', data);
}

export async function rotateRecoveryCode(): Promise<RotateRecoveryCodeResponse> {
  const response = await http.post<RotateRecoveryCodeResponse>('/api/v1/me/recovery-code/rotate');
  return response.data;
}

export async function getMembers(): Promise<MemberSummary[]> {
  const response = await http.get<MemberSummary[]>('/api/v1/members');
  return response.data;
}

export async function getMember(memberId: string): Promise<MemberDetail> {
  const response = await http.get<MemberDetail>(`/api/v1/members/${memberId}`);
  return response.data;
}

export function getAccessToken(): string {
  return accessToken;
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed?.id === 'string' && typeof parsed?.username === 'string') {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (!user) return localStorage.removeItem('user');
  localStorage.setItem('user', JSON.stringify(user));
}
