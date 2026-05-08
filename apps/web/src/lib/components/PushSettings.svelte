<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getPushState,
		subscribeToPush,
		unsubscribeFromPush,
		getCurrentSubscription,
		hasSubscribedBefore,
		markUnsubscribed,
	} from '$lib/push/subscribe';
	import Icon from './Icon.svelte';

	let permission = $state('unsupported');
	let toggling = $state(false);
	let error = $state('');

	onMount(async () => {
		const state = getPushState();
		// Permission may be 'granted' even after unsubscribing.
		// Query the SW for the real subscription state.
		if (state === 'granted') {
			const sub = await getCurrentSubscription();
			permission = sub ? 'granted' : 'default';
		} else {
			permission = state;
		}
	});

	async function handleToggle() {
		toggling = true;
		error = '';
		if (permission === 'granted') {
			const result = await unsubscribeFromPush();
			if (!result.ok) {
				error = result.reason === 'network' ? 'Server error — try again' : 'Failed to disable';
			}
			// Re-query SW to confirm unsubscribed
			const sub = await getCurrentSubscription();
			permission = sub ? 'granted' : 'default';
		} else {
			const browserPermission = await Notification.requestPermission();
			if (browserPermission === 'granted') {
				const result = await subscribeToPush();
				if (!result.ok) {
					const reasonMap: Record<string, string> = {
						unsupported: 'Not supported on this device',
						'no-vapid-key': 'Server configuration missing',
						network: 'Server error — try again later',
						'sw-timeout': 'Service worker not ready',
						unknown: 'Something went wrong'
					};
					error = reasonMap[result.reason] ?? 'Failed to enable';
				}
			}
			const sub = await getCurrentSubscription();
			permission = sub ? 'granted' : browserPermission;
		}
		toggling = false;
	}

	const isOn = $derived(permission === 'granted');
	const canToggle = $derived(permission !== 'unsupported' && permission !== 'denied');
</script>

<div class="setting-card">
	<div class="row">
		<div class="info">
			<div class="icon-wrap">
				<Icon name="bell" size={18} />
			</div>
			<div class="text">
				<p class="label">Push notifications</p>
				<p class="hint">
					{#if permission === 'unsupported'}
						Not supported on this device
					{:else if permission === 'denied'}
						Blocked in browser settings
					{:else if isOn}
						Enabled — you'll get alerts even when closed
					{:else}
						Disabled — enable to stay updated
					{/if}
				</p>
			</div>
		</div>
		{#if permission === 'denied'}
			<span class="badge">Blocked</span>
		{:else}
			<button
				class="toggle"
				class:on={isOn}
				disabled={!canToggle || toggling}
				onclick={handleToggle}
				aria-pressed={isOn}
				aria-label={isOn ? 'Disable push notifications' : 'Enable push notifications'}
			>
				<span class="knob"></span>
			</button>
		{/if}
	</div>
	{#if error}
		<p class="error">{error}</p>
	{/if}
</div>

<style>
	.setting-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		min-width: 0;
	}

	.icon-wrap {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: var(--color-surface-elevated);
		color: var(--color-accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.text { min-width: 0; }

	.label {
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}

	.hint {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.badge {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--color-text-muted);
		background: var(--color-surface-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-pill);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.toggle {
		flex-shrink: 0;
		width: 48px;
		height: 28px;
		border-radius: 14px;
		background: var(--color-border);
		border: none;
		padding: 2px;
		cursor: pointer;
		position: relative;
		transition: background 0.2s ease;
	}
	.toggle.on {
		background: var(--color-accent);
	}
	.toggle:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.knob {
		display: block;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 4px rgba(0,0,0,0.25);
		transform: translateX(0);
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.toggle.on .knob {
		transform: translateX(20px);
	}

	.error {
		font-size: var(--text-sm);
		color: var(--color-error);
		margin-top: var(--space-xs);
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle, .knob { transition: none; }
	}
</style>
