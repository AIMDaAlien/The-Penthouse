<script lang="ts">
	import ChatListPane from '$components/ChatListPane.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { goto } from '$app/navigation';
	import { chats as chatsApi } from '$services/chats';
	import type { ChatSummary } from '@penthouse/contracts';

	let chats = $state<ChatSummary[]>([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		loading = true;
		error = '';
		chatsApi.list()
			.then((res) => { chats = res.chats; })
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
</script>

<main class="home">
	<header class="top-bar">
		<h1>The Penthouse</h1>
		<span class="status" style:color={statusColor}>● {socketStore.state}</span>
	</header>

	{#if loading}
		<p class="state">Loading conversations...</p>
	{:else if error}
		<p class="state error">{error}</p>
	{:else}
		<ChatListPane {chats} onSelectChat={handleSelectChat} />
	{/if}
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
</style>
