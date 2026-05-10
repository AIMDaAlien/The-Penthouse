import { channels as channelsApi } from '$lib/services/channels';
import type { Channel } from '@penthouse/contracts';

function createChannelsStore() {
	let channels = $state<Channel[]>([]);
	let loading = $state(false);
	let loadedForChatId = $state<string | null>(null);
	let error = $state('');
	let pending: Promise<void> | null = null;

	function load(parentChatId: string, options: { force?: boolean } = {}) {
		if (loading && pending) return pending;
		if (loadedForChatId === parentChatId && !options.force) return Promise.resolve();

		pending = (async () => {
			loading = true;
			error = '';
			try {
				const res = await channelsApi.list(parentChatId);
				channels = res.channels;
				loadedForChatId = parentChatId;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load channels';
				loadedForChatId = parentChatId;
			} finally {
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	async function create(parentChatId: string, name: string) {
		const res = await channelsApi.create(parentChatId, { name });
		channels = [...channels, res.channel];
		loadedForChatId = parentChatId;
		return res.channel;
	}

	function reset() {
		channels = [];
		loading = false;
		loadedForChatId = null;
		error = '';
		pending = null;
	}

	return {
		get channels() { return channels; },
		get loading() { return loading; },
		get loadedForChatId() { return loadedForChatId; },
		get error() { return error; },
		load,
		create,
		reset,
	};
}

export const channelsStore = createChannelsStore();
