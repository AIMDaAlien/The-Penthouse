<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { users, chats } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import type { MemberDetail } from '@penthouse/contracts';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	const userId = $derived(page.params.id ?? '');
	const isOwnProfile = $derived(sessionStore.current?.user.id === userId);

	let user = $state<MemberDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let isEditing = $state(false);
	let editDisplayName = $state('');
	let editBio = $state('');
	let editTimezone = $state('');
	let saving = $state(false);
	let messagingInProgress = $state(false);

	async function loadProfile() {
		try {
			loading = true;
			error = '';
			user = await users.getProfile(userId);
			if (isOwnProfile) {
				editDisplayName = user.displayName;
				editBio = user.bio ?? '';
				editTimezone = user.timezone ?? '';
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load profile';
		} finally {
			loading = false;
		}
	}

	async function handleSaveProfile() {
		if (!editDisplayName.trim()) {
			error = 'Display name is required';
			return;
		}

		saving = true;
		error = '';
		try {
			const res = await users.updateProfile({
				displayName: editDisplayName.trim(),
				bio: editBio.trim() || null,
				timezone: editTimezone.trim() || null
			});
			sessionStore.set(res);
			if (user) {
				user.displayName = editDisplayName.trim();
				user.bio = editBio.trim() || null;
				user.timezone = editTimezone.trim() || null;
			}
			isEditing = false;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to save profile';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		isEditing = false;
		if (user) {
			editDisplayName = user.displayName;
			editBio = user.bio ?? '';
			editTimezone = user.timezone ?? '';
		}
	}

	async function handleStartMessage() {
		messagingInProgress = true;
		try {
			const result = await chats.createDm(userId);
			await goto(`/chat/${result.id}`);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to start message';
			messagingInProgress = false;
		}
	}

	function formatLastSeen(lastSeenAt: string | null | undefined): string {
		if (!lastSeenAt) return 'Never seen';
		const date = new Date(lastSeenAt);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Online now';
		if (diffMins < 60) return `Active ${diffMins}m ago`;
		if (diffHours < 24) return `Active ${diffHours}h ago`;
		if (diffDays < 7) return `Active ${diffDays}d ago`;
		return `Seen ${date.toLocaleDateString()}`;
	}

	onMount(() => {
		loadProfile();
	});
</script>

<div class="profile-shell">
	<!-- Header -->
	<header class="profile-header">
		<button class="back-btn" onclick={() => goto('/users')} aria-label="Back to users">
			<Icon name="arrow-left" size={20} />
		</button>
		<h1 class="profile-title">Profile</h1>
		{#if isOwnProfile && !isEditing}
			<button
				class="edit-btn"
				onclick={() => {
					isEditing = true;
				}}
				aria-label="Edit profile"
			>
				<Icon name="edit" size={16} />
			</button>
		{/if}
	</header>

	<!-- Content -->
	<div class="profile-content">
		{#if loading}
			<div class="state-msg">Loading profile...</div>
		{:else if error && !user}
			<div class="state-msg error">{error}</div>
		{:else if user}
			<div class="profile-card">
				<!-- Avatar -->
				<div class="avatar-large-wrap">
					<Avatar
						userId={user.id}
						displayName={user.displayName}
						avatarUrl={user.avatarUrl ?? null}
						size="lg"
						showPresence={false}
					/>
				</div>

				<!-- Status -->
				<div class="status-info">
					<span class="status-text">{formatLastSeen(user.lastSeenAt)}</span>
				</div>

				{#if isEditing}
					<!-- Edit mode -->
					<form class="edit-form" onsubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
						<div class="form-group">
							<label for="display-name">Display Name</label>
							<input
								id="display-name"
								type="text"
								bind:value={editDisplayName}
								disabled={saving}
								required
							/>
						</div>

						<div class="form-group">
							<label for="bio">Bio</label>
							<textarea
								id="bio"
								bind:value={editBio}
								disabled={saving}
								rows="3"
								placeholder="Tell us about yourself..."
							></textarea>
						</div>

						<div class="form-group">
							<label for="timezone">Timezone <span class="optional">(optional)</span></label>
							<input
								id="timezone"
								type="text"
								bind:value={editTimezone}
								disabled={saving}
								placeholder="e.g., America/New_York"
							/>
						</div>

						{#if error}
							<div class="error-msg">{error}</div>
						{/if}

						<div class="form-actions">
							<button type="button" class="cancel-btn" onclick={handleCancel} disabled={saving}>
								Cancel
							</button>
							<button type="submit" class="save-btn" disabled={saving}>
								{saving ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				{:else}
					<!-- View mode -->
					<div class="profile-info">
						<div class="info-field">
							<h2 class="field-value">{user.displayName}</h2>
							<p class="field-label">Name</p>
						</div>

						<div class="info-field">
							<p class="field-value">@{user.username}</p>
							<p class="field-label">Username</p>
						</div>

						{#if user.bio}
							<div class="info-field">
								<p class="field-value">{user.bio}</p>
								<p class="field-label">Bio</p>
							</div>
						{/if}

						{#if user.timezone}
							<div class="info-field">
								<p class="field-value">{user.timezone}</p>
								<p class="field-label">Timezone</p>
							</div>
						{/if}

						{#if !isOwnProfile}
							<button
								class="message-btn"
								onclick={handleStartMessage}
								disabled={messagingInProgress}
								aria-label="Start a direct message"
							>
								{messagingInProgress ? 'Starting...' : 'Message'}
							</button>
						{/if}

						{#if error}
							<div class="error-msg">{error}</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.profile-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
		background: var(--color-bg);
	}

	/* ── Header ── */
	.profile-header {
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

	.profile-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
	}

	.edit-btn {
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.3);
		border-radius: var(--radius-md);
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
	}

	.edit-btn:hover {
		background: rgba(119, 119, 194, 0.25);
	}

	/* ── Content ── */
	.profile-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
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

	/* ── Profile card ── */
	.profile-card {
		width: 100%;
		max-width: 400px;
	}

	.avatar-large-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-4);
	}

	/* Force large size — Avatar component sizes use CSS vars */
	:global(.avatar-large-wrap .avatar) {
		width: 96px;
		height: 96px;
		font-size: 2rem;
	}

	.status-info {
		text-align: center;
		margin-bottom: var(--space-4);
	}

	.status-text {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	/* ── View mode ── */
	.profile-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.info-field {
		padding: var(--space-3);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.field-label {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-1);
		font-weight: 500;
	}

	.field-value {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.5;
		word-break: break-word;
	}

	/* ── Edit form ── */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.form-group label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.optional {
		font-weight: 400;
		color: var(--color-text-secondary);
	}

	.form-group input,
	.form-group textarea {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		padding: var(--space-3);
		font-family: inherit;
		font-size: var(--text-sm);
		outline: none;
		transition: border-color 0.15s;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		border-color: var(--color-accent);
	}

	.form-group input:disabled,
	.form-group textarea:disabled {
		opacity: 0.5;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.error-msg {
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		font-size: var(--text-xs);
		border-radius: var(--radius-sm);
	}

	.form-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.cancel-btn,
	.save-btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.cancel-btn {
		background: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.cancel-btn:hover:not(:disabled) {
		background: var(--color-surface-raised);
	}

	.save-btn {
		background: var(--color-accent);
		color: #000;
		border: none;
		font-weight: 600;
	}

	.save-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.cancel-btn:disabled,
	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Message button ── */
	.message-btn {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--color-accent);
		color: #000;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		margin-top: var(--space-2);
	}

	.message-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.message-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
