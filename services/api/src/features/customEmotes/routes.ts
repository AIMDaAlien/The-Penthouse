import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/pool.js';
import { customEmotes, mediaUploads, stickerPacks, stickers } from '../../db/schema.js';
import { notFound, forbidden } from '../../utils/error-responses.js';

const CreateEmoteBodySchema = z.object({
  name: z.string().trim().min(1).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  mediaUploadId: z.string().uuid()
});

const CreateStickerPackBodySchema = z.object({
  name: z.string().trim().min(1).max(64)
});

const CreateStickerBodySchema = z.object({
  name: z.string().trim().min(1).max(32),
  mediaUploadId: z.string().uuid()
});

function emoteUrl(mediaUploadId: string): string {
  return `/api/v1/media/public/${mediaUploadId}`;
}

async function assertOwnedImageUpload(mediaUploadId: string, userId: string, role: 'admin' | 'member') {
  const [upload] = await db.select()
    .from(mediaUploads)
    .where(eq(mediaUploads.id, mediaUploadId))
    .limit(1);
  if (!upload) throw notFound('Media upload not found');
  if (upload.mediaKind !== 'image') throw forbidden('Only image uploads can be used here');
  if (upload.uploaderId !== userId && role !== 'admin') {
    throw forbidden('Only the uploader or admins can use this media upload');
  }
  return upload;
}

async function markPublicMedia(mediaUploadId: string) {
  await db.update(mediaUploads).set({ scope: 'public' }).where(eq(mediaUploads.id, mediaUploadId));
}

function assertPackVisible(pack: typeof stickerPacks.$inferSelect, userId: string, role: 'admin' | 'member') {
  if (!pack.isPublic && pack.userId !== userId && role !== 'admin') {
    throw forbidden('Sticker pack is private');
  }
}

export async function registerCustomEmoteRoutes(fastify: FastifyInstance) {
  // ─── Custom Emotes ───

  fastify.get('/api/v1/emotes', { preHandler: fastify.authenticate }, async (request) => {
    const rows = await db.select().from(customEmotes)
      .where(eq(customEmotes.userId, request.authUser!.userId))
      .orderBy(customEmotes.name);

    return {
      emotes: rows.map((e) => ({
        id: e.id,
        name: e.name,
        url: emoteUrl(e.mediaUploadId),
        width: e.width,
        height: e.height,
        isAnimated: e.isAnimated,
        createdAt: e.createdAt.toISOString()
      }))
    };
  });

  fastify.post('/api/v1/emotes', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateEmoteBodySchema.parse(request.body);
    await assertOwnedImageUpload(body.mediaUploadId, request.authUser!.userId, request.authUser!.role);
    const [row] = await db.transaction(async (tx) => {
      await tx.update(mediaUploads).set({ scope: 'public' }).where(eq(mediaUploads.id, body.mediaUploadId));
      return tx.insert(customEmotes).values({
        userId: request.authUser!.userId,
        name: body.name,
        mediaUploadId: body.mediaUploadId
      }).returning();
    });

    return {
      emote: {
        id: row.id,
        name: row.name,
        url: emoteUrl(row.mediaUploadId),
        width: row.width,
        height: row.height,
        isAnimated: row.isAnimated,
        createdAt: row.createdAt.toISOString()
      }
    };
  });

  fastify.delete('/api/v1/emotes/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const [existing] = await db.select().from(customEmotes)
      .where(eq(customEmotes.id, params.id))
      .limit(1);
    if (!existing) throw notFound('Emote not found');
    if (existing.userId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the owner or admins can delete this emote');
    }
    await db.delete(customEmotes).where(eq(customEmotes.id, params.id));
    return { success: true };
  });

  // ─── Sticker Packs ───

  fastify.get('/api/v1/sticker-packs', { preHandler: fastify.authenticate }, async (request) => {
    const rows = await db.select().from(stickerPacks)
      .where(eq(stickerPacks.userId, request.authUser!.userId))
      .orderBy(stickerPacks.name);

    return {
      packs: rows.map((p) => ({
        id: p.id,
        name: p.name,
        thumbnailUrl: p.thumbnailMediaUploadId ? emoteUrl(p.thumbnailMediaUploadId) : null,
        isPublic: p.isPublic,
        createdAt: p.createdAt.toISOString()
      }))
    };
  });

  fastify.post('/api/v1/sticker-packs', { preHandler: fastify.authenticate }, async (request) => {
    const body = CreateStickerPackBodySchema.parse(request.body);
    const [row] = await db.insert(stickerPacks).values({
      userId: request.authUser!.userId,
      name: body.name
    }).returning();

    return {
      pack: {
        id: row.id,
        name: row.name,
        thumbnailUrl: null,
        isPublic: row.isPublic,
        createdAt: row.createdAt.toISOString()
      }
    };
  });

  fastify.delete('/api/v1/sticker-packs/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const [existing] = await db.select().from(stickerPacks)
      .where(eq(stickerPacks.id, params.id))
      .limit(1);
    if (!existing) throw notFound('Sticker pack not found');
    if (existing.userId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the owner or admins can delete this pack');
    }
    await db.delete(stickerPacks).where(eq(stickerPacks.id, params.id));
    return { success: true };
  });

  // ─── Stickers ───

  fastify.get('/api/v1/sticker-packs/:id/stickers', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const [pack] = await db.select().from(stickerPacks)
      .where(eq(stickerPacks.id, params.id))
      .limit(1);
    if (!pack) throw notFound('Sticker pack not found');
    assertPackVisible(pack, request.authUser!.userId, request.authUser!.role);

    const rows = await db.select().from(stickers)
      .where(eq(stickers.packId, params.id))
      .orderBy(stickers.sortOrder, stickers.name);

    return {
      stickers: rows.map((s) => ({
        id: s.id,
        packId: s.packId,
        name: s.name,
        url: emoteUrl(s.mediaUploadId),
        sortOrder: s.sortOrder,
        createdAt: s.createdAt.toISOString()
      }))
    };
  });

  fastify.post('/api/v1/sticker-packs/:id/stickers', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const body = CreateStickerBodySchema.parse(request.body);
    const [pack] = await db.select().from(stickerPacks)
      .where(eq(stickerPacks.id, params.id))
      .limit(1);
    if (!pack) throw notFound('Sticker pack not found');
    if (pack.userId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the pack owner or admins can add stickers');
    }
    await assertOwnedImageUpload(body.mediaUploadId, request.authUser!.userId, request.authUser!.role);
    await markPublicMedia(body.mediaUploadId);

    const [row] = await db.insert(stickers).values({
      packId: params.id,
      name: body.name,
      mediaUploadId: body.mediaUploadId
    }).returning();

    return {
      sticker: {
        id: row.id,
        packId: row.packId,
        name: row.name,
        url: emoteUrl(row.mediaUploadId),
        sortOrder: row.sortOrder,
        createdAt: row.createdAt.toISOString()
      }
    };
  });

  fastify.delete('/api/v1/stickers/:id', { preHandler: fastify.authenticate }, async (request) => {
    const params = request.params as { id: string };
    const [existing] = await db.select()
      .from(stickers)
      .innerJoin(stickerPacks, eq(stickers.packId, stickerPacks.id))
      .where(eq(stickers.id, params.id))
      .limit(1);
    if (!existing) throw notFound('Sticker not found');
    if (existing.sticker_packs.userId !== request.authUser!.userId && request.authUser!.role !== 'admin') {
      throw forbidden('Only the pack owner or admins can delete this sticker');
    }
    await db.delete(stickers).where(eq(stickers.id, params.id));
    return { success: true };
  });
}
