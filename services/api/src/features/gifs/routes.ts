import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const GifSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional()
});

/**
 * Mock GIF search results for development.
 * Replace with Tenor/Giphy proxy when API keys are available.
 */
const MOCK_GIFS = [
  {
    id: 'mock-1',
    url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
    renderMode: 'image' as const,
    title: 'Thumbs up',
    width: 480,
    height: 270,
    provider: 'giphy' as const
  },
  {
    id: 'mock-2',
    url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif',
    renderMode: 'image' as const,
    title: 'Happy dance',
    width: 480,
    height: 360,
    provider: 'giphy' as const
  },
  {
    id: 'mock-3',
    url: 'https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufnwz3wDUli7GU0/giphy.gif',
    renderMode: 'image' as const,
    title: 'Mind blown',
    width: 480,
    height: 270,
    provider: 'giphy' as const
  },
  {
    id: 'mock-4',
    url: 'https://media.giphy.com/media/26xBwdIuRJiAIqHwA/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26xBwdIuRJiAIqHwA/giphy.gif',
    renderMode: 'image' as const,
    title: 'Cool',
    width: 480,
    height: 270,
    provider: 'giphy' as const
  },
  {
    id: 'mock-5',
    url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
    renderMode: 'image' as const,
    title: 'Wink',
    width: 480,
    height: 360,
    provider: 'giphy' as const
  }
];

export async function registerGifRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/gifs/search', { preHandler: fastify.authenticate }, async (request) => {
    const query = GifSearchQuerySchema.parse(request.query);
    const limit = query.limit ?? 20;

    // TODO: Replace with real Tenor/Giphy proxy when API keys are configured
    // For now return deterministic subset based on query string
    const searchLower = (query.q ?? '').toLowerCase();
    let results = MOCK_GIFS;
    if (searchLower) {
      results = MOCK_GIFS.filter((g) =>
        g.title.toLowerCase().includes(searchLower)
      );
      if (results.length === 0) results = MOCK_GIFS;
    }

    return {
      provider: 'giphy' as const,
      results: results.slice(0, limit)
    };
  });
}
