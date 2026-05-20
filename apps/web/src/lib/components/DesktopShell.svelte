<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import ChatListPane from './ChatListPane.svelte';
	import DesktopNav from './DesktopNav.svelte';

	let { children } = $props();

	const activeChatId = $derived(
		$page.url.pathname.startsWith('/chat/')
			? $page.url.pathname.split('/')[2]
			: undefined
	);

	// Show right pane on mobile for: threads, users directory, user profiles, settings
	const showRightPane = $derived(
		$page.url.pathname.startsWith('/chat/') ||
		$page.url.pathname === '/users' ||
		$page.url.pathname.startsWith('/users/') ||
		$page.url.pathname === '/settings'
	);

	$effect(() => {
		if (!chatsStore.loaded && !chatsStore.loading) {
			chatsStore.load();
		}
		if (!foldersStore.loaded && !foldersStore.loading) {
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

	async function handleCreateGroup(name: string) {
		await chatsStore.createGroup(name, []);
	}
</script>

<div class="monolith" class:show-right={showRightPane}>
	<div class="pane-left" aria-hidden={showRightPane ? true : undefined}>
		{#if chatsStore.loading && chatsStore.chats.length === 0}
			<div class="pane-loading">
				<span>Loading…</span>
			</div>
		{:else if chatsStore.error}
			<div class="pane-error">
				<span>{chatsStore.error}</span>
			</div>
		{:else}
			<ChatListPane
				chats={chatsStore.chats}
				{activeChatId}
				folders={foldersStore.folders}
				onSelectChat={handleSelectChat}
				onCreateFolder={(name) => foldersStore.create(name)}
				onCreateGroup={handleCreateGroup}
				onMoveToFolder={handleMoveToFolder}
			/>
		{/if}
		<DesktopNav />
	</div>
	<div class="pane-right">
		{@render children()}
	</div>
</div>

<style>
	/* ── Mobile base (touch / coarse pointer devices) ── */
	.monolith {
		display: block;
		min-height: 100dvh;
	}

	/* Hide whichever pane is not active on mobile */
	.monolith:not(.show-right) .pane-right {
		display: none;
	}

	.monolith.show-right .pane-left {
		display: none;
	}

	.pane-left {
		min-height: 100dvh;
	}

	.pane-right {
		min-height: 100dvh;
	}

	/* ── Desktop: mouse/trackpad (hover:hover + pointer:fine) ── */
	@media (hover: hover) and (pointer: fine) {
		.monolith {
			display: flex;
			width: 100%;
			max-width: 1200px;
			height: 760px;
			border-radius: var(--radius-xl);
			overflow: hidden;
			box-shadow:
				0 16px 64px rgba(0, 0, 0, 0.6),
				0 0 0 1px var(--p-line);
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			animation: monolith-expand 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
		}

		.pane-left {
			width: 340px;
			flex-shrink: 0;
			background: var(--p-bg);
			border-right: 1px solid var(--p-line);
			overflow-y: auto;
			overflow-x: hidden;
			display: flex !important;
			flex-direction: column;
			position: relative;
			min-height: unset;
		}

		.pane-right {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			position: relative;
			display: block !important;
			view-transition-name: pane-right;
			background: var(--p-surface);
			min-height: unset;
		}

		/* Chat list bottom padding meant for floating nav — not needed in pane */
		.pane-left :global(.chat-list) {
			padding-bottom: 0;
		}

		/* Shell should fill the pane, not 100dvh */
		.pane-left :global(.shell) {
			min-height: 100%;
		}

		/* Thread shell fills pane height instead of full viewport */
		.pane-right :global(.thread-shell) {
			height: 100%;
		}

		/* Page shells fill pane height on desktop (override 100dvh from page CSS) */
		.pane-right :global(.users-shell),
		.pane-right :global(.profile-shell),
		.pane-right :global(.shell) {
			height: 100% !important;
			min-height: 0 !important;
		}

		/* Back buttons are redundant on desktop — DesktopNav handles top-level navigation */
		.pane-right :global(.back-btn) {
			display: none;
		}

		/* Suppress full-page root transition on desktop — pane-right handles it */
		:global(::view-transition-old(root)),
		:global(::view-transition-new(root)) {
			animation: none;
		}

		:global(::view-transition-old(pane-right)) {
			animation: 120ms ease both pane-out;
		}

		:global(::view-transition-new(pane-right)) {
			animation: 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both pane-in;
		}
	}

	.pane-loading,
	.pane-error {
		padding: var(--space-lg);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		text-align: center;
	}

	.pane-error {
		color: var(--p-error);
	}

	@keyframes pane-out {
		to { opacity: 0; transform: translateY(-4px); }
	}

	@keyframes pane-in {
		from { opacity: 0; transform: translateY(6px); }
	}

	@keyframes monolith-expand {
		from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
		to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
	}
</style>
