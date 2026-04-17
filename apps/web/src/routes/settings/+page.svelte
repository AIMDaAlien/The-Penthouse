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
			<div class="profile-card">
				<!-- Hidden file input for avatar upload -->
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="file-input-hidden"
					bind:this={fileInput}
					onchange={handleAvatarChange}
				/>

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

			<button class="danger-action" onclick={handleLogout} disabled={loggingOut}>
				<Icon name="log-out" size={18} />
				{loggingOut ? 'Signing out...' : 'Sign out'}
			</button>
		</section>

		<p class="version-note">The Penthouse · alpha</p>
	</main>
</div>

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

	/* ── Profile card ── */
	.file-input-hidden {
		display: none;
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
	}

	.avatar-upload-btn {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-full);
		border: 2px solid var(--color-border);
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

	/* ── Density toggle ── */
	.density-toggle {
		display: flex;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		flex-shrink: 0;
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
		border-radius: 0;
	}

	.density-btn:active {
		transform: none;
	}

	.density-btn.active {
		background: var(--color-accent-dim);
		color: var(--color-accent);
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
