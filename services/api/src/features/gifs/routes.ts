import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const GifSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional()
});

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: GiphyImage;
    fixed_height: GiphyImage;
    fixed_height_downsampled: GiphyImage;
    preview_gif?: GiphyImage;
  };
}

const GIPHY_API_KEY = 'H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN';
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING_URL = 'https://api.giphy.com/v1/gifs/trending';

export async function registerGifRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/gifs/search', { preHandler: fastify.authenticate }, async (request) => {
    const rawQuery = request.query as { q?: unknown; limit?: unknown };
    const query = GifSearchQuerySchema.parse({
      q: typeof rawQuery.q === 'string' && rawQuery.q.trim() ? rawQuery.q : undefined,
      limit: rawQuery.limit
    });
    const limit = query.limit ?? 20;
    const searchTerm = query.q ?? '';

    try {
      const url = new URL(searchTerm ? GIPHY_SEARCH_URL : GIPHY_TRENDING_URL);
      url.searchParams.set('api_key', GIPHY_API_KEY);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', '0');
      url.searchParams.set('rating', 'g');
      if (searchTerm) {
        url.searchParams.set('q', searchTerm);
        url.searchParams.set('lang', 'en');
      }

      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        fastify.log.warn({ status: response.status }, 'Giphy API error');
        return { provider: 'giphy' as const, results: [] };
      }

      const data = await response.json() as { data: GiphyGif[] };
      const results = (data.data ?? []).map((gif): {
        id: string;
        url: string;
        previewUrl: string;
        renderMode: 'image';
        title: string | null;
        width: number;
        height: number;
        provider: 'giphy';
      } => ({
        id: gif.id,
        url: gif.images.original.url,
        previewUrl: gif.images.fixed_height_downsampled?.url ?? gif.images.fixed_height.url,
        renderMode: 'image' as const,
        title: gif.title || null,
        width: Number(gif.images.fixed_height.width) || 480,
        height: Number(gif.images.fixed_height.height) || 360,
        provider: 'giphy' as const
      }));

      return { provider: 'giphy' as const, results };
    } catch (err) {
      fastify.log.warn({ err }, 'Giphy fetch failed');
      return { provider: 'giphy' as const, results: [] };
    }
  });
}
