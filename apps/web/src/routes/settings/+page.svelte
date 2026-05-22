<script lang="ts">
	import { focusTrap } from '$lib/actions/focusTrap';
	import { goto } from '$app/navigation';
	import { auth } from '$services/auth';
	import { users } from '$services/users';
	import { media } from '$services/media';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import Icon from '$components/Icon.svelte';
	import Avatar from '$components/Avatar.svelte';
	import PushSettings from '$components/PushSettings.svelte';
	import AppearanceSettings from '$components/AppearanceSettings.svelte';
	import ProfileStyleSettings from '$components/ProfileStyleSettings.svelte';
	import { appearanceStore } from '$stores/appearance.svelte';

	let loggingOut = $state(false);
	let showConfirm = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let displayName = $state(sessionStore.user?.displayName ?? '');
	let profileStyle = $state<'editorial' | 'vogue' | 'wallpaper'>(sessionStore.user?.profileStyle ?? 'editorial');
	let avatarUploadId = $state<string | null>(null);
	let bannerUploadId = $state<string | null>(null);
	let avatarPreview = $state<string | null>(null);
	let bannerPreview = $state<string | null>(null);
	let uploadingAvatar = $state(false);
	let uploadingBanner = $state(false);

	let presenceState = $state(socketStore.presenceState);
	let presenceNote = $state(socketStore.presenceNote);
	let autoAfk = $state(socketStore.autoAfkEnabled);

	const currentUser = $derived(sessionStore.user);
	const effectiveAvatarUrl = $derived(avatarPreview ?? currentUser?.avatarUrl ?? null);
	const effectiveBannerUrl = $derived(bannerPreview ?? currentUser?.bannerUrl ?? null);


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

	async function handleAvatarSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			saveError = 'Please select an image file';
			return;
		}
		uploadingAvatar = true;
		try {
			const res = await media.upload(file, 'avatar');
			avatarUploadId = res.id;
			avatarPreview = res.url;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to upload avatar';
		} finally {
			uploadingAvatar = false;
			input.value = '';
		}
	}

	async function handleBannerSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			saveError = 'Please select an image file';
			return;
		}
		uploadingBanner = true;
		try {
			const res = await media.upload(file, 'banner');
			bannerUploadId = res.id;
			bannerPreview = res.url;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to upload banner';
		} finally {
			uploadingBanner = false;
			input.value = '';
		}
	}

	async function handleSaveProfile() {
		saving = true;
		saveError = '';
		try {
			const payload: Parameters<typeof users.updateProfile>[0] = {};
			if (displayName.trim()) payload.displayName = displayName.trim();
			if (profileStyle !== sessionStore.user?.profileStyle) payload.profileStyle = profileStyle;
			if (avatarUploadId) payload.avatarUploadId = avatarUploadId;
			if (bannerUploadId) payload.bannerUploadId = bannerUploadId;
			const res = await users.updateProfile(payload);
			sessionStore.updateUser(res);
			avatarUploadId = null;
			bannerUploadId = null;
			avatarPreview = null;
			bannerPreview = null;
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
			goto('/welcome', { replaceState: true });
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
				<div class="banner-preview" class:has-banner={!!effectiveBannerUrl}>
					{#if effectiveBannerUrl}
						<img src={effectiveBannerUrl} alt="Banner" class="banner-img" />
					{:else}
						<div class="banner-placeholder"></div>
					{/if}
					<label class="banner-upload-btn" title="Change banner">
						<Icon name="image" size={16} />
						<input type="file" accept="image/*" onchange={handleBannerSelect} disabled={uploadingBanner} hidden />
					</label>
				</div>
				<div class="profile-card">
					<div class="avatar-wrap">
						<Avatar url={effectiveAvatarUrl} name={currentUser.displayName ?? currentUser.username} size={64} />
						<label class="avatar-upload-btn" title="Change avatar">
							<Icon name="camera" size={14} />
							<input type="file" accept="image/*" onchange={handleAvatarSelect} disabled={uploadingAvatar} hidden />
						</label>
					</div>
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
				<p class="section-label">Appearance</p>
				<AppearanceSettings />
			</section>

			<section class="section">
				<p class="section-label">Profile Style</p>
				<ProfileStyleSettings
					value={profileStyle}
					onChange={(v) => profileStyle = v}
				/>
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
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} use:focusTrap={{ onEscape: () => showConfirm = false }}>
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
		border-bottom: 1px solid var(--p-line);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--p-accent);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.back-btn:hover { background: var(--p-surface-2); }

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
		border-bottom: 1px solid var(--p-line);
	}

	.banner-preview {
		position: relative;
		width: 100%;
		aspect-ratio: 20 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--p-surface-2);
		margin-bottom: var(--space-md);
	}

	.banner-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.banner-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, var(--p-surface-2) 0%, var(--p-line) 100%);
	}

	.banner-upload-btn {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
		border: none;
	}

	.banner-upload-btn:hover {
		background: rgba(0, 0, 0, 0.7);
	}

	.avatar-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.avatar-upload-btn {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--p-accent);
		color: var(--p-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border: 2px solid var(--p-bg);
		transition: opacity 0.15s;
	}

	.avatar-upload-btn:hover {
		opacity: 0.85;
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.profile-name {
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		color: var(--p-text);
	}

	.profile-handle {
		font-size: var(--text-sm);
		color: var(--p-text-2);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--p-text-2);
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}

	.setting-card {
		background: var(--p-surface);
		border: 1px solid var(--p-line);
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
		color: var(--p-text-2);
		font-weight: var(--weight-medium);
	}

	.field input,
	.field select {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--p-line);
		border-radius: 0;
		color: var(--p-text);
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
	.field select:focus { border-color: var(--p-accent); }

	.field-error {
		font-size: var(--text-sm);
		color: var(--p-error);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--text-sm);
		color: var(--p-text);
		cursor: pointer;
		gap: var(--space-md);
	}

	.toggle-row input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: var(--p-accent);
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-secondary {
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		padding: var(--space-sm) var(--space-md);
		color: var(--p-text);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		align-self: flex-start;
		transition: background 0.15s;
	}

	.btn-secondary:hover { background: var(--p-line); }
	.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

	.danger-btn {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-lg);
		color: var(--p-error);
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.danger-btn:hover { background: var(--p-surface-2); }
	.danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.version {
		font-size: var(--text-xs);
		color: var(--p-muted);
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
		background: var(--p-surface-2);
		border: 1px solid var(--p-line);
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
		color: var(--p-text);
	}

	.modal-desc {
		font-size: var(--text-sm);
		color: var(--p-text-2);
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
		border: 1px solid var(--p-line);
		border-radius: var(--radius-pill);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}

	.btn-confirm {
		padding: var(--space-sm) var(--space-lg);
		background: var(--p-error);
		border: none;
		border-radius: var(--radius-pill);
		color: var(--p-bg);
		font-size: var(--text-sm);
		font-weight: var(--weight-bold);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-confirm:hover { opacity: 0.85; }
	.btn-confirm:disabled { opacity: 0.5; }
</style>
