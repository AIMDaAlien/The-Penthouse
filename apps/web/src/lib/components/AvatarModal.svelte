<script lang="ts">
	import { goto } from '$app/navigation';
	import { chats } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import Icon from './Icon.svelte';

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

	interface Props {
		user: UserProfile;
		onClose?: () => void;
	}

	let { user, onClose }: Props = $props();

	let messagingLoading = $state(false);

	const currentUserId = sessionStore.current?.user.id ?? '';
	const isSelf = $derived(user.id === currentUserId);

	// Generate a deterministic banner gradient from user id if no banner set
	const bannerGradient = $derived(() => {
		if (user.bannerColor) return user.bannerColor;
		const hash = user.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
		const hue1 = (hash * 37) % 360;
		const hue2 = (hue1 + 40) % 360;
		return `linear-gradient(135deg, hsl(${hue1}, 50%, 30%), hsl(${hue2}, 60%, 20%))`;
	});

	function formatLastSeen(iso: string | null | undefined): string {
		if (!iso) return 'Unknown';
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffH = Math.floor(diffMin / 60);
		if (diffH < 24) return `${diffH}h ago`;
		const diffD = Math.floor(diffH / 24);
		if (diffD < 7) return `${diffD}d ago`;
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function formatMemberSince(iso: string | null | undefined): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long' });
	}

	async function handleMessageUser() {
		messagingLoading = true;
		try {
			const result = await chats.createDm(user.id);
			onClose?.();
			await goto(`/chat/${result.id}?name=${encodeURIComponent(user.displayName)}`);
		} finally {
			messagingLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-overlay" onclick={onClose} role="dialog" aria-modal="true" aria-label="User profile">
	<div class="modal-card" onclick={(e) => e.stopPropagation()}>
		<!-- Banner -->
		<div class="banner" style="background: {bannerGradient()}">
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<Icon name="close" size={18} />
			</button>
		</div>

		<!-- Avatar (overlapping banner) -->
		<div class="avatar-area">
			<div class="avatar-ring">
				{#if user.avatarUrl}
					<img src={user.avatarUrl} alt={user.displayName} class="avatar-img" />
				{:else}
					<div class="avatar-fallback">
						{user.displayName.slice(0, 2).toUpperCase()}
					</div>
				{/if}
				<span class="presence-dot" class:online={user.online}></span>
			</div>
		</div>

		<!-- Profile body -->
		<div class="profile-body">
			<!-- Name + status -->
			<div class="name-row">
				<h2 class="display-name">{user.displayName}</h2>
				{#if user.role && user.role !== 'member'}
					<span class="role-badge">{user.role}</span>
				{/if}
			</div>
			<p class="username">@{user.username}</p>

			{#if user.status}
				<p class="custom-status">
					<Icon name="at-sign" size={13} />
					{user.status}
				</p>
			{/if}

			<!-- Divider -->
			<hr class="divider" />

			<!-- Meta fields -->
			<div class="meta-grid">
				<div class="meta-item">
					<span class="meta-label">
						<Icon name="clock" size={13} />
						{user.online ? 'Online' : 'Last seen'}
					</span>
					<span class="meta-value">
						{user.online ? 'Active now' : formatLastSeen(user.lastSeen)}
					</span>
				</div>

				{#if user.createdAt}
					<div class="meta-item">
						<span class="meta-label">
							<Icon name="user" size={13} />
							Member since
						</span>
						<span class="meta-value">{formatMemberSince(user.createdAt)}</span>
					</div>
				{/if}
			</div>

			{#if user.bio}
				<div class="bio-section">
					<p class="bio-label">About</p>
					<p class="bio-text">{user.bio}</p>
				</div>
			{/if}

			<!-- Actions -->
			{#if !isSelf}
				<button
					class="action-btn primary"
					onclick={handleMessageUser}
					disabled={messagingLoading}
				>
					<Icon name="compose" size={16} />
					{messagingLoading ? 'Opening…' : 'Send message'}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-end;
		z-index: 200;
		animation: fade-in 0.2s ease;
	}

	.modal-card {
		width: 100%;
		max-height: 88dvh;
		background: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		overflow-y: auto;
		animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes fade-in {
		from { opacity: 0; }
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
	}

	/* Banner */
	.banner {
		position: relative;
		height: 100px;
		flex-shrink: 0;
	}

	.close-btn {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		background: rgba(0, 0, 0, 0.4);
		border: none;
		border-radius: var(--radius-full);
		color: #fff;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	/* Avatar */
	.avatar-area {
		padding: 0 var(--space-6);
		margin-top: -36px;
		margin-bottom: var(--space-2);
	}

	.avatar-ring {
		position: relative;
		width: 72px;
		height: 72px;
		border-radius: var(--radius-full);
		border: 3px solid var(--color-surface);
		background: var(--color-surface);
		overflow: visible;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-full);
	}

	.avatar-fallback {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-full);
		background: var(--color-accent-dim);
		color: var(--color-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xl);
		font-weight: 700;
		font-family: var(--font-sans);
	}

	.presence-dot {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 14px;
		height: 14px;
		border-radius: var(--radius-full);
		background: var(--color-text-secondary);
		border: 2px solid var(--color-surface);
		opacity: 0.5;
	}

	.presence-dot.online {
		background: var(--color-success);
		opacity: 1;
	}

	/* Profile body */
	.profile-body {
		padding: var(--space-2) var(--space-6) var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.display-name {
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		font-family: var(--font-display);
	}

	.role-badge {
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.3);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 600;
		padding: 2px 8px;
		text-transform: capitalize;
	}

	.username {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.custom-status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
		font-style: italic;
	}

	.divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--space-2) 0;
	}

	.meta-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.meta-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 500;
	}

	.meta-value {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.bio-section {
		margin-top: var(--space-2);
	}

	.bio-label {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 500;
		margin: 0 0 var(--space-2);
	}

	.bio-text {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		line-height: 1.6;
		margin: 0;
	}

	/* Actions */
	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		border-radius: var(--radius-lg);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-base);
		font-weight: 600;
		font-family: var(--font-sans);
		cursor: pointer;
		transition: opacity 0.15s, background 0.2s;
		margin-top: var(--space-4);
	}

	.action-btn.primary {
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.35);
		width: 100%;
	}

	.action-btn.primary:hover:not(:disabled) {
		background: rgba(119, 119, 194, 0.25);
	}

	.action-btn:disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
