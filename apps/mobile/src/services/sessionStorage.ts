import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { AuthUser } from '@penthouse/contracts';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

type StoredSessionState = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
};

function getWebStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    return storage && typeof storage.getItem === 'function' ? storage : null;
  } catch {
    return null;
  }
}

function usesNativeStorage(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
}

async function readValue(key: string): Promise<string | null> {
  if (usesNativeStorage()) {
    const result = await Preferences.get({ key });
    return result.value;
  }

  return getWebStorage()?.getItem(key) ?? null;
}

async function writeValue(key: string, value: string): Promise<void> {
  if (usesNativeStorage()) {
    await Preferences.set({ key, value });
    return;
  }

  getWebStorage()?.setItem(key, value);
}

async function removeValue(key: string): Promise<void> {
  if (usesNativeStorage()) {
    await Preferences.remove({ key });
    return;
  }

  getWebStorage()?.removeItem(key);
}

function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed?.id === 'string' &&
      typeof parsed?.username === 'string' &&
      typeof parsed?.displayName === 'string' &&
      (parsed?.avatarUrl === null || typeof parsed?.avatarUrl === 'string') &&
      (parsed?.role === 'admin' || parsed?.role === 'member') &&
      typeof parsed?.mustChangePassword === 'boolean' &&
      typeof parsed?.mustAcceptTestNotice === 'boolean' &&
      typeof parsed?.requiredTestNoticeVersion === 'string' &&
      (parsed?.acceptedTestNoticeVersion === null || typeof parsed?.acceptedTestNoticeVersion === 'string')
    ) {
      return parsed as AuthUser;
    }
  } catch {
    // fall through
  }

  return null;
}

async function migrateLegacyLocalStorageIfNeeded(): Promise<void> {
  if (!usesNativeStorage()) return;

  const [storedAccessToken, storedRefreshToken, storedUser] = await Promise.all([
    Preferences.get({ key: ACCESS_TOKEN_KEY }),
    Preferences.get({ key: REFRESH_TOKEN_KEY }),
    Preferences.get({ key: USER_KEY })
  ]);

  if (storedAccessToken.value || storedRefreshToken.value || storedUser.value) {
    return;
  }

  const legacyStorage = getWebStorage();
  if (!legacyStorage) return;

  const legacyAccessToken = legacyStorage.getItem(ACCESS_TOKEN_KEY);
  const legacyRefreshToken = legacyStorage.getItem(REFRESH_TOKEN_KEY);
  const legacyUser = legacyStorage.getItem(USER_KEY);

  if (!legacyAccessToken && !legacyRefreshToken && !legacyUser) {
    return;
  }

  const writes: Promise<void>[] = [];
  if (legacyAccessToken) writes.push(Preferences.set({ key: ACCESS_TOKEN_KEY, value: legacyAccessToken }));
  if (legacyRefreshToken) writes.push(Preferences.set({ key: REFRESH_TOKEN_KEY, value: legacyRefreshToken }));
  if (legacyUser) writes.push(Preferences.set({ key: USER_KEY, value: legacyUser }));

  await Promise.all(writes);
}

export async function loadStoredSessionState(): Promise<StoredSessionState> {
  await migrateLegacyLocalStorageIfNeeded();

  const [accessToken, refreshToken, rawUser] = await Promise.all([
    readValue(ACCESS_TOKEN_KEY),
    readValue(REFRESH_TOKEN_KEY),
    readValue(USER_KEY)
  ]);

  return {
    accessToken: accessToken ?? '',
    refreshToken: refreshToken ?? '',
    user: parseStoredUser(rawUser)
  };
}

export async function persistStoredTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    accessToken ? writeValue(ACCESS_TOKEN_KEY, accessToken) : removeValue(ACCESS_TOKEN_KEY),
    refreshToken ? writeValue(REFRESH_TOKEN_KEY, refreshToken) : removeValue(REFRESH_TOKEN_KEY)
  ]);
}

export async function persistStoredUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    await removeValue(USER_KEY);
    return;
  }

  await writeValue(USER_KEY, JSON.stringify(user));
}

export async function clearStoredSessionState(): Promise<void> {
  await Promise.all([
    removeValue(ACCESS_TOKEN_KEY),
    removeValue(REFRESH_TOKEN_KEY),
    removeValue(USER_KEY)
  ]);
}
