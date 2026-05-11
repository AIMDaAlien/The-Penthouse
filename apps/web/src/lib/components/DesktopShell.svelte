<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import ChatListPane from './ChatListPane.svelte';
	import Icon from './Icon.svelte';

	let { children } = $props();

	const activeChatId = $derived(
		$page.url.pathname.startsWith('/chat/')
			? $page.url.pathname.split('/')[2]
			: undefined
	);

	const isDesktopRoute = $derived(
		$page.url.pathname === '/' ||
		$page.url.pathname.startsWith('/chat/') ||
		$page.url.pathname.startsWith('/users') ||
		$page.url.pathname === '/settings'
	);

	$effect(() => {
		if (isDesktopRoute && !chatsStore.loaded && !chatsStore.loading) {
			chatsStore.load();
		}
		if (isDesktopRoute && !foldersStore.loaded && !foldersStore.loading) {
			foldersStore.load();
		}
	});

	function handleSelectChat(chatId: string) {
		goto(`/chat/${chatId}`);
	}

	async function handleMoveToFolder(chatId: string, folderId: string | null, currentFolderId?: string) {
		if (folderId) {
			await foldersStore.moveChat(folderId, chatId, currentFolderId);
		} else if (currentFolderId) {
			await foldersStore.removeChat(currentFolderId, chatId);
		}
	}
</script>

<div class="shell" class:is-desktop-route={isDesktopRoute}>
	{#if isDesktopRoute}
		<aside class="sidebar" aria-label="Conversations">
			<div class="sidebar-header">
				<h1 class="logo">
					<Icon name="home" size={22} />
					<span>The Penthouse</span>
				</h1>
			</div>
			{#if chatsStore.loading && chatsStore.chats.length === 0}
				<div class="sidebar-loading">
					<Icon name="loader" size={20} />
					<span>Loading…</span>
				</div>
			{:else if chatsStore.error}
				<div class="sidebar-error">
					<Icon name="alert" size={20} />
					<span>{chatsStore.error}</span>
				</div>
			{:else}
				<ChatListPane
					chats={chatsStore.chats}
					{activeChatId}
					folders={foldersStore.folders}
					onSelectChat={handleSelectChat}
					onCreateFolder={(name) => foldersStore.create(name)}
					onMoveToFolder={handleMoveToFolder}
				/>
			{/if}
		</aside>
	{/if}

	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: flex;
		min-height: calc(100dvh - var(--bottom-nav-offset, 0px));
		flex-direction: column;
	}

	.sidebar {
		display: none;
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	/* Desktop split-pane layout */
	@media (min-width: 768px) {
		.shell {
			min-height: 100dvh;
		}

		.shell.is-desktop-route {
			flex-direction: row;
		}

		.sidebar {
			display: flex;
			flex-direction: column;
			width: 300px;
			min-width: 260px;
			max-width: 360px;
			border-right: 1px solid var(--color-border);
			background: var(--color-surface);
			flex-shrink: 0;
		}

		.sidebar-header {
			padding: var(--space-md) var(--space-lg);
			border-bottom: 1px solid var(--color-border);
		}

		.logo {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-family: var(--font-display);
			font-size: var(--text-lg);
			font-weight: 600;
			color: var(--color-accent);
			margin: 0;
		}

		.sidebar-loading,
		.sidebar-error {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			padding: var(--space-lg);
			color: var(--color-text-secondary);
			font-size: var(--text-sm);
		}

		.sidebar-error {
			color: var(--color-error);
		}
	}

	/* Wide desktop */
	@media (min-width: 1200px) {
		.sidebar {
			width: 340px;
		}
	}

	:global(.sidebar-loading svg) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
