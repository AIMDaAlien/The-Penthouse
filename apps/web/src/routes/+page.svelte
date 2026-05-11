<script lang="ts">
	import ChatListPane from '$components/ChatListPane.svelte';
	import Icon from '$components/Icon.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		loading = true;
		error = '';
		Promise.all([
			chatsStore.load(),
			foldersStore.load()
		])
			.catch((err) => { error = err instanceof Error ? err.message : 'Failed to load chats'; })
			.finally(() => { loading = false; });
	});

	const statusColor = $derived(
		socketStore.state === 'connected' ? 'var(--color-success)' :
		socketStore.state === 'connecting' ? 'var(--color-accent)' :
		'var(--color-error)'
	);

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

<main class="home">
	<!-- Mobile-only header + list -->
	<div class="mobile-only">
		<header class="top-bar">
			<h1>The Penthouse</h1>
			<span class="status" style:color={statusColor}>● {socketStore.state}</span>
		</header>

		{#if loading}
			<p class="state">Loading conversations…</p>
		{:else if error}
			<p class="state error">{error}</p>
		{:else}
			<ChatListPane
				chats={chatsStore.chats}
				folders={foldersStore.folders}
				onSelectChat={handleSelectChat}
				onCreateFolder={(name) => foldersStore.create(name)}
				onMoveToFolder={handleMoveToFolder}
			/>
		{/if}
	</div>

	<!-- Desktop-only placeholder -->
	<div class="desktop-only">
		<div class="welcome">
			<Icon name="message" size={48} />
			<h2>Select a conversation</h2>
			<p>Choose a chat from the sidebar to start messaging.</p>
		</div>
	</div>
</main>

<style>
	.home {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	.status {
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		text-transform: uppercase;
	}

	.state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state.error {
		color: var(--color-error);
	}

	.desktop-only {
		display: none;
	}

	.welcome {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		color: var(--color-text-muted);
		text-align: center;
		padding: var(--space-xl);
	}

	.welcome h2 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.welcome p {
		font-size: var(--text-sm);
		max-width: 280px;
	}

	/* Desktop: hide mobile content, show placeholder */
	@media (min-width: 768px) {
		.mobile-only {
			display: none;
		}
		.desktop-only {
			display: flex;
			flex: 1;
		}
		.home {
			min-height: 0;
		}
	}
</style>
