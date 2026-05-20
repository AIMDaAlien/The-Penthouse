import { stickers as stickersApi } from '$services/stickers';
import type { StickerPack, Sticker } from '@penthouse/contracts';

function createStickersStore() {
	let packs = $state<StickerPack[]>([]);
	let stickersByPack = $state<Record<string, Sticker[]>>({});
	let loading = $state(false);
	let loaded = $state(false);
	let error = $state('');
	let pending: Promise<void> | null = null;

	function loadPacks(options: { force?: boolean } = {}) {
		if (loading && pending) return pending;
		if (loaded && !options.force) return Promise.resolve();

		pending = (async () => {
			loading = true;
			error = '';
			try {
				const res = await stickersApi.listPacks();
				packs = res.packs;
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load sticker packs';
			} finally {
				loaded = true;
				loading = false;
				pending = null;
			}
		})();

		return pending;
	}

	async function loadStickers(packId: string) {
		if (stickersByPack[packId]) return;
		try {
			const res = await stickersApi.listStickers(packId);
			stickersByPack[packId] = res.stickers;
		} catch (err) {
			console.error('Failed to load stickers', err);
		}
	}

	async function createPack(name: string) {
		const res = await stickersApi.createPack({ name });
		packs = [res.pack, ...packs];
		return res.pack;
	}

	async function deletePack(id: string) {
		await stickersApi.deletePack(id);
		packs = packs.filter((p) => p.id !== id);
		const next = { ...stickersByPack };
		delete next[id];
		stickersByPack = next;
	}

	function addPack(pack: StickerPack) {
		packs = [pack, ...packs];
		loaded = true;
	}

	function removePack(id: string) {
		packs = packs.filter((p) => p.id !== id);
		const next = { ...stickersByPack };
		delete next[id];
		stickersByPack = next;
	}

	async function addSticker(packId: string, data: { name: string; mediaUploadId: string }) {
		const res = await stickersApi.addSticker(packId, data);
		const existing = stickersByPack[packId] ?? [];
		stickersByPack = { ...stickersByPack, [packId]: [...existing, res.sticker] };
		return res.sticker;
	}

	async function removeSticker(id: string) {
		await stickersApi.removeSticker(id);
		const next: Record<string, Sticker[]> = {};
		for (const [key, list] of Object.entries(stickersByPack)) {
			next[key] = list.filter((s) => s.id !== id);
		}
		stickersByPack = next;
	}

	function reset() {
		packs = [];
		stickersByPack = {};
		loading = false;
		loaded = false;
		error = '';
		pending = null;
	}

	return {
		get packs() { return packs; },
		get stickersByPack() { return stickersByPack; },
		get loading() { return loading; },
		get loaded() { return loaded; },
		get error() { return error; },
		loadPacks,
		loadStickers,
		createPack,
		deletePack,
		addPack,
		removePack,
		addSticker,
		removeSticker,
		reset,
	};
}

export const stickersStore = createStickersStore();
