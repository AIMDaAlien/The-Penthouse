import { api } from './api';
import type { StickerPack, Sticker, ListStickerPacksResponse, ListStickersResponse } from '@penthouse/contracts';

export const stickers = {
	listPacks(): Promise<ListStickerPacksResponse> {
		return api.get<ListStickerPacksResponse>('/api/v1/sticker-packs');
	},
	listStickers(packId: string): Promise<ListStickersResponse> {
		return api.get<ListStickersResponse>(`/api/v1/sticker-packs/${packId}/stickers`);
	},
	createPack(data: { name: string }): Promise<{ pack: StickerPack }> {
		return api.post<{ pack: StickerPack }>('/api/v1/sticker-packs', data);
	},
	deletePack(id: string): Promise<void> {
		return api.delete<void>(`/api/v1/sticker-packs/${id}`);
	},
	addSticker(packId: string, data: { name: string; mediaUploadId: string }): Promise<{ sticker: Sticker }> {
		return api.post<{ sticker: Sticker }>(`/api/v1/sticker-packs/${packId}/stickers`, data);
	},
	removeSticker(id: string): Promise<void> {
		return api.delete<void>(`/api/v1/stickers/${id}`);
	}
};
