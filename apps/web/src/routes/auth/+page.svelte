<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$services/api';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';

	type AuthMode = 'login' | 'register';

	let mode = $state<AuthMode>('login');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let inviteCode = $state('');
	let acceptedAlphaNotice = $state(false);
	let error = $state('');
	let loading = $state(false);

	// Alpha notice version — matches testNoticeVersionMin/Max in contracts (string schema)
	const TEST_NOTICE_VERSION = '1';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (mode === 'register' && password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		loading = true;
		try {
			let session;
			if (mode === 'login') {
				session = await auth.login({ username, password });
			} else {
				if (!acceptedAlphaNotice) {
					error = 'You must acknowledge the alpha notice to register.';
					loading = false;
					return;
				}
				session = await auth.register({
					username,
					password,
					inviteCode,
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
				onclick={() => { mode = 'login'; error = ''; }}
			>
				Sign in
			</button>
			<button
				class="tab"
				class:active={mode === 'register'}
				onclick={() => { mode = 'register'; error = ''; }}
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
					<label for="invite-code">Invite code</label>
					<input
						id="invite-code"
						type="text"
						bind:value={inviteCode}
						autocapitalize="none"
						autocomplete="off"
						disabled={loading}
					/>
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

			<button type="submit" class="submit-btn" disabled={loading}>
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
		font-size: 1.5rem;
		font-weight: 400;
		color: var(--color-accent);
		letter-spacing: 0.02em;
		margin-bottom: 0.1em;
	}

	.logo-pent,
	.logo-house {
		font-size: clamp(3.5rem, 14vw, 5.5rem);
		font-weight: 900;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
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
</style>
