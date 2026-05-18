import { folders as foldersApi } from '$lib/services/folders';
import type { ChatFolder, ChatFolderItem } from '@penthouse/contracts';

export interface FolderWithItems extends ChatFolder {
	items: ChatFolderItem[];
}

function createFoldersStore() {
	let folders = $state<FolderWithItems[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let error = $state('');
	let pending: Promise<void> | null = null;

	function load(options: { force?: boolean } = {}) {
		if (loading && pending) return pending;
		if (loaded && !options.force) return Promise.resolve();

		pending = (async () => {
			loading = true;
			error = '';
			try {
				const res = await foldersApi.list();
				folders = res.folders;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load folders';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	async function create(name: string, icon?: string, color?: string, chatIds?: string[]) {
		const res = await foldersApi.create({ name, icon, color, chatIds });
		folders = [...folders, { ...res.folder, items: res.folder.items ?? [] }];
		loaded = true;
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
			deleteItem(fromFolderId, chatId);
		}
		// Add to new folder
		const res = await foldersApi.addItem(folderId, { chatId });
		upsertItem(res.item);
		await load({ force: true });
	}

	async function removeChat(folderId: string, chatId: string) {
		await foldersApi.removeItem(folderId, chatId);
		deleteItem(folderId, chatId);
		await load({ force: true });
	}

	async function reorder(order: { id: string; sortOrder: number }[]) {
		await foldersApi.reorder({ folders: order });
		// Optimistic: re-sort locally
		const orderMap = new Map(order.map((o) => [o.id, o.sortOrder]));
		folders = folders.map((f) =>
			orderMap.has(f.id) ? { ...f, sortOrder: orderMap.get(f.id)! } : f
		).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
	}

	async function reorderItems(folderId: string, itemOrder: { chatId: string; sortOrder: number }[]) {
		const res = await foldersApi.reorderItems(folderId, { items: itemOrder });
		// Optimistic: replace folder with reordered items
		folders = folders.map((f) => (f.id === folderId ? { ...f, items: res.folder.items } : f));
	}

	function upsertFolder(folder: ChatFolder) {
		const existing = folders.find((f) => f.id === folder.id);
		if (existing) {
			folders = folders.map((f) => (f.id === folder.id ? { ...f, ...folder } : f));
		} else {
			folders = [...folders, { ...folder, items: [] }];
		}
	}

	function deleteFolder(folderId: string) {
		folders = folders.filter((f) => f.id !== folderId);
	}

	function upsertItem(item: ChatFolderItem) {
		folders = folders.map((f) => {
			if (f.id !== item.folderId) return f;
			const existing = f.items.find((i) => i.chatId === item.chatId);
			if (existing) {
				return { ...f, items: f.items.map((i) => (i.chatId === item.chatId ? item : i)) };
			}
			return { ...f, items: [...f.items, item] };
		});
	}

	function deleteItem(folderId: string, chatId: string) {
		folders = folders.map((f) =>
			f.id === folderId
				? { ...f, items: f.items.filter((i) => i.chatId !== chatId) }
				: f
		);
	}

	function reset() {
		folders = [];
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	return {
		get folders() { return folders; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		load,
		create,
		update,
		remove,
		moveChat,
		removeChat,
		reorder,
		reorderItems,
		upsertFolder,
		deleteFolder,
		upsertItem,
		deleteItem,
		reset,
	};
}

export const foldersStore = createFoldersStore();
