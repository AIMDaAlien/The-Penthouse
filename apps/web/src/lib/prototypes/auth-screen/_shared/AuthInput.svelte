<!--
  AuthInput.svelte — composite input combining three signature focus effects:
    1. Floating label  : label sits inside the input by default, lifts to top-left on focus/fill
    2. Caret bloom     : a soft periwinkle halo blooms behind the input on focus, breathing
    3. Sweep underline : a 2px periwinkle line grows from the input's horizontal center on focus
  Used identically in all 10 V7 variants so the form chrome stays consistent.
-->
<script lang="ts">
	import { keystrokeRipples } from './motion';

	let {
		value = $bindable(''),
		label,
		type = 'text',
		autocomplete = '',
		autocapitalize = 'off',
		spellcheck = true,
		disabled = false,
		optional = false,
		upper = false,
		extra = '',
		ripple = false
	}: {
		value?: string;
		label: string;
		type?: 'text' | 'password';
		autocomplete?: string;
		autocapitalize?: string;
		spellcheck?: boolean;
		disabled?: boolean;
		optional?: boolean;
		upper?: boolean;
		extra?: string;
		ripple?: boolean;
	} = $props();

	const filled = $derived(value.length > 0);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (!ripple || !inputEl) return;
		const cleanup = keystrokeRipples(inputEl);
		return () => { cleanup?.destroy?.(); };
	});
</script>

<div class="ai" class:filled class:upper>
	<span class="bloom" aria-hidden="true"></span>
	{#if type === 'password'}
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<input
			bind:this={inputEl}
			type="password"
			bind:value
			autocomplete={autocomplete as any}
			{disabled}
			placeholder=" "
		/>
	{:else}
		<input
			bind:this={inputEl}
			type="text"
			bind:value
			autocomplete={autocomplete as any}
			autocapitalize={autocapitalize as any}
			{spellcheck}
			{disabled}
			placeholder=" "
		/>
	{/if}
	<span class="flabel">
		{label}{#if optional}&nbsp;<i>optional</i>{/if}
	</span>
	<span class="sweep" aria-hidden="true"></span>
	{#if extra}<span class="extra">{extra}</span>{/if}
</div>

<style>
	.ai {
		position: relative;
		isolation: isolate;
	}

	/* bloom halo behind the input */
	.bloom {
		position: absolute;
		inset: -4px;
		border-radius: 16px;
		pointer-events: none;
		opacity: 0;
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
		background:
			radial-gradient(ellipse at left center, oklch(0.69 0.140 285 / 0.50) 0%, oklch(0.69 0.140 285 / 0.20) 35%, transparent 70%);
		filter: blur(14px);
		z-index: 0;
	}
	.ai:focus-within .bloom {
		opacity: 1;
		animation: bloomBreath 2400ms ease-in-out infinite;
	}
	@keyframes bloomBreath {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.07); opacity: 0.74; }
	}

	/* the input itself */
	.ai input {
		position: relative;
		z-index: 1;
		width: 100%;
		background: oklch(1 0 0 / 0.06);
		border: 1px solid oklch(1 0 0 / 0.10);
		border-radius: 14px;
		padding: 22px 16px 10px;
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--p-text);
		outline: none;
		caret-color: var(--p-accent);
		transition: border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
		            background 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.ai input:hover {
		border-color: oklch(1 0 0 / 0.20);
		background: oklch(1 0 0 / 0.08);
	}
	.ai input:focus {
		border-color: var(--p-accent);
		background: oklch(0.69 0.140 285 / 0.10);
	}
	.ai input:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.ai.upper input {
		text-transform: uppercase;
		letter-spacing: 0.14em;
	}

	/* floating label */
	.flabel {
		position: absolute;
		left: 17px;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		font-family: var(--font-body);
		font-size: 1rem;
		color: oklch(0.93 0.012 280 / 0.55);
		pointer-events: none;
		transition: top 220ms cubic-bezier(0.22, 1, 0.36, 1),
		            transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
		            font-size 220ms cubic-bezier(0.22, 1, 0.36, 1),
		            color 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.flabel i {
		font-style: italic;
		font-family: var(--font-display);
		font-size: 0.85em;
		color: oklch(0.93 0.012 280 / 0.40);
	}
	.ai:focus-within .flabel,
	.ai.filled .flabel {
		top: 7px;
		transform: translateY(0);
		font-size: 0.7rem;
		color: var(--p-accent);
		font-weight: 500;
	}

	/* sweep underline */
	.sweep {
		position: absolute;
		left: 50%;
		bottom: -1px;
		transform: translateX(-50%);
		width: 0;
		height: 2px;
		background: var(--p-accent);
		border-radius: 1px;
		pointer-events: none;
		transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
		box-shadow: 0 0 12px oklch(0.69 0.140 285 / 0.60);
		z-index: 3;
	}
	.ai:focus-within .sweep {
		width: 92%;
	}

	.extra {
		display: block;
		margin-top: 8px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.85rem;
		color: oklch(0.93 0.012 280 / 0.55);
	}

	@media (prefers-reduced-motion: reduce) {
		.bloom, .flabel, .sweep { transition: none !important; animation: none !important; }
	}
</style>
