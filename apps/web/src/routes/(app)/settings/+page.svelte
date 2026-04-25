<!-- Settings page -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, media, users } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { settingsStore } from '$stores/settings.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let loggingOut = $state(false);
	let avatarUploading = $state(false);
	let avatarError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let showSignOutConfirm = $state(false);

	const currentUser = $derived(sessionStore.current?.user);

	async function handleAvatarChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		avatarUploading = true;
		avatarError = '';
		try {
			const upload = await media.upload(file);
			const res = await users.updateProfile({ avatarUploadId: upload.id });
			sessionStore.set(res);
		} catch (err: unknown) {
			avatarError = err instanceof Error ? err.message : 'Failed to update avatar';
			setTimeout(() => (avatarError = ''), 5000);
		} finally {
			avatarUploading = false;
			// Reset file input so same file can be re-selected
			if (input) input.value = '';
		}
	}

	async function handleLogout() {
		loggingOut = true;
		try {
			await auth.logout();
		} catch {
			// ignore — clear session regardless
		} finally {
			sessionStore.clear();
			socketStore.disconnect();
			goto('/auth');
		}
	}
</script>

<div class="shell">
	<header class="page-header">
		<div class="logo">
			<span class="logo-the">The</span>
			<span class="logo-name">Penthouse</span>
		</div>
	</header>

	<main class="settings-body">
		<!-- Profile summary -->
		{#if currentUser}
			<div class="profile-section">
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="file-input-hidden"
					bind:this={fileInput}
					onchange={handleAvatarChange}
				/>

				<!-- Banner (future: click to change) -->
				<div class="profile-banner" role="img" aria-label="Profile banner">
					<span class="banner-camera" aria-hidden="true">
						<Icon name="image" size={18} />
					</span>
				</div>

				<div class="profile-lower">
					<button
						class="avatar-upload-btn"
						onclick={() => fileInput?.click()}
						disabled={avatarUploading}
						aria-label="Change avatar"
						title="Tap to change avatar"
					>
						{#if currentUser.avatarUrl}
							<img src={currentUser.avatarUrl} alt={currentUser.displayName ?? currentUser.username} class="avatar-img" />
						{:else}
							<span class="avatar-initials">
								{(currentUser.displayName ?? currentUser.username).slice(0, 2).toUpperCase()}
							</span>
						{/if}
						<div class="avatar-overlay" aria-hidden="true">
							{#if avatarUploading}
								<span class="avatar-uploading-dot"></span>
							{:else}
								<Icon name="image" size={16} />
							{/if}
						</div>
					</button>

					<div class="profile-info">
						<p class="profile-name">{currentUser.displayName ?? currentUser.username}</p>
						<p class="profile-handle">@{currentUser.username}</p>
						{#if avatarError}
							<p class="avatar-error">{avatarError}</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Display settings -->
		<section class="section">
			<p class="section-label">Display</p>

			<div class="setting-row">
				<div class="setting-info">
					<p class="setting-name">Density</p>
					<p class="setting-desc">Controls spacing between chat rows</p>
				</div>
				<div class="density-toggle">
					<button
						class="density-btn"
						class:active={settingsStore.density === 'spacious'}
						onclick={() => settingsStore.setDensity('spacious')}
					>
						Spacious
					</button>
					<button
						class="density-btn"
						class:active={settingsStore.density === 'compact'}
						onclick={() => settingsStore.setDensity('compact')}
					>
						Compact
					</button>
				</div>
			</div>
		</section>

		<!-- Account -->
		<section class="section">
			<p class="section-label">Account</p>

			<button class="danger-action" onclick={() => (showSignOutConfirm = true)} disabled={loggingOut}>
				<Icon name="log-out" size={18} />
				{loggingOut ? 'Signing out...' : 'Sign out'}
			</button>
		</section>

		<p class="version-note">The Penthouse · alpha</p>
	</main>
</div>

<!-- Sign-out confirmation modal -->
{#if showSignOutConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="signout-backdrop" onclick={() => (showSignOutConfirm = false)}>
		<div class="signout-modal" role="dialog" aria-modal="true" aria-label="Sign out confirmation" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<p class="signout-title">Sign out?</p>
			<p class="signout-desc">You'll need to sign back in to access your chats.</p>
			<div class="signout-actions">
				<button class="signout-cancel" onclick={() => (showSignOutConfirm = false)}>Cancel</button>
				<button class="signout-confirm" onclick={handleLogout} disabled={loggingOut}>
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

	/* ── Header ── */
	.page-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
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

	/* ── Body ── */
	.settings-body {
		flex: 1;
		padding: var(--space-6) var(--space-5);
		padding-bottom: calc(var(--nav-height) + var(--space-6) + env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* ── Profile section ── */
	.file-input-hidden {
		display: none;
	}

	.profile-section {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.profile-banner {
		height: 120px;
		background: linear-gradient(135deg, #1A1A30 0%, #2A2A45 50%, #1A1A24 100%);
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
	}

	.banner-camera {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.4);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.profile-banner:hover .banner-camera {
		opacity: 1;
	}

	.profile-lower {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: 0 var(--space-5) var(--space-4);
		background: var(--color-surface);
		margin-top: -28px;
		padding-top: 0;
	}

	.avatar-upload-btn {
		position: relative;
		width: 60px;
		height: 60px;
		border-radius: var(--radius-full);
		border: 3px solid var(--color-surface);
		background: var(--color-accent-dim);
		padding: 0;
		flex-shrink: 0;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		text-shadow: none;
		transition: border-color 0.15s;
	}

	.avatar-upload-btn:hover {
		border-color: var(--color-accent);
	}

	.avatar-upload-btn:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-full);
	}

	.avatar-initials {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--color-accent);
		font-family: var(--font-sans);
	}

	.avatar-overlay {
		position: absolute;
		inset: 0;
		border-radius: var(--radius-full);
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.avatar-upload-btn:hover .avatar-overlay,
	.avatar-upload-btn:focus-visible .avatar-overlay {
		opacity: 1;
	}

	.avatar-uploading-dot {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		background: #fff;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.avatar-error {
		font-size: var(--text-xs);
		color: var(--color-danger);
		margin: 2px 0 0;
	}

	.profile-info {
		min-width: 0;
	}

	.profile-name {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	.profile-handle {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* ── Section ── */
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		margin: 0;
	}

	/* ── Setting row ── */
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
	}

	.setting-info {
		flex: 1;
		min-width: 0;
	}

	.setting-name {
		font-weight: 500;
		font-size: var(--text-base);
		color: var(--color-text-primary);
		margin: 0;
	}

	.setting-desc {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin: 0;
		margin-top: 2px;
	}

	/* ── Density toggle (inset neumorphic) ── */
	.density-toggle {
		display: flex;
		background: #0E0E1A;
		box-shadow: inset 2px 2px 6px rgba(0, 0, 0, 0.6), inset -1px -1px 4px rgba(80, 80, 120, 0.15);
		border-radius: var(--radius-pill);
		overflow: hidden;
		flex-shrink: 0;
		border: none;
		padding: 2px;
		gap: 2px;
	}

	.density-btn {
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-xs);
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		text-shadow: none;
		border-radius: var(--radius-pill);
	}

	.density-btn:active {
		transform: none;
	}

	.density-btn.active {
		background: rgba(180, 180, 255, 0.12);
		color: var(--color-accent-periwinkle);
		font-weight: 600;
	}

	/* ── Sign-out modal ── */
	.signout-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(10, 10, 18, 0.6);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
	}

	.signout-modal {
		background: rgba(36, 36, 50, 0.85);
		backdrop-filter: blur(16px) saturate(1.4);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		border: 1px solid var(--color-border-solid);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		padding: var(--space-6);
		width: 100%;
		max-width: 320px;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.signout-title {
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.signout-desc {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.signout-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}

	.signout-cancel {
		padding: var(--space-2) var(--space-5);
		background: none;
		border: 1px solid var(--color-border-solid);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		text-shadow: none;
	}

	.signout-confirm {
		padding: var(--space-2) var(--space-5);
		background: var(--color-danger);
		border: none;
		border-radius: var(--radius-pill);
		color: #fff;
		font-size: var(--text-sm);
		font-weight: 600;
		text-shadow: none;
		transition: opacity 0.15s;
	}

	.signout-confirm:disabled {
		opacity: 0.5;
	}

	/* ── Danger action ── */
	.danger-action {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-4) var(--space-5);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		color: var(--color-danger);
		font-size: var(--text-base);
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.danger-action:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
		border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border));
	}

	.danger-action:disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	/* ── Version ── */
	.version-note {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		text-align: center;
		opacity: 0.5;
		margin-top: auto;
	}
</style>
