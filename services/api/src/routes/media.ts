import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { pipeline } from 'node:stream/promises';
import { UploadResponseSchema } from '@penthouse/contracts';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/media/upload', { preHandler: [app.authenticate] }, async (request, reply) => {
    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'No file uploaded' });

    const uploadDir = path.join(process.cwd(), 'services/api/uploads');
    await mkdir(uploadDir, { recursive: true });

    const extension = path.extname(part.filename || '').slice(0, 10);
    const id = randomUUID();
    const fileName = `${id}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await pipeline(part.file, createWriteStream(filePath));

    const size = Number(part.file.bytesRead || 0);
    if (size > env.UPLOAD_MAX_MB * 1024 * 1024) {
      return reply.status(413).send({ error: 'File too large' });
    }

    await pool.query(
      'INSERT INTO media_uploads(id, uploader_id, file_name, file_path, size_bytes) VALUES($1, $2, $3, $4, $5)',
      [id, request.user.userId, part.filename, filePath, size]
    );

    const response = UploadResponseSchema.parse({
      id,
      fileName: part.filename,
      url: `/uploads/${fileName}`,
      size
    });

    return reply.status(201).send(response);
  });
}
