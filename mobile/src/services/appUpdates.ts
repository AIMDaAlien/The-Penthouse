import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { getAppUpdateInfo, type AppUpdateInfo } from './api';
import { storage } from './storage';

const DISMISSED_BINARY_UPDATE_KEY = 'updates:dismissed-binary';

export type UpdatePrompt =
  | {
      kind: 'binary';
      mandatory: boolean;
      latestVersion: string;
      currentVersion: string;
      notes: string;
      publishedAt: string | null;
      minSupportedVersion: string | null;
      downloadUrl: string;
    }
  | {
      kind: 'ota';
      mandatory: false;
      notes: string;
    };

const normalizeVersion = (input: string | null | undefined): string => {
  if (!input) return '0.0.0';
  return String(input)
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('+')[0];
};

const compareVersions = (a: string, b: string): number => {
  const left = normalizeVersion(a).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLen = Math.max(left.length, right.length);

  for (let i = 0; i < maxLen; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
};

export const getCurrentAppVersion = (): string => {
  const cfg = Constants.expoConfig?.version;
  if (cfg) return normalizeVersion(cfg);

  const constantsAny = Constants as unknown as {
    manifest?: { version?: string };
    manifest2?: { extra?: { expoClient?: { version?: string } } };
  };
  const manifestVersion = constantsAny.manifest?.version;
  if (manifestVersion) return normalizeVersion(manifestVersion);

  const manifest2Version = constantsAny.manifest2?.extra?.expoClient?.version;
  if (manifest2Version) return normalizeVersion(manifest2Version);

  return '0.0.0';
};

const getBinaryPromptFingerprint = (update: AppUpdateInfo): string =>
  `${normalizeVersion(update.latestVersion)}|${update.publishedAt || ''}`;

const getBinaryUpdateInfo = async (): Promise<AppUpdateInfo | null> => {
  try {
    const { data } = await getAppUpdateInfo();
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    return null;
  }
};

const checkForDownloadedOta = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return false;

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true;
  } catch (_) {
    return false;
  }
};

export const resolveUpdatePrompt = async (): Promise<UpdatePrompt | null> => {
  if (Platform.OS === 'web') return null;

  const currentVersion = getCurrentAppVersion();
  const binaryUpdate = await getBinaryUpdateInfo();

  if (binaryUpdate) {
    const isMandatoryFlag = binaryUpdate.mandatory === true;
    const belowMinSupported =
      !!binaryUpdate.minSupportedVersion &&
      compareVersions(currentVersion, binaryUpdate.minSupportedVersion) < 0;
    const hasNewerBinary = compareVersions(binaryUpdate.latestVersion, currentVersion) > 0;
    const mandatory = isMandatoryFlag || belowMinSupported;

    if (mandatory || hasNewerBinary) {
      const fingerprint = getBinaryPromptFingerprint(binaryUpdate);
      const dismissedFingerprint = await storage.getItem(DISMISSED_BINARY_UPDATE_KEY);
      const shouldPrompt = mandatory || dismissedFingerprint !== fingerprint;

      if (shouldPrompt) {
        return {
          kind: 'binary',
          mandatory,
          latestVersion: normalizeVersion(binaryUpdate.latestVersion),
          currentVersion,
          notes: binaryUpdate.notes || 'A new app version is available.',
          publishedAt: binaryUpdate.publishedAt,
          minSupportedVersion: binaryUpdate.minSupportedVersion,
          downloadUrl: binaryUpdate.apkUrl || binaryUpdate.downloadPath,
        };
      }
    }
  }

  const otaAvailable = await checkForDownloadedOta();
  if (otaAvailable) {
    return {
      kind: 'ota',
      mandatory: false,
      notes: binaryUpdate?.notes || 'A new in-app update is ready to install.',
    };
  }

  return null;
};

export const dismissBinaryPrompt = async (latestVersion: string, publishedAt: string | null): Promise<void> => {
  const fingerprint = `${normalizeVersion(latestVersion)}|${publishedAt || ''}`;
  await storage.setItem(DISMISSED_BINARY_UPDATE_KEY, fingerprint);
};

export const applyDownloadedOtaUpdate = async (): Promise<void> => {
  if (Platform.OS === 'web' || !Updates.isEnabled) return;
  await Updates.reloadAsync();
};
