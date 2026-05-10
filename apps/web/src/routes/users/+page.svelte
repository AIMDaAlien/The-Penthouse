<script lang="ts">
	import { goto } from '$app/navigation';
	import { users } from '$services/users';
	import { chats } from '$services/chats';
	import { socketStore, onPresenceUpdate, onPresenceSync } from '$stores/socket.svelte';
	import Icon from '$components/Icon.svelte';
	import Avatar from '$components/Avatar.svelte';
	import type { MemberDetail } from '@penthouse/contracts';

	type PresenceState = 'available' | 'busy' | 'dnd' | 'afk' | 'offline';
	type UserPresence = { state: PresenceState; note?: string; lastSeenAt?: string };

	let searchQuery = $state('');
	let results = $state<MemberDetail[]>([]);
	let allUsers = $state<MemberDetail[]>([]);
	let loading = $state(false);
	let error = $state('');
	let mode = $state<'directory' | 'search'>('directory');
	let userPresence = $state<Record<string, UserPresence>>({});

	async function loadDirectory() {
		loading = true;
		error = '';
		try {
			const res = await users.list();
			allUsers = res.users;
			mode = 'directory';
		} catch (err) {
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
			const res = await users.search(searchQuery.trim());
			results = res.results;
			mode = 'search';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSearch();
	}

	async function startDM(userId: string) {
		try {
			const res = await chats.createDM({ memberId: userId });
			goto(`/chat/${res.chatId}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start chat';
		}
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

	function presenceLabel(presence: UserPresence | undefined, fallbackLastSeen?: string | null): string {
		if (!presence) return formatLastSeen(fallbackLastSeen);
		if (presence.state === 'offline') return formatLastSeen(presence.lastSeenAt ?? fallbackLastSeen);
		return presence.state.charAt(0).toUpperCase() + presence.state.slice(1);
	}

	// Load on mount
	$effect(() => {
		loadDirectory();
	});

	// Presence tracking
	$effect(() => {
		const s = socketStore.instance;
		if (!s) return;
		const unsubs = [
			onPresenceSync((sync) => {
				const merged: Record<string, UserPresence> = { ...userPresence };
				for (const [userId, data] of Object.entries(sync)) {
					merged[userId] = {
						state: data.state,
						note: data.note,
						lastSeenAt: data.lastSeenAt
					};
				}
				userPresence = merged;
			}),
			onPresenceUpdate((update) => {
				userPresence = {
					...userPresence,
					[update.userId]: {
						state: update.state,
						note: update.note,
						lastSeenAt: update.timestamp
					}
				};
			})
		];
		return () => unsubs.forEach((u) => u());
	});
</script>

<div class="shell">
	<header class="header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<Icon name="arrowLeft" size={20} />
		</button>
		<h1>Find People</h1>
	</header>

	<div class="search-bar">
		<input
			type="text"
			placeholder="Search by username or name..."
			bind:value={searchQuery}
			onkeydown={handleKeydown}
			disabled={loading}
		/>
		<button onclick={handleSearch} disabled={loading || !searchQuery.trim()} aria-label="Search">
			<Icon name="search" size={18} />
		</button>
	</div>

	{#if error}<p class="error-msg">{error}</p>{/if}

	<div class="list">
		{#if loading}
			<p class="state">Loading...</p>
		{:else if mode === 'search' && results.length === 0}
			<p class="state">No users found.</p>
		{:else if mode === 'directory' && allUsers.length === 0}
			<p class="state">No users yet.</p>
		{:else if mode === 'search'}
			{#each results as user (user.id)}
				<button class="user-card" onclick={() => startDM(user.id)}>
					<Avatar url={user.avatarUrl} name={user.displayName} size={40} />
					<div class="user-info">
						<p class="user-name">{user.displayName}</p>
						<p class="user-meta">@{user.username} · {presenceLabel(userPresence[user.id], user.lastSeenAt)}</p>
						{#if userPresence[user.id]?.note}
							<p class="presence-note">{userPresence[user.id].note}</p>
						{/if}
					</div>
					<span class="presence-dot {userPresence[user.id]?.state ?? 'offline'}" aria-label={userPresence[user.id]?.state ?? 'offline'}></span>
				</button>
			{/each}
		{:else}
			{#each allUsers as user (user.id)}
				<button class="user-card" onclick={() => startDM(user.id)}>
					<Avatar url={user.avatarUrl} name={user.displayName} size={40} />
					<div class="user-info">
						<p class="user-name">{user.displayName}</p>
						<p class="user-meta">@{user.username} · {presenceLabel(userPresence[user.id], user.lastSeenAt)}</p>
						{#if userPresence[user.id]?.note}
							<p class="presence-note">{userPresence[user.id].note}</p>
						{/if}
					</div>
					<span class="presence-dot {userPresence[user.id]?.state ?? 'offline'}" aria-label={userPresence[user.id]?.state ?? 'offline'}></span>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.back-btn:hover { background: var(--color-surface-elevated); }

	h1 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.search-bar {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.search-bar input {
		flex: 1;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-sm);
		outline: none;
		font-family: inherit;
	}

	.search-bar input:focus { border-color: var(--color-accent); }
	.search-bar input:disabled { opacity: 0.5; }

	.search-bar button {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		color: #fff;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.search-bar button:disabled { opacity: 0.35; cursor: not-allowed; }
	.search-bar button:not(:disabled):hover { opacity: 0.85; }

	.error-msg {
		margin: var(--space-sm) var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		background: color-mix(in srgb, var(--color-error) 12%, transparent);
		color: var(--color-error);
		font-size: var(--text-sm);
		border-radius: var(--radius-sm);
	}

	.list {
		flex: 1;
		overflow-y: auto;
	}

	.state {
		padding: var(--space-xl);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border: none;
		border-bottom: 1px solid var(--color-border);
		background: none;
		color: var(--color-text);
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
	}

	.user-card:hover { background: var(--color-surface-elevated); }

	.user-info {
		flex: 1;
		min-width: 0;
	}

	.user-name {
		font-weight: var(--weight-medium);
		font-size: var(--text-base);
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

	.presence-note {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.presence-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.presence-dot.available { background: #22c55e; }
	.presence-dot.busy { background: #eab308; }
	.presence-dot.dnd { background: #ef4444; }
	.presence-dot.afk { background: #f97316; }
	.presence-dot.offline { background: #9ca3af; }
</style>
