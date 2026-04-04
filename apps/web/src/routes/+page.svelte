<!-- Chat list home page — MVP SPRINT: wire up real data here -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { chats } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import type { ChatSummary } from '@penthouse/contracts';

	let chatList = $state<ChatSummary[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			chatList = await chats.list();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load chats.';
		} finally {
			loading = false;
		}
	});

	function handleLogout() {
		sessionStore.clear();
		goto('/auth');
	}
</script>

<div class="shell">
	<header class="app-header">
		<h1 class="app-title">The Penthouse</h1>
		<button class="logout-btn" onclick={handleLogout}>Sign out</button>
	</header>

	<main class="chat-list">
		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if error}
			<div class="state-msg error">{error}</div>
		{:else if chatList.length === 0}
			<div class="state-msg">No conversations yet.</div>
		{:else}
			{#each chatList as chat (chat.id)}
				<button class="chat-row" onclick={() => goto(`/chat/${chat.id}`)}>
					<div class="chat-info">
						<span class="chat-name">{chat.name ?? 'Direct message'}</span>
						<span class="chat-preview">{new Date(chat.updatedAt).toLocaleDateString()}</span>
					</div>
					{#if chat.unreadCount > 0}
						<span class="unread-badge">{chat.unreadCount}</span>
					{/if}
				</button>
			{/each}
		{/if}
	</main>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.app-title {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--color-accent);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
	}

	.chat-list {
		flex: 1;
		overflow-y: auto;
	}

	.chat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--space-4) var(--space-6);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: inherit;
		text-align: left;
		transition: background 0.1s;
	}

	.chat-row:hover {
		background: var(--color-surface);
	}

	.chat-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
		min-width: 0;
	}

	.chat-name {
		font-weight: 600;
		font-size: var(--text-base);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-preview {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.unread-badge {
		background: var(--color-accent);
		color: #000;
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 2px 7px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
		margin-left: var(--space-3);
	}

	.state-msg {
		padding: var(--space-8) var(--space-6);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state-msg.error {
		color: var(--color-danger);
	}
</style>
