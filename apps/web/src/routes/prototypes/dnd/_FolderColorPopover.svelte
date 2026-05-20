<script lang="ts">
	import { FOLDER_COLOR_PRESETS } from './_dnd.svelte';

	interface Props {
		current: string;
		anchorRect: DOMRect;
		onSelect: (color: string) => void;
		onClose: () => void;
		variant?: 'solid' | 'frost';
	}

	let { current, anchorRect, onSelect, onClose, variant = 'solid' }: Props = $props();

	const left = $derived(Math.max(8, Math.min(anchorRect.left, window.innerWidth - 220)));
	const top = $derived(anchorRect.bottom + 6);

	function pick(color: string) {
		onSelect(color);
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	let rootEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		function onDocClick(e: MouseEvent) {
			if (rootEl && !rootEl.contains(e.target as Node)) onClose();
		}
		// next tick to avoid same-click close
		const t = setTimeout(() => document.addEventListener('click', onDocClick), 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener('click', onDocClick);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="pop"
	class:frost={variant === 'frost'}
	style:left="{left}px"
	style:top="{top}px"
	role="dialog"
	aria-label="Choose folder color"
	bind:this={rootEl}
>
	<header><span>Folder color</span></header>
	<div class="grid">
		{#each FOLDER_COLOR_PRESETS as p (p.id)}
			<button
				class="sw"
				class:active={p.value === current}
				style:--c={p.value}
				onclick={() => pick(p.value)}
				aria-label={p.label}
				title={p.label}
			>
				<span class="dot"></span>
				<span class="check" aria-hidden="true">
					<svg viewBox="0 0 12 12" width="9" height="9">
						<path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.pop {
		position: fixed;
		z-index: 200;
		width: 200px;
		background: oklch(0.18 0.022 280);
		border: 1px solid oklch(0.78 0.040 280 / 0.18);
		border-radius: 12px;
		padding: 12px;
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.04) inset,
			0 12px 28px oklch(0.04 0.02 280 / 0.55);
		animation: pop-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
	}
	.pop.frost {
		background: oklch(0.18 0.022 280 / 0.72);
		border-color: oklch(0.78 0.040 280 / 0.20);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
	}

	@keyframes pop-in {
		from { opacity: 0; transform: translateY(-4px) scale(0.97); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	header {
		display: flex; align-items: baseline;
		padding: 0 2px 10px;
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: oklch(0.62 0.040 280);
		font-weight: 600;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
	}

	.sw {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		background: none;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		display: grid;
		place-items: center;
		color: oklch(0.18 0.022 280);
		transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.sw:hover { transform: scale(1.08); }
	.sw:focus-visible { outline: 2px solid oklch(0.95 0.012 280); outline-offset: 2px; border-radius: 10px; }

	.dot {
		position: absolute; inset: 4px;
		border-radius: 50%;
		background: var(--c);
		box-shadow:
			0 0 0 1px oklch(0 0 0 / 0.22) inset,
			0 4px 10px color-mix(in oklch, var(--c) 35%, transparent);
	}
	.check {
		position: relative; z-index: 1;
		opacity: 0;
		transition: opacity 140ms;
	}
	.sw.active .check { opacity: 1; }
</style>
