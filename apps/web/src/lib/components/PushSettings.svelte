<script lang="ts">
	import {
		getPushState,
		subscribeToPush,
		unsubscribeFromPush,
		getCurrentSubscription,
	} from '$lib/push/subscribe';
	import { pushService } from '$services/push';
	import Icon from './Icon.svelte';

	let permission = $state('unsupported');
	let toggling = $state(false);
	let error = $state('');
	let prefs = $state<{
		enabled: boolean;
		scopeDefault: string;
		payloadPrivacy: string;
		quietHoursEnabled: boolean;
	} | null>(null);
	let saving = $state(false);
	let prefsError = $state('');

	$effect(() => {
		(async () => {
			const state = getPushState();
			if (state === 'granted') {
				const sub = await getCurrentSubscription();
				permission = sub ? 'granted' : 'default';
			} else {
				permission = state;
			}
			if (permission === 'granted') {
				try {
					prefs = await pushService.getPreferences();
				} catch {
					// Non-critical
				}
			}
		})();
	});

	async function handleToggle() {
		toggling = true;
		error = '';
		if (permission === 'granted') {
			const result = await unsubscribeFromPush();
			if (!result.ok) {
				error = result.reason === 'network' ? 'Server error — try again' : 'Failed to disable';
			}
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
		if (permission === 'granted' && !prefs) {
			try {
				prefs = await pushService.getPreferences();
			} catch {
				// Non-critical
			}
		}
		toggling = false;
	}

	async function savePrefs() {
		if (!prefs) return;
		saving = true;
		prefsError = '';
		try {
			const updated = await pushService.updatePreferences({
				enabled: prefs.enabled,
				scopeDefault: prefs.scopeDefault as any,
				payloadPrivacy: prefs.payloadPrivacy as any,
				quietHoursEnabled: prefs.quietHoursEnabled
			});
			prefs = {
				enabled: updated.enabled,
				scopeDefault: updated.scopeDefault,
				payloadPrivacy: updated.payloadPrivacy,
				quietHoursEnabled: updated.quietHoursEnabled
			};
		} catch (err) {
			prefsError = err instanceof Error ? err.message : 'Failed to save';
		} finally {
			saving = false;
		}
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

	{#if isOn && prefs}
		<div class="prefs">
			<div class="pref-row">
				<label for="scope">Notify me about</label>
				<select id="scope" bind:value={prefs.scopeDefault} onchange={savePrefs} disabled={saving}>
					<option value="all">All messages</option>
					<option value="dm_and_mention">DMs & mentions</option>
					<option value="dm_only">DMs only</option>
					<option value="off">Nothing</option>
				</select>
			</div>
			<div class="pref-row">
				<label for="privacy">Preview privacy</label>
				<select id="privacy" bind:value={prefs.payloadPrivacy} onchange={savePrefs} disabled={saving}>
					<option value="full">Show preview</option>
					<option value="metadata">Sender only</option>
					<option value="private">Hide content</option>
				</select>
			</div>
			{#if prefsError}
				<p class="error">{prefsError}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.setting-card {
		background: var(--p-surface);
		border: 1px solid var(--p-line);
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
		background: var(--p-surface-2);
		color: var(--p-accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.text { min-width: 0; }

	.label {
		font-size: var(--text-base);
		font-weight: var(--weight-medium);
		color: var(--p-text);
	}

	.hint {
		font-size: var(--text-sm);
		color: var(--p-text-2);
	}

	.badge {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		color: var(--p-muted);
		background: var(--p-surface-2);
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
		background: var(--p-line);
		border: none;
		padding: 2px;
		cursor: pointer;
		position: relative;
		transition: background 0.2s ease;
	}
	.toggle.on {
		background: var(--p-accent);
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
		color: var(--p-error);
		margin-top: var(--space-xs);
	}

	.prefs {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--p-line);
		margin-top: var(--space-sm);
	}

	.pref-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.pref-row label {
		font-size: var(--text-sm);
		color: var(--p-text-2);
	}

	.pref-row select {
		background: var(--p-bg);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-md);
		color: var(--p-text);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-sm);
		font-family: inherit;
		cursor: pointer;
	}

	.pref-row select:focus {
		outline: none;
		border-color: var(--p-accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle, .knob { transition: none; }
	}
</style>
