<script lang="ts">
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import type { ChatSummary } from '@penthouse/contracts';
	import type { FolderWithItems } from '$stores/folders.svelte';

	interface Props {
		chat: ChatSummary;
		active?: boolean;
		onSelect?: () => void;
		folders?: FolderWithItems[];
		onMoveToFolder?: (folderId: string | null) => void;
		// DND
		onPointerDown?: (e: PointerEvent) => void;
		onRowKeydown?: (e: KeyboardEvent) => void;
		dimmed?: boolean;
		combine?: boolean;
	}

	let { chat, active = false, onSelect, folders = [], onMoveToFolder, onPointerDown, onRowKeydown, dimmed = false, combine = false }: Props = $props();

	const timeLabel = $derived(() => {
		if (!chat.updatedAt) return '';
		const d = new Date(chat.updatedAt);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	});

	const currentFolder = $derived(() => folders.find((f) => f.items.some((i) => i.chatId === chat.id)));

	let menuOpen = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);
	let wrapperEl: HTMLDivElement;

	function openMenuAt(clientX: number, clientY: number) {
		menuX = clientX;
		menuY = clientY;
		menuOpen = true;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		openMenuAt(e.clientX, e.clientY);
	}

	function handleActionsClick(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const targetRect = target.getBoundingClientRect();
		menuX = Math.max(8, targetRect.right - 160);
		menuY = targetRect.bottom + 4;
		menuOpen = !menuOpen;
	}

	function handleSelectFolder(folderId: string) {
		onMoveToFolder?.(folderId);
		menuOpen = false;
	}

	function handleRemoveFromFolder() {
		onMoveToFolder?.(null);
		menuOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			menuOpen = false;
			return;
		}
		// Enter selects, Space starts keyboard drag
		if (e.key === 'Enter') {
			e.preventDefault();
			onSelect?.();
		} else if (e.key === ' ') {
			e.preventDefault();
			onRowKeydown?.(e);
		}
	}

	function handlePointerDown(e: PointerEvent) {
		onPointerDown?.(e);
	}

	$effect(() => {
		if (!menuOpen) return;
		function onClick(e: MouseEvent) {
			if (!wrapperEl.contains(e.target as Node)) {
				menuOpen = false;
			}
		}
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});
</script>

<div class="item-wrapper" bind:this={wrapperEl} class:dimmed class:combine>
	<div class="item-row" class:active>
		<button
			class="item"
			onclick={() => { menuOpen = false; onSelect?.(); }}
			oncontextmenu={handleContextMenu}
			onpointerdown={handlePointerDown}
			onkeydown={handleKeydown}
			aria-label={`Open chat ${chat.name}`}
		>
			<Avatar url={chat.counterpartAvatarUrl} name={chat.name} size={48} />
			<div class="content">
				<div class="row">
					<span class="name">{chat.name}</span>
					<span class="time">{timeLabel()}</span>
				</div>
				<div class="row">
					<span class="preview">{chat.type === 'dm' ? 'Direct message' : 'Group chat'}</span>
					{#if chat.unreadCount > 0}
						<span class="badge">{chat.unreadCount}</span>
					{/if}
				</div>
			</div>
		</button>
		{#if folders.length > 0 || currentFolder()}
			<button
				class="actions-btn"
				type="button"
				aria-label={`Chat actions for ${chat.name}`}
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				onclick={(e) => { e.stopPropagation(); handleActionsClick(e); }}
			>
				<Icon name="more" size={18} />
			</button>
		{/if}
	</div>

	<div class="context-menu" class:open={menuOpen} style="left: {menuX}px; top: {menuY}px;" role="menu">
		<div class="menu-section">Move to folder</div>
		{#each folders as folder (folder.id)}
			{#if folder.id !== currentFolder()?.id}
				<button class="menu-item" role="menuitem" onclick={() => handleSelectFolder(folder.id)}>
					{folder.name}
				</button>
			{/if}
		{/each}
		{#if currentFolder()}
			<div class="menu-divider"></div>
			<button class="menu-item menu-item-danger" role="menuitem" onclick={handleRemoveFromFolder}>
				Remove from folder
			</button>
		{/if}
	</div>
</div>

<style>
	.item-wrapper {
		position: relative;
	}

	.item-wrapper.dimmed {
		opacity: 0.28;
		filter: saturate(0.5);
		pointer-events: none;
	}

	.item-wrapper.combine {
		background: color-mix(in oklch, var(--p-accent) 18%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--p-accent);
	}

	.item-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--p-line);
	}

	.item-row.active {
		background: var(--p-surface-2);
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-lg);
		background: none;
		border: none;
		color: var(--p-text);
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
		min-width: 0;
		touch-action: none;
	}

	.item-row:hover {
		background: var(--p-surface-2);
	}

	.actions-btn {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		margin-right: var(--space-sm);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--p-muted);
		cursor: pointer;
		flex-shrink: 0;
	}

	.actions-btn:hover,
	.actions-btn[aria-expanded="true"] {
		background: var(--p-surface);
		color: var(--p-text);
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		min-width: 0;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.name {
		font-weight: var(--weight-medium);
		font-size: var(--text-base);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.time {
		font-size: var(--text-xs);
		color: var(--p-muted);
		flex-shrink: 0;
	}

	.preview {
		font-size: var(--text-sm);
		color: var(--p-text-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.badge {
		background: var(--p-accent);
		color: var(--p-bg);
		mix-blend-mode: normal;
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		flex-shrink: 0;
		min-width: 18px;
		text-align: center;
	}

	.context-menu {
		position: fixed;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 12px oklch(0 0 0 / 0.15);
		z-index: 10;
		min-width: 160px;
		padding: var(--space-xs) 0;
		display: none;
	}

	.context-menu.open {
		display: block;
	}

	.menu-section {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-xs);
		color: var(--p-muted);
		text-transform: uppercase;
		font-weight: var(--weight-bold);
	}

	.menu-item {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: var(--space-sm) var(--space-md);
		color: var(--p-text);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.menu-item:hover {
		background: var(--p-surface-2);
	}

	.menu-divider {
		height: 1px;
		background: var(--p-line);
		margin: var(--space-xs) var(--space-md);
	}

	.menu-item-danger {
		color: var(--p-error);
	}
</style>
