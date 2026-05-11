import type { FastifyInstance } from 'fastify';
import { db } from '../db/pool.js';
import { userWallpapers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { notFound } from '../utils/error-responses.js';

const CreateWallpaperSchema = z.object({
	chatId: z.string().uuid().optional(),
	isGlobal: z.boolean().default(false),
	wallpaperUrl: z.string().url().optional(),
	wallpaperColor: z.string().optional(),
	opacity: z.string().default('1')
});

export async function registerWallpaperRoutes(fastify: FastifyInstance) {
	fastify.get('/api/v1/wallpapers', { preHandler: fastify.authenticate }, async (request) => {
		const rows = await db.select().from(userWallpapers)
			.where(eq(userWallpapers.userId, request.authUser!.userId));
		return { wallpapers: rows };
	});

	fastify.post('/api/v1/wallpapers', { preHandler: fastify.authenticate }, async (request) => {
		const body = CreateWallpaperSchema.parse(request.body);
		const [wallpaper] = await db.insert(userWallpapers).values({
			userId: request.authUser!.userId,
			...body
		}).returning();
		return wallpaper;
	});

	fastify.delete('/api/v1/wallpapers/:id', { preHandler: fastify.authenticate }, async (request) => {
		const params = request.params as { id: string };
		const [existing] = await db.select().from(userWallpapers)
			.where(and(
				eq(userWallpapers.id, params.id),
				eq(userWallpapers.userId, request.authUser!.userId)
			)).limit(1);
		if (!existing) throw notFound('Wallpaper not found');
		await db.delete(userWallpapers).where(eq(userWallpapers.id, params.id));
		return { success: true };
	});
}
