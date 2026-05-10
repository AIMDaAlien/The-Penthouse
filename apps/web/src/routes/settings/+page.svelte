<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$services/auth';
	import { users } from '$services/users';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import Icon from '$components/Icon.svelte';
	import Avatar from '$components/Avatar.svelte';
	import PushSettings from '$components/PushSettings.svelte';

	let loggingOut = $state(false);
	let showConfirm = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let displayName = $state(sessionStore.user?.displayName ?? '');

	let presenceState = $state(socketStore.presenceState);
	let presenceNote = $state(socketStore.presenceNote);
	let autoAfk = $state(socketStore.autoAfkEnabled);

	const currentUser = $derived(sessionStore.user);
	const presenceOptions = [
		{ value: 'available', label: 'Available' },
		{ value: 'busy', label: 'Busy' },
		{ value: 'dnd', label: 'DND' },
		{ value: 'afk', label: 'AFK' },
		{ value: 'offline', label: 'Offline' }
	] as const;

	function handlePresenceChange() {
		socketStore.setPresence(presenceState, presenceNote.trim() || undefined);
	}

	function handleAutoAfkToggle() {
		socketStore.autoAfkEnabled = autoAfk;
	}

	async function handleSaveProfile() {
		saving = true;
		saveError = '';
		try {
			const res = await users.updateProfile({
				...(displayName.trim() ? { displayName: displayName.trim() } : {})
			});
			sessionStore.updateUser(res);
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			saving = false;
		}
	}

	async function handleLogout() {
		loggingOut = true;
		try { await auth.logout(); } catch { /* ignore */ }
		finally {
			sessionStore.clear();
			goto('/auth', { replaceState: true });
		}
	}
</script>

<div class="shell">
	<header class="header">
		<button class="back-btn" onclick={() => goto('/')} aria-label="Back">
			<Icon name="arrowLeft" size={20} />
		</button>
		<h1>Settings</h1>
	</header>

	<main class="body">
		{#if currentUser}
			<div class="profile-section">
				<div class="profile-card">
					<Avatar url={currentUser.avatarUrl} name={currentUser.displayName ?? currentUser.username} size={64} />
					<div class="profile-info">
						<p class="profile-name">{currentUser.displayName ?? currentUser.username}</p>
						<p class="profile-handle">@{currentUser.username}</p>
					</div>
				</div>
			</div>

			<section class="section">
				<p class="section-label">Profile</p>
				<div class="setting-card">
					<div class="field">
						<label for="display-name">Display name</label>
						<input id="display-name" type="text" bind:value={displayName} maxlength="40" />
					</div>
					{#if saveError}<p class="field-error">{saveError}</p>{/if}
					<button class="btn-secondary" onclick={handleSaveProfile} disabled={saving}>
						{saving ? 'Saving...' : 'Save profile'}
					</button>
				</div>
			</section>

			<section class="section">
				<p class="section-label">Presence</p>
				<div class="setting-card">
					<div class="field">
						<label for="presence-state">Status</label>
						<select id="presence-state" bind:value={presenceState} onchange={handlePresenceChange}>
							{#each presenceOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="presence-note">Note</label>
						<input
							id="presence-note"
							type="text"
							bind:value={presenceNote}
							maxlength="100"
							placeholder="What's on your mind?"
							onchange={handlePresenceChange}
						/>
					</div>
					<label class="toggle-row">
						<span>Auto-AFK when idle</span>
						<input
							type="checkbox"
							bind:checked={autoAfk}
							onchange={handleAutoAfkToggle}
						/>
					</label>
				</div>
			</section>

			<section class="section">
				<p class="section-label">Notifications</p>
				<PushSettings />
			</section>

			<section class="section">
				<p class="section-label">Account</p>
				<button class="danger-btn" onclick={() => showConfirm = true} disabled={loggingOut}>
					<Icon name="log-out" size={18} />
					{loggingOut ? 'Signing out...' : 'Sign out'}
				</button>
			</section>
		{/if}

		<p class="version">The Penthouse · v4.0.0-alpha.1</p>
	</main>
</div>

{#if showConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" role="presentation" tabindex="-1" onclick={() => showConfirm = false} onkeydown={(e) => e.key === 'Escape' && (showConfirm = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<p class="modal-title">Sign out?</p>
			<p class="modal-desc">You'll need to sign back in to access your chats.</p>
			<div class="modal-actions">
				<button class="btn-cancel" onclick={() => showConfirm = false}>Cancel</button>
				<button class="btn-confirm" onclick={handleLogout} disabled={loggingOut}>
					{loggingOut ? 'Signing out...' : 'Sign out'}
				</button>
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

	.body {
		flex: 1;
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.profile-section {
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.profile-name {
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}

	.profile-handle {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}

	.setting-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		font-weight: var(--weight-medium);
	}

	.field input,
	.field select {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		color: var(--color-text);
		padding: var(--space-sm) 0;
		outline: none;
		font-family: inherit;
		font-size: var(--text-base);
		width: 100%;
	}

	.field select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0 center;
		padding-right: var(--space-lg);
		cursor: pointer;
	}

	.field input:focus,
	.field select:focus { border-color: var(--color-accent); }

	.field-error {
		font-size: var(--text-sm);
		color: var(--color-error);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--text-sm);
		color: var(--color-text);
		cursor: pointer;
		gap: var(--space-md);
	}

	.toggle-row input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: var(--color-accent);
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-secondary {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		color: var(--color-text);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		align-self: flex-start;
		transition: background 0.15s;
	}

	.btn-secondary:hover { background: var(--color-border); }
	.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

	.danger-btn {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-error);
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.danger-btn:hover { background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface)); }
	.danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.version {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-align: center;
		margin-top: auto;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 10, 18, 0.6);
		backdrop-filter: blur(6px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.modal {
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		width: 100%;
		max-width: 320px;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.modal-title {
		font-size: var(--text-lg);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}

	.modal-desc {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: flex-end;
	}

	.btn-cancel {
		padding: var(--space-sm) var(--space-lg);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}

	.btn-confirm {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-error);
		border: none;
		border-radius: var(--radius-pill);
		color: #fff;
		font-size: var(--text-sm);
		font-weight: var(--weight-bold);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-confirm:hover { opacity: 0.85; }
	.btn-confirm:disabled { opacity: 0.5; }
</style>
