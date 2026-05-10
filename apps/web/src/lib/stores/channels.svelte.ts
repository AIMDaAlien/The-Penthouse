import { channels as channelsApi } from '$lib/services/channels';
import type { Channel } from '@penthouse/contracts';

function createChannelsStore() {
	let channels = $state<Channel[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function load(parentChatId: string) {
		if (loading) return;
		loading = true;
		error = '';
		try {
			const res = await channelsApi.list(parentChatId);
			channels = res.channels;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load channels';
		} finally {
			loading = false;
		}
	}

	async function create(parentChatId: string, name: string) {
		const res = await channelsApi.create(parentChatId, { name });
		channels = [...channels, res.channel];
		return res.channel;
	}

	function reset() {
		channels = [];
		loading = false;
		error = '';
	}

	return {
		get channels() { return channels; },
		get loading() { return loading; },
		get error() { return error; },
		load,
		create,
		reset,
	};
}

export const channelsStore = createChannelsStore();
