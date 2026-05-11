import { wallpapers as wallpapersApi } from '$services/wallpapers';
import type { UserWallpaper } from '@penthouse/contracts';

function createWallpapersStore() {
	let wallpapers = $state<UserWallpaper[]>([]);
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
				const res = await wallpapersApi.list();
				wallpapers = res.wallpapers;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load wallpapers';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	function addWallpaper(w: UserWallpaper) {
		wallpapers = [w, ...wallpapers];
	}

	function removeWallpaper(id: string) {
		wallpapers = wallpapers.filter((w) => w.id !== id);
	}

	function reset() {
		wallpapers = [];
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	function getForChat(chatId: string | undefined): UserWallpaper | undefined {
		if (!chatId) return undefined;
		return wallpapers.find((w) => w.chatId === chatId) ?? wallpapers.find((w) => w.isGlobal);
	}

	function getGlobal(): UserWallpaper | undefined {
		return wallpapers.find((w) => w.isGlobal);
	}

	return {
		get wallpapers() { return wallpapers; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		load,
		addWallpaper,
		removeWallpaper,
		reset,
		getForChat,
		getGlobal
	};
}

export const wallpapersStore = createWallpapersStore();
