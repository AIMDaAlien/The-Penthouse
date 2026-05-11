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
		reset,
	};
}

export const chatsStore = createChatsStore();
