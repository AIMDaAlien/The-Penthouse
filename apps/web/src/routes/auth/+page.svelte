<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import { auth } from '$services/auth';
	import { sessionStore } from '$stores/session.svelte';

	type AuthMode = 'login' | 'register';
	type AltchaState = 'unverified' | 'verifying' | 'verified' | 'error';
	type AltchaWidget = HTMLElement & { reset?: () => void };

	let mode = $state<AuthMode>('login');
	let username = $state('');
	let displayName = $state('');
	let inviteCode = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let captchaToken = $state('');
	let acceptedAlphaNotice = $state(false);
	let error = $state('');
	let loading = $state(false);
	let altchaRef = $state<AltchaWidget | null>(null);
	let altchaReady = $state(false);
	let altchaFailed = $state(false);
	let altchaStatus = $state<AltchaState>('unverified');

	const PASSWORD_MIN = 10;
	const PASSWORD_MAX = 128;
	const TEST_NOTICE_VERSION = 'alpha-v1';
	const skipCaptcha = dev || env.PUBLIC_SKIP_CAPTCHA === 'true';
	const ALTCHA_URL = env.PUBLIC_ALTCHA_API_URL || (env.PUBLIC_API_URL ? `${env.PUBLIC_API_URL}/api/v1/auth/challenge` : '');

	const strength = $derived({
		minMet: password.length >= PASSWORD_MIN,
		maxOk: password.length <= PASSWORD_MAX,
		noSpace: password === password.trim() || password.length === 0
	});
	const passwordsMatch = $derived(password === confirmPassword && confirmPassword.length > 0);

	const canSubmit = $derived(
		mode === 'login' || (
			strength.minMet && strength.maxOk && strength.noSpace &&
			inviteCode.trim().length > 0 &&
			password === confirmPassword &&
			acceptedAlphaNotice &&
			(skipCaptcha || !!captchaToken)
		)
	);

	function resetForm() {
		error = '';
		displayName = '';
		inviteCode = '';
		password = '';
		confirmPassword = '';
		captchaToken = '';
		acceptedAlphaNotice = false;
		altchaReady = false;
		altchaFailed = false;
		altchaStatus = 'unverified';
		altchaRef?.reset?.();
	}

	$effect(() => {
		let alive = true;
		if (!window.isSecureContext) {
			altchaFailed = true;
			return;
		}
		import('altcha')
			.then(() => {
				if (!alive) return;
				if (!customElements.get('altcha-widget')) {
					altchaFailed = true;
					return;
				}
				altchaReady = true;
			})
			.catch(() => { altchaFailed = true; });
		return () => { alive = false; };
	});

	$effect(() => {
		if (!altchaRef || !altchaReady) return;
		const onState = (e: Event) => {
			const d = (e as CustomEvent).detail as { state?: AltchaState; payload?: string; error?: string };
			altchaStatus = d.state ?? 'unverified';
			captchaToken = d.state === 'verified' && d.payload ? d.payload : '';
			if (d.state === 'error') altchaFailed = true;
		};
		altchaRef.addEventListener('statechange', onState);
		return () => altchaRef?.removeEventListener('statechange', onState);
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
				if (!strength.minMet || !strength.maxOk || !strength.noSpace) {
					error = `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters without leading/trailing spaces.`;
					loading = false;
					return;
				}
				if (password !== confirmPassword) { error = 'Passwords do not match.'; loading = false; return; }
				if (!acceptedAlphaNotice) { error = 'Acknowledge the alpha notice to register.'; loading = false; return; }
				if (!skipCaptcha && altchaFailed) { error = 'CAPTCHA failed. Reload and try again.'; loading = false; return; }
				if (!skipCaptcha && !captchaToken) { error = 'Complete the CAPTCHA challenge.'; loading = false; return; }
				session = await auth.register({
					username,
					...(displayName.trim() ? { displayName: displayName.trim() } : {}),
					password,
					inviteCode: inviteCode.trim().toUpperCase(),
					captchaToken: skipCaptcha ? 'dev' : captchaToken,
					acceptTestNotice: true,
					testNoticeVersion: TEST_NOTICE_VERSION
				});
			}
			sessionStore.set(session);
			goto('/', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
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
			<button class="tab" class:active={mode === 'login'} onclick={() => { mode = 'login'; resetForm(); }}>Sign in</button>
			<button class="tab" class:active={mode === 'register'} onclick={() => { mode = 'register'; resetForm(); }}>Create account</button>
		</div>

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="username">Username</label>
				<input id="username" type="text" bind:value={username} autocomplete="username" autocapitalize="none" required disabled={loading} />
			</div>

			<div class="field">
				<label for="password">Password</label>
				<input id="password" type="password" bind:value={password} autocomplete={mode === 'login' ? 'current-password' : 'new-password'} required disabled={loading} />
			</div>

			{#if mode === 'register'}
				<div class="field">
					<label for="display-name">Display name (optional)</label>
					<input id="display-name" type="text" bind:value={displayName} placeholder="e.g. Alice Smith" autocomplete="name" disabled={loading} maxlength="40" />
					<span class="hint">Used for your profile. Can be changed later.</span>
				</div>

				<div class="field">
					<label for="invite-code">Invite code</label>
					<input id="invite-code" class="invite-input" type="text" bind:value={inviteCode} autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" required disabled={loading} />
					<span class="hint">Use the private alpha code you were issued.</span>
				</div>

				<div class="field">
					<label for="confirm-password">Confirm password</label>
					<input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" required disabled={loading} />
				</div>

				<div class="field">
					<div class="section-label">Password requirements</div>
					<div class="requirements">
						<div class="req" class:met={strength.minMet}><span>●</span> {PASSWORD_MIN}–{PASSWORD_MAX} characters ({password.length})</div>
						<div class="req" class:met={strength.noSpace}><span>●</span> No leading/trailing spaces</div>
						<div class="req" class:met={passwordsMatch}><span>●</span> Passwords match</div>
					</div>
				</div>

				{#if !skipCaptcha}
					<div class="field">
						<div class="section-label">Verify you're human</div>
						<div class="altcha-box" class:failed={altchaFailed}>
							{#if altchaFailed}
								<p class="altcha-err">CAPTCHA failed to load. Reload the page.</p>
							{:else if altchaReady}
								<altcha-widget bind:this={altchaRef} challengeurl={ALTCHA_URL} hidelogo auto="off"></altcha-widget>
							{:else}
								<p class="altcha-loading">Loading verification challenge...</p>
							{/if}
						</div>
						<span class="hint">
							{#if altchaFailed}CAPTCHA failed. Reload and try again.{:else if altchaStatus === 'verifying'}Verifying...{:else if !captchaToken}Solve the CAPTCHA puzzle{:else}✓ CAPTCHA verified{/if}
						</span>
					</div>
				{/if}

				<label class="notice-check">
					<input type="checkbox" bind:checked={acceptedAlphaNotice} disabled={loading} />
					<span>I understand this is an <strong>alpha</strong> — data may be wiped without warning.</span>
				</label>
			{/if}

			{#if error}<p class="error-msg" role="alert">{error}</p>{/if}

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
		padding: var(--space-xl) var(--space-lg);
		gap: var(--space-lg);
		max-width: 480px;
		margin: 0 auto;
	}

	.logo {
		display: flex;
		flex-direction: column;
		font-family: var(--font-display);
		line-height: 0.88;
	}

	.logo-the {
		font-size: 1.25rem;
		font-weight: 400;
		color: var(--p-accent);
		letter-spacing: 0.08em;
		margin-bottom: 0.2em;
	}

	.logo-pent, .logo-house {
		font-size: clamp(3.5rem, 14vw, 5.5rem);
		font-weight: 600;
		color: var(--p-text);
		letter-spacing: -0.015em;
		line-height: 0.95;
	}

	.tagline {
		margin-top: var(--space-md);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		font-family: var(--font-sans);
	}

	.auth-card {
		width: 100%;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.mode-tabs {
		display: flex;
		border-bottom: 1px solid var(--p-line);
		padding: var(--space-sm) var(--space-md);
		gap: var(--space-sm);
	}

	.tab {
		flex: 1;
		padding: var(--space-md) var(--space-md);
		background: none;
		border: none;
		border-radius: var(--radius-pill);
		color: var(--p-text-2);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		transition: color 0.15s, background 0.15s;
		cursor: pointer;
		min-height: 44px;
	}

	.tab.active {
		color: var(--p-bg);
		background: var(--p-accent);
	}

	form {
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	label, .section-label {
		font-size: var(--text-sm);
		color: var(--p-text-2);
		font-weight: var(--weight-medium);
	}

	.hint {
		font-size: var(--text-xs);
		color: var(--p-muted);
	}

	.requirements {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: rgba(119, 119, 194, 0.05);
		border-radius: var(--radius-md);
		border: 1px solid rgba(119, 119, 194, 0.1);
	}

	.req {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-xs);
		color: var(--p-text-2);
		transition: color 0.15s;
	}

	.req.met { color: var(--p-success); }

	.altcha-box {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		padding: var(--space-md);
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-md);
		border: 1px solid var(--p-line);
		min-height: 100px;
	}

	.altcha-box.failed {
		border-color: color-mix(in srgb, var(--p-error) 35%, var(--p-line));
		background: color-mix(in srgb, var(--p-error) 6%, var(--p-bg));
	}

	.altcha-err, .altcha-loading {
		font-size: var(--text-xs);
		color: var(--p-text-2);
		text-align: center;
	}

	.altcha-err { color: var(--p-error); }

	input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--p-line);
		border-radius: 0;
		color: var(--p-text);
		padding: var(--space-md) 0;
		outline: none;
		transition: border-color 0.2s;
		width: 100%;
		font-family: inherit;
		font-size: var(--text-base);
		min-height: 44px;
	}

	input:focus { border-color: var(--p-accent); }
	input:disabled { opacity: 0.5; }

	.invite-input {
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.error-msg {
		font-size: var(--text-sm);
		color: var(--p-error);
		padding: var(--space-sm) var(--space-md);
		background: color-mix(in srgb, var(--p-error) 10%, var(--p-bg));
		border-radius: var(--radius-sm);
	}

	.submit-btn {
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-md);
		font-weight: var(--weight-bold);
		font-size: var(--text-base);
		width: 100%;
		transition: opacity 0.15s;
		cursor: pointer;
	}

	.submit-btn:not(:disabled):hover { opacity: 0.88; }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.notice-check {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		cursor: pointer;
		font-size: var(--text-sm);
		color: var(--p-text-2);
		line-height: 1.4;
	}

	.notice-check input {
		margin-top: 2px;
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		accent-color: var(--p-accent);
	}

	.notice-check strong { color: var(--p-accent); }

	:global(altcha-widget) {
		--altcha-border-radius: var(--radius-md);
		--altcha-border-color: var(--p-line);
		width: 100%;
	}
</style>
