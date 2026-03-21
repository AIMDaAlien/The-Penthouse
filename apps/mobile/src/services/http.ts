import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import type {
  AdminInviteDetail,
  AuthConfigResponse,
  ChatPreferencesRequest,
  ChatPreferencesResponse,
  CreateInviteRequest,
  AdminMessage,
  AdminMemberSummary,
  AdminModerateMessageRequest,
  AdminOperatorSummary,
  AdminTempPasswordResponse,
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  ChatSummary,
  CreateDirectChatRequest,
  DeviceNotificationSettings,
  GifProvider,
  GifSearchResponse,
  GetDeviceNotificationSettingsQuery,
  MeResponse,
  MarkChatReadResponse,
  MemberDetail,
  MemberSummary,
  Message,
  MessageMetadata,
  MessageType,
  PasswordResetRequest,
  RegistrationModeResponse,
  RevokeOtherSessionsResponse,
  RegisterDeviceTokenResponse,
  RotateRecoveryCodeResponse,
  SendMessageResponse,
  SessionSummary,
  TestNoticeAckResponse,
  UnregisterDeviceTokenRequest,
  UpdateDeviceNotificationSettingsRequest,
  UpdateRegistrationModeRequest,
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
import { TEST_NOTICE_VERSION } from '../testNotice';
import { getCachedPushToken } from './notifications';

const API_BASE = resolveApiBase();
const NOTICE_REQUIRED_ERROR = 'Test account acknowledgement required';

function sessionClientContext(): { appContext: string; deviceLabel: string; hasPushToken: boolean } {
  const appContext = Capacitor.getPlatform();
  const hasPushToken = Boolean(getCachedPushToken());

  if (appContext === 'android') {
    return { appContext, deviceLabel: 'Android app', hasPushToken };
  }

  if (appContext === 'ios') {
    return { appContext, deviceLabel: 'iOS app', hasPushToken };
  }

  return {
    appContext: 'web',
    deviceLabel: typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mobile')
      ? 'Mobile web browser'
      : 'Web browser',
    hasPushToken
  };
}

function sessionContextHeaders(): { headers: Record<string, string> } {
  const context = sessionClientContext();
  return {
    headers: {
      'x-penthouse-app-context': context.appContext,
      'x-penthouse-device-label': context.deviceLabel,
      'x-penthouse-push-present': context.hasPushToken ? '1' : '0'
    }
  };
}

export type AuthEvent =
  | {
      type: 'user_updated';
      user: AuthUser;
    }
  | {
      type: 'notice_required';
    };

const http = axios.create({
  baseURL: API_BASE,
  timeout: 15_000
});

let accessToken = '';
let refreshToken = '';
let cachedUser: AuthUser | null = null;
let hydrated = false;
let hydratingPromise: Promise<Session | null> | null = null;
const authEventListeners = new Set<(event: AuthEvent) => void>();

function emitAuthEvent(event: AuthEvent): void {
  authEventListeners.forEach((listener) => listener(event));
}

export function subscribeAuthEvents(listener: (event: AuthEvent) => void): () => void {
  authEventListeners.add(listener);
  return () => {
    authEventListeners.delete(listener);
  };
}

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
    const response = await axios.post<AuthResponse>(
      `${API_BASE}/api/v1/auth/refresh`,
      { refreshToken },
      sessionContextHeaders()
    );
    setTokens(response.data.accessToken, response.data.refreshToken);
    setStoredUser(response.data.user);
    emitAuthEvent({ type: 'user_updated', user: response.data.user });
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

    if (error.response?.status === 403 && error.response?.data?.error === NOTICE_REQUIRED_ERROR) {
      emitAuthEvent({ type: 'notice_required' });
      throw error;
    }

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
  const response = await http.post<AuthResponse>(
    '/api/v1/auth/register',
    {
      username: normalizeUsername(username),
      password,
      inviteCode: normalizeInviteCode(inviteCode),
      acceptTestNotice: true,
      testNoticeVersion: TEST_NOTICE_VERSION
    },
    sessionContextHeaders()
  );
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>(
    '/api/v1/auth/login',
    {
      username: normalizeUsername(username),
      password
    },
    sessionContextHeaders()
  );
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
  const response = await http.post<AuthResponse>('/api/v1/auth/password-reset', payload, sessionContextHeaders());
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

export async function acknowledgeTestNotice(version: string): Promise<TestNoticeAckResponse> {
  const response = await http.post<TestNoticeAckResponse>('/api/v1/me/test-notice/ack', {
    version
  });
  setStoredUser(response.data.user);
  return response.data;
}

export async function registerDeviceToken(platform: 'android' | 'ios', token: string, previousToken?: string | null): Promise<RegisterDeviceTokenResponse> {
  const response = await http.put<RegisterDeviceTokenResponse>('/api/v1/me/device-tokens', {
    platform,
    token,
    previousToken: previousToken ?? undefined
  });
  return response.data;
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  const payload: UnregisterDeviceTokenRequest = { token };
  await http.delete('/api/v1/me/device-tokens', { data: payload });
}

export async function getChats(): Promise<ChatSummary[]> {
  const response = await http.get<ChatSummary[]>('/api/v1/chats');
  return response.data;
}

export async function createDirectChat(memberId: string): Promise<ChatSummary> {
  const payload: CreateDirectChatRequest = { memberId };
  const response = await http.post<ChatSummary>('/api/v1/chats/dm', payload);
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

export async function updateChatPreferences(chatId: string, notificationsMuted: boolean): Promise<ChatPreferencesResponse> {
  const payload: ChatPreferencesRequest = { notificationsMuted };
  const response = await http.patch<ChatPreferencesResponse>(`/api/v1/chats/${chatId}/preferences`, payload);
  return response.data;
}

export async function sendMessage(
  chatId: string,
  content: string,
  clientMessageId: string,
  type: MessageType = 'text',
  metadata: MessageMetadata | null = null
): Promise<SendMessageResponse> {
  const response = await http.post<SendMessageResponse>(`/api/v1/chats/${chatId}/messages`, {
    chatId,
    content,
    type,
    metadata,
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

export async function getMySessions(): Promise<SessionSummary[]> {
  const response = await http.get<SessionSummary[]>('/api/v1/me/sessions');
  return response.data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await http.delete(`/api/v1/me/sessions/${sessionId}`);
}

export async function revokeOtherSessions(): Promise<RevokeOtherSessionsResponse> {
  const response = await http.delete<RevokeOtherSessionsResponse>('/api/v1/me/sessions/others');
  return response.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<AuthResponse> {
  const response = await http.post<AuthResponse>('/api/v1/me/password', data, sessionContextHeaders());
  setTokens(response.data.accessToken, response.data.refreshToken);
  setStoredUser(response.data.user);
  return response.data;
}

export async function rotateRecoveryCode(): Promise<RotateRecoveryCodeResponse> {
  const response = await http.post<RotateRecoveryCodeResponse>('/api/v1/me/recovery-code/rotate');
  return response.data;
}

export async function getDeviceNotificationSettings(token: string): Promise<DeviceNotificationSettings> {
  const params: GetDeviceNotificationSettingsQuery = { token };
  const response = await http.get<DeviceNotificationSettings>('/api/v1/me/device-notification-settings', { params });
  return response.data;
}

export async function updateDeviceNotificationSettings(data: UpdateDeviceNotificationSettingsRequest): Promise<DeviceNotificationSettings> {
  const response = await http.put<DeviceNotificationSettings>('/api/v1/me/device-notification-settings', data);
  return response.data;
}

export async function getMembers(q = ''): Promise<MemberSummary[]> {
  const response = await http.get<MemberSummary[]>('/api/v1/members', {
    params: q.trim() ? { q: q.trim() } : undefined
  });
  return response.data;
}

export async function getAuthConfig(): Promise<AuthConfigResponse> {
  const response = await http.get<AuthConfigResponse>('/api/v1/auth/config');
  return response.data;
}

export async function getAdminInvites(): Promise<AdminInviteDetail[]> {
  const response = await http.get<AdminInviteDetail[]>('/api/v1/admin/invites');
  return response.data;
}

export async function createAdminInvite(data: CreateInviteRequest): Promise<AdminInviteDetail> {
  const response = await http.post<AdminInviteDetail>('/api/v1/admin/invites', data);
  return response.data;
}

export async function revokeAdminInvite(inviteId: string): Promise<void> {
  await http.post(`/api/v1/admin/invites/${inviteId}/revoke`);
}

export async function getRegistrationMode(): Promise<RegistrationModeResponse> {
  const response = await http.get<RegistrationModeResponse>('/api/v1/admin/registration-mode');
  return response.data;
}

export async function updateRegistrationMode(data: UpdateRegistrationModeRequest): Promise<RegistrationModeResponse> {
  const response = await http.put<RegistrationModeResponse>('/api/v1/admin/registration-mode', data);
  return response.data;
}

export async function getAdminOperatorSummary(): Promise<AdminOperatorSummary> {
  const response = await http.get<AdminOperatorSummary>('/api/v1/admin/operator/summary');
  return response.data;
}

export async function getAdminMembers(q = ''): Promise<AdminMemberSummary[]> {
  const response = await http.get<AdminMemberSummary[]>('/api/v1/admin/members', {
    params: q.trim() ? { q: q.trim() } : undefined
  });
  return response.data;
}

export async function getAdminChats(): Promise<ChatSummary[]> {
  const response = await http.get<ChatSummary[]>('/api/v1/admin/chats');
  return response.data;
}

export async function getAdminChatMessages(chatId: string, cursor?: string): Promise<AdminMessage[]> {
  const response = await http.get<AdminMessage[]>(`/api/v1/admin/chats/${chatId}/messages`, {
    params: cursor ? { cursor } : undefined
  });
  return response.data;
}

export async function hideAdminMessage(messageId: string, reason: string): Promise<AdminMessage> {
  const payload: AdminModerateMessageRequest = { reason };
  const response = await http.post<AdminMessage>(`/api/v1/admin/messages/${messageId}/hide`, payload);
  return response.data;
}

export async function unhideAdminMessage(messageId: string, reason: string): Promise<AdminMessage> {
  const payload: AdminModerateMessageRequest = { reason };
  const response = await http.post<AdminMessage>(`/api/v1/admin/messages/${messageId}/unhide`, payload);
  return response.data;
}

export async function removeAdminMember(memberId: string): Promise<void> {
  await http.post(`/api/v1/admin/members/${memberId}/remove`);
}

export async function banAdminMember(memberId: string): Promise<void> {
  await http.post(`/api/v1/admin/members/${memberId}/ban`);
}

export async function issueAdminTempPassword(memberId: string): Promise<AdminTempPasswordResponse> {
  const response = await http.post<AdminTempPasswordResponse>(`/api/v1/admin/members/${memberId}/temp-password`);
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
