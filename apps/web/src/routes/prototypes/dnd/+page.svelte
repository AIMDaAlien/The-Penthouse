<script lang="ts">
	const auroraFamily = [
		{
			slug: 'aurora',
			title: 'Aurora',
			tag: 'baseline · no glass',
			pitch: 'The chosen direction. Folder color washes the row stack from the top in a soft gradient; avatars are solid lavender so the folder color carries all the chroma. Each folder header has a clickable color dot for recoloring.',
			swatches: ['oklch(0.78 0.130 305)', 'oklch(0.66 0.085 300)', 'oklch(0.66 0.030 270)']
		},
		{
			slug: 'aurora-veil',
			title: 'Veil',
			tag: 'soft frost · 14px',
			pitch: 'Barely there. 14px sidebar blur, 8px on folder bodies. The canvas color washes drift through the sidebar; expanded folders pick up a faint glass tint. Atmospheric without being decorative.',
			swatches: ['oklch(0.78 0.130 305)', 'oklch(0.84 0.080 220)', 'oklch(0.65 0.110 145)']
		},
		{
			slug: 'aurora-glass',
			title: 'Glass',
			tag: 'medium frost · 28px',
			pitch: '28px sidebar blur, 18px on folder bodies, folder color leaks into the glass tint. Drop indicators stay luminous. Ghost is a glassy pill. Reads like a window pane in front of a colorful scene.',
			swatches: ['oklch(0.78 0.130 305)', 'oklch(0.66 0.110 5)', 'oklch(0.70 0.090 195)']
		},
		{
			slug: 'aurora-crystal',
			title: 'Crystal',
			tag: 'sharp glass · cool edge',
			pitch: '40px blur with saturation 180, contrast 108. Inner edges get a cool-blue highlight that makes the glass read as a beveled crystal slab. The ghost glows hard. Strongest color underneath, sharpest refraction.',
			swatches: ['oklch(0.84 0.080 220)', 'oklch(0.78 0.130 305)', 'oklch(0.72 0.110 165)']
		}
	];

	const otherDirections = [
		{ slug: 'refined', title: 'Refined', tag: 'periwinkle baseline' },
		{ slug: 'tree',    title: 'Tree',    tag: 'IDE / file-tree' },
		{ slug: 'bento',   title: 'Bento',   tag: 'drawer cards' },
		{ slug: 'compact', title: 'Compact', tag: 'high density' }
	];
</script>

<div class="page">
	<header class="head">
		<div class="head-text">
			<span class="eyebrow">Prototypes · DND for folders & chats</span>
			<h1>Aurora, with frost on top.</h1>
			<p>
				Aurora is the chosen direction: drenched folder color, lavender avatars, no gradients on identity. The three frost variants below take Aurora and apply purposeful glass at three intensities. Backdrop blur lets the color wash through behind text, which makes the binding more atmospheric without losing legibility.
			</p>
		</div>
		<div class="head-meta">
			<dl>
				<dt>Identity</dt>
				<dd>solid lavender avatars</dd>
				<dt>Folder color</dt>
				<dd>clickable dot · 10 presets</dd>
				<dt>Library</dt>
				<dd>none · Pointer Events</dd>
				<dt>Glass policy</dt>
				<dd>folder bodies + ghost only</dd>
			</dl>
		</div>
	</header>

	<section class="grid">
		{#each auroraFamily as v, i (v.slug)}
			<a class="card" href="/prototypes/dnd/{v.slug}" style:--seq={i}>
				<div class="card-head">
					<span class="card-num">0{i + 1}</span>
					<div class="swatches" aria-hidden="true">
						{#each v.swatches as s}
							<span class="swatch" style:background={s}></span>
						{/each}
					</div>
				</div>
				<div class="card-body">
					<h2>{v.title}</h2>
					<span class="card-tag">{v.tag}</span>
					<p>{v.pitch}</p>
				</div>
				<div class="card-foot">
					<span>open prototype</span>
					<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
						<path d="M3 8 L13 8 M9 4 L13 8 L9 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			</a>
		{/each}
	</section>

	<section class="others">
		<div class="others-head">
			<h3>Earlier directions</h3>
			<p>The four other shapes we explored. Useful as reference, but Aurora is the committed line.</p>
		</div>
		<div class="others-list">
			{#each otherDirections as v (v.slug)}
				<a class="row" href="/prototypes/dnd/{v.slug}">
					<span class="row-title">{v.title}</span>
					<span class="row-tag">{v.tag}</span>
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<path d="M5 3 L11 8 L5 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			{/each}
		</div>
	</section>

	<footer class="foot">
		<p>
			Drag any row to start. Click without dragging = open chat / toggle folder. Tap a folder's color dot to recolor. Keyboard: <span class="kbd">Space</span> grab, <span class="kbd">↑↓</span> move, <span class="kbd">Enter</span> drop, <span class="kbd">Esc</span> cancel.
		</p>
	</footer>
</div>

<style>
	:global(html), :global(body) {
		margin: 0;
		padding: 0;
		background: oklch(0.08 0.012 280);
	}

	.page {
		min-height: 100vh;
		background:
			radial-gradient(ellipse 80% 50% at 18% 5%, oklch(0.78 0.130 305 / 0.08), transparent 60%),
			radial-gradient(ellipse 60% 40% at 95% 35%, oklch(0.65 0.110 145 / 0.05), transparent 60%),
			radial-gradient(ellipse 50% 50% at 50% 100%, oklch(0.70 0.090 195 / 0.05), transparent 60%),
			oklch(0.10 0.018 280);
		color: oklch(0.93 0.012 280);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		padding: 64px 56px 80px;
	}

	.head {
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
		gap: 56px;
		max-width: 1200px;
		margin: 0 auto 56px;
		align-items: end;
	}

	.eyebrow {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: oklch(0.78 0.130 305);
		font-weight: 600;
		display: block;
		margin-bottom: 16px;
	}

	h1 {
		font-size: clamp(36px, 4.4vw, 60px);
		line-height: 1.02;
		letter-spacing: -0.022em;
		font-weight: 600;
		margin: 0 0 20px;
		color: oklch(0.97 0.020 305);
		max-width: 16ch;
	}

	.head-text p {
		margin: 0;
		font-size: 15px;
		line-height: 1.6;
		color: oklch(0.82 0.025 280);
		max-width: 60ch;
	}

	.head-meta dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 14px;
		margin: 0;
		font-size: 12px;
	}
	.head-meta dt {
		color: oklch(0.62 0.040 280);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 10.5px;
		font-weight: 600;
	}
	.head-meta dd {
		margin: 0;
		color: oklch(0.93 0.012 280);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 18px;
		max-width: 1200px;
		margin: 0 auto 48px;
	}

	.card {
		display: flex;
		flex-direction: column;
		padding: 22px 22px 18px;
		background: oklch(0.18 0.022 280 / 0.55);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
		border: 1px solid oklch(0.85 0.040 280 / 0.18);
		border-radius: 18px;
		text-decoration: none;
		color: inherit;
		transition:
			transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
			border-color 220ms,
			background 220ms,
			box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1);
		min-height: 330px;
		animation: card-in 540ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--seq) * 70ms) both;
	}
	@keyframes card-in {
		from { opacity: 0; transform: translateY(10px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.card:hover {
		transform: translateY(-3px);
		border-color: oklch(0.78 0.130 305 / 0.50);
		background: oklch(0.20 0.026 280 / 0.65);
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.05) inset,
			0 18px 36px oklch(0.05 0.02 280 / 0.5),
			0 0 0 1px oklch(0.78 0.130 305 / 0.22);
	}
	.card:focus-visible {
		outline: 2px solid oklch(0.78 0.130 305);
		outline-offset: 2px;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 22px;
	}
	.card-num {
		font-family: ui-monospace, "JetBrains Mono", "SF Mono", monospace;
		font-size: 11px;
		color: oklch(0.62 0.040 280);
		letter-spacing: 0.04em;
	}
	.swatches { display: flex; gap: 4px; }
	.swatch {
		width: 14px;
		height: 14px;
		border-radius: 4px;
		box-shadow: inset 0 0 0 1px oklch(0 0 0 / 0.2);
	}

	.card-body { flex: 1; }
	.card h2 {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0 0 4px;
		color: oklch(0.97 0.010 280);
	}
	.card-tag {
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.10em;
		color: oklch(0.78 0.130 305);
		font-weight: 600;
		display: block;
		margin-bottom: 14px;
	}
	.card p {
		margin: 0;
		font-size: 13px;
		line-height: 1.55;
		color: oklch(0.80 0.025 280);
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid oklch(0.85 0.040 280 / 0.12);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
		color: oklch(0.80 0.025 280);
		transition: color 160ms;
	}
	.card:hover .card-foot { color: oklch(0.78 0.130 305); }
	.card-foot svg { transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1); }
	.card:hover .card-foot svg { transform: translateX(3px); }

	/* ----- Others ----- */
	.others {
		max-width: 1200px;
		margin: 0 auto 56px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
		gap: 36px;
		align-items: start;
	}
	.others-head h3 {
		margin: 0 0 8px;
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.005em;
		color: oklch(0.96 0.010 280);
	}
	.others-head p {
		margin: 0;
		font-size: 13px;
		line-height: 1.55;
		color: oklch(0.72 0.030 280);
		max-width: 32ch;
	}
	.others-list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid oklch(0.85 0.040 280 / 0.10);
	}
	.others-list .row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 16px;
		padding: 16px 4px;
		text-decoration: none;
		color: oklch(0.93 0.012 280);
		border-bottom: 1px solid oklch(0.85 0.040 280 / 0.10);
		align-items: baseline;
		transition: padding 240ms cubic-bezier(0.22, 1, 0.36, 1), color 160ms;
	}
	.others-list .row:hover {
		padding-left: 14px;
		padding-right: 14px;
		color: oklch(0.97 0.010 280);
		background: oklch(0.18 0.022 280 / 0.4);
	}
	.row-title { font-size: 16px; font-weight: 500; letter-spacing: -0.005em; }
	.row-tag {
		font-size: 10.5px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: oklch(0.62 0.040 280);
		font-weight: 600;
	}
	.others-list .row svg { color: oklch(0.62 0.040 280); transition: transform 200ms; }
	.others-list .row:hover svg { transform: translateX(3px); color: oklch(0.78 0.130 305); }

	.foot {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
		font-size: 12px;
		color: oklch(0.62 0.040 280);
		line-height: 1.7;
		padding-top: 28px;
		border-top: 1px solid oklch(0.85 0.040 280 / 0.08);
	}
	.kbd {
		display: inline-block;
		font-family: ui-monospace, "JetBrains Mono", "SF Mono", monospace;
		font-size: 10.5px;
		padding: 1px 5px;
		background: oklch(0.20 0.022 280);
		border: 1px solid oklch(0.85 0.040 280 / 0.22);
		border-bottom-width: 2px;
		border-radius: 4px;
		color: oklch(0.93 0.012 280);
		margin: 0 1px;
	}

	@media (max-width: 760px) {
		.page { padding: 36px 20px 60px; }
		.head { grid-template-columns: 1fr; gap: 24px; }
		.head-meta dl { grid-template-columns: 1fr 1fr; }
		.others { grid-template-columns: 1fr; gap: 18px; }
	}
</style>
