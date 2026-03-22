import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockHttp = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  },
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

const mockAxiosPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockHttp),
    post: mockAxiosPost
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android'
  }
}));

vi.mock('./notifications', () => ({
  getCachedPushToken: vi.fn(() => 'push-token-1')
}));

const mockLoadStoredSessionState = vi.fn();
const mockPersistStoredTokens = vi.fn();
const mockPersistStoredUser = vi.fn();
const mockClearStoredSessionState = vi.fn();

vi.mock('./sessionStorage', () => ({
  loadStoredSessionState: mockLoadStoredSessionState,
  persistStoredTokens: mockPersistStoredTokens,
  persistStoredUser: mockPersistStoredUser,
  clearStoredSessionState: mockClearStoredSessionState
}));

vi.mock('./runtime', () => ({
  resolveApiBase: () => 'http://localhost:3000'
}));

describe('http session hydration', () => {
  beforeEach(() => {
    vi.resetModules();
    mockAxiosPost.mockReset();
    mockLoadStoredSessionState.mockReset();
    mockPersistStoredTokens.mockReset();
    mockPersistStoredUser.mockReset();
    mockClearStoredSessionState.mockReset();
    mockHttp.interceptors.request.use.mockReset();
    mockHttp.interceptors.response.use.mockReset();
    mockHttp.get.mockReset();
    mockHttp.post.mockReset();
    mockHttp.patch.mockReset();
    mockHttp.put.mockReset();
    mockHttp.delete.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates from stored refresh token before forcing auth screen', async () => {
    mockLoadStoredSessionState.mockResolvedValue({
      accessToken: '',
      refreshToken: 'stored-refresh-token',
      user: null
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          username: 'aimtest',
          displayName: 'Aim',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: false,
          requiredTestNoticeVersion: 'alpha-v1',
          acceptedTestNoticeVersion: 'alpha-v1'
        },
        accessToken: 'refreshed-access-token',
        refreshToken: 'rotated-refresh-token'
      }
    });

    const mod = await import('./http');
    const session = await mod.hydrateStoredSession();

    expect(session).toEqual({
      user: {
        id: 'user-1',
        username: 'aimtest',
        displayName: 'Aim',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      },
      accessToken: 'refreshed-access-token',
      refreshToken: 'rotated-refresh-token'
    });
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/refresh',
      {
        refreshToken: 'stored-refresh-token'
      },
      {
        headers: {
          'x-penthouse-app-context': 'android',
          'x-penthouse-device-label': 'Android app',
          'x-penthouse-push-present': '1'
        }
      }
    );
    expect(mockPersistStoredTokens).toHaveBeenCalledWith('refreshed-access-token', 'rotated-refresh-token');
    expect(mockPersistStoredUser).toHaveBeenCalled();
  });

  it('preserves stored credentials when hydration refresh fails due to network error', async () => {
    mockLoadStoredSessionState.mockResolvedValue({
      accessToken: '',
      refreshToken: 'stored-refresh-token',
      user: null
    });
    mockAxiosPost.mockRejectedValue(new Error('Network Error'));

    const mod = await import('./http');
    const session = await mod.hydrateStoredSession();

    expect(session).toBeNull();
    expect(mockClearStoredSessionState).not.toHaveBeenCalled();
  });

  it('treats malformed stored access tokens as needing refresh', async () => {
    mockLoadStoredSessionState.mockResolvedValue({
      accessToken: 'not-a-jwt',
      refreshToken: 'stored-refresh-token',
      user: {
        id: 'user-1',
        username: 'aimtest',
        displayName: 'Aim',
        avatarUrl: null,
        role: 'member',
        mustChangePassword: false,
        mustAcceptTestNotice: false,
        requiredTestNoticeVersion: 'alpha-v1',
        acceptedTestNoticeVersion: 'alpha-v1'
      }
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          username: 'aimtest',
          displayName: 'Aim',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: false,
          requiredTestNoticeVersion: 'alpha-v1',
          acceptedTestNoticeVersion: 'alpha-v1'
        },
        accessToken: 'refreshed-access-token',
        refreshToken: 'rotated-refresh-token'
      }
    });

    const mod = await import('./http');
    const session = await mod.hydrateStoredSession();

    expect(session?.accessToken).toBe('refreshed-access-token');
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('sends test notice acknowledgement fields during register', async () => {
    mockHttp.post.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          username: 'aimtest',
          displayName: 'Aim',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: false,
          requiredTestNoticeVersion: 'alpha-v1',
          acceptedTestNoticeVersion: 'alpha-v1'
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }
    });

    const mod = await import('./http');
    await mod.register('  AIMTEST ', 'supersecurepassword', ' penthouse-alpha ');

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      {
        username: 'aimtest',
        password: 'supersecurepassword',
        inviteCode: 'PENTHOUSE-ALPHA',
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      },
      {
        headers: {
          'x-penthouse-app-context': 'android',
          'x-penthouse-device-label': 'Android app',
          'x-penthouse-push-present': '1'
        }
      }
    );
  });

  it('persists the updated user after acknowledging the test notice', async () => {
    mockHttp.post.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          username: 'aimtest',
          displayName: 'Aim',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: false,
          requiredTestNoticeVersion: 'alpha-v2',
          acceptedTestNoticeVersion: 'alpha-v2'
        },
        acceptedAt: new Date().toISOString()
      }
    });

    const mod = await import('./http');
    const result = await mod.acknowledgeTestNotice('alpha-v2');

    expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/me/test-notice/ack', {
      version: 'alpha-v2'
    });
    expect(result.user.acceptedTestNoticeVersion).toBe('alpha-v2');
    expect(mockPersistStoredUser).toHaveBeenCalledWith(expect.objectContaining({
      acceptedTestNoticeVersion: 'alpha-v2'
    }));
  });

  it('emits user_updated when refresh rotates tokens with a fresh user', async () => {
    mockLoadStoredSessionState.mockResolvedValue({
      accessToken: '',
      refreshToken: 'stored-refresh-token',
      user: null
    });
    mockAxiosPost.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          username: 'aimtest',
          displayName: 'Aim',
          avatarUrl: null,
          role: 'member',
          mustChangePassword: false,
          mustAcceptTestNotice: true,
          requiredTestNoticeVersion: 'alpha-v2',
          acceptedTestNoticeVersion: 'alpha-v1'
        },
        accessToken: 'refreshed-access-token',
        refreshToken: 'rotated-refresh-token'
      }
    });

    const mod = await import('./http');
    const listener = vi.fn();
    const unsubscribe = mod.subscribeAuthEvents(listener);

    await mod.hydrateStoredSession();

    expect(listener).toHaveBeenCalledWith({
      type: 'user_updated',
      user: expect.objectContaining({
        mustAcceptTestNotice: true,
        requiredTestNoticeVersion: 'alpha-v2'
      })
    });

    unsubscribe();
  });

  it('emits notice_required on exact 403 acknowledgement errors', async () => {
    const mod = await import('./http');
    const listener = vi.fn();
    const unsubscribe = mod.subscribeAuthEvents(listener);
    const responseRejected = mockHttp.interceptors.response.use.mock.calls[0]?.[1];

    await expect(
      responseRejected({
        config: { url: '/api/v1/chats' },
        response: {
          status: 403,
          data: {
            error: 'Test account acknowledgement required'
          }
        }
      })
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          status: 403
        })
      })
    );

    expect(listener).toHaveBeenCalledWith({ type: 'notice_required' });

    unsubscribe();
  });
});
