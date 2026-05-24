<script lang="ts">
	import Avatar from './Avatar.svelte';
	import PresenceAvatar from './PresenceAvatar.svelte';
	import Icon from './Icon.svelte';
	import { presenceStore } from '$stores/presence.svelte';
	import { voiceRoomsStore } from '$stores/voiceRooms.svelte';
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

	const timeLabel = $derived.by(() => {
		if (!chat.updatedAt) return '';
		const d = new Date(chat.updatedAt);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	});

	const currentFolder = $derived.by(() => folders.find((f) => f.items.some((i) => i.chatId === chat.id)));

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
			{#if chat.type === 'dm' && chat.counterpartMemberId}
				<PresenceAvatar url={chat.counterpartAvatarUrl} name={chat.name} size={48} userId={chat.counterpartMemberId} />
			{:else}
				<Avatar url={chat.counterpartAvatarUrl} name={chat.name} size={48} />
			{/if}
			<div class="content">
				<div class="row">
					<span class="name">{chat.name}</span>
					<span class="time">{timeLabel}</span>
				</div>
				<div class="row">
					{#if chat.type === 'dm' && chat.counterpartMemberId}
						{@const p = presenceStore.get(chat.counterpartMemberId)}
						<span class="preview" class:presence-note={!!p?.note}>
							{#if p?.note}
								{p.note}
							{:else}
								Direct message
							{/if}
						</span>
					{:else}
						<span class="preview">{chat.type === 'dm' ? 'Direct message' : 'Group chat'}</span>
					{/if}
					{#if chat.unreadCount > 0}
						<span class="badge">{chat.unreadCount}</span>
					{/if}
					{#if true}
						{@const voice = voiceRoomsStore.get(chat.id)}
						{#if voice && voice.participantCount > 0}
							<span class="voice-pill" class:speaking={voice.speakingUserIds.length > 0}>
								<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
									<path d="M8 2a3 3 0 0 1 3 3v2a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm0 9c2.5 0 4.5-1.8 4.9-4.2a.5.5 0 0 1 1 .2 6 6 0 0 1-1.8 3.8v1.7a1 1 0 0 1-1 1H4.9a1 1 0 0 1-1-1v-1.7a6 6 0 0 1-1.8-3.8.5.5 0 0 1 1-.2C3.5 9.2 5.5 11 8 11z"/>
								</svg>
								{voice.participantCount}
							</span>
						{/if}
					{/if}
				</div>
			</div>
		</button>
		{#if folders.length > 0 || currentFolder}
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
			{#if folder.id !== currentFolder?.id}
				<button class="menu-item" role="menuitem" onclick={() => handleSelectFolder(folder.id)}>
					{folder.name}
				</button>
			{/if}
		{/each}
		{#if currentFolder}
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
		padding: 0;
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

	.preview.presence-note {
		color: var(--p-accent);
		font-style: italic;
	}

	.voice-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: var(--p-accent);
		background: var(--p-accent-soft);
		border: 1px solid var(--p-accent-edge);
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		flex-shrink: 0;
	}

	.voice-pill.speaking {
		animation: voice-pulse 1.2s ease-in-out infinite;
	}

	@keyframes voice-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
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
