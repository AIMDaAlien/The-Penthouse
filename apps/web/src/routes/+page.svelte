<!-- Chat list home page -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { chats, users } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { ChatSummary, MemberDetail } from '@penthouse/contracts';

	let chatList = $state<ChatSummary[]>([]);
	let loading = $state(true);
	let error = $state('');

	// New DM modal state
	let showNewDmModal = $state(false);
	let dmSearchQuery = $state('');
	let dmSearchResults = $state<MemberDetail[]>([]);
	let dmSearching = $state(false);
	let dmCreating = $state(false);
	let dmError = $state('');

	const currentUserId = sessionStore.current?.user.id ?? '';

	// Connection status
	const connectionStatus = $derived(socketStore.state);
	const statusDot = $derived.by(() => {
		switch (connectionStatus) {
			case 'connected':
				return '🟢';
			case 'connecting':
				return '🟡';
			case 'degraded':
				return '🟡';
			case 'failed':
				return '🔴';
			default:
				return '⚪';
		}
	});

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

	async function handleDmSearch() {
		if (!dmSearchQuery.trim()) {
			dmSearchResults = [];
			return;
		}

		dmSearching = true;
		dmError = '';
		try {
			const response = await users.search(dmSearchQuery.trim(), 10);
			dmSearchResults = response.results;
		} catch (err: unknown) {
			dmError = err instanceof Error ? err.message : 'Search failed';
			dmSearchResults = [];
		} finally {
			dmSearching = false;
		}
	}

	async function handleSelectUser(user: MemberDetail) {
		if (user.id === currentUserId) {
			dmError = "You can't message yourself";
			return;
		}

		dmCreating = true;
		dmError = '';
		try {
			const result = await chats.createDm(user.id);
			showNewDmModal = false;
			dmSearchQuery = '';
			dmSearchResults = [];
			await goto(`/chat/${result.id}`);
		} catch (err: unknown) {
			dmError = err instanceof Error ? err.message : 'Failed to create message';
		} finally {
			dmCreating = false;
		}
	}

	function handleCloseModal() {
		if (!dmCreating) {
			showNewDmModal = false;
			dmSearchQuery = '';
			dmSearchResults = [];
			dmError = '';
		}
	}
</script>

<div class="shell">
	<header class="app-header">
		<h1 class="app-title">The Penthouse</h1>
		<div class="header-actions">
			<div class="connection-status">
				<span class="status-dot">{statusDot}</span>
			</div>
			<button class="action-btn" onclick={() => (showNewDmModal = true)} aria-label="New message" title="Start a new conversation">
				✏️
			</button>
			<button class="action-btn" onclick={() => goto('/users')} aria-label="Find people">
				👥
			</button>
			<button class="logout-btn" onclick={handleLogout}>Sign out</button>
		</div>
	</header>

	<main class="chat-list">
		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if error}
			<div class="state-msg error">{error}</div>
		{:else if chatList.length === 0}
			<div class="state-msg">No conversations yet. Start one with the ✏️ button.</div>
		{:else}
			{#each chatList as chat (chat.id)}
				<button class="chat-row" onclick={() => goto(`/chat/${chat.id}?name=${encodeURIComponent(chat.name ?? 'Direct message')}`)}>
					{#if chat.counterpartMemberId}
						<Avatar
							userId={chat.counterpartMemberId}
							displayName={chat.name ?? 'Direct message'}
							avatarUrl={chat.counterpartAvatarUrl}
							size="md"
							showPresence={true}
						/>
					{/if}
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

	<!-- New DM Modal -->
	{#if showNewDmModal}
		<div class="modal-overlay" onclick={handleCloseModal} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
			<div class="modal-content" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3 class="modal-title" id="modal-title">Start a conversation</h3>
					<button class="modal-close" onclick={handleCloseModal} aria-label="Close" disabled={dmCreating}>
						✕
					</button>
				</div>

				<div class="modal-body">
					<input
						type="text"
						class="dm-search-input"
						placeholder="Search for someone..."
						bind:value={dmSearchQuery}
						onkeyup={handleDmSearch}
						disabled={dmSearching || dmCreating}
					/>

					{#if dmError}
						<div class="dm-error">{dmError}</div>
					{/if}

					{#if dmSearching}
						<div class="dm-loading">Searching...</div>
					{:else if dmSearchQuery && dmSearchResults.length === 0}
						<div class="dm-no-results">No users found</div>
					{:else if dmSearchResults.length > 0}
						<div class="dm-results">
							{#each dmSearchResults as user (user.id)}
								<button
									class="dm-user-row"
									onclick={() => handleSelectUser(user)}
									disabled={dmCreating || user.id === currentUserId}
								>
									<Avatar
										userId={user.id}
										displayName={user.displayName}
										avatarUrl={user.avatarUrl}
										size="sm"
										showPresence={true}
									/>
									<div class="dm-user-info">
										<div class="dm-user-name">{user.displayName}</div>
										<div class="dm-user-username">@{user.username}</div>
									</div>
									{#if user.id === currentUserId}
										<span class="dm-user-badge">You</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.connection-status {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		font-size: 0.875rem;
	}

	.connection-status .status-dot {
		display: inline-block;
	}

	.action-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-base);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.action-btn:hover {
		background: var(--color-surface);
		border-color: var(--color-border-solid);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.logout-btn:hover {
		background: var(--color-surface);
		border-color: var(--color-border-solid);
	}

	.chat-list {
		flex: 1;
		overflow-y: auto;
	}

	.chat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
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

	:global(.chat-row .avatar-container) {
		flex-shrink: 0;
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

	/* ── Modal ── */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-end;
		z-index: 20;
	}

	.modal-content {
		width: 100%;
		background: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		max-height: 80dvh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.modal-title {
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-xl);
		padding: var(--space-2);
		cursor: pointer;
		transition: color 0.15s;
	}

	.modal-close:hover:not(:disabled) {
		color: var(--color-text-primary);
	}

	.modal-close:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.dm-search-input {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-base);
		outline: none;
		transition: border-color 0.15s;
		font-family: var(--font-sans);
	}

	.dm-search-input:focus {
		border-color: var(--color-accent);
	}

	.dm-search-input:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.dm-error {
		padding: var(--space-3) var(--space-4);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
	}

	.dm-loading {
		padding: var(--space-6) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.dm-no-results {
		padding: var(--space-6) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.dm-results {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.dm-user-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: inherit;
		text-align: left;
		transition: background 0.15s, border-color 0.15s;
		cursor: pointer;
	}

	.dm-user-row:hover:not(:disabled) {
		background: rgba(119, 119, 194, 0.1);
		border-color: var(--color-accent);
	}

	.dm-user-row:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	:global(.dm-user-row .avatar-container) {
		flex-shrink: 0;
	}

	.dm-user-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.dm-user-name {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dm-user-username {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dm-user-badge {
		background: var(--color-accent);
		color: #000;
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}
</style>
