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
		align-items: center;
		justify-content: center;
		padding: var(--space-6) var(--space-4);
		gap: var(--space-8);
	}

	.auth-hero {
		text-align: center;
	}

	.logo {
		display: flex;
		flex-direction: column;
		line-height: 0.9;
		letter-spacing: -0.02em;
	}

	.logo-the {
		font-size: var(--text-xl);
		color: var(--color-text-secondary);
		font-weight: 300;
		text-transform: uppercase;
		letter-spacing: 0.3em;
	}

	.logo-pent {
		font-size: 3.5rem;
		font-weight: 800;
		color: var(--color-accent);
	}

	.logo-house {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: 0.15em;
	}

	.tagline {
		margin-top: var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.auth-card {
		width: 100%;
		max-width: 380px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
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
		background: var(--color-surface-raised);
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
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: var(--color-accent);
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
		background: var(--color-accent);
		color: #000;
		border: none;
		border-radius: var(--radius-sm);
		padding: var(--space-3) var(--space-4);
		font-weight: 600;
		font-size: var(--text-base);
		transition: opacity 0.15s;
	}

	.submit-btn:disabled {
		opacity: 0.5;
	}

	.submit-btn:not(:disabled):hover {
		opacity: 0.9;
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
