<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		family?: 'aurora' | 'all';
	}

	let { family = 'aurora' }: Props = $props();

	const auroraFamily = [
		{ slug: 'aurora',         label: 'Aurora',  sub: 'baseline' },
		{ slug: 'aurora-veil',    label: 'Veil',    sub: 'soft frost' },
		{ slug: 'aurora-glass',   label: 'Glass',   sub: 'medium frost' },
		{ slug: 'aurora-crystal', label: 'Crystal', sub: 'sharp glass' }
	];
	const allFamily = [
		{ slug: 'refined',        label: 'Refined', sub: 'periwinkle' },
		{ slug: 'tree',           label: 'Tree',    sub: 'file-tree' },
		{ slug: 'bento',          label: 'Bento',   sub: 'drawer cards' },
		{ slug: 'compact',        label: 'Compact', sub: 'density' },
		{ slug: 'aurora',         label: 'Aurora',  sub: 'chosen direction' }
	];
	const variants = $derived(family === 'aurora' ? auroraFamily : allFamily);

	const current = $derived(page.url.pathname.split('/').pop() ?? '');
</script>

<nav class="vnav" aria-label="Variant chooser">
	<a class="home" href="/prototypes/dnd">← gallery</a>
	<div class="tabs" role="tablist">
		{#each variants as v (v.slug)}
			<a
				class="tab"
				class:active={current === v.slug}
				href="/prototypes/dnd/{v.slug}"
				role="tab"
				aria-selected={current === v.slug}
			>
				<span class="tab-label">{v.label}</span>
				<span class="tab-sub">{v.sub}</span>
			</a>
		{/each}
	</div>
	{#if family === 'aurora'}
		<a class="alt" href="/prototypes/dnd?lane=others">other directions →</a>
	{/if}
</nav>

<style>
	.vnav {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 22px;
		background: oklch(0.11 0.014 280);
		border-bottom: 1px solid oklch(0.78 0.040 280 / 0.10);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		flex-shrink: 0;
	}

	.home, .alt {
		font-size: 11px;
		color: oklch(0.62 0.040 280);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 500;
		padding: 4px 8px;
		border-radius: 6px;
		transition: color 140ms, background 140ms;
		white-space: nowrap;
	}
	.home:hover, .alt:hover { color: oklch(0.93 0.012 280); background: oklch(0.18 0.022 280); }

	.tabs {
		display: flex;
		gap: 3px;
		flex: 1;
	}

	.tab {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 6px 14px;
		border-radius: 8px;
		color: oklch(0.80 0.025 280);
		text-decoration: none;
		transition: background 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms;
		min-width: 0;
	}
	.tab:hover { background: oklch(0.18 0.022 280); color: oklch(0.95 0.012 280); }
	.tab.active {
		background: oklch(0.78 0.130 305 / 0.18);
		color: oklch(0.95 0.012 280);
		box-shadow: inset 0 0 0 1px oklch(0.78 0.130 305 / 0.42);
	}
	.tab-label {
		font-size: 12.5px;
		font-weight: 600;
		letter-spacing: 0.005em;
	}
	.tab-sub {
		font-size: 10px;
		color: oklch(0.60 0.040 280);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.tab.active .tab-sub { color: oklch(0.78 0.130 305); }
</style>
