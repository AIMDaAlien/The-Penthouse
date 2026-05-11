import { emotes as emotesApi } from '$services/emotes';
import type { Emote } from '@penthouse/contracts';

function createEmotesStore() {
	let emotes = $state<Emote[]>([]);
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
				const res = await emotesApi.list();
				emotes = res.emotes;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load emotes';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	function addEmote(emote: Emote) {
		emotes = [emote, ...emotes];
		loaded = true;
	}

	function removeEmote(id: string) {
		emotes = emotes.filter((e) => e.id !== id);
	}

	function reset() {
		emotes = [];
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	return {
		get emotes() { return emotes; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		load,
		addEmote,
		removeEmote,
		reset,
	};
}

export const emotesStore = createEmotesStore();
