import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { db } from '../db/pool.js';
import { mediaUploads } from '../db/schema.js';
import { forbidden, notFound } from '../utils/error-responses.js';
import { processImage, type ImagePurpose } from '../utils/image-processing.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { privateMediaUrl, publicMediaUrl, verifySignedPrivateMediaToken } from '../utils/media-access.js';

function classifyUpload(fileName: string, contentType?: string): 'image' | 'video' | 'file' {
  const extension = path.extname(fileName).toLowerCase();
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('audio/')) return 'file';
  if (['.apng', '.avif', '.gif', '.heic', '.jpeg', '.jpg', '.png', '.webp'].includes(extension)) return 'image';
  if (['.m4v', '.mov', '.mp4', '.mpeg', '.mpg', '.webm'].includes(extension)) return 'video';
  return 'file';
}

const UploadQuerySchema = z.object({
  purpose: z.enum(['avatar', 'banner']).optional()
});

async function sendMediaFile(row: typeof mediaUploads.$inferSelect, reply: FastifyReply) {
  const base = path.resolve(env.UPLOAD_DIR);
  const resolved = path.resolve(base, row.storageKey);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw notFound('Media not found');

  const info = await stat(resolved).catch(() => null);
  if (!info?.isFile()) throw notFound('Media not found');

  if (row.contentType) reply.header('content-type', row.contentType);
  return reply.send(createReadStream(resolved));
}

export async function registerMediaRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/media/upload', { preHandler: [fastify.authenticate, rateLimit(10)] }, async (request) => {
    await mkdir(env.UPLOAD_DIR, { recursive: true });
    const part = await request.file();
    if (!part) throw notFound('No file uploaded');

    const query = UploadQuerySchema.parse(request.query);
    const purpose: ImagePurpose | undefined = query.purpose as ImagePurpose | undefined;

    const ext = path.extname(part.filename);
    const storageKey = `${randomUUID()}${ext}`;
    const target = path.join(env.UPLOAD_DIR, storageKey);
    await pipeline(part.file, createWriteStream(target));

    let contentType = part.mimetype;
    let sizeBytes: number;

    const kind = classifyUpload(part.filename, part.mimetype);
    if (purpose && kind === 'image') {
      const processed = await processImage(target, part.mimetype, purpose);
      contentType = processed.contentType;
      sizeBytes = processed.sizeBytes;
    } else {
      const info = await stat(target);
      sizeBytes = info.size;
    }

    const [row] = await db.insert(mediaUploads).values({
      uploaderId: request.authUser!.userId,
      fileName: storageKey,
      originalFileName: part.filename,
      storageKey,
      sizeBytes,
      contentType,
      mediaKind: classifyUpload(part.filename, contentType),
      scope: purpose ? 'public' : 'private'
    }).returning();

    return {
      id: row.id,
      fileName: row.fileName,
      originalFileName: row.originalFileName,
      url: row.scope === 'public' ? publicMediaUrl(row.id) : privateMediaUrl(row.id),
      size: row.sizeBytes,
      contentType: row.contentType ?? undefined,
      mediaKind: row.mediaKind
    };
  });

  fastify.get('/api/v1/media/public/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const [row] = await db.select().from(mediaUploads).where(eq(mediaUploads.id, params.id)).limit(1);
    if (!row || row.scope !== 'public') throw notFound('Media not found');
    return sendMediaFile(row, reply);
  });

  fastify.get('/api/v1/media/signed/:payload/:signature', async (request, reply) => {
    const params = request.params as { payload: string; signature: string };
    const mediaId = verifySignedPrivateMediaToken(`${params.payload}.${params.signature}`);
    const [row] = await db.select().from(mediaUploads).where(eq(mediaUploads.id, mediaId)).limit(1);
    if (!row) throw notFound('Media not found');
    return sendMediaFile(row, reply);
  });

  fastify.get('/api/v1/media/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const [row] = await db.select().from(mediaUploads).where(eq(mediaUploads.id, params.id)).limit(1);
    if (!row) throw notFound('Media not found');
    if (row.scope !== 'public' && row.uploaderId !== request.authUser!.userId) {
      throw forbidden('Only the uploader can access this media');
    }

    return sendMediaFile(row, reply);
  });
}

export const __testables = {
  classifyUpload
};
