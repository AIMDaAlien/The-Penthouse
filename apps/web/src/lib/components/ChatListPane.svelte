<script lang="ts">
	import ChatListItem from './ChatListItem.svelte';
	import Icon from './Icon.svelte';
	import FolderColorPopover from './FolderColorPopover.svelte';
	import { createChatListDnd } from '$lib/dnd/chatListDnd.svelte';
	import { folders as foldersApi } from '$services/folders';
	import type { ChatSummary } from '@penthouse/contracts';
	import type { FolderWithItems } from '$stores/folders.svelte';

	interface Props {
		chats: ChatSummary[];
		activeChatId?: string;
		onSelectChat?: (chatId: string) => void;
		folders?: FolderWithItems[];
		onCreateFolder?: (name: string) => void;
		onCreateGroup?: (name: string) => void;
		onMoveToFolder?: (chatId: string, folderId: string | null, currentFolderId?: string) => void;
	}

	let { chats, activeChatId, onSelectChat, folders = [], onCreateFolder, onCreateGroup, onMoveToFolder }: Props = $props();

	const dnd = createChatListDnd({
		onToggleFolder: (id) => toggleFolder(id)
	});
	let listEl: HTMLElement;
	$effect(() => dnd.setListEl(listEl));

	// Folder open/close state — client-side only
	let openFolders = $state<Set<string>>(new Set());
	let prevFolderIds = new Set<string>();
	$effect(() => {
		const currentIds = new Set(folders.map((f) => f.id));
		const next = new Set(openFolders);
		let changed = false;
		for (const id of currentIds) {
			if (!prevFolderIds.has(id)) {
				next.add(id);
				changed = true;
			}
		}
		if (changed) {
			openFolders = next;
		}
		prevFolderIds = currentIds;
	});

	let creatingFolder = $state(false);
	let newFolderName = $state('');
	let creatingGroup = $state(false);
	let newGroupName = $state('');
	let colorEdit = $state<{ folderId: string; anchorRect: DOMRect } | null>(null);
	let combineInputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (dnd.combineEditing && combineInputEl) {
			combineInputEl.focus();
			combineInputEl.select();
		}
	});

	function handleCreateGroup() {
		const name = newGroupName.trim();
		if (name) {
			onCreateGroup?.(name);
		}
		creatingGroup = false;
		newGroupName = '';
	}

	function handleCreateFolder() {
		const name = newFolderName.trim();
		if (name) {
			onCreateFolder?.(name);
		}
		creatingFolder = false;
		newFolderName = '';
	}

	function toggleFolder(id: string) {
		if (dnd.drag?.active) return;
		const next = new Set(openFolders);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		openFolders = next;
	}

	function openColorPicker(e: MouseEvent, folderId: string) {
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		colorEdit = { folderId, anchorRect: rect };
	}

	async function handleSetFolderColor(folderId: string, color: string) {
		// Use the store's update method; the socket will sync it back
		// We call the API directly here since foldersStore.update exists
		await foldersApi.update(folderId, { color });
		colorEdit = null;
	}

	const sortedFolders = $derived([...folders].sort((a, b) => a.sortOrder - b.sortOrder));
	const folderedChatIds = $derived(new Set(folders.flatMap((f) => f.items.map((i) => i.chatId))));
	const unfolderedChats = $derived(chats.filter((c) => !folderedChatIds.has(c.id)));

	function handlePointerDownOnRow(e: PointerEvent, source: { kind: 'folder' | 'chat'; id: string; fromFolderId?: string }) {
		const el = e.currentTarget as HTMLElement;
		dnd.pickUp(e, source, el);
	}

	function getFolderColor(folderId: string): string {
		return folders.find((f) => f.id === folderId)?.color ?? 'var(--p-accent)';
	}

	function getGhostColor(): string {
		if (!dnd.drag) return 'var(--p-accent)';
		if (dnd.drag.source.kind === 'folder') {
			return getFolderColor(dnd.drag.source.id);
		}
		const parent = folders.find((f) => f.items.some((i) => i.chatId === dnd.drag!.source.id));
		return parent?.color ?? 'var(--p-accent)';
	}
</script>

<svelte:window
	onpointermove={dnd.handlePointerMove}
	onpointerup={dnd.handlePointerUp}
	onkeydown={dnd.handleKeydown}
/>

<div class="pane">
	<header class="header">
		<h2>Messages</h2>
		<div class="header-actions">
			{#if creatingFolder}
				<form class="folder-form" onsubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}>
					<input
						type="text"
						bind:value={newFolderName}
						placeholder="Folder name"
					/>
					<button type="submit" class="icon-btn" aria-label="Create folder">
						<Icon name="check" size={16} />
					</button>
					<button type="button" class="icon-btn" aria-label="Cancel" onclick={() => { creatingFolder = false; newFolderName = ''; }}>
						<Icon name="x" size={16} />
					</button>
				</form>
			{:else if creatingGroup}
				<form class="group-form" onsubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
					<input
						type="text"
						bind:value={newGroupName}
						placeholder="Group name"
					/>
					<button type="submit" class="icon-btn" aria-label="Create group">
						<Icon name="check" size={16} />
					</button>
					<button type="button" class="icon-btn" aria-label="Cancel" onclick={() => { creatingGroup = false; newGroupName = ''; }}>
						<Icon name="x" size={16} />
					</button>
				</form>
			{:else}
				<button class="icon-btn" aria-label="New folder" onclick={() => creatingFolder = true}>
					<Icon name="folder-plus" size={20} />
				</button>
				<button class="icon-btn" aria-label="New chat" onclick={() => creatingGroup = true}>
					<Icon name="plus" size={20} />
				</button>
			{/if}
		</div>
	</header>

	<div class="list" bind:this={listEl} role="list">
		{#if chats.length === 0 && folders.length === 0}
			<div class="empty">
				<Icon name="message" size={32} />
				<p>No conversations yet</p>
			</div>
		{:else}
			{#each sortedFolders as folder, fi (folder.id)}
				<div class="slot" class:line={dnd.folderIndicatorBetween(fi)}></div>
				<section
					class="folder"
					class:open={openFolders.has(folder.id)}
					class:dimmed={dnd.isDragSource('folder', folder.id)}
					class:receiving={dnd.targetFolderId() === folder.id}
					style:--fc={folder.color ?? 'var(--p-accent)'}
				>
					<div class="aura-bg" aria-hidden="true"></div>

					<div
						class="frow"
						data-folder-header
						data-folder-id={folder.id}
						tabindex="0"
						role="button"
						aria-grabbed={dnd.drag?.active && dnd.drag.source.kind === 'folder' && dnd.drag.source.id === folder.id}
						aria-expanded={openFolders.has(folder.id)}
						onpointerdown={(e) => handlePointerDownOnRow(e, { kind: 'folder', id: folder.id })}
						onkeydown={(e) => dnd.rowKeydown(e, 'folder', folder.id)}
					>
						<button
							class="dot-btn"
							type="button"
							aria-label="Change folder color"
							onclick={(e) => openColorPicker(e, folder.id)}
							onpointerdown={(e) => e.stopPropagation()}
						>
							<span class="dot" aria-hidden="true"></span>
						</button>
						<span class="fname">{folder.name}</span>
						<span class="fcount">{folder.items.length}</span>
						<span class="caret" aria-hidden="true">
							<svg viewBox="0 0 12 12" width="10" height="10">
								<path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</span>
					</div>

					{#if openFolders.has(folder.id) && folder.items.length > 0}
						<div class="fbody">
							{#each folder.items as item, ci (item.chatId)}
								{@const chat = chats.find((c) => c.id === item.chatId)}
								{#if chat}
									<div class="slot" class:line={dnd.indicatorBetween(folder.id, ci)}></div>
									<div
										data-chat-row
										data-chat-id={chat.id}
										class="in-folder"
									>
										<ChatListItem
											chat={chat}
											active={chat.id === activeChatId}
											onSelect={() => onSelectChat?.(chat.id)}
											folders={folders}
											onMoveToFolder={(targetFolderId) => onMoveToFolder?.(chat.id, targetFolderId, folder.id)}
											onPointerDown={(e) => handlePointerDownOnRow(e, { kind: 'chat', id: chat.id, fromFolderId: folder.id })}
											onRowKeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id, folder.id)}
											dimmed={dnd.isDragSource('chat', chat.id)}
											combine={dnd.combineTargetId() === chat.id}
										/>
										{#if dnd.combineEditing?.targetChatId === chat.id}
											<form
												class="combine-form"
											 onsubmit={(e) => { e.preventDefault(); dnd.commitCombine(dnd.combineEditing!.name); }}
											>
												<input
													bind:this={combineInputEl}
													type="text"
													bind:value={dnd.combineEditing.name}
													onkeydown={(e) => {
														if (e.key === 'Enter') { e.preventDefault(); dnd.commitCombine(dnd.combineEditing!.name); }
														if (e.key === 'Escape') { e.preventDefault(); dnd.cancelCombine(); }
													}}
												/>
												<button type="submit" class="combine-btn">Create</button>
												<button type="button" class="combine-btn" onclick={dnd.cancelCombine}>Cancel</button>
											</form>
										{/if}
									</div>
								{/if}
							{/each}
							<div class="slot tail" class:line={dnd.indicatorBetween(folder.id, folder.items.length)}></div>
						</div>
					{/if}
				</section>
			{/each}
			<div class="slot" class:line={dnd.folderIndicatorBetween(sortedFolders.length)}></div>

			{#if unfolderedChats.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
				<div class="sec"><span class="sec-glyph">◌</span> Direct</div>
			{/if}

			<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
				{#if unfolderedChats.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
					<div class="root-pill">release to ungroup</div>
				{/if}
				{#each unfolderedChats as chat, ci (chat.id)}
					<div class="slot" class:line={dnd.indicatorBetween('root', ci)}></div>
					<div
						data-chat-row
						data-chat-id={chat.id}
						class:combine-target={dnd.combineTargetId() === chat.id}
					>
						<ChatListItem
							chat={chat}
							active={chat.id === activeChatId}
							onSelect={() => onSelectChat?.(chat.id)}
							folders={folders}
							onMoveToFolder={(targetFolderId) => onMoveToFolder?.(chat.id, targetFolderId)}
							onPointerDown={(e) => handlePointerDownOnRow(e, { kind: 'chat', id: chat.id })}
							onRowKeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id)}
							dimmed={dnd.isDragSource('chat', chat.id)}
							combine={dnd.combineTargetId() === chat.id}
						/>
						{#if dnd.combineEditing?.targetChatId === chat.id}
							<form
								class="combine-form"
							 onsubmit={(e) => { e.preventDefault(); dnd.commitCombine(dnd.combineEditing!.name); }}
							>
								<input
									bind:this={combineInputEl}
									type="text"
									bind:value={dnd.combineEditing.name}
									onkeydown={(e) => {
										if (e.key === 'Enter') { e.preventDefault(); dnd.commitCombine(dnd.combineEditing!.name); }
										if (e.key === 'Escape') { e.preventDefault(); dnd.cancelCombine(); }
									}}
								/>
								<button type="submit" class="combine-btn">Create</button>
								<button type="button" class="combine-btn" onclick={dnd.cancelCombine}>Cancel</button>
							</form>
						{/if}
					</div>
				{/each}
				<div class="slot tail" class:line={dnd.indicatorBetween('root', unfolderedChats.length)}></div>
			</div>
		{/if}
	</div>
</div>

<!-- Ghost -->
{#if dnd.drag?.active}
	{@const d = dnd.drag}
	{@const gc = getGhostColor()}
	<div
		class="ghost"
		style:left="{d.pointerX - d.offsetX}px"
		style:top="{d.pointerY - d.offsetY}px"
		style:--gc={gc}
		aria-hidden="true"
	>
		{#if d.source.kind === 'folder'}
			<span class="g-dot" style:background={gc}></span>
			<span class="g-name">{d.preview}</span>
		{:else}
			{@const chat = chats.find((c) => c.id === d.source.id)}
			{#if chat}
				<div class="g-avatar">{chat.name.split(/[\s_]+/).map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()}</div>
				<span class="g-name">{d.preview}</span>
			{/if}
		{/if}
	</div>
{/if}

<!-- Color picker popover -->
{#if colorEdit}
	{@const folder = folders.find((f) => f.id === colorEdit?.folderId)}
	{#if folder}
		<FolderColorPopover
			current={folder.color ?? 'var(--p-accent)'}
			anchorRect={colorEdit.anchorRect}
			onSelect={(c) => handleSetFolderColor(folder.id, c)}
			onClose={() => (colorEdit = null)}
		/>
	{/if}
{/if}

<!-- Live region for screen readers -->
<div class="live" aria-live="polite" aria-atomic="true">{dnd.liveMsg}</div>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		background: var(--p-bg);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--p-line);
	}

	h2 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--p-text);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--p-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.icon-btn:hover {
		background: var(--p-surface-2);
	}

	.folder-form,
	.group-form {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.folder-form input,
	.group-form input {
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		padding: var(--space-xs) var(--space-sm);
		color: var(--p-text);
		font-size: var(--text-sm);
		width: 120px;
	}

	.folder-form input:focus,
	.group-form input:focus {
		outline: none;
		border-color: var(--p-accent);
	}

	.list {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
		padding: 4px 0 var(--space-lg);
		position: relative;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-xl);
		color: var(--p-muted);
		min-height: 200px;
	}

	.empty p {
		font-size: var(--text-sm);
	}

	/* ----- Folder ----- */
	.folder {
		position: relative;
		border-bottom: 1px solid var(--p-line);
	}

	.aura-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
		background:
			radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--fc) 26%, transparent), transparent 70%),
			linear-gradient(180deg, color-mix(in oklch, var(--fc) 14%, transparent), color-mix(in oklch, var(--fc) 2%, transparent) 70%, transparent);
	}

	.folder.open .aura-bg {
		opacity: 1;
	}

	.frow {
		display: grid;
		grid-template-columns: 22px 1fr auto 14px;
		align-items: center;
		gap: 10px;
		padding: var(--space-sm) var(--space-lg);
		position: relative;
		z-index: 2;
		cursor: pointer;
		transition: padding 200ms cubic-bezier(0.22, 1, 0.36, 1);
		user-select: none;
	}

	.frow:hover .fname {
		color: var(--p-text);
	}

	.frow:focus-visible {
		outline: 2px solid var(--fc);
		outline-offset: -2px;
		border-radius: 2px;
	}

	.dot-btn {
		width: 22px;
		height: 22px;
		padding: 0;
		margin: 0;
		background: none;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: border-color 160ms, background 160ms;
	}

	.dot-btn:hover {
		border-color: color-mix(in oklch, var(--fc) 40%, var(--p-line));
		background: oklch(1 0 0 / 0.04);
	}

	.dot-btn:focus-visible {
		outline: 2px solid var(--fc);
		outline-offset: 0;
	}

	.dot {
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--fc);
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--fc) 22%, transparent),
			0 0 10px color-mix(in oklch, var(--fc) 50%, transparent);
		transition: box-shadow 200ms;
	}

	.dot-btn:hover .dot {
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--fc) 32%, transparent),
			0 0 14px color-mix(in oklch, var(--fc) 65%, transparent);
	}

	.fname {
		font-size: 13.5px;
		font-weight: var(--weight-bold);
		letter-spacing: -0.005em;
		color: var(--p-text);
		transition: color 160ms;
	}

	.fcount {
		font-size: 10.5px;
		font-weight: var(--weight-bold);
		color: color-mix(in oklch, var(--fc) 80%, var(--p-text-2));
		background: color-mix(in oklch, var(--fc) 18%, oklch(0 0 0 / 0.20));
		padding: 1.5px 8px;
		border-radius: var(--radius-pill);
		min-width: 20px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.caret {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--p-muted);
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.folder:not(.open) .caret {
		transform: rotate(-90deg);
	}

	.folder.receiving {
		background: color-mix(in oklch, var(--fc) 14%, transparent);
	}

	.folder.receiving .frow {
		box-shadow: inset 0 0 0 1.5px var(--fc);
	}

	.folder.receiving .frow::after {
		content: '↳';
		position: absolute;
		right: 36px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--fc);
		font-size: 16px;
	}

	.folder.dimmed {
		opacity: 0.28;
		filter: saturate(0.5);
		pointer-events: none;
	}

	.fbody {
		position: relative;
		z-index: 1;
		padding-bottom: 4px;
	}

	/* Drop slot indicators */
	.slot {
		height: 0;
		position: relative;
		overflow: visible;
		z-index: 3;
	}

	.slot.tail {
		height: 4px;
	}

	.slot.line::after {
		content: '';
		position: absolute;
		left: var(--space-lg);
		right: var(--space-lg);
		top: -1.5px;
		height: 3px;
		border-radius: 3px;
		background: linear-gradient(90deg, transparent, var(--p-accent) 18%, var(--p-accent) 82%, transparent);
		box-shadow: 0 0 8px var(--p-accent), 0 0 16px var(--p-accent-soft);
		animation: bar-in 240ms cubic-bezier(0.16, 1, 0.3, 1), bar-pulse 1600ms ease-in-out 240ms infinite;
	}

	.fbody .slot.line::after {
		left: 30px;
	}

	@keyframes bar-in {
		from { transform: scaleX(0.3); opacity: 0; }
		to { transform: scaleX(1); opacity: 1; }
	}

	@keyframes bar-pulse {
		0%, 100% { box-shadow: 0 0 8px var(--p-accent), 0 0 16px var(--p-accent-soft); }
		50% { box-shadow: 0 0 14px var(--p-accent), 0 0 28px var(--p-accent-soft); }
	}

	/* Root zone */
	.root-zone {
		position: relative;
		min-height: 24px;
		transition: background 240ms;
	}

	.root-zone.active {
		background: linear-gradient(180deg, color-mix(in oklch, var(--p-accent) 18%, transparent), transparent);
	}

	.root-pill {
		display: inline-block;
		margin: 20px var(--space-lg);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--p-accent);
		background: var(--p-accent-soft);
		border: 1px solid var(--p-accent-edge);
		padding: 7px 14px;
		border-radius: var(--radius-pill);
		box-shadow: 0 0 14px color-mix(in oklch, var(--p-accent) 30%, transparent);
	}

	/* Section header */
	.sec {
		padding: var(--space-lg) var(--space-lg) var(--space-sm);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--p-muted);
		font-weight: var(--weight-bold);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sec-glyph {
		color: var(--p-accent);
		font-size: 13px;
	}

	/* Combine form */
	.combine-form {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-lg);
	}

	.combine-form input {
		flex: 1;
		background: var(--p-surface);
		border: 1px solid var(--p-accent);
		border-radius: var(--radius-md);
		padding: var(--space-xs) var(--space-sm);
		color: var(--p-text);
		font-size: var(--text-sm);
	}

	.combine-form input:focus {
		outline: none;
		border-color: var(--p-accent);
	}

	.combine-btn {
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		cursor: pointer;
	}

	.combine-btn[type="button"] {
		background: var(--p-surface-2);
		color: var(--p-text);
		border: 1px solid var(--p-line);
	}

	/* Ghost */
	.ghost {
		position: fixed;
		z-index: 100;
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 14px 9px 12px;
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklch, var(--gc) 30%, transparent), transparent 60%),
			var(--p-surface-2);
		border: 1px solid var(--gc);
		border-radius: var(--radius-lg);
		box-shadow:
			0 0 0 4px color-mix(in oklch, var(--gc) 22%, transparent),
			0 18px 36px oklch(0.04 0.02 280 / 0.55),
			0 0 36px color-mix(in oklch, var(--gc) 28%, transparent);
		transform: scale(1.03);
		animation: ghost-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.g-dot {
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--gc);
		box-shadow: 0 0 10px color-mix(in oklch, var(--gc) 50%, transparent);
	}

	.g-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: color-mix(in oklch, var(--p-accent) 30%, var(--p-surface-2));
		display: grid;
		place-items: center;
		font-weight: var(--weight-bold);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--p-text);
		flex-shrink: 0;
	}

	.g-name {
		font-weight: var(--weight-medium);
		font-size: 14px;
		color: var(--p-text);
	}

	@keyframes ghost-in {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1.03); }
	}

	/* Accessibility */
	.live {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
</style>
