import { chats as chatsApi } from '$services/chats';
import type { ChatSummary } from '@penthouse/contracts';

function createChatsStore() {
	let chats = $state<ChatSummary[]>([]);
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
				const res = await chatsApi.list();
				chats = res.chats;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load chats';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	function addChat(chat: ChatSummary) {
		chats = [chat, ...chats];
		loaded = true;
	}

	function updateChat(chatId: string, patch: Partial<ChatSummary>) {
		chats = chats.map((c) => (c.id === chatId ? { ...c, ...patch } : c));
	}

	function removeChat(chatId: string) {
		chats = chats.filter((c) => c.id !== chatId);
	}

	async function createGroup(name: string, memberIds: string[]) {
		const res = await chatsApi.createGroup({ name, memberIds });
		addChat(res.chat);
		return res.chat;
	}

	async function deleteChat(chatId: string) {
		await chatsApi.deleteChat(chatId);
		removeChat(chatId);
	}

	async function archive(chatId: string) {
		await chatsApi.archive(chatId);
		updateChat(chatId, { archivedAt: new Date().toISOString() });
	}

	async function unarchive(chatId: string) {
		await chatsApi.unarchive(chatId);
		updateChat(chatId, { archivedAt: null });
	}

	function reset() {
		chats = [];
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	return {
		get chats() { return chats; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		load,
		addChat,
		updateChat,
		removeChat,
		createGroup,
		deleteChat,
		archive,
		unarchive,
		reset,
	};
}

export const chatsStore = createChatsStore();
