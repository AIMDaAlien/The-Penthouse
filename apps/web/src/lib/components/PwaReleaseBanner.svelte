<script lang="ts">
	import { browser, dev } from '$app/environment';
	import Icon from './Icon.svelte';

	const INSTALL_DISMISSED_KEY = 'penthouse:pwa-install-dismissed';

	let installPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showInstallPrompt = $state(false);
	let updateAvailable = $state(false);
	let updateSW = $state<((reloadPage?: boolean) => Promise<void>) | null>(null);
	let updateError = $state('');

	$effect(() => {
		if (!browser) return;

		const installDismissed = sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';

		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			installPrompt = event as BeforeInstallPromptEvent;
			showInstallPrompt = !installDismissed;
		};

		const handleAppInstalled = () => {
			installPrompt = null;
			showInstallPrompt = false;
			sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		if (!dev && 'serviceWorker' in navigator) {
			void import('virtual:pwa-register')
				.then(({ registerSW }) => {
					updateSW = registerSW({
						immediate: true,
						onNeedRefresh() {
							updateError = '';
							updateAvailable = true;
						},
						onRegisterError(error: unknown) {
							console.error('Service worker registration failed', error);
						}
					});
				})
				.catch((error) => {
					console.error('PWA registration failed', error);
				});
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	});

	async function installApp() {
		if (!installPrompt) return;
		const prompt = installPrompt;
		installPrompt = null;
		showInstallPrompt = false;
		await prompt.prompt();
		const choice = await prompt.userChoice;
		if (choice.outcome === 'dismissed') {
			sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
		}
	}

	function dismissInstall() {
		showInstallPrompt = false;
		sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
	}

	async function applyUpdate() {
		if (!updateSW) return;
		updateError = '';
		try {
			await updateSW(true);
		} catch {
			updateError = 'Reload failed. Refresh the page manually.';
		}
	}

	function dismissUpdate() {
		updateAvailable = false;
	}
</script>

{#if updateAvailable}
	<div class="pwa-banner update" role="status" aria-live="polite">
		<div class="copy">
			<Icon name="loader" size={18} />
			<span>Update available</span>
			{#if updateError}<small>{updateError}</small>{/if}
		</div>
		<div class="actions">
			<button type="button" class="ghost" onclick={dismissUpdate} aria-label="Dismiss update">
				<Icon name="close" size={16} />
			</button>
			<button type="button" class="primary" onclick={applyUpdate}>Reload</button>
		</div>
	</div>
{:else if showInstallPrompt}
	<div class="pwa-banner" role="status" aria-live="polite">
		<div class="copy">
			<Icon name="home" size={18} />
			<span>Install The Penthouse</span>
		</div>
		<div class="actions">
			<button type="button" class="ghost" onclick={dismissInstall} aria-label="Dismiss install prompt">
				<Icon name="close" size={16} />
			</button>
			<button type="button" class="primary" onclick={installApp}>Install</button>
		</div>
	</div>
{/if}

<style>
	.pwa-banner {
		position: fixed;
		left: max(16px, env(safe-area-inset-left));
		right: max(16px, env(safe-area-inset-right));
		bottom: calc(var(--nav-height, 64px) + max(14px, env(safe-area-inset-bottom)));
		z-index: 320;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		max-width: 520px;
		margin: 0 auto;
		padding: 10px 12px;
		background: color-mix(in srgb, var(--p-surface) 92%, black);
		border: 1px solid var(--p-line-2);
		border-radius: var(--radius-md);
		box-shadow: 0 16px 42px oklch(0 0 0 / 0.38);
		backdrop-filter: blur(16px);
	}

	.copy {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		color: var(--p-text);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
	}

	.copy span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.copy small {
		color: var(--p-error);
		font-size: var(--text-xs);
		font-weight: var(--weight-regular);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	button {
		min-height: 36px;
		border-radius: var(--radius-pill);
	}

	.ghost {
		display: inline-grid;
		place-items: center;
		width: 36px;
		padding: 0;
		background: transparent;
		color: var(--p-text-2);
		border-color: transparent;
	}

	.primary {
		padding: 8px 16px;
		background: var(--p-accent);
		border-color: var(--p-accent);
		color: var(--p-bg);
	}

	@media (min-width: 780px) {
		.pwa-banner {
			left: auto;
			right: 24px;
			bottom: 24px;
			margin: 0;
		}
	}

	@media (max-width: 420px) {
		.pwa-banner {
			align-items: stretch;
		}

		.primary {
			padding-inline: 12px;
		}
	}
</style>
