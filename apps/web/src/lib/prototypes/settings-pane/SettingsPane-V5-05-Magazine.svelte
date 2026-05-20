<script lang="ts">
	// SettingsPane V5-05 — Magazine (elegant typography, image-forward editorial)
	// Self-contained prototype. No external imports.

	const user = {
		name: 'kimi.eve',
		displayName: 'Kimi Eve',
		bio: 'Designing quiet spaces for loud thoughts.',
		avatar: 'https://i.pravatar.cc/300?u=kimi',
		banner: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&q=80'
	};

	let pushEnabled = $state(true);
	let typingEnabled = $state(true);
	let readReceipts = $state(true);
	let autoAfk = $state(false);
	let themeName = $state('T-D1');
	let presence = $state<'online' | 'away' | 'offline'>('online');
	let displayName = $state(user.displayName);
	const themes = [
		{ id: 'T-D1', label: 'Periwinkle', accent: 'oklch(0.69 0.140 285)', bgHue: 280 },
		{ id: 'T-D2', label: 'Sage',  accent: 'oklch(0.65 0.060 145)', bgHue: 145 },
		{ id: 'T-D3', label: 'Slate', accent: 'oklch(0.62 0.075 245)', bgHue: 245 },
		{ id: 'T-D4', label: 'Plum', accent: 'oklch(0.60 0.090 340)', bgHue: 340 },
		{ id: 'T-D7', label: 'Charcoal', accent: 'oklch(0.60 0.100 35)', bgHue: 35 },
	];

	const activeTheme = $derived(themes.find(t => t.id === themeName) ?? themes[0]);
</script>

<div
	class="pane"
	style:--p-accent={activeTheme.accent}
	style:--p-accent-soft="color-mix(in oklch, {activeTheme.accent} 16%, transparent)"
	style:--p-accent-edge="color-mix(in oklch, {activeTheme.accent} 36%, transparent)"
	style:--p-bg="oklch(0.15 0.020 {activeTheme.bgHue})"
>
	<div class="tex"></div>

	<!-- Editorial cover -->
	<div class="cover">
		<img src={user.banner} alt="" class="cover-img" />
		<div class="tex tex-cover"></div>
		<div class="cover-shade"></div>

		<div class="cover-meta">
			<span class="kicker">The Penthouse · Volume IV</span>
			<h1 class="cover-title">Preferences</h1>
			<span class="folio">Issue 04 — Settings &amp; Identity</span>
		</div>
	</div>

	<div class="scroll">
		<!-- Byline / identity -->
		<section class="byline">
			<div class="byline-pfp-wrap">
				<img src={user.avatar} alt="" class="byline-pfp" />
				<div class="tex tex-pfp"></div>
				<span class="dot {presence}"></span>
			</div>
			<div class="byline-text">
				<span class="byline-eyebrow">By</span>
				<span class="byline-name">{displayName}</span>
				<span class="byline-handle">@{user.name}</span>
				<p class="byline-bio">{user.bio}</p>
			</div>
		</section>

		<!-- Display name field, full-bleed -->
		<section class="article">
			<span class="article-eyebrow">N° 01 — Identity</span>
			<h2 class="article-title">What they call you.</h2>
			<label class="field-stack">
				<input bind:value={displayName} placeholder="Display name" />
				<span class="field-help">This is the name your readers see at the top of every message.</span>
			</label>
		</section>

		<div class="grid">
			<!-- Presence -->
			<section class="article">
				<span class="article-eyebrow">N° 02 — Presence</span>
				<h2 class="article-title">Where you are.</h2>
				<div class="presence-picker">
					{#each ['online', 'away', 'offline'] as p}
						<button
							class="presence-btn"
							class:active={presence === p}
							onclick={() => presence = p as typeof presence}
						>
							<span class="presence-dot {p}"></span>
							<span class="presence-label">{p}</span>
						</button>
					{/each}
				</div>
				<div class="field-row">
					<span class="field-name">Auto-AFK</span>
					<button class="toggle" class:on={autoAfk} onclick={() => autoAfk = !autoAfk} aria-label="Toggle Auto-AFK">
						<span class="toggle-thumb"></span>
					</button>
				</div>
			</section>

			<!-- Notifications -->
			<section class="article">
				<span class="article-eyebrow">N° 03 — Notifications</span>
				<h2 class="article-title">How loud, &amp; when.</h2>
				<div class="field-row">
					<span class="field-name">Push alerts</span>
					<button class="toggle" class:on={pushEnabled} onclick={() => pushEnabled = !pushEnabled} aria-label="Toggle push">
						<span class="toggle-thumb"></span>
					</button>
				</div>
				<div class="field-row">
					<span class="field-name">Typing indicators</span>
					<button class="toggle" class:on={typingEnabled} onclick={() => typingEnabled = !typingEnabled} aria-label="Toggle typing">
						<span class="toggle-thumb"></span>
					</button>
				</div>
				<div class="field-row">
					<span class="field-name">Read receipts</span>
					<button class="toggle" class:on={readReceipts} onclick={() => readReceipts = !readReceipts} aria-label="Toggle receipts">
						<span class="toggle-thumb"></span>
					</button>
				</div>
			</section>

			<!-- Theme -->
			<section class="article">
				<span class="article-eyebrow">N° 05 — Theme</span>
				<h2 class="article-title">A palette to live in.</h2>
				<div class="theme-grid">
					{#each themes as t}
						<button class="theme-btn" class:active={themeName === t.id} onclick={() => themeName = t.id}>
							<span class="theme-swatch" style:background={t.accent}></span>
							<span class="theme-label">{t.label}</span>
						</button>
					{/each}
				</div>
			</section>
		</div>

		<!-- Colophon -->
		<section class="colophon">
			<button class="signout">Sign out</button>
			<span class="colophon-line">Set in Ubuntu &amp; JetBrains Mono. Printed in OKLCH. — Issue 04.</span>
		</section>
	</div>
</div>

<style>
	.pane {
		container-type: inline-size;
		position: relative;
		width: 860px; height: 760px;
		background: var(--p-bg, oklch(0.15 0.020 280));
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
		display: flex; flex-direction: column;
		border-radius: var(--r-lg, 22px);
	}

	.tex {
		position: absolute; inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay; opacity: 0.40; pointer-events: none; z-index: 0;
	}
	.tex-cover { inset: 0; opacity: 0.30; mix-blend-mode: overlay; }
	.tex-pfp { inset: 0; border-radius: 50%; opacity: 0.45; z-index: 2; }

	.wallpaper-layer {
		position: absolute; inset: 0;
		opacity: 0.18; mix-blend-mode: soft-light;
		pointer-events: none; z-index: 0;
	}

	/* Cover */
	.cover {
		position: relative;
		height: 250px;
		flex-shrink: 0;
		overflow: hidden;
	}
	.cover-img {
		position: absolute; inset: 0;
		width: 100%; height: 100%;
		object-fit: cover;
		filter: brightness(0.55) saturate(1.1);
	}
	.cover-shade {
		position: absolute; inset: 0;
		background: linear-gradient(180deg, oklch(0 0 0 / 0.25) 0%, transparent 35%, var(--p-bg) 100%);
		z-index: 2;
	}
	.cover-meta {
		position: absolute;
		left: 44px; right: 44px; bottom: 36px;
		z-index: 3;
		display: flex; flex-direction: column;
		gap: 6px;
	}
	.kicker {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 3px; text-transform: uppercase;
		color: oklch(1 0 0 / 0.78);
	}
	.cover-title {
		font-size: 4.2rem;
		font-weight: 300;
		font-style: italic;
		letter-spacing: -2px;
		line-height: 0.9;
		color: oklch(1 0 0 / 0.98);
		margin: 0;
	}
	.folio {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem; letter-spacing: 2px; text-transform: uppercase;
		color: oklch(1 0 0 / 0.62);
	}

	/* Scroll body */
	.scroll {
		position: relative; z-index: 1;
		flex: 1; overflow-y: auto;
		padding: 28px 44px 32px;
	}

	/* Byline / identity */
	.byline {
		display: flex; align-items: center; gap: 18px;
		padding-bottom: 24px;
		margin-bottom: 28px;
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.byline-pfp-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
	.byline-pfp {
		width: 100%; height: 100%;
		border-radius: 50%; object-fit: cover;
		position: relative; z-index: 1;
	}
	.dot {
		position: absolute; bottom: 2px; right: 2px;
		width: 16px; height: 16px;
		border-radius: 50%;
		border: 3px solid var(--p-bg);
		z-index: 3;
	}
	.dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.byline-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.byline-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 2.5px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
	}
	.byline-name {
		font-size: 1.45rem;
		font-weight: 400; font-style: italic;
		letter-spacing: -0.5px;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.byline-handle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.74rem; letter-spacing: 1px;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}
	.byline-bio {
		font-size: 0.92rem; line-height: 1.5;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		margin: 6px 0 0;
		max-width: 460px;
	}

	/* Article (section) */
	.article {
		padding-top: 22px;
		border-top: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.article-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 2.5px; text-transform: uppercase;
		color: var(--p-accent, oklch(0.69 0.140 285));
		display: block; margin-bottom: 6px;
	}
	.article-title {
		font-size: 1.55rem;
		font-weight: 400; font-style: italic;
		letter-spacing: -0.6px;
		line-height: 1.1;
		color: var(--p-text, oklch(0.93 0.012 280));
		margin: 0 0 16px;
	}

	/* Responsive 1→2 col */
	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 28px;
		margin-top: 28px;
	}
	.grid > .article {
		padding-top: 22px;
	}
	@container (min-width: 700px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
			column-gap: 36px;
		}
	}

	/* Field stack (display name input) */
	.field-stack { display: flex; flex-direction: column; gap: 8px; }
	.field-stack input {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--p-line-2, oklch(0.78 0.090 280 / 0.22));
		padding: 10px 0;
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, sans-serif;
		font-size: 1.5rem;
		font-style: italic;
		font-weight: 300;
		letter-spacing: -0.5px;
		transition: border-color 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.field-stack input:focus {
		outline: none;
		border-bottom-color: var(--p-accent, oklch(0.69 0.140 285));
	}
	.field-help {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem; letter-spacing: 1.2px;
		color: var(--p-muted, oklch(0.65 0.050 280));
		text-transform: uppercase;
	}

	/* Presence picker */
	.presence-picker {
		display: grid; grid-template-columns: repeat(3, 1fr);
		gap: 6px; margin-bottom: 14px;
	}
	.presence-btn {
		display: flex; align-items: center; gap: 8px;
		padding: 9px 12px;
		background: transparent;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-pill, 999px);
		color: var(--p-text-2, oklch(0.80 0.025 280));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.presence-btn.active {
		border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.presence-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.presence-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.presence-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.presence-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.presence-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	/* Field row */
	.field-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 11px 0;
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.field-row:last-child { border-bottom: none; }
	.field-name {
		font-size: 1rem; font-weight: 400;
		color: var(--p-text, oklch(0.93 0.012 280));
	}

	/* Toggle */
	.toggle {
		width: 38px; height: 22px;
		border-radius: 999px;
		background: var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border: none; padding: 3px;
		cursor: pointer;
		transition: background 280ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}
	.toggle.on { background: var(--p-accent, oklch(0.69 0.140 285)); }
	.toggle-thumb {
		display: block; width: 16px; height: 16px;
		border-radius: 50%;
		background: var(--p-text, oklch(0.93 0.012 280));
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.toggle.on .toggle-thumb { transform: translateX(16px); }

	/* Wallpaper grid */
	.wallpaper-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
	.wp-btn {
		display: flex; flex-direction: column; align-items: center; gap: 6px;
		padding: 8px 4px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--r-sm, 8px);
		color: var(--p-text-2, oklch(0.80 0.025 280));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.wp-btn.active {
		border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
	}
	.wp-swatch {
		width: 100%; height: 32px;
		border-radius: var(--r-sm, 8px);
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.wp-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.56rem; letter-spacing: 1px; text-transform: uppercase;
	}

	/* Theme grid */
	.theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
	.theme-btn {
		display: flex; flex-direction: column; align-items: center; gap: 6px;
		padding: 10px 4px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--r-sm, 8px);
		color: var(--p-text-2, oklch(0.80 0.025 280));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.theme-btn.active {
		border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
	}
	.theme-swatch {
		width: 28px; height: 28px; border-radius: 50%;
		opacity: 0.80;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.theme-btn.active .theme-swatch { opacity: 1; }
	.theme-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.56rem; letter-spacing: 1px; text-transform: uppercase;
	}

	/* Colophon */
	.colophon {
		margin-top: 32px;
		padding-top: 22px;
		border-top: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		display: flex; flex-direction: column; align-items: center; gap: 14px;
	}
	.colophon-line {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 1.5px;
		color: var(--p-muted, oklch(0.65 0.050 280));
		text-align: center;
	}
	.signout {
		padding: 11px 26px;
		background: transparent;
		color: var(--p-warning, oklch(0.62 0.070 35));
		border: 1px solid var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.8px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.signout:hover { background: var(--p-warning-soft, oklch(0.62 0.070 35 / 0.12)); }
</style>
