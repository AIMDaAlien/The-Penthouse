<script lang="ts">
	import ChatListPane from '$components/ChatListPane.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import { sessionStore } from '$stores/session.svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		if (!sessionStore.isAuthenticated) return;

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
		socketStore.state === 'connected' ? 'var(--p-success)' :
		socketStore.state === 'connecting' ? 'var(--p-accent)' :
		'var(--p-error)'
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

	async function handleCreateGroup(name: string) {
		await chatsStore.createGroup(name, []);
	}
</script>

<main class="home">
	<!-- Mobile: header + chat list -->
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
				onCreateGroup={handleCreateGroup}
				onMoveToFolder={handleMoveToFolder}
			/>
		{/if}
	</div>

	<!-- Desktop: editorial empty state (inside pane-right) -->
	<div class="desktop-only">
		<div class="select-placeholder">
			<div class="empty-book">
				<span class="empty-label">DIRECTORY IS EMPTY</span>
				<blockquote class="empty-quote">
					All distances are the same<br>to the person who longs.
				</blockquote>
				<cite class="empty-cite">— Rainer Maria Rilke</cite>
			</div>
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
		border-bottom: 1px solid var(--p-line);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--p-accent);
	}

	.status {
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		text-transform: uppercase;
	}

	.state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--p-text-2);
		font-size: var(--text-sm);
	}

	.state.error {
		color: var(--p-error);
	}

	.desktop-only {
		display: none;
	}

	/* Desktop: hide mobile content, show editorial placeholder */
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
			height: 100%;
		}
	}

	.select-placeholder {
		height: 100%;
		display: flex;
		align-items: center;
		min-height: 100dvh;
		padding: 0 48px;
	}

	.empty-book {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 320px;
	}

	.empty-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: var(--weight-medium);
		letter-spacing: 0.12em;
		color: var(--p-text-2);
		opacity: 0.6;
	}

	.empty-quote {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-xl);
		line-height: 1.4;
		background: linear-gradient(180deg, var(--p-text) 40%, transparent 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	.empty-cite {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-style: normal;
		color: var(--p-text-2);
		opacity: 0.5;
	}

	@media (hover: hover) and (pointer: fine) {
		.select-placeholder {
			min-height: unset;
		}
	}
</style>
