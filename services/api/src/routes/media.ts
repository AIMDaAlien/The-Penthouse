import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { db } from '../db/pool.js';
import { mediaUploads } from '../db/schema.js';
import { notFound } from '../utils/error-responses.js';
import { processImage, type ImagePurpose } from '../utils/image-processing.js';

function mediaKind(contentType?: string): 'image' | 'video' | 'file' {
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  return 'file';
}

const UploadQuerySchema = z.object({
  purpose: z.enum(['avatar', 'banner']).optional()
});

export async function registerMediaRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/media/upload', { preHandler: fastify.authenticate }, async (request) => {
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

    if (purpose && mediaKind(part.mimetype) === 'image') {
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
      mediaKind: mediaKind(contentType)
    }).returning();

    return {
      id: row.id,
      fileName: row.fileName,
      originalFileName: row.originalFileName,
      url: `/api/v1/media/${row.id}`,
      size: row.sizeBytes,
      contentType: row.contentType ?? undefined,
      mediaKind: row.mediaKind
    };
  });

  fastify.get('/api/v1/media/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const params = request.params as { id: string };
    const [row] = await db.select().from(mediaUploads).where(eq(mediaUploads.id, params.id)).limit(1);
    if (!row) throw notFound('Media not found');

    const resolved = path.resolve(env.UPLOAD_DIR, row.storageKey);
    const base = path.resolve(env.UPLOAD_DIR);
    if (!resolved.startsWith(base)) throw notFound('Media not found');

    if (row.contentType) reply.header('content-type', row.contentType);
    return reply.send(createReadStream(resolved));
  });
}
