<script lang="ts">
	import Avatar from './Avatar.svelte';
	import type { ChatSummary } from '@penthouse/contracts';
	import type { FolderWithItems } from '$stores/folders.svelte';

	interface Props {
		chat: ChatSummary;
		active?: boolean;
		onclick?: () => void;
		folders?: FolderWithItems[];
		onMoveToFolder?: (folderId: string | null) => void;
	}

	let { chat, active = false, onclick, folders = [], onMoveToFolder }: Props = $props();

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

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		const rect = wrapperEl.getBoundingClientRect();
		menuX = e.clientX - rect.left;
		menuY = e.clientY - rect.top;
		menuOpen = true;
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
		}
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

<svelte:window onkeydown={handleKeydown} />

<div class="item-wrapper" bind:this={wrapperEl}>
	<button class="item" class:active onclick={() => { menuOpen = false; onclick?.(); }} oncontextmenu={handleContextMenu} aria-label={`Open chat ${chat.name}`}>
		<Avatar url={chat.counterpartAvatarUrl} name={chat.name} size={48} />
		<div class="content">
			<div class="row">
				<span class="name">{chat.name}</span>
				<span class="time">{timeLabel()}</span>
			</div>
			<div class="row">
				<span class="preview">{chat.type === 'dm' ? 'Direct message' : 'Channel'}</span>
				{#if chat.unreadCount > 0}
					<span class="badge">{chat.unreadCount}</span>
				{/if}
			</div>
		</div>
	</button>

	{#if menuOpen}
		<div class="context-menu" style="left: {menuX}px; top: {menuY}px;">
			<div class="menu-section">Move to folder</div>
			{#each folders as folder (folder.id)}
				{#if folder.id !== currentFolder()?.id}
					<button class="menu-item" onclick={() => handleSelectFolder(folder.id)}>
						{folder.name}
					</button>
				{/if}
			{/each}
			{#if currentFolder()}
				<div class="menu-divider"></div>
				<button class="menu-item menu-item-danger" onclick={handleRemoveFromFolder}>
					Remove from folder
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.item-wrapper {
		position: relative;
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-lg);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
	}

	.item:hover, .item.active {
		background: var(--color-surface-elevated);
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
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.preview {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.badge {
		background: var(--color-accent);
		color: var(--color-bg);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		flex-shrink: 0;
		min-width: 18px;
		text-align: center;
	}

	.context-menu {
		position: absolute;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 10;
		min-width: 160px;
		padding: var(--space-xs) 0;
	}

	.menu-section {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
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
		color: var(--color-text);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.menu-item:hover {
		background: var(--color-surface-elevated);
	}

	.menu-divider {
		height: 1px;
		background: var(--color-border);
		margin: var(--space-xs) var(--space-md);
	}

	.menu-item-danger {
		color: var(--color-error);
	}
</style>
