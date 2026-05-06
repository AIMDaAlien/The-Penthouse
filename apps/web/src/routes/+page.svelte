<script lang="ts">
	import ChatListPane from '$components/ChatListPane.svelte';
	import BottomNav from '$components/BottomNav.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { goto } from '$app/navigation';
	import type { ChatSummary } from '@penthouse/contracts';

	// TODO: fetch from API
	const chats = $state<ChatSummary[]>([
		{
			id: '1',
			type: 'dm',
			name: 'Alice',
			updatedAt: new Date().toISOString(),
			unreadCount: 2,
			counterpartAvatarUrl: null
		},
		{
			id: '2',
			type: 'channel',
			name: 'General',
			updatedAt: new Date(Date.now() - 3600000).toISOString(),
			unreadCount: 0
		}
	]);

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

	<ChatListPane {chats} onSelectChat={handleSelectChat} />
	<BottomNav active="chats" />
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
</style>
