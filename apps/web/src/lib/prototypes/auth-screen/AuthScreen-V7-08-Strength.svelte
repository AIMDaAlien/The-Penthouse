<!--
  V7-08 Strength — five baseline effects + password field gains a periwinkle glow ring
  that grows with password length.
-->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import Wordmark from './_shared/Wordmark.svelte';
	import AuthInput from './_shared/AuthInput.svelte';
	import KeyButton from './_shared/KeyButton.svelte';
	import { createAuthForm } from './_shared/authForm.svelte';
	import { typeReveal, stagger, tabSwitchIn, tabSwitchOut } from './_shared/motion';

	const form = createAuthForm();
	const ratio = $derived(Math.min(1, form.password.length / 16));
</script>

<div class="root">
	<div class="aurora" aria-hidden="true">
		<div class="aura a-a"></div>
		<div class="aura a-b"></div>
	</div>

	<article class="article">
		<header class="art-head" use:typeReveal={{ delay: 0 }}>
			<Wordmark size="xl" align="start" />
			<p class="issue-line"><em>The hush, growing brighter.</em></p>
		</header>
		<div class="art-body">
			<h1 class="headline" use:typeReveal={{ delay: stagger(1) }}>The longer<br/><em>the password,</em><br/>the brighter the lamp.</h1>
			<p class="lead" use:typeReveal={{ delay: stagger(2) }}>
				<span class="dropcap" aria-hidden="true">T</span><span class="dropcap-h">T</span>he room behind the password keeps a quiet count, never spoken aloud. It tells no one but itself, and only because asked.
			</p>
		</div>
	</article>

	<aside class="glass-col" use:typeReveal={{ delay: stagger(2) }}>
		<div class="glass">
			<header class="g-head"><span class="g-kicker"><em>Sign-in</em></span><h2 class="g-title">A glowing word.</h2></header>
			<div class="tabs">
				<button class="tab" class:active={form.mode === 'login'} onclick={() => form.setMode('login')} type="button">Returning</button>
				<button class="tab" class:active={form.mode === 'register'} onclick={() => form.setMode('register')} type="button">First arrival</button>
			</div>
			{#key form.mode}
				<form class="form" onsubmit={form.submit} in:fly={tabSwitchIn} out:fly={tabSwitchOut}>
					<AuthInput label="Username" bind:value={form.username} autocomplete="username" autocapitalize="none" disabled={form.loading} />

					<div class="strength-wrap" style="--ratio: {ratio}">
						<span class="strength-ring" aria-hidden="true"></span>
						<AuthInput label="Password" type="password" bind:value={form.password} autocomplete={form.mode === 'login' ? 'current-password' : 'new-password'} disabled={form.loading} />
					</div>

					{#if form.mode === 'register'}
						<AuthInput label="Confirm password" type="password" bind:value={form.confirmPassword} autocomplete="new-password" disabled={form.loading} />
						<AuthInput label="Display name" bind:value={form.displayName} autocomplete="name" disabled={form.loading} optional />
						<AuthInput label="Invite code" bind:value={form.inviteCode} autocapitalize="characters" spellcheck={false} disabled={form.loading} upper />
						<label class="check"><input type="checkbox" bind:checked={form.acceptedNotice} disabled={form.loading} /><span><em>An alpha.</em> Data may be wiped without warning.</span></label>
					{/if}
					{#if form.error}<p class="error">{form.error}</p>{/if}
					<KeyButton loading={form.loading} disabled={form.loading || !form.canSubmit} onpress={() => form.submit()} />
				</form>
			{/key}
		</div>
	</aside>
</div>

<style>
	.root { position: relative; min-height: 100dvh; display: grid; grid-template-columns: 1fr 460px; gap: 48px; color: var(--p-text); font-family: var(--font-body); background: oklch(0.11 0.018 285); padding: 56px; overflow: hidden; isolation: isolate; }
	.aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
	.aura { position: absolute; border-radius: 50%; filter: blur(100px); }
	.a-a { width: 620px; height: 620px; background: oklch(0.69 0.140 285 / 0.55); top: -120px; right: 22%; }
	.a-b { width: 520px; height: 520px; background: oklch(0.50 0.110 285 / 0.45); bottom: -160px; left: -80px; }
	.article { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 36px; max-width: 640px; }
	.art-head { display: flex; flex-direction: column; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid oklch(0.78 0.090 285 / 0.14); }
	.issue-line { font-family: var(--font-display); font-size: 0.95rem; color: var(--p-muted); }
	.issue-line em { font-style: italic; color: var(--p-accent); }
	.art-body { display: flex; flex-direction: column; gap: 26px; }
	.headline { font-family: var(--font-display); font-size: clamp(2.6rem, 4.8vw, 3.6rem); font-weight: 400; line-height: 1.05; color: var(--p-text); }
	.headline em { font-style: italic; color: var(--p-accent); }
	.lead { font-family: var(--font-display); font-size: 1.15rem; line-height: 1.65; color: var(--p-text-2); max-width: 52ch; position: relative; }
	.dropcap { float: left; font-family: var(--font-display); font-style: italic; font-weight: 700; font-size: 5.4rem; line-height: 0.82; color: var(--p-accent); margin: 0.04em 0.14em 0 0; padding-top: 0.06em; animation: dcpulse 2400ms ease-in-out infinite; }
	.dropcap-h { font-family: var(--font-display); visibility: hidden; }
	@keyframes dcpulse { 0%,100% { opacity: 1; transform: scale(1); text-shadow: 0 0 14px oklch(0.69 0.140 285 / 0.22); } 50% { opacity: 0.86; transform: scale(0.985); text-shadow: 0 0 32px oklch(0.69 0.140 285 / 0.50); } }
	.glass-col { position: relative; z-index: 1; align-self: center; }
	.glass { padding: 32px 32px 30px; background: oklch(0.21 0.025 285 / 0.42); backdrop-filter: blur(28px) saturate(150%); -webkit-backdrop-filter: blur(28px) saturate(150%); border: 1px solid oklch(1 0 0 / 0.10); border-radius: 24px; box-shadow: 0 30px 70px oklch(0 0 0 / 0.50), inset 0 1px 0 oklch(1 0 0 / 0.10); display: flex; flex-direction: column; gap: 20px; }
	.g-head { display: flex; flex-direction: column; gap: 6px; padding-bottom: 4px; }
	.g-kicker { font-family: var(--font-display); font-size: 0.95rem; color: var(--p-accent); }
	.g-kicker em { font-style: italic; }
	.g-title { font-family: var(--font-display); font-size: 1.75rem; font-weight: 400; line-height: 1.15; color: oklch(0.93 0.012 280 / 0.95); }
	.tabs { display: flex; gap: 4px; padding: 4px; background: oklch(0 0 0 / 0.24); border-radius: 999px; }
	.tab { flex: 1; padding: 9px 16px; background: transparent; border: none; border-radius: 999px; font-family: var(--font-body); font-size: 0.86rem; font-weight: 500; color: oklch(0.93 0.012 280 / 0.72); cursor: pointer; transition: color 200ms cubic-bezier(0.22,1,0.36,1), background 200ms cubic-bezier(0.22,1,0.36,1); }
	.tab:hover { color: var(--p-text); } .tab.active { background: var(--p-accent); color: var(--p-bg); }
	.form { display: flex; flex-direction: column; gap: 18px; }

	.strength-wrap { position: relative; }
	.strength-ring {
		position: absolute;
		inset: -10px;
		border-radius: 22px;
		pointer-events: none;
		background: radial-gradient(ellipse at center, oklch(0.69 0.140 285 / calc(var(--ratio) * 0.55)) 0%, oklch(0.69 0.140 285 / calc(var(--ratio) * 0.22)) 40%, transparent 75%);
		filter: blur(calc(10px + var(--ratio) * 22px));
		opacity: calc(0.15 + var(--ratio) * 0.85);
		transform: scale(calc(1 + var(--ratio) * 0.05));
		transition: opacity 420ms cubic-bezier(0.22,1,0.36,1), filter 420ms cubic-bezier(0.22,1,0.36,1), transform 420ms cubic-bezier(0.22,1,0.36,1);
		z-index: 0;
	}

	.check { display: flex; align-items: flex-start; gap: 10px; padding: 4px 0; font-family: var(--font-display); font-size: 0.92rem; color: oklch(0.93 0.012 280 / 0.82); cursor: pointer; line-height: 1.45; }
	.check em { color: var(--p-accent); font-style: italic; }
	.check input { margin-top: 3px; accent-color: var(--p-accent); width: 16px; height: 16px; }
	.error { font-family: var(--font-display); font-style: italic; font-size: 0.92rem; color: var(--p-error); padding: 10px 14px; background: color-mix(in oklch, var(--p-error) 14%, transparent); border-radius: 10px; text-align: center; }
	@media (max-width: 1000px) { .root { grid-template-columns: 1fr; padding: 32px 24px; } .glass-col { align-self: stretch; } }
	@media (prefers-reduced-motion: reduce) { .dropcap { animation: none !important; } .strength-ring { transition: none !important; } .tab { transition: none !important; } }
</style>
