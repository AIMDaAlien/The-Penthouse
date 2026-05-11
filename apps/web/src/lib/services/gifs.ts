import { api } from './api';
import type { GifSearchResponse } from '@penthouse/contracts';

export const gifs = {
	search(query: string, limit = 20): Promise<GifSearchResponse> {
		return api.get<GifSearchResponse>(`/api/v1/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}`);
	}
};
