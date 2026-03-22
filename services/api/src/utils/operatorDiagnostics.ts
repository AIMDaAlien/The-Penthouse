import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { getUploadsDir } from './uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../../package.json');
const UPLOAD_SCAN_TTL_MS = 60_000;
const MAX_UPLOAD_SCAN_FILES = 5_000;
const MAX_ERROR_ROUTE_GROUPS = 5;

type UploadDiagnostics = {
  status: 'available' | 'unavailable';
  directoryBytes: number | null;
  fileCount: number | null;
  latestUploadAt: string | null;
  scanLimited: boolean;
};

type BackupDiagnostics = {
  status: string;
  target: string | null;
  lastSuccessfulBackupAt: string | null;
};

const PROCESS_STARTED_AT = new Date();

const pushStats = {
  successfulSends: 0,
  failedSends: 0,
  staleTokensRemoved: 0,
  lastFailureAt: null as string | null
};

const errorStats = {
  serverErrorCount: 0,
  lastServerErrorAt: null as string | null,
  routeGroups: new Map<string, number>()
};

let cachedVersionPromise: Promise<string | null> | null = null;
let cachedUploadDiagnostics: { value: UploadDiagnostics; expiresAt: number } | null = null;

function normalizeIsoDateTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString();
}

function classifyRouteGroup(url: string | undefined): string {
  const value = typeof url === 'string' ? url : '';
  if (value.startsWith('/api/v1/admin')) return 'admin';
  if (value.startsWith('/api/v1/auth')) return 'auth';
  if (value.startsWith('/api/v1/chats')) return 'chats';
  if (value.startsWith('/api/v1/media')) return 'media';
  if (value.startsWith('/api/v1/me')) return 'me';
  if (value.startsWith('/api/v1/gifs')) return 'gifs';
  if (value.startsWith('/uploads/')) return 'uploads';
  return 'other';
}

async function readPackageVersion(): Promise<string | null> {
  if (!cachedVersionPromise) {
    cachedVersionPromise = readFile(PACKAGE_JSON_PATH, 'utf8')
      .then((contents) => {
        const parsed = JSON.parse(contents) as { version?: unknown };
        return typeof parsed.version === 'string' ? parsed.version : null;
      })
      .catch(() => null);
  }

  return cachedVersionPromise;
}

export async function scanUploadDirectory(dir: string, maxFiles = MAX_UPLOAD_SCAN_FILES): Promise<UploadDiagnostics> {
  const stack = [dir];
  let directoryBytes = 0;
  let fileCount = 0;
  let latestUploadAtMs: number | null = null;
  let scanLimited = false;

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(nextPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileStats = await stat(nextPath);
      directoryBytes += fileStats.size;
      fileCount += 1;
      const nextLatest = fileStats.mtimeMs;
      latestUploadAtMs = latestUploadAtMs === null ? nextLatest : Math.max(latestUploadAtMs, nextLatest);

      if (fileCount >= maxFiles) {
        scanLimited = true;
        stack.length = 0;
        break;
      }
    }
  }

  return {
    status: 'available',
    directoryBytes,
    fileCount,
    latestUploadAt: latestUploadAtMs === null ? null : new Date(latestUploadAtMs).toISOString(),
    scanLimited
  };
}

export async function getBuildRuntimeDiagnostics() {
  return {
    startedAt: PROCESS_STARTED_AT.toISOString(),
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - PROCESS_STARTED_AT.getTime()) / 1000)),
    version: await readPackageVersion(),
    buildId: env.OPS_BUILD_ID || null,
    deployedAt: normalizeIsoDateTime(env.OPS_DEPLOYED_AT)
  };
}

export async function getUploadDiagnostics(): Promise<UploadDiagnostics> {
  const now = Date.now();
  if (cachedUploadDiagnostics && cachedUploadDiagnostics.expiresAt > now) {
    return cachedUploadDiagnostics.value;
  }

  const uploadsDir = getUploadsDir();

  try {
    await stat(uploadsDir);
    const value = await scanUploadDirectory(uploadsDir);
    cachedUploadDiagnostics = {
      value,
      expiresAt: now + UPLOAD_SCAN_TTL_MS
    };
    return value;
  } catch {
    const value: UploadDiagnostics = {
      status: 'unavailable',
      directoryBytes: null,
      fileCount: null,
      latestUploadAt: null,
      scanLimited: false
    };
    cachedUploadDiagnostics = {
      value,
      expiresAt: now + UPLOAD_SCAN_TTL_MS
    };
    return value;
  }
}

export async function getBackupDiagnostics(): Promise<BackupDiagnostics> {
  const configuredPath = env.BACKUP_STATUS_PATH.trim();
  if (!configuredPath) {
    return {
      status: 'unconfigured',
      target: null,
      lastSuccessfulBackupAt: null
    };
  }

  try {
    const parsed = JSON.parse(await readFile(configuredPath, 'utf8')) as {
      status?: unknown;
      target?: unknown;
      lastSuccessfulBackupAt?: unknown;
    };

    return {
      status: typeof parsed.status === 'string' && parsed.status.trim() ? parsed.status.trim() : 'unavailable',
      target: typeof parsed.target === 'string' && parsed.target.trim() ? parsed.target.trim() : null,
      lastSuccessfulBackupAt: normalizeIsoDateTime(parsed.lastSuccessfulBackupAt)
    };
  } catch {
    return {
      status: 'unavailable',
      target: null,
      lastSuccessfulBackupAt: null
    };
  }
}

export function recordPushSendSuccess(): void {
  pushStats.successfulSends += 1;
}

export function recordPushSendFailure(): void {
  pushStats.failedSends += 1;
  pushStats.lastFailureAt = new Date().toISOString();
}

export function recordPushStaleTokenRemoval(): void {
  pushStats.staleTokensRemoved += 1;
}

export function getPushRuntimeDiagnostics() {
  return {
    successfulSends: pushStats.successfulSends,
    failedSends: pushStats.failedSends,
    staleTokensRemoved: pushStats.staleTokensRemoved,
    lastFailureAt: pushStats.lastFailureAt
  };
}

export function recordServerError(url: string | undefined): void {
  const group = classifyRouteGroup(url);
  errorStats.serverErrorCount += 1;
  errorStats.lastServerErrorAt = new Date().toISOString();
  errorStats.routeGroups.set(group, (errorStats.routeGroups.get(group) ?? 0) + 1);
}

export function getErrorRuntimeDiagnostics() {
  return {
    serverErrorCount: errorStats.serverErrorCount,
    lastServerErrorAt: errorStats.lastServerErrorAt,
    routeGroups: [...errorStats.routeGroups.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, MAX_ERROR_ROUTE_GROUPS)
      .map(([group, count]) => ({ group, count }))
  };
}

export function resetOperatorDiagnosticsForTests(): void {
  pushStats.successfulSends = 0;
  pushStats.failedSends = 0;
  pushStats.staleTokensRemoved = 0;
  pushStats.lastFailureAt = null;

  errorStats.serverErrorCount = 0;
  errorStats.lastServerErrorAt = null;
  errorStats.routeGroups.clear();

  cachedUploadDiagnostics = null;
}
