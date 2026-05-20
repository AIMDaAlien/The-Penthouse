<script lang="ts">
	// SettingsPane V5-03 — Borderless Typography (S1.6 borderless + S2.1 typography-led)
	// Self-contained prototype. No external imports.

	const user = {
		name: 'kimi.eve',
		displayName: 'Kimi Eve',
		bio: 'Designing quiet spaces for loud thoughts.',
		avatar: 'https://i.pravatar.cc/150?u=kimi',
		banner: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80'
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
	style:--p-bg="oklch(0.16 0.020 {activeTheme.bgHue})"
>
	<div class="tex"></div>

	<header class="head">
		<span class="eyebrow">N° 04 / SETTINGS</span>
		<h1 class="display">Preferences.</h1>
	</header>

	<div class="scroll">
		<!-- Identity (minimal, typography-forward) -->
		<section class="section">
			<span class="sec-eyebrow">N° 01 / IDENTITY</span>
			<div class="id-row">
				<div class="pfp-wrap">
					<img src={user.avatar} alt="" class="pfp" />
					<div class="tex tex-pfp"></div>
					<span class="dot {presence}"></span>
				</div>
				<div class="id-meta">
					<span class="id-name">{displayName}</span>
					<span class="id-handle">@{user.name}</span>
				</div>
			</div>
			<label class="field-stack">
				<span class="field-name">Display name</span>
				<input class="input-bare" bind:value={displayName} />
			</label>
		</section>

		<div class="rule"></div>

		<!-- Presence -->
		<section class="section">
			<span class="sec-eyebrow">N° 02 / PRESENCE</span>
			<div class="presence-row">
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
			<div class="field-bare">
				<span class="field-name">Auto-AFK</span>
				<button class="toggle" class:on={autoAfk} onclick={() => autoAfk = !autoAfk} aria-label="Toggle Auto-AFK">
					<span class="toggle-thumb"></span>
				</button>
			</div>
		</section>

		<div class="rule"></div>

		<!-- Notifications -->
		<section class="section">
			<span class="sec-eyebrow">N° 03 / NOTIFICATIONS</span>
			<div class="field-bare">
				<span class="field-name">Push alerts</span>
				<button class="toggle" class:on={pushEnabled} onclick={() => pushEnabled = !pushEnabled} aria-label="Toggle push">
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="field-bare">
				<span class="field-name">Typing indicators</span>
				<button class="toggle" class:on={typingEnabled} onclick={() => typingEnabled = !typingEnabled} aria-label="Toggle typing">
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="field-bare">
				<span class="field-name">Read receipts</span>
				<button class="toggle" class:on={readReceipts} onclick={() => readReceipts = !readReceipts} aria-label="Toggle receipts">
					<span class="toggle-thumb"></span>
				</button>
			</div>
		</section>

		<div class="rule"></div>

		<!-- Theme -->
		<section class="section">
			<span class="sec-eyebrow">N° 05 / THEME</span>
			<div class="theme-row">
				{#each themes as t}
					<button class="theme-chip" class:active={themeName === t.id} onclick={() => themeName = t.id}>
						<span class="theme-swatch" style:background={t.accent}></span>
						<span class="theme-label">{t.label}</span>
					</button>
				{/each}
			</div>
		</section>

		<div class="rule"></div>

		<!-- Sign out -->
		<section class="section">
			<button class="signout">Sign out</button>
		</section>
	</div>
</div>

<style>
	.pane {
		container-type: inline-size;
		position: relative;
		width: 860px;
		height: 760px;
		background: var(--p-bg, oklch(0.16 0.020 280));
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border-radius: var(--r-lg, 22px);
	}

	.wallpaper-layer {
		position: absolute; inset: 0;
		opacity: 0.18; mix-blend-mode: soft-light;
		pointer-events: none; z-index: 0;
	}

	.tex {
		position: absolute; inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay; opacity: 0.40; pointer-events: none; z-index: 0;
	}
	.tex-pfp { inset: 0; border-radius: 50%; opacity: 0.45; }

	/* Big header — typography-led */
	.head {
		position: relative; z-index: 1;
		padding: 38px 40px 8px;
	}
	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
		display: block; margin-bottom: 14px;
	}
	.display {
		font-size: 4rem;
		font-weight: 700;
		letter-spacing: -3px;
		line-height: 0.9;
		color: var(--p-text, oklch(0.93 0.012 280));
		margin: 0;
	}

	.scroll {
		position: relative; z-index: 1;
		flex: 1; overflow-y: auto;
		padding: 14px 40px 40px;
	}
	.section { padding: 16px 0; }
	.rule { height: 1px; background: var(--p-line, oklch(0.78 0.090 280 / 0.12)); }

	.sec-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
		display: block; margin-bottom: 16px;
	}

	/* Identity */
	.id-row { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
	.pfp-wrap { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
	.pfp {
		width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
		position: relative; z-index: 1;
	}
	.dot {
		position: absolute; bottom: 2px; right: 2px;
		width: 14px; height: 14px;
		border-radius: 50%;
		border: 2px solid var(--p-bg, oklch(0.16 0.020 280));
		z-index: 2;
	}
	.dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.id-meta { display: flex; flex-direction: column; gap: 2px; }
	.id-name {
		font-size: 1.5rem; font-weight: 700;
		letter-spacing: -0.6px;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.id-handle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.78rem; letter-spacing: 1px;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}

	.field-stack { display: flex; flex-direction: column; gap: 6px; }
	.input-bare {
		background: transparent; border: none;
		border-bottom: 1px solid var(--p-line-2, oklch(0.78 0.090 280 / 0.22));
		padding: 8px 0;
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, sans-serif;
		font-size: 1.05rem;
		transition: border-color 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.input-bare:focus {
		outline: none;
		border-bottom-color: var(--p-accent, oklch(0.69 0.140 285));
	}

	/* Presence */
	.presence-row { display: flex; gap: 22px; margin-bottom: 18px; }
	.presence-btn {
		display: flex; align-items: center; gap: 8px;
		padding: 8px 0;
		background: transparent;
		border: none;
		color: var(--p-muted, oklch(0.65 0.050 280));
		cursor: pointer;
		transition: color 0.15s;
		border-bottom: 1px solid transparent;
	}
	.presence-btn.active {
		color: var(--p-text, oklch(0.93 0.012 280));
		border-bottom-color: var(--p-accent, oklch(0.69 0.140 285));
	}
	.presence-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.presence-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.presence-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.presence-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.presence-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.66rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	/* Bare field row */
	.field-bare {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 0;
	}
	.field-name {
		font-size: 0.95rem; font-weight: 500;
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

	/* Wallpaper row */
	.wallpaper-row { display: flex; gap: 14px; flex-wrap: wrap; }
	.wp-chip {
		display: flex; align-items: center; gap: 8px;
		padding: 6px 12px 6px 6px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--r-pill, 999px);
		color: var(--p-muted, oklch(0.65 0.050 280));
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.wp-chip.active {
		border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.wp-swatch {
		width: 22px; height: 22px;
		border-radius: 50%;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.wp-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.2px; text-transform: uppercase;
	}

	/* Theme row */
	.theme-row { display: flex; gap: 14px; flex-wrap: wrap; }
	.theme-chip {
		display: flex; align-items: center; gap: 10px;
		padding: 6px 14px 6px 6px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--r-pill, 999px);
		color: var(--p-muted, oklch(0.65 0.050 280));
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.theme-chip.active {
		border-color: var(--p-accent, oklch(0.69 0.140 285));
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.theme-swatch {
		width: 22px; height: 22px; border-radius: 50%;
		background: var(--p-accent, oklch(0.69 0.140 285));
		opacity: 0.7;
	}
	.theme-chip.active .theme-swatch { opacity: 1; }
	.theme-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	/* Sign out — borderless variant uses just text + warning color */
	.signout {
		display: inline-block;
		padding: 10px 0;
		background: transparent;
		color: var(--p-warning, oklch(0.62 0.070 35));
		border: none;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.78rem; letter-spacing: 2px; text-transform: uppercase;
		cursor: pointer;
		transition: opacity 0.15s;
		border-bottom: 1px solid var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32));
	}
	.signout:hover { opacity: 0.75; }
</style>
