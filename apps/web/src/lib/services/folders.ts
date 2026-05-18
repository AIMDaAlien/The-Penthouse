import { api } from './api';
import type {
	ChatFolder,
	ChatFolderItem,
	CreateFolderRequest,
	UpdateFolderRequest,
	ReorderFoldersRequest,
	ReorderFolderItemsRequest,
	AddFolderItemRequest,
	ListFoldersResponse
} from '@penthouse/contracts';

export const folders = {
	list(): Promise<ListFoldersResponse> {
		return api.get<ListFoldersResponse>('/api/v1/folders');
	},

	create(data: CreateFolderRequest): Promise<{ folder: ChatFolder & { items: ChatFolderItem[] } }> {
		return api.post<{ folder: ChatFolder & { items: ChatFolderItem[] } }>('/api/v1/folders', data);
	},

	update(id: string, data: UpdateFolderRequest): Promise<{ folder: ChatFolder }> {
		return api.patch<{ folder: ChatFolder }>(`/api/v1/folders/${id}`, data);
	},

	delete(id: string): Promise<{ success: boolean }> {
		return api.delete<{ success: boolean }>(`/api/v1/folders/${id}`);
	},

	addItem(folderId: string, data: AddFolderItemRequest): Promise<{ item: ChatFolderItem }> {
		return api.post<{ item: ChatFolderItem }>(`/api/v1/folders/${folderId}/items`, data);
	},

	removeItem(folderId: string, chatId: string): Promise<{ success: boolean }> {
		return api.delete<{ success: boolean }>(`/api/v1/folders/${folderId}/items/${chatId}`);
	},

	reorder(data: ReorderFoldersRequest): Promise<{ success: boolean }> {
		return api.patch<{ success: boolean }>('/api/v1/folders/reorder', data);
	},

	reorderItems(folderId: string, data: ReorderFolderItemsRequest): Promise<{ folder: ChatFolder & { items: ChatFolderItem[] } }> {
		return api.patch<{ folder: ChatFolder & { items: ChatFolderItem[] } }>(`/api/v1/folders/${folderId}/items/reorder`, data);
	}
};
