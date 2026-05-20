<!--
  KeyButton.svelte — circular submit with a properly-sized key SVG that rotates on click.
  The SVG is 38x38 inside a 72x72 circle (53% fill) so the key reads at glance.
-->
<script lang="ts">
	let {
		loading = false,
		disabled = false,
		label = 'Turn the key',
		magnetic = false,
		onpress
	}: {
		loading?: boolean;
		disabled?: boolean;
		label?: string;
		magnetic?: boolean;
		onpress?: () => void;
	} = $props();

	let turned = $state(false);
	let btnEl: HTMLButtonElement | undefined = $state();

	function handleClick() {
		if (disabled || loading) return;
		turned = true;
		setTimeout(() => { turned = false; }, 1400);
		onpress?.();
	}

	// Magnetic pull when `magnetic` prop is true.
	$effect(() => {
		if (!magnetic || !btnEl) return;
		const node = btnEl;
		const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		if (prefersReduced) return;

		const radius = 130;
		const strength = 0.28;

		const onMove = (e: MouseEvent) => {
			const rect = node.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.top + rect.height / 2;
			const dx = e.clientX - cx;
			const dy = e.clientY - cy;
			const dist = Math.hypot(dx, dy);
			if (dist > radius) {
				node.style.setProperty('--mx', '0px');
				node.style.setProperty('--my', '0px');
				return;
			}
			const f = (1 - dist / radius) * strength;
			node.style.setProperty('--mx', `${dx * f}px`);
			node.style.setProperty('--my', `${dy * f}px`);
		};
		const onLeave = () => {
			node.style.setProperty('--mx', '0px');
			node.style.setProperty('--my', '0px');
		};
		window.addEventListener('mousemove', onMove);
		node.addEventListener('mouseleave', onLeave);
		return () => {
			window.removeEventListener('mousemove', onMove);
			node.removeEventListener('mouseleave', onLeave);
		};
	});
</script>

<div class="row">
	<button
		bind:this={btnEl}
		class="key"
		class:turned
		class:magnetic
		type="button"
		{disabled}
		onclick={handleClick}
		aria-label={label}
	>
		<span class="key-inner">
			<svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">
				<!-- bow (the round handle) -->
				<circle cx="11" cy="18" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4" />
				<!-- inner hole of the bow -->
				<circle cx="11" cy="18" r="2.2" fill="currentColor" />
				<!-- shank -->
				<line x1="17" y1="18" x2="32" y2="18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
				<!-- two teeth -->
				<line x1="25" y1="18" x2="25" y2="23.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
				<line x1="29.5" y1="18" x2="29.5" y2="25" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
			</svg>
		</span>
	</button>
	<span class="key-label">
		{#if loading}
			<span class="dot"></span> <em>Admitting…</em>
		{:else}
			<em>{label}</em>
		{/if}
	</span>
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 6px;
		padding: 10px 14px;
		background: oklch(1 0 0 / 0.04);
		border: 1px solid oklch(1 0 0 / 0.08);
		border-radius: 16px;
	}

	.key {
		--mx: 0px;
		--my: 0px;
		width: 72px;
		height: 72px;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		box-shadow:
			0 12px 32px oklch(0.69 0.140 285 / 0.45),
			inset 0 1px 0 oklch(1 0 0 / 0.20);
		transition:
			transform 1100ms cubic-bezier(0.45, 1.4, 0.5, 1),
			box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.key.magnetic {
		transform: translate(var(--mx), var(--my));
		transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.key.turned { transform: rotate(180deg) translate(0, 0); transition: transform 1100ms cubic-bezier(0.45, 1.4, 0.5, 1); }
	.key.magnetic.turned { transform: translate(var(--mx), var(--my)) rotate(180deg); }

	.key:hover:not(:disabled) {
		box-shadow:
			0 16px 40px oklch(0.69 0.140 285 / 0.55),
			inset 0 1px 0 oklch(1 0 0 / 0.30);
	}
	.key:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		box-shadow: none;
	}

	.key-inner {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.key-label {
		font-family: var(--font-display);
		font-size: 1.1rem;
		color: oklch(0.93 0.012 280 / 0.92);
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.key-label em { font-style: italic; }

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--p-accent);
		animation: pulse 1100ms ease-in-out infinite;
		display: inline-block;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.45; transform: scale(0.85); }
	}

	@media (prefers-reduced-motion: reduce) {
		.key { transition: none !important; }
		.dot { animation: none !important; }
	}
</style>
