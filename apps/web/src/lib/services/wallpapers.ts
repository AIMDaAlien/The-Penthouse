import { api } from './api';
import type { UserWallpaper, CreateWallpaperRequest, ListWallpapersResponse } from '@penthouse/contracts';

export const wallpapers = {
	list(): Promise<ListWallpapersResponse> {
		return api.get<ListWallpapersResponse>('/api/v1/wallpapers');
	},

	create(data: CreateWallpaperRequest): Promise<{ wallpaper: UserWallpaper }> {
		return api.post<{ wallpaper: UserWallpaper }>('/api/v1/wallpapers', data);
	},

	remove(id: string): Promise<void> {
		return api.delete<void>(`/api/v1/wallpapers/${id}`);
	}
};
