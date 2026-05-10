import { chats as chatsApi } from '$services/chats';
import type { ChatSummary } from '@penthouse/contracts';

function createChatsStore() {
	let chats = $state<ChatSummary[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function load() {
		if (loading) return;
		loading = true;
		error = '';
		try {
			const res = await chatsApi.list();
			chats = res.chats;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load chats';
		} finally {
			loading = false;
		}
	}

	function addChat(chat: ChatSummary) {
		chats = [chat, ...chats];
	}

	function updateChat(chatId: string, patch: Partial<ChatSummary>) {
		chats = chats.map((c) => (c.id === chatId ? { ...c, ...patch } : c));
	}

	function removeChat(chatId: string) {
		chats = chats.filter((c) => c.id !== chatId);
	}

	return {
		get chats() { return chats; },
		get loading() { return loading; },
		get error() { return error; },
		load,
		addChat,
		updateChat,
		removeChat,
	};
}

export const chatsStore = createChatsStore();
