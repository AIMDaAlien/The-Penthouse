// Shared DnD state + behavior for the prototype variants.
// Each variant page calls `createDnd()` once and renders against the returned state.

export type Chat = { id: string; name: string; preview: string; unread: number; time: string };
export type Folder = { id: string; name: string; color: string; chatIds: string[]; open: boolean };

export type DragKind = 'folder' | 'chat';
export type DragSource = { kind: DragKind; id: string; fromFolderId?: string };

export type DropTarget =
	| { kind: 'reorder-folder'; index: number }
	| { kind: 'reorder-chat-in-folder'; folderId: string; index: number }
	| { kind: 'reorder-chat-root'; index: number }
	| { kind: 'move-into-folder'; folderId: string }
	| { kind: 'combine-with-chat'; targetChatId: string }
	| { kind: 'remove-from-folder' }
	| null;

export const seedChats: Chat[] = [
	{ id: 'c1',  name: 'Mira Wen',         preview: 'see you at 8',         unread: 2,  time: '14:02' },
	{ id: 'c2',  name: 'Dorian Pell',      preview: 'sent the files',       unread: 0,  time: '13:48' },
	{ id: 'c3',  name: 'Studio Loop',      preview: 'mix v3 attached',      unread: 5,  time: '12:11' },
	{ id: 'c4',  name: 'Hana K.',          preview: 'lol absolutely not',   unread: 0,  time: '11:30' },
	{ id: 'c5',  name: 'Family',           preview: 'mom: did you call?',   unread: 1,  time: '10:02' },
	{ id: 'c6',  name: 'Atlas Rho',        preview: 'reading list ↓',       unread: 0,  time: 'Mon'   },
	{ id: 'c7',  name: 'Klein Bottle DAO', preview: 'gm degens',            unread: 12, time: 'Sun'   },
	{ id: 'c8',  name: 'Yusra Idris',      preview: 'voice note · 1:24',    unread: 0,  time: 'Sat'   },
	{ id: 'c9',  name: 'Pent dev #front',  preview: 'PR merged',            unread: 0,  time: 'Fri'   },
	{ id: 'c10', name: 'Sketchbook',       preview: 'attached: 4 photos',   unread: 0,  time: 'Thu'   }
];

export const seedFolders: Folder[] = [
	{ id: 'f1', name: 'Work',    color: 'oklch(0.68 0.100 240)', chatIds: ['c2', 'c9'], open: true  },
	{ id: 'f2', name: 'Studio',  color: 'oklch(0.65 0.110 145)', chatIds: ['c3', 'c8'], open: true  },
	{ id: 'f3', name: 'Private', color: 'oklch(0.60 0.090 340)', chatIds: ['c5'],       open: false }
];

const PALETTE = [
	'oklch(0.68 0.100 240)',
	'oklch(0.65 0.110 145)',
	'oklch(0.60 0.090 340)',
	'oklch(0.62 0.080 65)',
	'oklch(0.69 0.140 285)'
];

export const FOLDER_COLOR_PRESETS: { id: string; label: string; value: string }[] = [
	{ id: 'periwinkle', label: 'Periwinkle', value: 'oklch(0.69 0.140 285)' },
	{ id: 'lavender',   label: 'Lavender',   value: 'oklch(0.72 0.090 305)' },
	{ id: 'rose',       label: 'Rose',       value: 'oklch(0.66 0.110 5)'   },
	{ id: 'plum',       label: 'Plum',       value: 'oklch(0.60 0.090 340)' },
	{ id: 'amber',      label: 'Amber',      value: 'oklch(0.72 0.110 75)'  },
	{ id: 'olive',      label: 'Olive',      value: 'oklch(0.62 0.080 110)' },
	{ id: 'sage',       label: 'Sage',       value: 'oklch(0.65 0.110 145)' },
	{ id: 'teal',       label: 'Teal',       value: 'oklch(0.70 0.090 195)' },
	{ id: 'sky',        label: 'Sky',        value: 'oklch(0.68 0.100 240)' },
	{ id: 'cool',       label: 'Cool',       value: 'oklch(0.66 0.030 270)' }
];

export function initials(name: string): string {
	return name
		.split(/[\s_]+/)
		.map((w) => w[0])
		.filter(Boolean)
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

export type DndState = ReturnType<typeof createDnd>;

export function createDnd() {
	let chats = $state<Chat[]>(structuredClone(seedChats));
	let folders = $state<Folder[]>(structuredClone(seedFolders));

	const folderedIds = $derived(new Set(folders.flatMap((f) => f.chatIds)));
	const unfoldered = $derived(chats.filter((c) => !folderedIds.has(c.id)));

	let drag = $state<{
		source: DragSource;
		pointerX: number;
		pointerY: number;
		offsetX: number;
		offsetY: number;
		preview: string;
		target: DropTarget;
		keyboard: boolean;
		startX: number;
		startY: number;
		active: boolean;
		pointerId: number | null;
	} | null>(null);

	let actions = $state<{ ts: string; label: string; payload: string }[]>([]);
	let liveMsg = $state('');
	let listEl: HTMLElement | null = null;
	const DRAG_THRESHOLD = 4;

	function setListEl(el: HTMLElement | null) {
		listEl = el;
	}

	function log(label: string, payload: object) {
		const ts = new Date().toLocaleTimeString();
		actions = [{ ts, label, payload: JSON.stringify(payload) }, ...actions].slice(0, 50);
	}

	function announce(msg: string) {
		liveMsg = '';
		queueMicrotask(() => (liveMsg = msg));
	}

	function findChat(id: string) {
		return chats.find((c) => c.id === id);
	}

	function commitDrop() {
		if (!drag || !drag.target || !drag.active) {
			endDrag();
			return;
		}
		const src = drag.source;
		const t = drag.target;

		switch (t.kind) {
			case 'reorder-folder': {
				const cur = folders.findIndex((f) => f.id === src.id);
				if (cur < 0) break;
				const next = [...folders];
				const [moved] = next.splice(cur, 1);
				const insertAt = t.index > cur ? t.index - 1 : t.index;
				next.splice(insertAt, 0, moved);
				folders = next;
				log('foldersStore.reorder', { order: folders.map((f, i) => ({ id: f.id, sortOrder: i })) });
				announce(`Folder ${moved.name} → position ${insertAt + 1}`);
				break;
			}
			case 'reorder-chat-in-folder': {
				const f = folders.find((x) => x.id === t.folderId);
				if (!f) break;
				const fromIdx = f.chatIds.indexOf(src.id);
				const working = [...f.chatIds];
				if (fromIdx >= 0) working.splice(fromIdx, 1);
				const insertAt = fromIdx >= 0 && t.index > fromIdx ? t.index - 1 : t.index;
				working.splice(insertAt, 0, src.id);
				const otherFolder = src.fromFolderId && src.fromFolderId !== f.id ? src.fromFolderId : null;
				folders = folders.map((ff) => {
					if (ff.id === f.id) return { ...ff, chatIds: working };
					if (otherFolder && ff.id === otherFolder)
						return { ...ff, chatIds: ff.chatIds.filter((id) => id !== src.id) };
					return ff;
				});
				log('foldersStore.reorderItems', {
					folderId: f.id,
					itemOrder: working.map((id, i) => ({ chatId: id, sortOrder: i }))
				});
				announce(`Reordered within ${f.name}`);
				break;
			}
			case 'reorder-chat-root': {
				if (src.fromFolderId) {
					folders = folders.map((ff) =>
						ff.id === src.fromFolderId ? { ...ff, chatIds: ff.chatIds.filter((id) => id !== src.id) } : ff
					);
					log('foldersStore.removeChat', { folderId: src.fromFolderId, chatId: src.id });
					announce('Removed from folder');
				} else {
					const ids = unfoldered.map((c) => c.id);
					const fromIdx = ids.indexOf(src.id);
					if (fromIdx >= 0) ids.splice(fromIdx, 1);
					const insertAt = fromIdx >= 0 && t.index > fromIdx ? t.index - 1 : t.index;
					ids.splice(insertAt, 0, src.id);
					const reorderMap = new Map(ids.map((id, i) => [id, i]));
					chats = [...chats].sort((a, b) => {
						const aIn = reorderMap.has(a.id);
						const bIn = reorderMap.has(b.id);
						if (aIn && bIn) return (reorderMap.get(a.id) ?? 0) - (reorderMap.get(b.id) ?? 0);
						return aIn ? 1 : bIn ? -1 : 0;
					});
					announce('Reordered chat');
				}
				break;
			}
			case 'move-into-folder': {
				folders = folders.map((ff) => {
					if (ff.id === t.folderId)
						return { ...ff, chatIds: [...ff.chatIds.filter((id) => id !== src.id), src.id], open: true };
					if (src.fromFolderId && ff.id === src.fromFolderId)
						return { ...ff, chatIds: ff.chatIds.filter((id) => id !== src.id) };
					return ff;
				});
				log('foldersStore.moveChat', {
					folderId: t.folderId,
					chatId: src.id,
					fromFolderId: src.fromFolderId
				});
				const tf = folders.find((f) => f.id === t.folderId);
				announce(`Moved to ${tf?.name}`);
				break;
			}
			case 'combine-with-chat': {
				const a = findChat(src.id);
				const b = findChat(t.targetChatId);
				if (!a || !b) break;
				const name = prompt(
					`Name new folder for ${a.name} + ${b.name}`,
					`${b.name.split(' ')[0]} + ${a.name.split(' ')[0]}`
				);
				if (!name) {
					endDrag();
					return;
				}
				const id = 'f' + Math.random().toString(36).slice(2, 7);
				folders = [
					...folders,
					{
						id,
						name,
						color: PALETTE[folders.length % PALETTE.length],
						chatIds: [t.targetChatId, src.id],
						open: true
					}
				];
				log('foldersStore.create', { name, chatIds: [t.targetChatId, src.id] });
				announce(`New folder ${name} created`);
				break;
			}
			case 'remove-from-folder': {
				if (src.fromFolderId) {
					folders = folders.map((ff) =>
						ff.id === src.fromFolderId ? { ...ff, chatIds: ff.chatIds.filter((id) => id !== src.id) } : ff
					);
					log('foldersStore.removeChat', { folderId: src.fromFolderId, chatId: src.id });
					announce('Removed from folder');
				}
				break;
			}
		}
		endDrag();
	}

	function cancelDrag() {
		if (drag) announce('Cancelled');
		endDrag();
	}

	function endDrag() {
		drag = null;
		document.body.style.cursor = '';
	}

	function pickUp(e: PointerEvent, source: DragSource, srcEl: HTMLElement) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		try { srcEl.setPointerCapture(e.pointerId); } catch {}
		const r = srcEl.getBoundingClientRect();
		const previewLabel =
			source.kind === 'folder'
				? folders.find((f) => f.id === source.id)?.name ?? ''
				: chats.find((c) => c.id === source.id)?.name ?? '';
		drag = {
			source,
			pointerX: e.clientX,
			pointerY: e.clientY,
			offsetX: e.clientX - r.left,
			offsetY: e.clientY - r.top,
			preview: previewLabel,
			target: null,
			keyboard: false,
			startX: e.clientX,
			startY: e.clientY,
			active: false,
			pointerId: e.pointerId
		};
	}

	function handlePointerMove(e: PointerEvent) {
		if (!drag || drag.keyboard) return;
		drag.pointerX = e.clientX;
		drag.pointerY = e.clientY;
		if (!drag.active) {
			const dx = e.clientX - drag.startX;
			const dy = e.clientY - drag.startY;
			if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
				drag.active = true;
				document.body.style.cursor = 'grabbing';
				announce(`Picked up ${drag.preview}.`);
			} else {
				return;
			}
		}
		drag.target = resolveTarget(e.clientX, e.clientY);
	}

	function handlePointerUp() {
		if (!drag || drag.keyboard) return;
		if (!drag.active) {
			const src = drag.source;
			if (src.kind === 'chat') {
				log('selectChat (click)', { chatId: src.id });
				announce(`Opened ${drag.preview}`);
			} else if (src.kind === 'folder') {
				folders = folders.map((f) => (f.id === src.id ? { ...f, open: !f.open } : f));
			}
			endDrag();
			return;
		}
		commitDrop();
	}

	function rectCenterY(el: HTMLElement) {
		const r = el.getBoundingClientRect();
		return r.top + r.height / 2;
	}

	function resolveTarget(x: number, y: number): DropTarget {
		if (!drag || !listEl) return null;
		const el = document.elementFromPoint(x, y) as HTMLElement | null;
		if (!el || !listEl.contains(el)) return null;
		const src = drag.source;

		const folderHeader = el.closest<HTMLElement>('[data-folder-header]');
		if (folderHeader) {
			const fid = folderHeader.dataset.folderId!;
			if (src.kind === 'chat') {
				if (fid === src.fromFolderId) return null;
				const r = folderHeader.getBoundingClientRect();
				const edgeBand = Math.min(8, r.height * 0.22);
				if (y < r.top + edgeBand) {
					const idx = folders.findIndex((f) => f.id === fid);
					return { kind: 'reorder-folder', index: idx };
				}
				if (y > r.bottom - edgeBand) {
					return { kind: 'reorder-chat-in-folder', folderId: fid, index: 0 };
				}
				return { kind: 'move-into-folder', folderId: fid };
			}
			if (src.kind === 'folder' && fid !== src.id) {
				const center = rectCenterY(folderHeader);
				const idx = folders.findIndex((f) => f.id === fid);
				return { kind: 'reorder-folder', index: y < center ? idx : idx + 1 };
			}
		}

		const chatRow = el.closest<HTMLElement>('[data-chat-row]');
		if (chatRow && src.kind === 'chat') {
			const targetChatId = chatRow.dataset.chatId!;
			if (targetChatId === src.id) return null;
			const r = chatRow.getBoundingClientRect();
			const center = r.top + r.height / 2;
			const inCenterBand = Math.abs(y - center) < r.height * 0.30;
			const targetParent = folders.find((f) => f.chatIds.includes(targetChatId));
			const sameParent = targetParent?.id === src.fromFolderId;
			const bothUnfoldered = !targetParent && !src.fromFolderId;

			if (inCenterBand && bothUnfoldered) {
				return { kind: 'combine-with-chat', targetChatId };
			}
			if (sameParent) {
				if (targetParent) {
					const idx = targetParent.chatIds.indexOf(targetChatId);
					const insertAt = y < center ? idx : idx + 1;
					return { kind: 'reorder-chat-in-folder', folderId: targetParent.id, index: insertAt };
				}
				const idx = unfoldered.findIndex((c) => c.id === targetChatId);
				const insertAt = y < center ? idx : idx + 1;
				return { kind: 'reorder-chat-root', index: insertAt };
			}
			if (targetParent) {
				const idx = targetParent.chatIds.indexOf(targetChatId);
				const insertAt = y < center ? idx : idx + 1;
				return { kind: 'reorder-chat-in-folder', folderId: targetParent.id, index: insertAt };
			}
			const idx = unfoldered.findIndex((c) => c.id === targetChatId);
			const insertAt = y < center ? idx : idx + 1;
			return { kind: 'reorder-chat-root', index: insertAt };
		}

		const rootZone = el.closest<HTMLElement>('[data-root-zone]');
		if (rootZone && src.kind === 'chat' && src.fromFolderId) {
			return { kind: 'remove-from-folder' };
		}

		return null;
	}

	function kbStart(kind: DragKind, id: string, fromFolderId?: string) {
		drag = {
			source: { kind, id, fromFolderId },
			pointerX: 0,
			pointerY: 0,
			offsetX: 0,
			offsetY: 0,
			preview:
				kind === 'folder'
					? folders.find((f) => f.id === id)?.name ?? ''
					: chats.find((c) => c.id === id)?.name ?? '',
			target: null,
			keyboard: true,
			startX: 0,
			startY: 0,
			active: true,
			pointerId: null
		};
		announce(`Grabbed ${drag.preview}. ↑↓ move · Enter drop · Esc cancel.`);
	}

	function kbMove(dir: 'up' | 'down') {
		if (!drag || !drag.keyboard) return;
		const src = drag.source;
		if (src.kind === 'folder') {
			const cur = folders.findIndex((f) => f.id === src.id);
			const next = dir === 'up' ? cur - 1 : cur + 1;
			if (next < 0 || next >= folders.length) return;
			const arr = [...folders];
			[arr[cur], arr[next]] = [arr[next], arr[cur]];
			folders = arr;
			log('foldersStore.reorder', { order: folders.map((f, i) => ({ id: f.id, sortOrder: i })) });
		} else {
			const parent = folders.find((f) => f.id === src.fromFolderId);
			if (parent) {
				const cur = parent.chatIds.indexOf(src.id);
				const next = dir === 'up' ? cur - 1 : cur + 1;
				if (next < 0 || next >= parent.chatIds.length) return;
				const arr = [...parent.chatIds];
				[arr[cur], arr[next]] = [arr[next], arr[cur]];
				folders = folders.map((f) => (f.id === parent.id ? { ...f, chatIds: arr } : f));
				log('foldersStore.reorderItems', {
					folderId: parent.id,
					itemOrder: arr.map((id, i) => ({ chatId: id, sortOrder: i }))
				});
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!drag) return;
		if (e.key === 'Escape') { e.preventDefault(); cancelDrag(); return; }
		if (!drag.keyboard) return;
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); announce('Dropped'); endDrag(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); kbMove('up'); }
		else if (e.key === 'ArrowDown') { e.preventDefault(); kbMove('down'); }
	}

	function rowKeydown(e: KeyboardEvent, kind: DragKind, id: string, fromFolderId?: string) {
		if (drag) return;
		if (e.key === ' ') { e.preventDefault(); kbStart(kind, id, fromFolderId); }
	}

	function toggleFolder(id: string) {
		if (drag) return;
		folders = folders.map((f) => (f.id === id ? { ...f, open: !f.open } : f));
	}

	function reset() {
		chats = structuredClone(seedChats);
		folders = structuredClone(seedFolders);
		actions = [];
		announce('Demo reset');
	}

	function setFolderColor(folderId: string, color: string) {
		folders = folders.map((f) => (f.id === folderId ? { ...f, color } : f));
		log('foldersStore.update', { folderId, color });
	}

	function renameFolder(folderId: string, name: string) {
		folders = folders.map((f) => (f.id === folderId ? { ...f, name } : f));
		log('foldersStore.update', { folderId, name });
	}

	function isDragSource(kind: DragKind, id: string) {
		return !!drag?.active && drag.source.kind === kind && drag.source.id === id;
	}

	function indicatorBetween(parent: 'root' | string, index: number): boolean {
		if (!drag || !drag.active || !drag.target) return false;
		const t = drag.target;
		if (parent === 'root' && t.kind === 'reorder-chat-root' && t.index === index) return true;
		if (parent !== 'root') {
			if (t.kind === 'reorder-chat-in-folder' && t.folderId === parent && t.index === index) return true;
		}
		return false;
	}

	function folderIndicatorBetween(index: number): boolean {
		if (!drag || !drag.active || !drag.target) return false;
		return drag.target.kind === 'reorder-folder' && drag.target.index === index;
	}

	function targetFolderId(): string | null {
		if (!drag?.active || drag.target?.kind !== 'move-into-folder') return null;
		return drag.target.folderId;
	}

	function combineTargetId(): string | null {
		if (!drag?.active || drag.target?.kind !== 'combine-with-chat') return null;
		return drag.target.targetChatId;
	}

	function rootIsTarget(): boolean {
		return !!drag?.active && drag.target?.kind === 'remove-from-folder';
	}

	return {
		// state
		get chats() { return chats; },
		get folders() { return folders; },
		get unfoldered() { return unfoldered; },
		get drag() { return drag; },
		get actions() { return actions; },
		get liveMsg() { return liveMsg; },
		// dom hook
		setListEl,
		// pointer handlers (attach to window)
		handlePointerMove,
		handlePointerUp,
		handleKeydown,
		// row handlers (attach per row)
		pickUp,
		rowKeydown,
		toggleFolder,
		// utility
		reset,
		setFolderColor,
		renameFolder,
		// query helpers
		isDragSource,
		indicatorBetween,
		folderIndicatorBetween,
		targetFolderId,
		combineTargetId,
		rootIsTarget,
		initials
	};
}
