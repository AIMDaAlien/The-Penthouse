<script lang="ts">
	/**
	 * Logo mockup gallery — /prototypes/logo
	 *
	 * Pulls all variants from `$lib/prototypes/logo/variants.js`. Same source
	 * also feeds the standalone `docs/logo-gallery.html` so the live route and
	 * the shareable file are always in lockstep.
	 *
	 * Brand register. Wordmark stays separate; these are icon-only.
	 */
	import { variants, familyLabels } from '$lib/prototypes/logo/variants.js';

	type BgKey = 'dark' | 'light' | 'neutral';
	type Family = keyof typeof familyLabels;
	type FilterKey = 'all' | Family;

	const ACCENT_DARK = 'oklch(0.72 0.150 285)';
	const ACCENT_LIGHT = 'oklch(0.52 0.135 285)';

	const BG: Record<BgKey, { fill: string; ink: string; accent: string; label: string; note: string }> = {
		dark: {
			fill: 'oklch(0.16 0.020 280)',
			ink: 'oklch(0.95 0.012 280)',
			accent: ACCENT_DARK,
			label: 'Periwinkle · dark',
			note: 'default app theme'
		},
		light: {
			fill: 'oklch(0.96 0.020 285)',
			ink: 'oklch(0.20 0.020 285)',
			accent: ACCENT_LIGHT,
			label: 'Periwinkle · light',
			note: 'inverted theme'
		},
		neutral: {
			fill: 'oklch(0.99 0.002 285)',
			ink: 'oklch(0.18 0.012 285)',
			accent: ACCENT_LIGHT,
			label: 'Neutral white',
			note: 'iOS lock screen worst case'
		}
	};

	const bgKeys: BgKey[] = ['dark', 'light', 'neutral'];
	const filterKeys: FilterKey[] = ['all', 'grid', 'wordmark', 'interlock', 'experimental'];

	let bg = $state<BgKey>('dark');
	let filter = $state<FilterKey>('all');
	let zoomed = $state<string | null>(null);

	let active = $derived(BG[bg]);
	let filtered = $derived(
		filter === 'all' ? variants : variants.filter((v) => v.family === filter)
	);

	function zoom(id: string) {
		zoomed = zoomed === id ? null : id;
	}
</script>

<svelte:head>
	<title>Logo mockups · The Penthouse</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&display=swap"
	/>
</svelte:head>

<div class="page" style:--p-bg={active.fill} style:--p-ink={active.ink} style:--p-accent={active.accent}>
	<header class="topbar">
		<div class="brand">
			<span class="num">N° 05</span>
			<span class="dot">·</span>
			<span class="title">Logo mockups</span>
			<span class="count">{variants.length} variants</span>
		</div>
		<nav class="links">
			<a href="/prototypes">← All prototypes</a>
			<a href="/logo-gallery.html" target="_blank" rel="noopener">Standalone HTML ↗</a>
			<a href="/prototypes/flow">Flow →</a>
		</nav>
	</header>

	<section class="controls">
		<div class="control-group">
			<span class="label">Background</span>
			<div class="seg">
				{#each bgKeys as key (key)}
					<button class:on={bg === key} onclick={() => (bg = key)}>{BG[key].label}</button>
				{/each}
			</div>
			<span class="note">{active.note}</span>
		</div>
		<div class="control-group">
			<span class="label">Family</span>
			<div class="seg">
				{#each filterKeys as key (key)}
					<button class:on={filter === key} onclick={() => (filter = key)}>
						{key === 'all' ? 'All' : familyLabels[key]}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<section class="grid">
		{#each filtered as v (v.id)}
			<article class="card" class:zoomed={zoomed === v.id}>
				<button class="hit" onclick={() => zoom(v.id)} aria-label="Toggle {v.name} details">
					<div class="canvas" style:background={active.fill}>
						{@html v.svg(zoomed === v.id ? 256 : 168, active.ink, active.accent)}
					</div>
				</button>
				<div class="meta">
					<div class="line1">
						<span class="vnum">{v.number}</span>
						<span class="vname">{v.name}</span>
						<span class="vfam">{familyLabels[v.family as Family]}</span>
					</div>
					<p class="blurb">{v.blurb}</p>
					<div class="scale-row" aria-label="Scale test 192 / 60 / 16">
						<div class="scale-cell">
							<div class="scale-bg" style:background={active.fill}>{@html v.svg(64, active.ink, active.accent)}</div>
							<span>192</span>
						</div>
						<div class="scale-cell">
							<div class="scale-bg" style:background={active.fill}>{@html v.svg(40, active.ink, active.accent)}</div>
							<span>60</span>
						</div>
						<div class="scale-cell">
							<div class="scale-bg" style:background={active.fill}>{@html v.svg(16, active.ink, active.accent)}</div>
							<span>16</span>
						</div>
					</div>
				</div>
			</article>
		{/each}
	</section>

	<footer class="foot">
		<p>
			{variants.length} icon directions. The PENT 2x2 grid family leads,
			non-grid PENT follows, PH interlock and experimental round out. Hero is {zoomed ? '256' : '168'} px;
			scale row tests at PWA-install (192), Apple touch (60), and favicon (16). Tap a tile to enlarge.
		</p>
		<p class="fine">
			The wordmark stays separate. None of these replace it. They are compressed marks meant to
			survive at 16 px where the wordmark's hairline serifs would not.
		</p>
	</footer>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--p-bg);
		color: var(--p-ink);
		font-family: 'Ubuntu', system-ui, sans-serif;
		transition:
			background 320ms cubic-bezier(0.16, 1, 0.3, 1),
			color 320ms cubic-bezier(0.16, 1, 0.3, 1);
		padding: 40px 64px 96px;
	}

	@media (max-width: 720px) {
		.page { padding: 24px 16px 64px; }
	}

	.topbar {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-bottom: 22px;
		border-bottom: 1px solid color-mix(in oklch, var(--p-ink) 14%, transparent);
		margin-bottom: 40px;
		flex-wrap: wrap;
		gap: 14px;
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}

	.num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--p-ink) 60%, transparent);
	}

	.dot { color: color-mix(in oklch, var(--p-ink) 35%, transparent); }

	.title {
		font-family: 'Playfair Display', serif;
		font-style: italic;
		font-weight: 500;
		font-size: 22px;
	}

	.count {
		margin-left: 8px;
		padding: 2px 10px;
		border-radius: 999px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.06em;
		background: color-mix(in oklch, var(--p-accent) 14%, transparent);
		color: var(--p-accent);
	}

	.links { display: flex; gap: 22px; flex-wrap: wrap; }

	.links a {
		font-size: 13px;
		color: color-mix(in oklch, var(--p-ink) 70%, transparent);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: color 180ms, border-color 180ms;
	}

	.links a:hover {
		color: var(--p-accent);
		border-bottom-color: var(--p-accent);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 22px 40px;
		margin-bottom: 40px;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: color-mix(in oklch, var(--p-ink) 55%, transparent);
	}

	.note {
		font-size: 12px;
		font-style: italic;
		color: color-mix(in oklch, var(--p-ink) 55%, transparent);
	}

	.seg {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: 999px;
		background: color-mix(in oklch, var(--p-ink) 6%, transparent);
		border: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent);
	}

	.seg button {
		appearance: none;
		border: 0;
		background: transparent;
		color: color-mix(in oklch, var(--p-ink) 70%, transparent);
		font: inherit;
		font-size: 12px;
		padding: 6px 14px;
		border-radius: 999px;
		cursor: pointer;
		transition:
			background 180ms cubic-bezier(0.16, 1, 0.3, 1),
			color 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.seg button:hover { color: var(--p-ink); }

	.seg button.on {
		background: var(--p-ink);
		color: var(--p-bg);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 22px;
	}

	.card {
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in oklch, var(--p-ink) 12%, transparent);
		border-radius: 14px;
		overflow: hidden;
		background: color-mix(in oklch, var(--p-ink) 3%, transparent);
		transition:
			transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
			border-color 180ms;
	}

	.card.zoomed {
		grid-column: span 2;
		border-color: var(--p-accent);
	}

	@media (max-width: 720px) {
		.card.zoomed { grid-column: span 1; }
	}

	.hit {
		appearance: none;
		border: 0;
		background: transparent;
		padding: 0;
		cursor: pointer;
		display: block;
		width: 100%;
	}

	.canvas {
		aspect-ratio: 1.6 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: aspect-ratio 320ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.card.zoomed .canvas { aspect-ratio: 1 / 1; }

	.meta {
		padding: 18px 18px 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-top: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent);
	}

	.line1 {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}

	.vnum {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--p-accent);
		letter-spacing: 0.06em;
	}

	.vname {
		font-family: 'Playfair Display', serif;
		font-weight: 600;
		font-size: 17px;
	}

	.vfam {
		margin-left: auto;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: color-mix(in oklch, var(--p-ink) 50%, transparent);
		font-family: 'JetBrains Mono', monospace;
	}

	.blurb {
		font-size: 13px;
		line-height: 1.55;
		margin: 0;
		color: color-mix(in oklch, var(--p-ink) 80%, transparent);
		max-width: 60ch;
	}

	.scale-row {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		margin-top: 8px;
	}

	.scale-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.scale-bg {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 8px;
		border: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent);
	}

	.scale-cell span {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: color-mix(in oklch, var(--p-ink) 50%, transparent);
		letter-spacing: 0.08em;
	}

	.foot {
		margin-top: 64px;
		padding-top: 22px;
		border-top: 1px solid color-mix(in oklch, var(--p-ink) 10%, transparent);
		max-width: 70ch;
		color: color-mix(in oklch, var(--p-ink) 70%, transparent);
		font-size: 13px;
		line-height: 1.55;
	}

	.foot p { margin: 0 0 8px; }
	.foot .fine { font-size: 12px; font-style: italic; color: color-mix(in oklch, var(--p-ink) 55%, transparent); }
</style>
