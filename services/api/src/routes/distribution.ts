import type { FastifyInstance } from 'fastify';
import { AppDistributionResponseSchema } from '@penthouse/contracts';
import { env } from '../config/env.js';

const LOCAL_APP_FALLBACK_URL = 'http://localhost:5173';
const LEGACY_ANDROID_NOTES = 'Deprecated Android APK retained only for existing installs. Use the PWA for new installs.';

function firstUsableOrigin(value: string): string | null {
  for (const origin of value.split(',')) {
    const trimmed = origin.trim();
    if (/^https?:\/\//.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function getPublicAppBaseUrl(): string {
  const configured = env.PUBLIC_APP_URL.trim();
  return normalizeBaseUrl(configured || firstUsableOrigin(env.CORS_ORIGIN) || LOCAL_APP_FALLBACK_URL);
}

function normalizeDownloadPath(value: string): string {
  const trimmed = value.trim() || '/downloads/legacy/the-penthouse.apk';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function registerDistributionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/app-distribution', async (_request, reply) => {
    const appUrl = getPublicAppBaseUrl();
    const legacyDownloadPath = normalizeDownloadPath(env.LEGACY_APK_DOWNLOAD_PATH);

    const payload = AppDistributionResponseSchema.parse({
      sourceOfTruth: 'pwa',
      defaultPlatform: 'pwa',
      pwa: {
        status: 'live',
        url: appUrl,
        installUrl: appUrl
      },
      legacyAndroid: {
        status: env.LEGACY_APK_STATUS,
        deprecated: true,
        url: new URL(legacyDownloadPath, `${appUrl}/`).toString(),
        fileName: legacyDownloadPath.split('/').filter(Boolean).at(-1) ?? 'the-penthouse.apk',
        notes: LEGACY_ANDROID_NOTES
      }
    });

    return reply
      .header('Cache-Control', 'public, max-age=60')
      .send(payload);
  });
}
