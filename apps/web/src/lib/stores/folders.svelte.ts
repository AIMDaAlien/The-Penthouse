import { folders as foldersApi } from '$lib/services/folders';
import type { ChatFolder, ChatFolderItem } from '@penthouse/contracts';

export interface FolderWithItems extends ChatFolder {
	items: ChatFolderItem[];
}

function createFoldersStore() {
	let folders = $state<FolderWithItems[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function load() {
		if (loading) return;
		loading = true;
		error = '';
		try {
			const res = await foldersApi.list();
			folders = res.folders;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load folders';
		} finally {
			loading = false;
		}
	}

	async function create(name: string, icon?: string, color?: string) {
		const res = await foldersApi.create({ name, icon, color });
		folders = [...folders, { ...res.folder, items: [] }];
		return res.folder;
	}

	async function update(id: string, patch: { name?: string; icon?: string; color?: string; sortOrder?: number }) {
		const res = await foldersApi.update(id, patch);
		folders = folders.map((f) => (f.id === id ? { ...f, ...res.folder } : f));
		return res.folder;
	}

	async function remove(id: string) {
		await foldersApi.delete(id);
		folders = folders.filter((f) => f.id !== id);
	}

	async function moveChat(folderId: string, chatId: string, fromFolderId?: string) {
		// If chat is in another folder, remove it first
		if (fromFolderId && fromFolderId !== folderId) {
			await foldersApi.removeItem(fromFolderId, chatId);
			folders = folders.map((f) =>
				f.id === fromFolderId
					? { ...f, items: f.items.filter((i) => i.chatId !== chatId) }
					: f
			);
		}
		// Add to new folder
		const res = await foldersApi.addItem(folderId, { chatId });
		folders = folders.map((f) =>
			f.id === folderId
				? { ...f, items: [...f.items, res.item] }
				: f
		);
	}

	async function removeChat(folderId: string, chatId: string) {
		await foldersApi.removeItem(folderId, chatId);
		folders = folders.map((f) =>
			f.id === folderId
				? { ...f, items: f.items.filter((i) => i.chatId !== chatId) }
				: f
		);
	}

	async function reorder(order: { id: string; sortOrder: number }[]) {
		await foldersApi.reorder({ folders: order });
		// Optimistic: re-sort locally
		const orderMap = new Map(order.map((o) => [o.id, o.sortOrder]));
		folders = folders.map((f) =>
			orderMap.has(f.id) ? { ...f, sortOrder: orderMap.get(f.id)! } : f
		).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
	}

	return {
		get folders() { return folders; },
		get loading() { return loading; },
		get error() { return error; },
		load,
		create,
		update,
		remove,
		moveChat,
		removeChat,
		reorder,
	};
}

export const foldersStore = createFoldersStore();
