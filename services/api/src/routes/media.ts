import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { pipeline } from 'node:stream/promises';
import {
  GifProviderSchema,
  GifSearchResponseSchema,
  type GifProvider,
  type MediaKind,
  UploadResponseSchema
} from '@penthouse/contracts';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { ensureUploadsDirReady } from '../utils/uploads.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const AUDIO_EXTENSIONS = new Set(['.webm', '.ogg', '.oga', '.mp3', '.m4a']);
const AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.json', '.log', '.csv', '.yaml', '.yml', '.xml']);
const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'text/csv',
  'text/markdown',
  'text/plain',
  'text/xml'
]);
const GIF_PROVIDER_CACHE_TTL_MS = 60 * 60 * 1000;
const GIF_PROVIDER_CACHE_MAX_ENTRIES = 200;
const GIF_PROVIDER_NOT_CONFIGURED_ERROR = 'GIF provider not configured';
const gifProviderCache = new Map<string, { expiresAt: number; data: unknown }>();

type UploadRateLimitRow = {
  upload_count: number | string;
  retry_after_seconds: number | string | null;
};

type UploadRateLimitState = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function pruneGifProviderCache(now = Date.now()): void {
  for (const [key, entry] of gifProviderCache.entries()) {
    if (entry.expiresAt <= now) {
      gifProviderCache.delete(key);
    }
  }

  while (gifProviderCache.size > GIF_PROVIDER_CACHE_MAX_ENTRIES) {
    const oldestKey = gifProviderCache.keys().next().value;
    if (!oldestKey) break;
    gifProviderCache.delete(oldestKey);
  }
}

function safeOriginalFileName(fileName: string): string {
  const base = path.basename(fileName || 'attachment');
  const sanitized = base.replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
  return sanitized || 'attachment';
}

function extensionForFile(fileName: string, mimeType: string): string {
  const rawExt = path.extname(fileName).toLowerCase();
  if (rawExt && rawExt.length <= 10) return rawExt;

  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'video/mp4') return '.mp4';
  if (mimeType === 'video/webm') return '.webm';
  if (mimeType === 'audio/webm') return '.webm';
  if (mimeType === 'audio/ogg') return '.ogg';
  if (mimeType === 'audio/mp4') return '.m4a';
  if (mimeType === 'audio/mpeg') return '.mp3';
  if (mimeType === 'text/plain') return '.txt';
  if (mimeType === 'text/markdown') return '.md';
  if (mimeType === 'application/json') return '.json';

  return '';
}

function classifyUpload(fileName: string, mimeType: string): MediaKind | null {
  const ext = extensionForFile(fileName, mimeType);

  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }

  if (AUDIO_MIME_TYPES.has(mimeType)) {
    return 'file';
  }

  if (VIDEO_EXTENSIONS.has(ext) || mimeType.startsWith('video/')) {
    return 'video';
  }

  if (AUDIO_EXTENSIONS.has(ext) || mimeType.startsWith('text/') || TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(ext)) {
    return 'file';
  }

  return null;
}

async function fetchJsonWithCache(url: string): Promise<unknown> {
  const now = Date.now();
  pruneGifProviderCache(now);
  const cached = gifProviderCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('GIF provider timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Upstream responded ${response.status}`);
  }

  const data = await response.json();
  gifProviderCache.set(url, {
    expiresAt: now + GIF_PROVIDER_CACHE_TTL_MS,
    data
  });
  pruneGifProviderCache(now);
  return data;
}

function clearGifProviderCache(): void {
  gifProviderCache.clear();
}

function extractGiphyResults(json: any): ReturnType<typeof GifSearchResponseSchema.parse>['results'] {
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map((gif: any) => ({
    id: String(gif.id),
    url: String(gif?.images?.original?.url || gif?.images?.downsized?.url || ''),
    previewUrl: String(gif?.images?.fixed_height_small?.url || gif?.images?.preview_gif?.url || gif?.images?.original?.url || ''),
    renderMode: 'image' as const,
    title: typeof gif?.title === 'string' && gif.title.trim() ? gif.title : null,
    width: Number.parseInt(gif?.images?.original?.width ?? '', 10) || null,
    height: Number.parseInt(gif?.images?.original?.height ?? '', 10) || null,
    provider: 'giphy' as const
  })).filter((item: any) => item.url && item.previewUrl);
}

function extractKlipyResults(json: any): ReturnType<typeof GifSearchResponseSchema.parse>['results'] {
  const nestedRows = json?.data?.data;
  const directRows = json?.data;
  const v2Rows = json?.results;
  let rows: any[] = [];

  if (Array.isArray(v2Rows)) {
    rows = v2Rows;
  } else if (Array.isArray(nestedRows)) {
    rows = nestedRows;
  } else if (Array.isArray(directRows)) {
    rows = directRows;
  } else if (json && typeof json === 'object') {
    throw new Error('Klipy provider parse failure');
  }

  const results = rows.map((gif: any) => {
    const file = gif?.file ?? {};
    const files = gif?.files ?? {};
    const formats = gif?.media_formats ?? {};
    const selectedFormat =
      formats.mediumgif ??
      formats.gif ??
      formats.tinygif ??
      formats.nanogif ??
      file?.md?.gif ??
      file?.hd?.gif ??
      file?.gif ??
      files?.gif ??
      files?.webp ??
      files?.mp4 ??
      null;
    const previewFormat =
      formats.preview ??
      formats.gifpreview ??
      formats.tinygifpreview ??
      file?.preview ??
      file?.jpg ??
      file?.md?.jpg ??
      file?.hd?.jpg ??
      files?.preview ??
      null;
    const url =
      selectedFormat?.url ||
      file?.url ||
      gif?.url ||
      '';
    const previewUrl =
      previewFormat?.url ||
      file?.preview_url ||
      gif?.blur_preview ||
      gif?.preview_url ||
      url;
    const dims = Array.isArray(selectedFormat?.dims) ? selectedFormat.dims : null;
    const previewDims = Array.isArray(previewFormat?.dims) ? previewFormat.dims : null;
    const mimeType = String(
      selectedFormat?.mime_type ||
      selectedFormat?.mimeType ||
      file?.mime_type ||
      file?.mimeType ||
      ''
    ).toLowerCase();
    const renderMode: 'image' | 'video' = mimeType.includes('video') || /\.(mp4|webm)(?:$|[?#])/i.test(String(url))
      ? 'video'
      : 'image';

    return {
      id: String(gif?.id || gif?.slug || randomUUID()),
      url: String(url),
      previewUrl: String(previewUrl),
      renderMode,
      title: typeof gif?.title === 'string' && gif.title.trim() ? gif.title : null,
      width: Number.parseInt(String(
        gif?.width ||
        selectedFormat?.width ||
        dims?.[0] ||
        previewFormat?.width ||
        previewDims?.[0] ||
        file?.width ||
        files?.gif?.width ||
        ''
      ), 10) || null,
      height: Number.parseInt(String(
        gif?.height ||
        selectedFormat?.height ||
        dims?.[1] ||
        previewFormat?.height ||
        previewDims?.[1] ||
        file?.height ||
        files?.gif?.height ||
        ''
      ), 10) || null,
      provider: 'klipy' as const
    };
  }).filter((item: any) => item.url && item.previewUrl);

  if (rows.length > 0 && results.length === 0) {
    throw new Error('Klipy provider parse failure');
  }

  return results;
}

function normalizeLimit(raw: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function getUploadRateLimitState(
  db: Pick<typeof pool, 'query'>,
  userId: string
): Promise<UploadRateLimitState> {
  const result = await db.query<UploadRateLimitRow>(
    `SELECT COUNT(*)::int AS upload_count,
            COALESCE(
              CEIL(EXTRACT(EPOCH FROM (MIN(created_at) + ($2::int * INTERVAL '1 minute') - NOW())))::int,
              $2::int * 60
            ) AS retry_after_seconds
       FROM media_uploads
      WHERE uploader_id = $1
        AND created_at >= NOW() - ($2::int * INTERVAL '1 minute')`,
    [userId, env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES]
  );

  const row = result.rows[0];
  const uploadCount = Number(row?.upload_count ?? 0);
  if (uploadCount < env.UPLOAD_RATE_LIMIT_MAX_FILES) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Number(row?.retry_after_seconds ?? env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES * 60))
  };
}

function sendUploadRateLimit(reply: FastifyReply, state: UploadRateLimitState) {
  return reply
    .header('Retry-After', String(state.retryAfterSeconds))
    .status(429)
    .send({
      error: `Upload limit reached. You can upload up to ${env.UPLOAD_RATE_LIMIT_MAX_FILES} files every ${env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      retryAfterSeconds: state.retryAfterSeconds
    });
}

async function fetchGifProvider(provider: GifProvider, mode: 'trending' | 'search', query?: string, limit = 30) {
  if (provider === 'giphy') {
    if (!env.GIPHY_API_KEY) {
      throw new Error('GIPHY not configured');
    }

    const cappedLimit = normalizeLimit(limit, 30, 30);
    const url = mode === 'trending'
      ? `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&limit=${cappedLimit}&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&q=${encodeURIComponent(query || '')}&limit=${cappedLimit}&rating=pg-13`;
    return extractGiphyResults(await fetchJsonWithCache(url));
  }

  if (!env.KLIPY_API_KEY) {
    throw new Error(GIF_PROVIDER_NOT_CONFIGURED_ERROR);
  }

  const cappedLimit = normalizeLimit(limit, 30, 30);
  const url = mode === 'trending'
    ? `https://api.klipy.com/v2/featured?key=${encodeURIComponent(env.KLIPY_API_KEY)}&limit=${cappedLimit}`
    : `https://api.klipy.com/v2/search?key=${encodeURIComponent(env.KLIPY_API_KEY)}&q=${encodeURIComponent(query || '')}&limit=${cappedLimit}`;
  return extractKlipyResults(await fetchJsonWithCache(url));
}

export const __testables = {
  classifyUpload,
  clearGifProviderCache,
  extractKlipyResults,
  fetchGifProvider,
  fetchJsonWithCache,
  getUploadRateLimitState,
  pruneGifProviderCache,
  gifProviderCacheSize: () => gifProviderCache.size
};

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/media/upload', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'No file uploaded' });

    const originalFileName = safeOriginalFileName(part.filename || 'attachment');
    const mediaKind = classifyUpload(originalFileName, part.mimetype);
    if (!mediaKind) {
      return reply.status(415).send({ error: 'Unsupported file type' });
    }

    const initialRateLimit = await getUploadRateLimitState(pool, request.user.userId);
    if (!initialRateLimit.allowed) {
      part.file.resume();
      return sendUploadRateLimit(reply, initialRateLimit);
    }

    const uploadDir = await ensureUploadsDirReady();

    const extension = extensionForFile(originalFileName, part.mimetype).slice(0, 10);
    const id = randomUUID();
    const storageKey = `${id}${extension}`;
    const filePath = path.join(uploadDir, storageKey);

    try {
      await pipeline(part.file, createWriteStream(filePath));
      if (part.file.truncated) {
        await rm(filePath, { force: true });
        return reply.status(413).send({ error: 'File too large' });
      }

      const size = Number(part.file.bytesRead || 0);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1), 0)', [`media-upload:${request.user.userId}`]);

        const finalRateLimit = await getUploadRateLimitState(client, request.user.userId);
        if (!finalRateLimit.allowed) {
          await client.query('ROLLBACK');
          await rm(filePath, { force: true });
          return sendUploadRateLimit(reply, finalRateLimit);
        }

        await client.query(
          `INSERT INTO media_uploads(
            id,
            uploader_id,
            file_name,
            original_file_name,
            storage_key,
            file_path,
            size_bytes,
            content_type,
            media_kind
          ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, request.user.userId, originalFileName, originalFileName, storageKey, filePath, size, part.mimetype, mediaKind]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }

      return reply.status(201).send(
        UploadResponseSchema.parse({
          id,
          fileName: storageKey,
          originalFileName,
          url: `/uploads/${storageKey}`,
          size,
          contentType: part.mimetype,
          mediaKind
        })
      );
    } catch (error) {
      await rm(filePath, { force: true }).catch(() => undefined);
      throw error;
    }
  });

  app.get('/api/v1/gifs/:provider/trending', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { provider: rawProvider } = request.params as { provider: string };
    const { limit: rawLimit } = request.query as { limit?: string | number };
    const provider = GifProviderSchema.safeParse(rawProvider);
    if (!provider.success) {
      return reply.status(404).send({ error: 'Unknown GIF provider' });
    }

    try {
      const limit = normalizeLimit(rawLimit, 30, 30);
      return GifSearchResponseSchema.parse({
        provider: provider.data,
        results: await fetchGifProvider(provider.data, 'trending', undefined, limit)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch GIFs';
      const statusCode = /not configured/i.test(message) ? 503 : 502;
      const publicError = /not configured/i.test(message)
        ? message
        : provider.data === 'klipy'
          ? 'Klipy temporarily unavailable'
          : 'Failed to fetch GIFs';
      request.log.warn({ provider: provider.data, error: message }, 'gif provider trending failed');
      return reply.status(statusCode).send({ error: publicError });
    }
  });

  app.get('/api/v1/gifs/:provider/search', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { provider: rawProvider } = request.params as { provider: string };
    const { q, limit: rawLimit } = request.query as { q?: string; limit?: string | number };
    const provider = GifProviderSchema.safeParse(rawProvider);
    if (!provider.success) {
      return reply.status(404).send({ error: 'Unknown GIF provider' });
    }
    if (!q?.trim()) {
      return reply.status(400).send({ error: 'Search query required' });
    }

    try {
      const limit = normalizeLimit(rawLimit, 30, 30);
      return GifSearchResponseSchema.parse({
        provider: provider.data,
        results: await fetchGifProvider(provider.data, 'search', q.trim(), limit)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search GIFs';
      const statusCode = /not configured/i.test(message) ? 503 : 502;
      const publicError = /not configured/i.test(message)
        ? message
        : provider.data === 'klipy'
          ? 'Klipy temporarily unavailable'
          : 'Failed to search GIFs';
      request.log.warn({ provider: provider.data, error: message }, 'gif provider search failed');
      return reply.status(statusCode).send({ error: publicError });
    }
  });

  app.get('/api/v1/gifs/search', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const {
      q,
      provider: rawProvider = 'giphy',
      limit: rawLimit
    } = request.query as { q?: string; provider?: string; limit?: string | number };

    const provider = GifProviderSchema.safeParse(rawProvider);
    if (!provider.success) {
      return reply.status(404).send({ error: 'Unknown GIF provider' });
    }
    if (!q?.trim()) {
      return reply.status(400).send({ error: 'Search query required' });
    }

    try {
      const limit = normalizeLimit(rawLimit, 20, 20);
      return GifSearchResponseSchema.parse({
        provider: provider.data,
        results: await fetchGifProvider(provider.data, 'search', q.trim(), limit)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search GIFs';
      const statusCode = /not configured/i.test(message) ? 503 : 502;
      const publicError = /not configured/i.test(message)
        ? message
        : provider.data === 'klipy'
          ? 'Klipy temporarily unavailable'
          : 'Failed to search GIFs';
      request.log.warn({ provider: provider.data, error: message }, 'gif provider search failed');
      return reply.status(statusCode).send({ error: publicError });
    }
  });
}
