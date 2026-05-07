<script lang="ts">
	import { onMount } from 'svelte';
	import { getPushState, subscribeToPush, unsubscribeFromPush } from '$lib/push/subscribe';
	import Icon from './Icon.svelte';

	let permission = $state('unsupported');
	let visible = $state(false);
	let loading = $state(false);
	let error = $state('');

	onMount(() => {
		permission = getPushState();
		// Show banner if permission hasn't been asked yet
		visible = permission === 'default';
	});

	async function handleAllow() {
		loading = true;
		error = '';
		try {
			await subscribeToPush();
			permission = 'granted';
			visible = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to enable notifications';
			if (Notification.permission === 'denied') {
				permission = 'denied';
			}
		} finally {
			loading = false;
		}
	}

	function handleDismiss() {
		visible = false;
		// Don't ask again this session; localStorage flag would be too permanent.
		// Instead we just dismiss — next app refresh or session it will reappear.
	}

	function handleOpenSettings() {
		visible = false;
		// Browsers require user-initiated gesture to open settings; this is best-effort
	}

	export function refreshState() {
		permission = getPushState();
		visible = permission === 'default';
	}
</script>

{#if visible}
	<div class="banner" role="alert" aria-live="polite">
		<div class="banner-content">
			<div class="icon-wrap">
				<Icon name="bell" size={20} />
			</div>
			<div class="text">
				<p class="title">Stay in the loop</p>
				<p class="desc">Get notified when someone messages you — even when the app is closed.</p>
			</div>
		</div>
		<div class="actions">
			{#if error}
				<p class="error">{error}</p>
			{/if}
			<button class="btn-dismiss" onclick={handleDismiss} disabled={loading} aria-label="Dismiss">
				Not now
			</button>
			{#if permission === 'default'}
				<button class="btn-allow" onclick={handleAllow} disabled={loading}>
					{loading ? 'Enabling...' : 'Enable'}
				</button>
			{:else if permission === 'denied'}
				<button class="btn-allow" onclick={handleOpenSettings}>
					Open settings
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 300;
		background: rgba(26, 26, 40, 0.92);
		backdrop-filter: blur(16px) saturate(1.5);
		border-bottom: 1px solid var(--color-border);
		padding: var(--space-md) var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		animation: slideDown 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideDown {
		from { transform: translateY(-100%); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	.banner-content {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.icon-wrap {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--color-accent);
		color: #12121C;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.text { flex: 1; min-width: 0; }

	.title {
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		color: var(--color-text);
		margin-bottom: 2px;
	}

	.desc {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
		align-items: center;
	}

	.error {
		font-size: var(--text-sm);
		color: var(--color-error);
		margin-right: auto;
	}

	.btn-dismiss {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-dismiss:hover { background: var(--color-surface-elevated); }
	.btn-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-allow {
		background: var(--color-accent);
		border: none;
		color: #12121C;
		font-size: var(--text-sm);
		font-weight: var(--weight-bold);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-allow:hover { opacity: 0.85; }
	.btn-allow:disabled { opacity: 0.5; cursor: not-allowed; }

	@media (prefers-reduced-motion: reduce) {
		.banner { animation: none; }
	}
</style>
