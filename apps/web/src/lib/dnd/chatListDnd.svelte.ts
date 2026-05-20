import { foldersStore } from '$stores/folders.svelte';
import { chatsStore } from '$stores/chats.svelte';

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

export const FOLDER_COLOR_PRESETS: { id: string; label: string; value: string }[] = [
	{ id: 'periwinkle', label: 'Periwinkle', value: 'oklch(0.69 0.140 285)' },
	{ id: 'lavender', label: 'Lavender', value: 'oklch(0.72 0.090 305)' },
	{ id: 'rose', label: 'Rose', value: 'oklch(0.66 0.110 5)' },
	{ id: 'plum', label: 'Plum', value: 'oklch(0.60 0.090 340)' },
	{ id: 'amber', label: 'Amber', value: 'oklch(0.72 0.110 75)' },
	{ id: 'olive', label: 'Olive', value: 'oklch(0.62 0.080 110)' },
	{ id: 'sage', label: 'Sage', value: 'oklch(0.65 0.110 145)' },
	{ id: 'teal', label: 'Teal', value: 'oklch(0.70 0.090 195)' },
	{ id: 'sky', label: 'Sky', value: 'oklch(0.68 0.100 240)' },
	{ id: 'cool', label: 'Cool', value: 'oklch(0.66 0.030 270)' }
];

export type DndState = ReturnType<typeof createChatListDnd>;

export interface DndOptions {
	onToggleFolder?: (id: string) => void;
}

export function createChatListDnd(opts: DndOptions = {}) {
	const DRAG_THRESHOLD = 4;

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

	let liveMsg = $state('');
	let listEl: HTMLElement | null = null;
	let suppressNextClick = false;

	// Combine-to-folder inline name editing
	let combineEditing = $state<{ targetChatId: string; sourceChatId: string; name: string } | null>(null);

	function setListEl(el: HTMLElement | null) {
		listEl = el;
	}

	function announce(msg: string) {
		liveMsg = '';
		queueMicrotask(() => (liveMsg = msg));
	}

	function getFolder(id: string) {
		return foldersStore.folders.find((f) => f.id === id);
	}

	function getChat(id: string) {
		return chatsStore.chats.find((c) => c.id === id);
	}

	async function commitDrop() {
		if (!drag || !drag.target || !drag.active) {
			endDrag();
			return;
		}
		suppressNextClick = true;
		const src = drag.source;
		const t = drag.target;

		switch (t.kind) {
			case 'reorder-folder': {
				const folders = foldersStore.folders;
				const cur = folders.findIndex((f) => f.id === src.id);
				if (cur < 0) break;
				const next = [...folders];
				const [moved] = next.splice(cur, 1);
				const insertAt = t.index > cur ? t.index - 1 : t.index;
				next.splice(insertAt, 0, moved);
				const order = next.map((f, i) => ({ id: f.id, sortOrder: i }));
				await foldersStore.reorder(order);
				announce(`Folder ${moved.name} moved to position ${insertAt + 1}`);
				break;
			}
			case 'reorder-chat-in-folder': {
				const folder = getFolder(t.folderId);
				if (!folder) break;
				const fromIdx = folder.items.findIndex((i) => i.chatId === src.id);
				const working = folder.items.map((i) => i.chatId);
				if (fromIdx >= 0) working.splice(fromIdx, 1);
				// If chat came from a different folder, also remove from there
				if (src.fromFolderId && src.fromFolderId !== t.folderId) {
					await foldersStore.removeChat(src.fromFolderId, src.id);
				}
				const insertAt = fromIdx >= 0 && t.index > fromIdx ? t.index - 1 : t.index;
				working.splice(insertAt, 0, src.id);
				const itemOrder = working.map((chatId, i) => ({ chatId, sortOrder: i }));
				await foldersStore.reorderItems(t.folderId, itemOrder);
				announce(`Reordered within ${folder.name}`);
				break;
			}
			case 'reorder-chat-root': {
				if (src.fromFolderId) {
					// Moving from folder to root at specific position
					await foldersStore.removeChat(src.fromFolderId, src.id);
					announce('Removed from folder');
				} else {
					// Reordering unfoldered chats — we don't have a backend for this
					// Just remove from any folder if applicable
					announce('Reordered chat');
				}
				break;
			}
			case 'move-into-folder': {
				await foldersStore.moveChat(t.folderId, src.id, src.fromFolderId);
				const tf = getFolder(t.folderId);
				announce(`Moved to ${tf?.name ?? 'folder'}`);
				break;
			}
			case 'combine-with-chat': {
				// Trigger inline name editing instead of prompt()
				const a = getChat(src.id);
				const b = getChat(t.targetChatId);
				if (!a || !b) break;
				combineEditing = {
					targetChatId: t.targetChatId,
					sourceChatId: src.id,
					name: `${b.name.split(' ')[0]} + ${a.name.split(' ')[0]}`
				};
				// Don't end drag yet — user needs to confirm the name
				return;
			}
			case 'remove-from-folder': {
				if (src.fromFolderId) {
					await foldersStore.removeChat(src.fromFolderId, src.id);
					announce('Removed from folder');
				}
				break;
			}
		}
		endDrag();
	}

	async function commitCombine(name: string) {
		if (!combineEditing) return;
		const { targetChatId, sourceChatId } = combineEditing;
		const palette = FOLDER_COLOR_PRESETS.map((p) => p.value);
		const color = palette[foldersStore.folders.length % palette.length];
		await foldersStore.create(name, undefined, undefined, [targetChatId, sourceChatId]);
		combineEditing = null;
		announce(`New folder ${name} created`);
		endDrag();
	}

	function cancelCombine() {
		combineEditing = null;
		endDrag();
	}

	function cancelDrag() {
		if (drag) announce('Cancelled');
		suppressNextClick = false;
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
				? getFolder(source.id)?.name ?? ''
				: getChat(source.id)?.name ?? '';
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
		// Intercept the upcoming click to suppress it if this becomes a drag
		function interceptClick(ev: MouseEvent) {
			if (suppressNextClick) {
				ev.stopImmediatePropagation();
				ev.preventDefault();
			}
			suppressNextClick = false;
			srcEl.removeEventListener('click', interceptClick, true);
		}
		suppressNextClick = false;
		srcEl.addEventListener('click', interceptClick, true);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!drag || drag.keyboard) return;
		drag.pointerX = e.clientX;
		drag.pointerY = e.clientY;
		if (!drag.active) {
			const dx = e.clientX - drag.startX;
			const dy = e.clientY - drag.startY;
			if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
				suppressNextClick = true;
				drag.active = true;
				document.body.style.cursor = 'grabbing';
				announce(`Picked up ${drag.preview}`);
			} else {
				return;
			}
		}
		drag.target = resolveTarget(e.clientX, e.clientY);
	}

	function handlePointerUp() {
		if (!drag || drag.keyboard) return;
		if (!drag.active) {
			// Was a click
			const src = drag.source;
			if (src.kind === 'folder') {
				toggleFolder(src.id);
			}
			suppressNextClick = false;
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
					const idx = foldersStore.folders.findIndex((f) => f.id === fid);
					return { kind: 'reorder-folder', index: idx };
				}
				if (y > r.bottom - edgeBand) {
					return { kind: 'reorder-chat-in-folder', folderId: fid, index: 0 };
				}
				return { kind: 'move-into-folder', folderId: fid };
			}
			if (src.kind === 'folder' && fid !== src.id) {
				const center = rectCenterY(folderHeader);
				const idx = foldersStore.folders.findIndex((f) => f.id === fid);
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
			const targetParent = foldersStore.folders.find((f) => f.items.some((i) => i.chatId === targetChatId));
			const sameParent = targetParent?.id === src.fromFolderId;
			const bothUnfoldered = !targetParent && !src.fromFolderId;

			if (inCenterBand && bothUnfoldered) {
				return { kind: 'combine-with-chat', targetChatId };
			}
			if (sameParent) {
				if (targetParent) {
					const idx = targetParent.items.findIndex((i) => i.chatId === targetChatId);
					const insertAt = y < center ? idx : idx + 1;
					return { kind: 'reorder-chat-in-folder', folderId: targetParent.id, index: insertAt };
				}
				// Root reorder not supported by backend; treat as remove-from-folder if applicable
				const idx = getUnfolderedChats().findIndex((c) => c.id === targetChatId);
				const insertAt = y < center ? idx : idx + 1;
				return { kind: 'reorder-chat-root', index: insertAt };
			}
			if (targetParent) {
				const idx = targetParent.items.findIndex((i) => i.chatId === targetChatId);
				const insertAt = y < center ? idx : idx + 1;
				return { kind: 'reorder-chat-in-folder', folderId: targetParent.id, index: insertAt };
			}
			const idx = getUnfolderedChats().findIndex((c) => c.id === targetChatId);
			const insertAt = y < center ? idx : idx + 1;
			return { kind: 'reorder-chat-root', index: insertAt };
		}

		const rootZone = el.closest<HTMLElement>('[data-root-zone]');
		if (rootZone && src.kind === 'chat' && src.fromFolderId) {
			return { kind: 'remove-from-folder' };
		}

		return null;
	}

	function getUnfolderedChats() {
		const folderedIds = new Set(foldersStore.folders.flatMap((f) => f.items.map((i) => i.chatId)));
		return chatsStore.chats.filter((c) => !folderedIds.has(c.id));
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
					? getFolder(id)?.name ?? ''
					: getChat(id)?.name ?? '',
			target: null,
			keyboard: true,
			startX: 0,
			startY: 0,
			active: true,
			pointerId: null
		};
		announce(`Grabbed ${drag.preview}. Arrow keys to move, Enter to drop, Escape to cancel.`);
	}

	async function kbMove(dir: 'up' | 'down') {
		if (!drag || !drag.keyboard) return;
		const src = drag.source;
		if (src.kind === 'folder') {
			const folders = foldersStore.folders;
			const cur = folders.findIndex((f) => f.id === src.id);
			const next = dir === 'up' ? cur - 1 : cur + 1;
			if (next < 0 || next >= folders.length) return;
			const arr = [...folders];
			[arr[cur], arr[next]] = [arr[next], arr[cur]];
			const order = arr.map((f, i) => ({ id: f.id, sortOrder: i }));
			await foldersStore.reorder(order);
		} else {
			const parent = foldersStore.folders.find((f) => f.id === src.fromFolderId);
			if (parent) {
				const cur = parent.items.findIndex((i) => i.chatId === src.id);
				const next = dir === 'up' ? cur - 1 : cur + 1;
				if (next < 0 || next >= parent.items.length) return;
				const arr = parent.items.map((i) => i.chatId);
				[arr[cur], arr[next]] = [arr[next], arr[cur]];
				const itemOrder = arr.map((chatId, i) => ({ chatId, sortOrder: i }));
				await foldersStore.reorderItems(parent.id, itemOrder);
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (drag) { e.preventDefault(); cancelDrag(); }
			return;
		}
		if (!drag) return;
		if (!drag.keyboard) return;
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commitDrop(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); kbMove('up'); }
		else if (e.key === 'ArrowDown') { e.preventDefault(); kbMove('down'); }
	}

	function rowKeydown(e: KeyboardEvent, kind: DragKind, id: string, fromFolderId?: string) {
		if (drag) return;
		if (e.key === ' ') { e.preventDefault(); kbStart(kind, id, fromFolderId); }
	}

	function toggleFolder(id: string) {
		if (drag?.active) return;
		// Folders don't have an 'open' state in the backend — this is client-side only
		opts.onToggleFolder?.(id);
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

	function getGhostColor(): string {
		if (!drag) return 'var(--p-accent)';
		if (drag.source.kind === 'folder') {
			return getFolder(drag.source.id)?.color ?? 'var(--p-accent)';
		}
		const parent = foldersStore.folders.find((f) => f.items.some((i) => i.chatId === drag!.source.id));
		return parent?.color ?? 'var(--p-accent)';
	}

	return {
		// state
		get drag() { return drag; },
		get liveMsg() { return liveMsg; },
		get combineEditing() { return combineEditing; },
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
		// combine
		commitCombine,
		cancelCombine,
		// query helpers
		isDragSource,
		indicatorBetween,
		folderIndicatorBetween,
		targetFolderId,
		combineTargetId,
		rootIsTarget,
		getGhostColor,
		getUnfolderedChats
	};
}
