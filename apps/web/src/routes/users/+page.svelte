<script lang="ts">
	import { goto } from '$app/navigation';
	import { users } from '$services/users';
	import { chats } from '$services/chats';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore, onPresenceUpdate, onPresenceSync } from '$stores/socket.svelte';
	import Icon from '$components/Icon.svelte';
	import PresenceAvatar from '$components/PresenceAvatar.svelte';
	import ProfileCard from '$components/ProfileCard.svelte';
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
	let selectedUserId = $state<string | null>(null);
	let mobileView = $state<'list' | 'detail'>('list');

	const selectedUser = $derived(
		allUsers.find((u) => u.id === selectedUserId) ??
		results.find((u) => u.id === selectedUserId) ??
		null
	);

	async function loadDirectory() {
		loading = true;
		error = '';
		try {
			const res = await users.list();
			allUsers = res.users;
			if (!selectedUserId && res.users.length > 0) {
				selectedUserId = res.users[0].id;
			}
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

	function selectUser(id: string) {
		selectedUserId = id;
		mobileView = 'detail';
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

	function presenceToStatus(state: PresenceState | undefined): 'online' | 'away' | 'offline' {
		if (!state) return 'offline';
		if (state === 'available') return 'online';
		if (state === 'afk' || state === 'busy' || state === 'dnd') return 'away';
		return 'offline';
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

	const displayUsers = $derived(mode === 'search' ? results : allUsers);
</script>

<div class="people-screen" class:mobile-detail={mobileView === 'detail'}>
	<!-- Roster (left on desktop, full on mobile list view) -->
	<aside class="roster" class:hidden-mobile={mobileView === 'detail'}>
		<header class="list-head">
			<span class="eyebrow">N° 04 / DIRECTORY</span>
			<h1 class="display">People</h1>
		</header>

		<div class="search-bar">
			<input
				type="text"
				placeholder="Search..."
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				disabled={loading}
			/>
			<button onclick={handleSearch} disabled={loading} aria-label="Search">
				<Icon name="search" size={16} />
			</button>
		</div>

		{#if error}<p class="error-msg">{error}</p>{/if}

		<div class="list-body">
			{#if loading}
				<p class="state">Loading...</p>
			{:else if displayUsers.length === 0}
				<p class="state">No users found.</p>
			{:else}
				{#each displayUsers as user (user.id)}
					<button
						class="roster-item"
						class:active={selectedUserId === user.id}
						onclick={() => selectUser(user.id)}
					>
						<div class="r-avatar-wrap">
							<PresenceAvatar url={user.avatarUrl} name={user.displayName} size={38} userId={user.id} />
						</div>
						<div class="r-meta">
							<span class="r-name">{user.displayName}</span>
							<span class="r-role">@{user.username}</span>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</aside>

	<!-- Focus pane (right on desktop, full on mobile detail view) -->
	<div class="focus" class:hidden-mobile={mobileView === 'list'}>
		{#if selectedUser}
			<button class="mobile-back" onclick={() => mobileView = 'list'} aria-label="Back">
				←
			</button>
			<ProfileCard
				person={{
					id: selectedUser.id,
					name: selectedUser.displayName,
					bio: selectedUser.bio,
					avatar: selectedUser.avatarUrl,
					banner: selectedUser.bannerUrl ?? null,
					status: presenceToStatus(userPresence[selectedUser.id]?.state)
				}}
				style={selectedUser.profileStyle ?? 'editorial'}
				onMessage={selectedUser.id === sessionStore.user?.id ? undefined : startDM}
			/>
		{:else}
			<div class="empty-focus">
				<p>Select someone from the directory.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.people-screen {
		display: flex;
		height: 100%;
		min-height: 100dvh;
	}

	/* Mobile: show one pane at a time */
	@media (max-width: 767px) {
		.people-screen.mobile-detail .roster {
			display: none;
		}
		.people-screen:not(.mobile-detail) .focus {
			display: none;
		}
	}

	.roster {
		width: 300px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--p-line);
		background: var(--p-bg);
	}

	.list-head {
		padding: var(--sp-4) var(--sp-4) var(--sp-3);
		border-bottom: 1px solid var(--p-line);
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--p-secondary);
		display: block;
		margin-bottom: 10px;
	}

	.display {
		font-size: 2.2rem;
		font-weight: 700;
		letter-spacing: -1.5px;
		line-height: 0.95;
		color: var(--p-text);
		margin: 0;
	}

	.search-bar {
		display: flex;
		gap: var(--sp-2);
		padding: var(--sp-3) var(--sp-4);
		border-bottom: 1px solid var(--p-line);
	}

	.search-bar input {
		flex: 1;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-sm);
		padding: 8px 12px;
		color: var(--p-text);
		font-family: var(--font-sans);
		font-size: 0.9rem;
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--p-accent-edge);
	}

	.search-bar button {
		width: 36px;
		height: 36px;
		border-radius: var(--r-sm);
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		color: var(--p-text-2);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}

	.list-body {
		flex: 1;
		overflow-y: auto;
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.roster-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		cursor: pointer;
		transition: background 0.15s;
		width: 100%;
		text-align: left;
		color: inherit;
	}

	.roster-item:hover {
		background: var(--p-surface-2);
	}

	.roster-item.active {
		background: var(--p-accent-soft);
	}

	.r-avatar-wrap {
		position: relative;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
	}

	.r-meta {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.r-name {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--p-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.r-role {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--p-muted);
	}

	.focus {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--sp-4);
		overflow-y: auto;
		background: var(--p-bg);
		position: relative;
	}

	.mobile-back {
		display: none;
		position: absolute;
		top: var(--sp-3);
		left: var(--sp-3);
		width: 30px;
		height: 30px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		color: var(--p-text);
		font-size: 0.9rem;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		padding: 0;
		z-index: 10;
	}

	@media (max-width: 767px) {
		.mobile-back {
			display: flex;
		}
		.roster {
			width: 100%;
			border-right: none;
		}
	}

	.empty-focus {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--p-muted);
		font-size: 0.95rem;
	}

	.error-msg {
		padding: var(--sp-3) var(--sp-4);
		color: var(--p-error);
		font-size: 0.85rem;
	}

	.state {
		padding: var(--sp-4);
		color: var(--p-muted);
		text-align: center;
		font-size: 0.9rem;
	}
</style>
