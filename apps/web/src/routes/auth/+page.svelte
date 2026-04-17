<script lang="ts">
	import { PUBLIC_ALTCHA_API_URL } from '$env/static/public';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';

	type AuthMode = 'login' | 'register';
	type AltchaStateChangeDetail = {
		state?: 'unverified' | 'verifying' | 'verified' | 'error';
		payload?: string;
		error?: string;
	};
	type AltchaRuntimeState = 'loading' | 'ready' | 'failed';
	type AltchaWidgetElement = HTMLElement & {
		reset?: () => void;
	};

	let mode = $state<AuthMode>('login');
	let username = $state('');
	let displayName = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let captchaToken = $state('');
	let acceptedAlphaNotice = $state(false);
	let error = $state('');
	let loading = $state(false);
	let altchaElement: AltchaWidgetElement | null = $state(null);
	let altchaRuntimeState = $state<AltchaRuntimeState>('loading');
	let altchaRuntimeMessage = $state('Loading verification challenge...');
	let altchaWidgetLoaded = $state(false);
	let altchaState = $state<AltchaStateChangeDetail['state']>('unverified');

	// Password validation helpers
	const PASSWORD_MIN = 10;
	const PASSWORD_MAX = 128;
	const ALTCHA_LOAD_TIMEOUT_MS = 4_000;

	const getPasswordStrength = () => ({
		minMet: password.length >= PASSWORD_MIN,
		maxOk: password.length <= PASSWORD_MAX,
		noLeadingTrail: password === password.trim() || password.length === 0
	});

	const getPasswordValid = () => {
		const s = getPasswordStrength();
		return s.minMet && s.maxOk && s.noLeadingTrail;
	};

	const canSubmit = $derived(
		mode === 'login' || (
			getPasswordValid() &&
			password === confirmPassword &&
			acceptedAlphaNotice &&
			!!captchaToken
		)
	);

	const TEST_NOTICE_VERSION = 'alpha-v1';

	function setAltchaFailure(message: string) {
		altchaRuntimeState = 'failed';
		altchaRuntimeMessage = message;
		altchaWidgetLoaded = false;
		altchaState = 'error';
		captchaToken = '';
	}

	function resetRegistrationState() {
		error = '';
		displayName = '';
		password = '';
		confirmPassword = '';
		captchaToken = '';
		acceptedAlphaNotice = false;
		altchaWidgetLoaded = false;
		altchaState = 'unverified';
		if (altchaRuntimeState !== 'failed') {
			altchaRuntimeMessage = 'Loading verification challenge...';
		}
		altchaElement?.reset?.();
	}

	onMount(() => {
		let disposed = false;

		const initializeAltcha = async () => {
			if (!window.isSecureContext) {
				setAltchaFailure(
					'Human verification requires a secure browser context. Open this app from localhost or HTTPS.'
				);
				return;
			}

			try {
				await import('altcha');
				if (disposed) return;

				if (!customElements.get('altcha-widget')) {
					throw new Error('ALTCHA widget did not register.');
				}

				altchaRuntimeState = 'ready';
				altchaRuntimeMessage = 'Loading verification challenge...';
			} catch {
				if (disposed) return;
				setAltchaFailure(
					'Human verification failed to load. Reload the page. If this persists on Android, update Chrome and Android System WebView.'
				);
			}
		};

		void initializeAltcha();

		return () => {
			disposed = true;
		};
	});

	$effect(() => {
		if (!altchaElement || altchaRuntimeState !== 'ready') return;

		const loadTimer = window.setTimeout(() => {
			if (!altchaWidgetLoaded) {
				setAltchaFailure(
					'Human verification did not initialize on this device. Reload the page. If needed, update Chrome and Android System WebView.'
				);
			}
		}, ALTCHA_LOAD_TIMEOUT_MS);

		const handleLoad = () => {
			altchaWidgetLoaded = true;
			altchaState = 'unverified';
			altchaRuntimeMessage = 'Solve the CAPTCHA puzzle above';
		};

		const handleStateChange = (event: Event) => {
			const detail = (event as CustomEvent<AltchaStateChangeDetail>).detail;
			altchaState = detail?.state ?? 'unverified';
			captchaToken =
				detail?.state === 'verified' && typeof detail.payload === 'string' ? detail.payload : '';

			if (detail?.state === 'verifying') {
				altchaRuntimeMessage = 'Verifying challenge...';
				return;
			}

			if (detail?.state === 'verified') {
				altchaRuntimeMessage = 'CAPTCHA verified';
				return;
			}

			if (detail?.state === 'error') {
				setAltchaFailure(
					typeof detail.error === 'string' && detail.error.trim().length > 0
						? detail.error
						: 'Human verification failed to initialize. Reload the page and try again.'
				);
				return;
			}

			altchaRuntimeMessage = 'Solve the CAPTCHA puzzle above';
		};

		altchaElement.addEventListener('load', handleLoad);
		altchaElement.addEventListener('statechange', handleStateChange);

		return () => {
			window.clearTimeout(loadTimer);
			altchaElement?.removeEventListener('load', handleLoad);
			altchaElement?.removeEventListener('statechange', handleStateChange);
		};
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		loading = true;
		try {
			let session;
			if (mode === 'login') {
				session = await auth.login({ username, password });
			} else {
				// Register validation
				if (!getPasswordValid()) {
					error = `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters without leading/trailing spaces.`;
					loading = false;
					return;
				}
				if (password !== confirmPassword) {
					error = 'Passwords do not match.';
					loading = false;
					return;
				}
				if (!acceptedAlphaNotice) {
					error = 'You must acknowledge the alpha notice to register.';
					loading = false;
					return;
				}
				if (altchaRuntimeState === 'failed') {
					error = altchaRuntimeMessage;
					loading = false;
					return;
				}
				if (!altchaWidgetLoaded) {
					error = 'Human verification is still loading. Wait a moment and try again.';
					loading = false;
					return;
				}
				if (!captchaToken) {
					error = 'Please complete the CAPTCHA challenge below.';
					loading = false;
					return;
				}

				session = await auth.register({
					username,
					...(displayName.trim() ? { displayName: displayName.trim() } : {}),
					password,
					inviteCode: 'PENTHOUSE-ALPHA',
					captchaToken,
					acceptTestNotice: true,
					testNoticeVersion: TEST_NOTICE_VERSION
				});
			}
			sessionStore.set(session);
			socketStore.connect(session.accessToken);
			goto('/');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-shell">
	<div class="auth-hero">
		<div class="logo">
			<span class="logo-the">The</span>
			<span class="logo-pent">PENT</span>
			<span class="logo-house">HOUSE</span>
		</div>
		<p class="tagline">As dynamic as your personality.</p>
	</div>

	<div class="auth-card">
		<div class="mode-tabs">
			<button
				class="tab"
				class:active={mode === 'login'}
				aria-label="Switch to sign in"
				onclick={() => { mode = 'login'; resetRegistrationState(); }}
			>
				Sign in
			</button>
			<button
				class="tab"
				class:active={mode === 'register'}
				aria-label="Switch to create account"
				onclick={() => { mode = 'register'; resetRegistrationState(); }}
			>
				Create account
			</button>
		</div>

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="username">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					autocomplete={mode === 'login' ? 'username' : 'username'}
					autocapitalize="none"
					required
					disabled={loading}
				/>
			</div>

			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					disabled={loading}
				/>
			</div>

			{#if mode === 'register'}
				<div class="field">
					<label for="display-name">Display name (optional)</label>
					<input
						id="display-name"
						type="text"
						bind:value={displayName}
						placeholder="e.g., Alice Smith"
						autocomplete="name"
						disabled={loading}
						maxlength="40"
					/>
					<span class="field-hint">Used for your profile. Can be changed later.</span>
				</div>

				<div class="field">
					<label for="confirm-password">Confirm password</label>
					<input
						id="confirm-password"
						type="password"
						bind:value={confirmPassword}
						autocomplete="new-password"
						required
						disabled={loading}
					/>
				</div>

				<div class="field">
					<div class="section-label">Password requirements</div>
					<div class="password-requirements">
						<div class="requirement" class:met={getPasswordStrength().minMet}>
							<span class="requirement-dot">●</span>
							{PASSWORD_MIN}–{PASSWORD_MAX} characters ({password.length})
						</div>
						<div class="requirement" class:met={getPasswordStrength().noLeadingTrail}>
							<span class="requirement-dot">●</span>
							No leading/trailing spaces
						</div>
					</div>
				</div>

				<div class="altcha-section">
					<div class="section-label">Verify you're human</div>
					<div class="altcha-container" class:failed={altchaRuntimeState === 'failed'}>
						{#if altchaRuntimeState === 'failed'}
							<p class="altcha-status altcha-status--error">{altchaRuntimeMessage}</p>
						{:else}
							{#if !altchaWidgetLoaded}
								<p class="altcha-status">{altchaRuntimeMessage}</p>
							{/if}
							{#if altchaRuntimeState === 'ready'}
								<altcha-widget
									bind:this={altchaElement}
									challengeurl={PUBLIC_ALTCHA_API_URL}
									hidelogo
									auto="off"
								></altcha-widget>
							{/if}
						{/if}
					</div>
					<span class="field-hint">
						{#if altchaRuntimeState === 'failed'}
							{altchaRuntimeMessage}
						{:else if !altchaWidgetLoaded}
							Loading verification challenge...
						{:else if altchaState === 'verifying'}
							Verifying challenge...
						{:else if !captchaToken}
							Solve the CAPTCHA puzzle above
						{:else}
							✓ CAPTCHA verified
						{/if}
					</span>
				</div>

				<label class="notice-check">
					<input
						type="checkbox"
						bind:checked={acceptedAlphaNotice}
						disabled={loading}
					/>
					<span>
						I understand this is an <strong>alpha</strong> — data may be wiped without warning.
					</span>
				</label>
			{/if}

			{#if error}
				<p class="error-msg">{error}</p>
			{/if}

			<button type="submit" class="submit-btn" disabled={loading || !canSubmit}>
				{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
			</button>
		</form>
	</div>
</div>

<style>
	.auth-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		padding: var(--space-8) var(--space-6);
		gap: var(--space-6);
		max-width: 480px;
		margin: 0 auto;
	}

	.auth-hero {
		text-align: left;
	}

	/* Logo — matches reference: serif display, "The" in accent, PENTHOUSE in white */
	.logo {
		display: flex;
		flex-direction: column;
		font-family: var(--font-display);
		line-height: 0.88;
	}

	.logo-the {
		font-size: 1.25rem;
		font-weight: 400;
		color: var(--color-accent);
		letter-spacing: 0.08em;
		margin-bottom: 0.2em;
	}

	.logo-pent,
	.logo-house {
		font-size: clamp(3.5rem, 14vw, 5.5rem);
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.015em;
		line-height: 0.95;
	}

	.tagline {
		margin-top: var(--space-4);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-family: var(--font-sans);
	}

	.auth-card {
		width: 100%;
		background: var(--color-surface-glass);
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.mode-tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
	}

	.tab {
		flex: 1;
		padding: var(--space-4);
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		transition: color 0.15s, background 0.15s;
	}

	.tab.active {
		color: var(--color-accent);
		background: rgba(119, 119, 194, 0.08);
		border-bottom: 2px solid var(--color-accent);
	}

	form {
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.section-label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.field-hint {
		display: block;
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin-top: var(--space-1);
	}

	.password-requirements {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: rgba(119, 119, 194, 0.05);
		border-radius: var(--radius-md);
		border: 1px solid rgba(119, 119, 194, 0.1);
	}

	.requirement {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		transition: color 0.15s;
	}

	.requirement.met {
		color: var(--color-success);
	}

	.requirement-dot {
		flex-shrink: 0;
	}

	.altcha-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.altcha-container {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		min-height: 100px;
	}

	input {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		outline: none;
		transition: border-color 0.2s;
		width: 100%;
	}

	input:focus {
		border-color: var(--color-border-solid);
	}

	input:disabled {
		opacity: 0.5;
	}

	.error-msg {
		font-size: var(--text-sm);
		color: var(--color-danger);
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border-radius: var(--radius-sm);
	}

	.submit-btn {
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.4);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		font-weight: var(--weight-bold);
		font-size: var(--text-base);
		width: 100%;
		transition: background 0.2s, opacity 0.15s;
	}

	.submit-btn:not(:disabled):hover {
		background: rgba(119, 119, 194, 0.25);
	}

	.submit-btn:disabled {
		opacity: 0.5;
	}

	.notice-check {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		cursor: pointer;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.notice-check input[type='checkbox'] {
		margin-top: 2px;
		flex-shrink: 0;
		accent-color: var(--color-accent);
		width: 16px;
		height: 16px;
	}

	.notice-check strong {
		color: var(--color-accent);
	}

	.altcha-container.failed {
		border-color: color-mix(in srgb, var(--color-danger) 35%, var(--color-border));
		background: color-mix(in srgb, var(--color-danger) 6%, rgba(0, 0, 0, 0.2));
	}

	.altcha-status {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		text-align: center;
	}

	.altcha-status--error {
		color: var(--color-danger);
	}

	:global(altcha-widget) {
		--altcha-border-radius: var(--radius-md);
		--altcha-border-color: var(--color-border);
		width: 100%;
	}
</style>
