import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
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

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
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

  if (VIDEO_EXTENSIONS.has(ext) || mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('text/') || TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(ext)) {
    return 'file';
  }

  return null;
}

async function fetchJsonWithCache(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream responded ${response.status}`);
  }

  return response.json();
}

function extractGiphyResults(json: any): ReturnType<typeof GifSearchResponseSchema.parse>['results'] {
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map((gif: any) => ({
    id: String(gif.id),
    url: String(gif?.images?.original?.url || gif?.images?.downsized?.url || ''),
    previewUrl: String(gif?.images?.fixed_height_small?.url || gif?.images?.preview_gif?.url || gif?.images?.original?.url || ''),
    title: typeof gif?.title === 'string' && gif.title.trim() ? gif.title : null,
    width: Number.parseInt(gif?.images?.original?.width ?? '', 10) || null,
    height: Number.parseInt(gif?.images?.original?.height ?? '', 10) || null,
    provider: 'giphy' as const
  })).filter((item: any) => item.url && item.previewUrl);
}

function extractKlipyResults(json: any): ReturnType<typeof GifSearchResponseSchema.parse>['results'] {
  const nestedRows = json?.data?.data;
  const directRows = json?.data;
  let rows: any[] = [];

  if (Array.isArray(nestedRows)) {
    rows = nestedRows;
  } else if (Array.isArray(directRows)) {
    rows = directRows;
  } else if (json && typeof json === 'object' && ('data' in json || 'result' in json)) {
    throw new Error('Klipy provider parse failure');
  }

  const results = rows.map((gif: any) => {
    const file = gif?.file ?? {};
    const files = gif?.files ?? {};
    const url = file?.url || files?.gif?.url || files?.webp?.url || files?.mp4?.url || gif?.url || '';
    const previewUrl = file?.preview_url || gif?.blur_preview || files?.preview?.url || gif?.preview_url || url;

    return {
      id: String(gif?.id || gif?.slug || randomUUID()),
      url: String(url),
      previewUrl: String(previewUrl),
      title: typeof gif?.title === 'string' && gif.title.trim() ? gif.title : null,
      width: Number.parseInt(String(gif?.width || file?.width || files?.gif?.width || ''), 10) || null,
      height: Number.parseInt(String(gif?.height || file?.height || files?.gif?.height || ''), 10) || null,
      provider: 'klipy' as const
    };
  }).filter((item: any) => item.url && item.previewUrl);

  if (rows.length > 0 && results.length === 0) {
    throw new Error('Klipy provider parse failure');
  }

  return results;
}

async function fetchGifProvider(provider: GifProvider, mode: 'trending' | 'search', query?: string) {
  if (provider === 'giphy') {
    if (!env.GIPHY_API_KEY) {
      throw new Error('GIPHY not configured');
    }

    const limit = 30;
    const url = mode === 'trending'
      ? `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&limit=${limit}&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&q=${encodeURIComponent(query || '')}&limit=${limit}&rating=pg-13`;
    return extractGiphyResults(await fetchJsonWithCache(url));
  }

  if (!env.KLIPY_API_KEY) {
    throw new Error('Klipy not configured');
  }

  const url = mode === 'trending'
    ? `https://api.klipy.com/api/v1/${encodeURIComponent(env.KLIPY_API_KEY)}/gifs/trending?per_page=30&page=1`
    : `https://api.klipy.com/api/v1/${encodeURIComponent(env.KLIPY_API_KEY)}/gifs/search?q=${encodeURIComponent(query || '')}&per_page=30&page=1`;
  return extractKlipyResults(await fetchJsonWithCache(url));
}

export const __testables = {
  classifyUpload,
  extractKlipyResults
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

    const uploadDir = path.join(process.cwd(), 'services/api/uploads');
    await mkdir(uploadDir, { recursive: true });

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
      await pool.query(
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
    const provider = GifProviderSchema.safeParse(rawProvider);
    if (!provider.success) {
      return reply.status(404).send({ error: 'Unknown GIF provider' });
    }

    try {
      return GifSearchResponseSchema.parse({
        provider: provider.data,
        results: await fetchGifProvider(provider.data, 'trending')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch GIFs';
      const statusCode = /not configured/i.test(message) ? 503 : 502;
      return reply.status(statusCode).send({ error: message });
    }
  });

  app.get('/api/v1/gifs/:provider/search', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
    const { provider: rawProvider } = request.params as { provider: string };
    const { q } = request.query as { q?: string };
    const provider = GifProviderSchema.safeParse(rawProvider);
    if (!provider.success) {
      return reply.status(404).send({ error: 'Unknown GIF provider' });
    }
    if (!q?.trim()) {
      return reply.status(400).send({ error: 'Search query required' });
    }

    try {
      return GifSearchResponseSchema.parse({
        provider: provider.data,
        results: await fetchGifProvider(provider.data, 'search', q.trim())
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search GIFs';
      const statusCode = /not configured/i.test(message) ? 503 : 502;
      return reply.status(statusCode).send({ error: message });
    }
  });
}
