<script lang="ts">
	import ChatListItem from './ChatListItem.svelte';
	import Icon from './Icon.svelte';
	import type { ChatSummary } from '@penthouse/contracts';
	import type { FolderWithItems } from '$stores/folders.svelte';

	interface Props {
		chats: ChatSummary[];
		activeChatId?: string;
		onSelectChat?: (chatId: string) => void;
		folders?: FolderWithItems[];
		onCreateFolder?: (name: string) => void;
		onMoveToFolder?: (chatId: string, folderId: string | null, currentFolderId?: string) => void;
	}

	let { chats, activeChatId, onSelectChat, folders = [], onCreateFolder, onMoveToFolder }: Props = $props();

	let creatingFolder = $state(false);
	let newFolderName = $state('');

	const sortedFolders = $derived([...folders].sort((a, b) => a.sortOrder - b.sortOrder));

	const folderedChatIds = $derived(new Set(folders.flatMap((f) => f.items.map((i) => i.chatId))));
	const unfolderedChats = $derived(chats.filter((c) => !folderedChatIds.has(c.id)));

	function handleCreateFolder() {
		const name = newFolderName.trim();
		if (name) {
			onCreateFolder?.(name);
		}
		creatingFolder = false;
		newFolderName = '';
	}
</script>

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
			{:else}
				<button class="icon-btn" aria-label="New folder" onclick={() => creatingFolder = true}>
					<Icon name="folder-plus" size={20} />
				</button>
				<button class="icon-btn" aria-label="New chat">
					<Icon name="plus" size={20} />
				</button>
			{/if}
		</div>
	</header>

	<div class="list" role="list">
		{#if chats.length === 0 && folders.length === 0}
			<div class="empty">
				<Icon name="message" size={32} />
				<p>No conversations yet</p>
			</div>
		{:else}
			{#each sortedFolders as folder (folder.id)}
				<details class="folder" open>
					<summary class="folder-header">
						{#if folder.color}
							<span class="folder-dot" style="background-color: {folder.color};"></span>
						{/if}
						<span class="folder-name">{folder.name}</span>
					</summary>
					<div class="folder-items">
						{#each folder.items as item (item.chatId)}
							{@const chat = chats.find((c) => c.id === item.chatId)}
							{#if chat}
								<ChatListItem
									chat={chat}
									active={chat.id === activeChatId}
									onclick={() => onSelectChat?.(chat.id)}
									folders={folders}
									onMoveToFolder={(targetFolderId) => onMoveToFolder?.(chat.id, targetFolderId, folder.id)}
								/>
							{/if}
						{/each}
					</div>
				</details>
			{/each}

			{#each unfolderedChats as chat (chat.id)}
				<ChatListItem
					chat={chat}
					active={chat.id === activeChatId}
					onclick={() => onSelectChat?.(chat.id)}
					folders={folders}
					onMoveToFolder={(targetFolderId) => onMoveToFolder?.(chat.id, targetFolderId)}
				/>
			{/each}
		{/if}
	</div>
</div>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		background: var(--color-bg);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	h2 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn:hover {
		background: var(--color-surface-elevated);
	}

	.folder-form {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.folder-form input {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-text);
		font-size: var(--text-sm);
		width: 120px;
	}

	.folder-form input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.list {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-xl);
		color: var(--color-text-muted);
		min-height: 200px;
	}

	.empty p {
		font-size: var(--text-sm);
	}

	.folder {
		border-bottom: 1px solid var(--color-border);
	}

	.folder-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-surface-elevated);
		cursor: pointer;
		font-weight: var(--weight-bold);
		font-size: var(--text-sm);
		list-style: none;
	}

	.folder-header::-webkit-details-marker {
		display: none;
	}

	.folder-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.folder-name {
		flex: 1;
	}

	.folder-items {
		background: var(--color-bg);
	}
</style>
