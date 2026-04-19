<!-- Chat list home page -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { chats, users } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { presenceStore } from '$stores/presence.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import AvatarModal from '$lib/components/AvatarModal.svelte';
	import type { ChatSummary, MemberDetail } from '@penthouse/contracts';

	interface UserProfile {
		id: string;
		displayName: string;
		username: string;
		avatarUrl?: string | null;
		bio?: string | null;
		status?: string | null;
		online?: boolean;
		lastSeen?: string | null;
		role?: string;
		createdAt?: string | null;
		bannerColor?: string | null;
	}

	let chatList = $state<ChatSummary[]>([]);
	let loading = $state(true);
	let error = $state('');
	let selfChatId = $state<string | null>(null);

	// Context menu state (mute toggle / archive)
	let contextMenuChat = $state<ChatSummary | null>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let muteLoading = $state(false);
	let archiveLoading = $state(false);
	// Timestamp comparison prevents ghost-clicks after long-press on slow devices
	let longPressCompletedAt = 0;

	// Archived chats
	let archivedChats = $state<ChatSummary[]>([]);
	let showArchived = $state(false);
	let archivedLoading = $state(false);
	let archivedLoaded = $state(false);

	// New DM modal state
	let showNewDmModal = $state(false);
	let dmSearchQuery = $state('');
	let dmSearchResults = $state<MemberDetail[]>([]);
	let dmSearching = $state(false);
	let dmCreating = $state(false);
	let dmError = $state('');
	let dmSearchTimeout: ReturnType<typeof setTimeout> | null = null;
	let latestDmSearchId = 0;

	// Avatar modal state
	let avatarModalProfile = $state<UserProfile | null>(null);
	let avatarModalLoading = $state(false);

	const currentUserId = sessionStore.current?.user.id ?? '';
	const connectionStatus = $derived(socketStore.state);

	// Pin self-chat at top; everything else stays in server order
	const sortedChatList = $derived(
		selfChatId
			? [
					...chatList.filter((c) => c.id === selfChatId),
					...chatList.filter((c) => c.id !== selfChatId)
				]
			: chatList
	);

	function formatChatTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		const diffDays = Math.floor(diffMs / 86400000);
		if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	onMount(async () => {
		// Guard: auth redirect from +layout.svelte is async — API calls must not fire before it lands.
		if (!sessionStore.isAuthenticated) {
			loading = false;
			return;
		}
		try {
			// Fetch chat list and self-DM in parallel.
			// chats.self() will fail until Codex implements the endpoint — that's expected.
			const [list] = await Promise.all([
				chats.list(),
				chats.self().then((s) => { selfChatId = s.id; }).catch(() => {})
			]);
			chatList = list;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load chats.';
		} finally {
			loading = false;
		}
	});

	// Long-press + right-click → context menu
	function handlePointerDown(e: PointerEvent, chat: ChatSummary) {
		if (e.button !== 0) return;
		longPressTimer = setTimeout(() => {
			contextMenuChat = chat;
			longPressCompletedAt = Date.now();
		}, 500);
	}

	function handlePointerUp() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleChatRowClick(chat: ChatSummary) {
		if (Date.now() - longPressCompletedAt < 600) return;
		goto(`/chat/${chat.id}?name=${encodeURIComponent(chat.name ?? 'Direct message')}`);
	}

	function handleContextMenu(e: Event, chat: ChatSummary) {
		e.preventDefault();
		contextMenuChat = chat;
	}

	async function handleAvatarClick(e: MouseEvent, chat: ChatSummary) {
		e.stopPropagation();
		if (!chat.counterpartMemberId) return;
		avatarModalLoading = true;
		try {
			const profile = await users.getProfile(chat.counterpartMemberId);
			const online = presenceStore.userPresenceMap.get(profile.id) ?? false;
			avatarModalProfile = {
				id: profile.id,
				displayName: profile.displayName,
				username: profile.username,
				avatarUrl: profile.avatarUrl,
				bio: profile.bio ?? null,
				status: null,
				online,
				lastSeen: (profile as MemberDetail & { lastSeenAt?: string | null }).lastSeenAt ?? null,
				role: undefined,
				createdAt: null,
				bannerColor: null
			};
		} catch {
			// silently fail — tapping avatar still shouldn't break anything
		} finally {
			avatarModalLoading = false;
		}
	}

	async function handleToggleMute() {
		if (!contextMenuChat) return;
		muteLoading = true;

		const targetChatId = contextMenuChat.id;
		const newMuted = !contextMenuChat.notificationsMuted;
		const originalMuted = contextMenuChat.notificationsMuted;

		// Optimistic update
		chatList = chatList.map((c) =>
			c.id === targetChatId ? { ...c, notificationsMuted: newMuted } : c
		);
		if (contextMenuChat) {
			contextMenuChat = { ...contextMenuChat, notificationsMuted: newMuted };
		}

		try {
			await chats.setPreferences(targetChatId, { notificationsMuted: newMuted });
		} catch (err: unknown) {
			chatList = chatList.map((c) =>
				c.id === targetChatId ? { ...c, notificationsMuted: originalMuted } : c
			);
			if (contextMenuChat) {
				contextMenuChat = { ...contextMenuChat, notificationsMuted: originalMuted };
			}
			error = err instanceof Error ? err.message : 'Failed to update mute state.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			muteLoading = false;
			contextMenuChat = null;
		}
	}

	function handleDmSearch() {
		if (dmSearchTimeout) clearTimeout(dmSearchTimeout);
		if (!dmSearchQuery.trim()) {
			latestDmSearchId++;
			dmSearchResults = [];
			dmSearching = false;
			return;
		}
		dmSearching = true;
		dmError = '';
		const capturedId = ++latestDmSearchId;
		dmSearchTimeout = setTimeout(async () => {
			try {
				const response = await users.search(dmSearchQuery.trim(), 10);
				if (capturedId === latestDmSearchId) dmSearchResults = response.results;
			} catch (err: unknown) {
				if (capturedId === latestDmSearchId) {
					dmError = err instanceof Error ? err.message : 'Search failed';
					dmSearchResults = [];
				}
			} finally {
				if (capturedId === latestDmSearchId) dmSearching = false;
			}
		}, 300);
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

	function handleCloseDmModal() {
		if (!dmCreating) {
			showNewDmModal = false;
			dmSearchQuery = '';
			dmSearchResults = [];
			dmError = '';
		}
	}

	async function handleToggleArchive() {
		if (!contextMenuChat || archiveLoading) return;
		archiveLoading = true;
		const target = contextMenuChat;
		const isArchived = !!(target as any).archivedAt;
		contextMenuChat = null;

		try {
			if (isArchived) {
				await chats.unarchive(target.id);
				archivedChats = archivedChats.filter((c) => c.id !== target.id);
				chatList = [...chatList, { ...target, archivedAt: undefined } as any];
			} else {
				await chats.archive(target.id);
				chatList = chatList.filter((c) => c.id !== target.id);
				if (archivedLoaded) {
					archivedChats = [{ ...target, archivedAt: new Date().toISOString() } as any, ...archivedChats];
				}
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to update archive.';
			setTimeout(() => (error = ''), 4000);
		} finally {
			archiveLoading = false;
		}
	}

	async function loadArchivedChats() {
		if (archivedLoaded || archivedLoading) return;
		archivedLoading = true;
		try {
			archivedChats = await chats.list({ archived: true });
			archivedLoaded = true;
		} catch {
			// silently fail
		} finally {
			archivedLoading = false;
		}
	}

	function toggleArchivedSection() {
		showArchived = !showArchived;
		if (showArchived && !archivedLoaded) loadArchivedChats();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (avatarModalProfile) { avatarModalProfile = null; return; }
			if (contextMenuChat && !muteLoading) { contextMenuChat = null; return; }
			if (showNewDmModal && !dmCreating) handleCloseDmModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="shell">
	<header class="app-header">
		<div class="logo">
			<span class="logo-the">The</span>
			<span class="logo-name">Penthouse</span>
		</div>
		<div class="header-actions">
			<span
				class="conn-dot"
				class:connected={connectionStatus === 'connected'}
				class:degraded={connectionStatus === 'connecting' || connectionStatus === 'degraded'}
				class:failed={connectionStatus === 'failed'}
				title={connectionStatus}
			></span>
			<button class="icon-btn" onclick={() => (showNewDmModal = true)} aria-label="New message">
				<Icon name="compose" size={20} />
			</button>
		</div>
	</header>

	<main class="chat-list">
		{#if error}
			<div class="state-msg error">{error}</div>
		{/if}

		{#if loading}
			<div class="state-msg">Loading...</div>
		{:else if chatList.length === 0 && !error}
			<div class="empty-state">
				<p class="empty-title">No conversations yet</p>
				<button class="empty-cta" onclick={() => (showNewDmModal = true)}>
					<Icon name="compose" size={16} />
					Start a conversation
				</button>
			</div>
		{:else}
			{#each sortedChatList.filter((c) => !(c as any).archivedAt) as chat (chat.id)}
				{@const isSelf = chat.id === selfChatId}
				<div
					class="chat-row"
					class:muted={chat.notificationsMuted}
					class:self-chat={isSelf}
					role="button"
					tabindex="0"
					onclick={() => handleChatRowClick(chat)}
					onpointerdown={(e) => handlePointerDown(e, chat)}
					onpointerup={handlePointerUp}
					onpointerleave={handlePointerUp}
					oncontextmenu={(e) => handleContextMenu(e, chat)}
					onkeydown={(e) => e.key === 'Enter' && handleChatRowClick(chat)}
				>
					{#if isSelf}
						<div class="self-icon" aria-hidden="true">
							<Icon name="bookmark" size={18} />
						</div>
					{:else if chat.counterpartMemberId}
						<button
							class="avatar-btn"
							onclick={(e) => handleAvatarClick(e, chat)}
							onpointerdown={(e) => e.stopPropagation()}
							onpointerup={(e) => e.stopPropagation()}
							aria-label="View {chat.name ?? 'profile'}"
							disabled={avatarModalLoading}
						>
							<Avatar
								userId={chat.counterpartMemberId}
								displayName={chat.name ?? 'DM'}
								avatarUrl={chat.counterpartAvatarUrl}
								size="md"
								showPresence={true}
							/>
						</button>
					{:else}
						<div class="channel-icon" aria-hidden="true">
							<Icon name="hash" size={18} />
						</div>
					{/if}

					<div class="chat-info">
						<div class="chat-name-row">
							<span class="chat-name">{isSelf ? 'Saved' : (chat.name ?? 'Direct message')}</span>
							{#if chat.notificationsMuted && !isSelf}
								<Icon name="bell-off" size={12} class="muted-icon" />
							{/if}
							<span class="chat-time">{formatChatTime(chat.updatedAt)}</span>
						</div>
						<span class="chat-subtext">
							{isSelf ? 'Your personal notes' : (chat.type === 'channel' ? 'Channel' : 'Direct message')}
						</span>
					</div>

					{#if chat.unreadCount > 0 && !chat.notificationsMuted}
						<span class="unread-badge" aria-label="{chat.unreadCount} unread">
							{chat.unreadCount > 99 ? '99+' : chat.unreadCount}
						</span>
					{/if}
				</div>
			{/each}

			<!-- Archived chats collapsible -->
			<button class="archived-toggle" onclick={toggleArchivedSection} aria-expanded={showArchived}>
				<Icon name={showArchived ? 'chevron-down' : 'chevron-right'} size={14} />
				<Icon name="archive" size={15} />
				<span>Archived</span>
			</button>

			{#if showArchived}
				{#if archivedLoading}
					<div class="state-msg small">Loading...</div>
				{:else if archivedChats.length === 0}
					<div class="state-msg small">No archived chats</div>
				{:else}
					{#each archivedChats as chat (chat.id)}
						<div
							class="chat-row archived-row"
							role="button"
							tabindex="0"
							onclick={() => handleChatRowClick(chat)}
							onpointerdown={(e) => handlePointerDown(e, chat)}
							onpointerup={handlePointerUp}
							onpointerleave={handlePointerUp}
							oncontextmenu={(e) => handleContextMenu(e, chat)}
							onkeydown={(e) => e.key === 'Enter' && handleChatRowClick(chat)}
						>
							{#if chat.counterpartMemberId}
								<Avatar
									userId={chat.counterpartMemberId}
									displayName={chat.name ?? 'DM'}
									avatarUrl={chat.counterpartAvatarUrl}
									size="md"
									showPresence={false}
								/>
							{:else}
								<div class="channel-icon" aria-hidden="true">
									<Icon name="hash" size={18} />
								</div>
							{/if}
							<div class="chat-info">
								<div class="chat-name-row">
									<span class="chat-name">{chat.name ?? 'Direct message'}</span>
									<span class="chat-time">{formatChatTime(chat.updatedAt)}</span>
								</div>
								<span class="chat-subtext archived-label">Archived</span>
							</div>
						</div>
					{/each}
				{/if}
			{/if}
		{/if}
	</main>
</div>

<!-- Avatar modal -->
{#if avatarModalProfile}
	<AvatarModal user={avatarModalProfile} onClose={() => (avatarModalProfile = null)} />
{/if}

<!-- Context menu (mute toggle) -->
{#if contextMenuChat}
	<div
		class="overlay"
		onclick={(e) => { if (e.target === e.currentTarget) contextMenuChat = null; }}
		onkeydown={(e) => e.key === 'Escape' && (contextMenuChat = null)}
		role="dialog"
		aria-modal="true"
		aria-label="Chat options"
		tabindex="-1"
	>
		<div class="bottom-sheet" role="document">
			<div class="sheet-handle"></div>
			<div class="sheet-header">
				<p class="sheet-title">{contextMenuChat.name ?? 'Direct message'}</p>
				<button class="icon-btn" onclick={() => (contextMenuChat = null)} aria-label="Close" disabled={muteLoading}>
					<Icon name="close" size={18} />
				</button>
			</div>
			<button class="sheet-action" onclick={handleToggleMute} disabled={muteLoading || archiveLoading}>
				<Icon name={contextMenuChat.notificationsMuted ? 'bell' : 'bell-off'} size={18} />
				{contextMenuChat.notificationsMuted ? 'Unmute notifications' : 'Mute notifications'}
			</button>
			<button class="sheet-action" onclick={handleToggleArchive} disabled={muteLoading || archiveLoading}>
				<Icon name={(contextMenuChat as any).archivedAt ? 'inbox' : 'archive'} size={18} />
				{(contextMenuChat as any).archivedAt ? 'Unarchive' : 'Archive'}
			</button>
		</div>
	</div>
{/if}

<!-- New DM modal -->
{#if showNewDmModal}
	<div
		class="overlay"
		onclick={(e) => { if (e.target === e.currentTarget) handleCloseDmModal(); }}
		onkeydown={(e) => e.key === 'Escape' && handleCloseDmModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="dm-modal-title"
		tabindex="-1"
	>
		<div class="bottom-sheet" role="document">
			<div class="sheet-handle"></div>
			<div class="sheet-header">
				<p class="sheet-title" id="dm-modal-title">New message</p>
				<button class="icon-btn" onclick={handleCloseDmModal} aria-label="Close" disabled={dmCreating}>
					<Icon name="close" size={18} />
				</button>
			</div>

			<div class="sheet-body">
				<div class="search-wrap">
					<Icon name="search" size={15} class="search-icon" />
					<input
						type="text"
						class="search-input"
						placeholder="Search by name or username..."
						bind:value={dmSearchQuery}
						oninput={handleDmSearch}
						disabled={dmSearching || dmCreating}
					/>
				</div>

				{#if dmError}
					<div class="inline-error">{dmError}</div>
				{/if}

				{#if dmSearching}
					<p class="state-msg">Searching...</p>
				{:else if dmSearchQuery && dmSearchResults.length === 0}
					<p class="state-msg">No users found</p>
				{:else}
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
									<span class="dm-user-name">{user.displayName}</span>
									<span class="dm-user-handle">@{user.username}</span>
								</div>
								{#if user.id === currentUserId}
									<span class="you-badge">You</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	/* ── Header ── */
	.app-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-5);
		background: var(--color-surface-glass);
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		font-family: var(--font-display);
		display: flex;
		align-items: baseline;
		gap: 0.25em;
		line-height: 1;
	}

	.logo-the {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-accent);
		letter-spacing: 0.08em;
	}

	.logo-name {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.conn-dot {
		width: 7px;
		height: 7px;
		border-radius: var(--radius-full);
		background: var(--color-text-secondary);
		opacity: 0.35;
		flex-shrink: 0;
		transition: background 0.3s, opacity 0.3s;
	}

	.conn-dot.connected {
		background: var(--color-success);
		opacity: 1;
	}

	.conn-dot.degraded {
		background: #f59e0b;
		opacity: 1;
	}

	.conn-dot.failed {
		background: var(--color-danger);
		opacity: 1;
	}

	.icon-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		border-radius: var(--radius-lg);
		padding: 0;
		transition: color 0.15s, background 0.15s;
		text-shadow: none;
	}

	.icon-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-accent-dim);
	}

	/* ── Chat list ── */
	.chat-list {
		flex: 1;
		padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
	}

	.state-msg {
		padding: var(--space-8) var(--space-6);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.state-msg.error {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		padding: var(--space-3) var(--space-5);
		text-align: left;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-8) var(--space-6);
	}

	.empty-title {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.empty-cta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.35);
		border-radius: var(--radius-lg);
		padding: var(--space-3) var(--space-5);
		font-size: var(--text-sm);
		font-weight: 600;
		transition: background 0.15s;
	}

	.empty-cta:hover {
		background: rgba(119, 119, 194, 0.25);
	}

	/* ── Chat rows ── */
	.chat-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.1s;
		user-select: none;
		-webkit-user-select: none;
		background: none;
	}

	.chat-row:hover {
		background: var(--color-accent-dim);
	}

	.chat-row:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	:global([data-density='compact']) .chat-row {
		padding-top: var(--space-2);
		padding-bottom: var(--space-2);
	}

	.chat-row.muted {
		opacity: 0.55;
	}

	.avatar-btn {
		background: none;
		border: none;
		padding: 0;
		flex-shrink: 0;
		cursor: pointer;
		border-radius: var(--radius-full);
		display: block;
		line-height: 0;
		text-shadow: none;
		transition: opacity 0.15s;
	}

	.avatar-btn:hover {
		opacity: 0.85;
	}

	.avatar-btn:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.channel-icon,
	.self-icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: var(--color-accent-dim);
		border: 1px solid var(--color-border);
		color: var(--color-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.chat-row.self-chat {
		border-bottom: 1px solid var(--color-border);
	}

	.chat-row.self-chat + .chat-row {
		border-top: 1px solid rgba(119, 119, 194, 0.15);
	}

	:global([data-density='compact']) .channel-icon,
	:global([data-density='compact']) .self-icon {
		width: 36px;
		height: 36px;
	}

	.chat-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}

	.chat-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.chat-name {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	:global(.muted-icon) {
		flex-shrink: 0;
		color: var(--color-text-secondary);
	}

	.chat-time {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.chat-subtext {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.unread-badge {
		background: var(--color-accent);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
		min-width: 22px;
		text-align: center;
	}

	/* ── Overlay + Bottom sheets ── */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: flex-end;
		z-index: 200;
		animation: fade-in 0.2s ease;
	}

	@keyframes fade-in {
		from { opacity: 0; }
	}

	.bottom-sheet {
		width: 100%;
		background: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		border-top: 1px solid var(--color-border);
		max-height: 82dvh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: var(--color-border-solid);
		border-radius: var(--radius-full);
		margin: var(--space-3) auto var(--space-1);
		flex-shrink: 0;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-5) var(--space-4);
		flex-shrink: 0;
	}

	.sheet-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.sheet-action {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4) var(--space-5);
		background: none;
		border: none;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-primary);
		font-size: var(--text-base);
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.sheet-action:hover:not(:disabled) {
		background: var(--color-accent-dim);
	}

	.sheet-action:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	/* ── DM search sheet ── */
	.sheet-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-3) var(--space-5) calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	:global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 24px);
		font-size: var(--text-base);
		outline: none;
		transition: border-color 0.15s;
		font-family: var(--font-sans);
	}

	.search-input:focus {
		border-color: var(--color-accent);
	}

	.search-input:disabled {
		opacity: 0.5;
	}

	.inline-error {
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
	}

	.dm-results {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.dm-user-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-3);
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		color: inherit;
		text-align: left;
		transition: background 0.1s, border-color 0.1s;
		cursor: pointer;
		text-shadow: none;
	}

	.dm-user-row:hover:not(:disabled) {
		background: var(--color-accent-dim);
		border-color: rgba(119, 119, 194, 0.25);
	}

	.dm-user-row:disabled {
		opacity: 0.5;
		pointer-events: none;
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

	.dm-user-handle {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.you-badge {
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.3);
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	/* ── Archived section ── */
	.archived-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-3) var(--space-5);
		background: none;
		border: none;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		font-family: var(--font-sans);
		text-shadow: none;
		transition: background 0.12s;
	}

	.archived-toggle:hover {
		background: var(--color-accent-dim);
	}

	.archived-row {
		opacity: 0.65;
	}

	.archived-label {
		color: var(--color-text-secondary);
		font-style: italic;
		font-size: var(--text-xs);
	}

	.state-msg.small {
		padding: var(--space-3) var(--space-5);
		font-size: var(--text-xs);
	}
</style>
