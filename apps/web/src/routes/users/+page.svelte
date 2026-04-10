<script lang="ts">
	import { goto } from '$app/navigation';
	import { users } from '$services/api';
	import type { MemberDetail } from '@penthouse/contracts';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let searchQuery = $state('');
	let results = $state<MemberDetail[]>([]);
	let allUsers = $state<MemberDetail[]>([]);
	let loading = $state(false);
	let error = $state('');
	let mode = $state<'directory' | 'search'>('directory');
	let offset = $state(0);
	let limit = 20;
	let total = $state(0);

	async function loadDirectory() {
		loading = true;
		error = '';
		try {
			const res = await users.list({ offset, limit });
			allUsers = res.users;
			total = res.total;
			mode = 'directory';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load users';
		} finally {
			loading = false;
		}
	}

	async function handleSearch() {
		if (!searchQuery.trim()) {
			mode = 'directory';
			return;
		}

		loading = true;
		error = '';
		try {
			const res = await users.search(searchQuery.trim(), 50);
			results = res.results;
			mode = 'search';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}

	function goToProfile(userId: string) {
		goto(`/users/${userId}`);
	}

	function previousPage() {
		if (offset > 0) {
			offset = Math.max(0, offset - limit);
			loadDirectory();
		}
	}

	function nextPage() {
		if (offset + limit < total) {
			offset += limit;
			loadDirectory();
		}
	}

	// Load directory on mount
	import { onMount } from 'svelte';
	onMount(() => {
		loadDirectory();
	});

	function getStatusColor(lastSeenAt: string | null | undefined): string {
		if (!lastSeenAt) return 'offline';
		const now = new Date();
		const lastSeen = new Date(lastSeenAt);
		const diffMs = now.getTime() - lastSeen.getTime();
		const diffMins = diffMs / (1000 * 60);
		return diffMins < 5 ? 'online' : 'away';
	}

	function formatLastSeen(lastSeenAt: string | null | undefined): string {
		if (!lastSeenAt) return 'Never';
		const date = new Date(lastSeenAt);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="users-shell">
	<!-- Header -->
	<header class="users-header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back to chat list">
			<Icon name="arrow-left" size={20} />
		</button>
		<h1 class="users-title">Find People</h1>
	</header>

	<!-- Search bar -->
	<div class="search-container">
		<input
			type="text"
			class="search-input"
			placeholder="Search by username or name..."
			bind:value={searchQuery}
			onkeydown={handleKeydown}
			disabled={loading}
		/>
		<button
			class="search-btn"
			onclick={handleSearch}
			disabled={loading || !searchQuery.trim()}
			aria-label="Search users"
		>
			🔍
		</button>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<!-- Results or directory -->
	<div class="users-list">
		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if error && (mode === 'directory' ? allUsers.length === 0 : results.length === 0)}
			<div class="state-msg error">{error}</div>
		{:else if mode === 'search'}
			{#if results.length === 0}
				<div class="state-msg">No users found matching "{searchQuery}"</div>
			{:else}
				<div class="results-header">Found {results.length} user{results.length !== 1 ? 's' : ''}</div>
				{#each results as user (user.id)}
					<button class="user-card" onclick={() => goToProfile(user.id)}>
						<Avatar
							userId={user.id}
							displayName={user.displayName}
							avatarUrl={user.avatarUrl ?? null}
							size="md"
							showPresence={getStatusColor(user.lastSeenAt) === 'online'}
						/>
						<div class="user-info">
							<div class="user-name">{user.displayName}</div>
							<div class="user-meta">@{user.username}</div>
							<div class="user-last-seen">
								{#if getStatusColor(user.lastSeenAt) === 'online'}
									<span class="status-label online">Online</span>
								{:else if getStatusColor(user.lastSeenAt) === 'away'}
									<span class="status-label away">Away</span>
								{:else}
									<span class="status-label offline">Seen {formatLastSeen(user.lastSeenAt)}</span>
								{/if}
							</div>
						</div>
						<div class="chevron"><Icon name="chevron-right" size={16} /></div>
					</button>
				{/each}
			{/if}
		{:else}
			<!-- Directory view -->
			{#if allUsers.length === 0}
				<div class="state-msg">No users found</div>
			{:else}
				<div class="results-header">
					Showing {offset + 1}–{Math.min(offset + limit, total)} of {total} user{total !== 1 ? 's' : ''}
				</div>
				{#each allUsers as user (user.id)}
					<button class="user-card" onclick={() => goToProfile(user.id)}>
						<Avatar
							userId={user.id}
							displayName={user.displayName}
							avatarUrl={user.avatarUrl ?? null}
							size="md"
							showPresence={getStatusColor(user.lastSeenAt) === 'online'}
						/>
						<div class="user-info">
							<div class="user-name">{user.displayName}</div>
							<div class="user-meta">@{user.username}</div>
							<div class="user-last-seen">
								{#if getStatusColor(user.lastSeenAt) === 'online'}
									<span class="status-label online">Online</span>
								{:else if getStatusColor(user.lastSeenAt) === 'away'}
									<span class="status-label away">Away</span>
								{:else}
									<span class="status-label offline">Seen {formatLastSeen(user.lastSeenAt)}</span>
								{/if}
							</div>
						</div>
						<div class="chevron"><Icon name="chevron-right" size={16} /></div>
					</button>
				{/each}

				<!-- Pagination -->
				<div class="pagination">
					<button class="pagination-btn icon-btn" onclick={previousPage} disabled={offset === 0} aria-label="Previous page">
						<Icon name="arrow-left" size={16} />
					</button>
					<span class="pagination-info">Page {Math.floor(offset / limit) + 1}</span>
					<button class="pagination-btn icon-btn" onclick={nextPage} disabled={offset + limit >= total} aria-label="Next page">
						<Icon name="chevron-right" size={16} />
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.users-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
		background: var(--color-bg);
	}

	/* ── Header ── */
	.users-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		flex-shrink: 0;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: none;
		border: none;
		color: var(--color-accent);
		padding: 0;
		border-radius: var(--radius-lg);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.back-btn:hover {
		background: var(--color-accent-dim);
	}

	.users-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
	}

	/* ── Search ── */
	.search-container {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		outline: none;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		border-color: var(--color-accent);
	}

	.search-input:disabled {
		opacity: 0.5;
	}

	.search-btn {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		background: var(--color-accent);
		color: #000;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.search-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.search-btn:not(:disabled):hover {
		opacity: 0.85;
	}

	/* ── List ── */
	.users-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.state-msg {
		padding: var(--space-8) var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state-msg.error {
		color: var(--color-danger);
	}

	.results-header {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.error-msg {
		margin: var(--space-2) var(--space-4);
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		font-size: var(--text-xs);
		border-radius: var(--radius-sm);
	}

	/* ── User cards ── */
	.user-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		text-align: left;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
		width: 100%;
	}

	.user-card:hover {
		background: var(--color-surface-raised);
		border-color: var(--color-border-solid);
	}

	.user-info {
		flex: 1;
		min-width: 0;
	}

	.user-name {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-meta {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-last-seen {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-top: 2px;
	}

	.status-label {
		font-weight: 500;
	}

	.status-label.online {
		color: var(--color-success);
	}

	.status-label.away {
		color: #fbbf24;
	}

	.status-label.offline {
		color: var(--color-text-secondary);
	}

	.chevron {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--color-text-secondary);
		transition: color 0.15s;
	}

	.user-card:hover .chevron {
		color: var(--color-accent);
	}

	/* ── Pagination ── */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-3);
		margin-top: var(--space-2);
		border-top: 1px solid var(--color-border);
	}

	.pagination-btn {
		padding: var(--space-2) var(--space-3);
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.3);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		cursor: pointer;
		transition: background 0.15s;
	}

	.pagination-btn.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
	}

	.pagination-btn:not(:disabled):hover {
		background: rgba(119, 119, 194, 0.25);
	}

	.pagination-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.pagination-info {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		min-width: 50px;
		text-align: center;
	}
</style>
