import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockHttp = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  },
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn()
};

const mockAxiosPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockHttp),
    post: mockAxiosPost
  }
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
    mockHttp.get.mockReset();
    mockHttp.post.mockReset();
    mockHttp.patch.mockReset();
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
          mustChangePassword: false
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
        mustChangePassword: false
      },
      accessToken: 'refreshed-access-token',
      refreshToken: 'rotated-refresh-token'
    });
    expect(mockAxiosPost).toHaveBeenCalledWith('http://localhost:3000/api/v1/auth/refresh', {
      refreshToken: 'stored-refresh-token'
    });
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
        mustChangePassword: false
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
          mustChangePassword: false
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
});
