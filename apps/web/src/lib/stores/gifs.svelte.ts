import { gifs as gifsApi } from '$services/gifs';
import type { GifResult } from '@penthouse/contracts';

function createGifsStore() {
	let results = $state<GifResult[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let error = $state('');
	let pending: Promise<void> | null = null;

	function load(query: string, limit = 20) {
		if (loading && pending) return pending;
		if (loaded && !query) return Promise.resolve();

		pending = (async () => {
			loading = true;
			error = '';
			try {
				const res = await gifsApi.search(query, limit);
				results = res.results;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load GIFs';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	function reset() {
		results = [];
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	return {
		get results() { return results; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		load,
		reset,
	};
}

export const gifsStore = createGifsStore();
