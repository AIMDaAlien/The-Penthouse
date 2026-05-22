<script lang="ts">
	import { onDestroy } from 'svelte';
	import { chats } from '$services/chats';
	import { users } from '$services/users';
	import { sessionStore } from '$stores/session.svelte';
	import Icon from './Icon.svelte';
	import Avatar from './Avatar.svelte';
	import type { ChatMemberDetail } from '@penthouse/contracts';

	interface Props {
		chatId: string;
		canManage?: boolean;
		open: boolean;
		onClose: () => void;
	}

	let { chatId, canManage = false, open, onClose }: Props = $props();

	let members = $state<ChatMemberDetail[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>>([]);
	let searching = $state(false);
	let addingUserId = $state<string | null>(null);
	let removingUserId = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	const myUserId = $derived(sessionStore.user?.id ?? '');

	function canRemove(targetUserId: string): boolean {
		return canManage && targetUserId !== myUserId;
	}

	async function loadMembers() {
		loading = true;
		try {
			const res = await chats.listMembers(chatId);
			members = res.members;
		} catch (err) {
			members = [];
		} finally {
			loading = false;
		}
	}

	async function handleSearch() {
		const q = searchQuery.trim();
		if (!q) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			const res = await users.search(q, 10);
			// Filter out users already in the chat
			const memberIds = new Set(members.map((m) => m.id));
			searchResults = res.results.filter((u) => !memberIds.has(u.id));
		} catch (err) {
			searchResults = [];
		} finally {
			searching = false;
		}
	}

	function clearSearchTimeout() {
		if (!searchTimeout) return;
		clearTimeout(searchTimeout);
		searchTimeout = null;
	}

	function onSearchInput() {
		clearSearchTimeout();
		searchTimeout = setTimeout(() => {
			searchTimeout = null;
			void handleSearch();
		}, 250);
	}

	async function handleInvite(userId: string) {
		addingUserId = userId;
		try {
			await chats.addMember(chatId, { memberId: userId, role: 'member' });
			searchQuery = '';
			searchResults = [];
			await loadMembers();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to invite member');
		} finally {
			addingUserId = null;
		}
	}

	async function handleRemove(userId: string) {
		removingUserId = userId;
		try {
			await chats.removeMember(chatId, userId);
			members = members.filter((m) => m.id !== userId);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to remove member');
		} finally {
			removingUserId = null;
		}
	}

	$effect(() => {
		if (open) {
			void loadMembers();
		} else {
			clearSearchTimeout();
			searchQuery = '';
			searchResults = [];
			searching = false;
		}
	});

	onDestroy(() => {
		clearSearchTimeout();
	});
</script>

{#if open}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Close members modal"
		onclick={onClose}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onClose();
			}
		}}
	>
		<div
			class="modal-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Chat members"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h2>Members</h2>
				<button onclick={onClose} aria-label="Close">
					<Icon name="x" size={18} />
				</button>
			</div>

			{#if canManage}
				<div class="invite-section">
					<div class="search-row">
						<Icon name="search" size={16} />
						<input
							type="text"
							placeholder="Search users to invite..."
							bind:value={searchQuery}
							oninput={onSearchInput}
							onkeydown={(e) => e.key === 'Enter' && handleSearch()}
						/>
						{#if searching}
							<span class="search-spinner"><Icon name="loader" size={16} /></span>
						{/if}
					</div>
					{#if searchResults.length > 0}
						<div class="search-results" role="list">
							{#each searchResults as user (user.id)}
								<div class="search-result" role="listitem">
									<Avatar url={user.avatarUrl} name={user.displayName} size={28} />
									<div class="search-result-meta">
										<span class="search-result-name">{user.displayName}</span>
										<span class="search-result-handle">@{user.username}</span>
									</div>
									<button
										class="invite-btn"
										disabled={addingUserId === user.id}
										onclick={() => handleInvite(user.id)}
									>
										{#if addingUserId === user.id}
											<Icon name="loader" size={14} />
										{:else}
											<Icon name="plus" size={14} />
										{/if}
										Invite
									</button>
								</div>
							{/each}
						</div>
					{:else if searchQuery.trim() && !searching}
						<p class="search-empty">No users found</p>
					{/if}
				</div>
			{/if}

			{#if loading}
				<p class="state">Loading members...</p>
			{:else}
				<div class="members-list" role="list">
					{#each members as member (member.id)}
						<div class="member-row" role="listitem">
							<Avatar url={member.avatarUrl} name={member.displayName} size={32} />
							<div class="member-meta">
								<span class="member-name">
									{member.displayName}
									{#if member.id === myUserId}
										<span class="member-you">(you)</span>
									{/if}
								</span>
								<span class="member-role" class:owner={member.role === 'owner'}>
									{member.role}
								</span>
							</div>
							{#if canRemove(member.id)}
								<button
									class="remove-btn"
									disabled={removingUserId === member.id}
									onclick={() => handleRemove(member.id)}
									aria-label="Remove {member.displayName}"
								>
									{#if removingUserId === member.id}
										<Icon name="loader" size={14} />
									{:else}
										<Icon name="x" size={14} />
									{/if}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: oklch(0 0 0 / 0.45);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
	}

	.modal-panel {
		background: var(--p-surface);
		border: 1px solid var(--p-line-2);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		width: 100%;
		max-width: 420px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--p-text);
	}

	.modal-header button {
		background: none;
		border: none;
		color: var(--p-text-2);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-header button:hover {
		color: var(--p-text);
		background: var(--p-surface-2);
	}

	.invite-section {
		margin-bottom: var(--space-md);
		flex-shrink: 0;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		color: var(--p-text-2);
	}

	.search-row input {
		flex: 1;
		background: none;
		border: none;
		color: var(--p-text);
		font-size: var(--text-sm);
		outline: none;
	}

	.search-row input::placeholder {
		color: var(--p-muted);
	}

	.search-spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.search-results {
		margin-top: var(--space-sm);
		max-height: 160px;
		overflow-y: auto;
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		background: var(--p-surface-2);
	}

	.search-result {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--p-line);
	}

	.search-result:last-child {
		border-bottom: none;
	}

	.search-result-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.search-result-name {
		font-size: var(--text-sm);
		color: var(--p-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.search-result-handle {
		font-size: var(--text-xs);
		color: var(--p-muted);
	}

	.invite-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--p-accent-soft);
		border: 1px solid var(--p-accent-edge);
		border-radius: var(--radius-pill);
		color: var(--p-accent);
		font-size: var(--text-xs);
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.invite-btn:hover:not(:disabled) {
		background: var(--p-accent-edge);
	}

	.invite-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-empty {
		margin: var(--space-sm) 0 0;
		font-size: var(--text-sm);
		color: var(--p-muted);
		text-align: center;
	}

	.state {
		font-size: var(--text-sm);
		color: var(--p-muted);
		text-align: center;
		padding: var(--space-md);
	}

	.members-list {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--p-line);
		transition: background 0.1s;
	}

	.member-row:last-child {
		border-bottom: none;
	}

	.member-row:hover {
		background: var(--p-surface-2);
	}

	.member-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.member-name {
		font-size: var(--text-sm);
		color: var(--p-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.member-you {
		color: var(--p-muted);
		margin-left: var(--space-xs);
	}

	.member-role {
		font-size: var(--text-xs);
		color: var(--p-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.member-role.owner {
		color: var(--p-accent);
		font-weight: 600;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--p-muted);
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s, background 0.15s;
	}

	.remove-btn:hover:not(:disabled) {
		color: var(--p-warning);
		background: var(--p-warning-soft);
	}

	.remove-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
