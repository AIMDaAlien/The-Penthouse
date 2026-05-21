<script lang="ts">
	// SettingsPane V5-04 — Outlined Data-Led (S1.2 outlined + S2.4 data-led)
	// Self-contained prototype. No external imports.
	// Values are prominent in JBM, every section sits in a visible outline.

	const user = {
		name: 'nova.lee',
		displayName: 'Nova Lee',
		bio: 'Designing quiet spaces for loud thoughts.',
		avatar: 'https://i.pravatar.cc/150?u=nova-lee',
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
		<h1 class="display">Preferences</h1>
		<p class="head-sub">Configure your presence, notifications, and theme.</p>
	</header>

	<div class="scroll">
		<!-- Identity panel -->
		<section class="panel">
			<div class="panel-head">
				<span class="sec-eyebrow">N° 01 / IDENTITY</span>
				<span class="sec-value">@{user.name.toUpperCase()}</span>
			</div>
			<div class="panel-body">
				<div class="id-row">
					<div class="pfp-wrap">
						<img src={user.avatar} alt="" class="pfp" />
						<div class="tex tex-pfp"></div>
						<span class="dot {presence}"></span>
					</div>
					<div class="id-meta">
						<span class="id-name">{displayName}</span>
						<span class="id-bio">{user.bio}</span>
					</div>
				</div>
				<label class="field-stack">
					<span class="field-name">Display name</span>
					<input bind:value={displayName} />
				</label>
			</div>
		</section>

		<!-- Presence panel -->
		<section class="panel">
			<div class="panel-head">
				<span class="sec-eyebrow">N° 02 / PRESENCE</span>
				<span class="sec-value">{presence.toUpperCase()}</span>
			</div>
			<div class="panel-body">
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
					<div class="field-label">
						<span class="field-name">Auto-AFK</span>
						<span class="field-help">After 10 min idle</span>
					</div>
					<div class="field-control">
						<span class="field-value">{autoAfk ? 'ON' : 'OFF'}</span>
						<button class="toggle" class:on={autoAfk} onclick={() => autoAfk = !autoAfk} aria-label="Toggle Auto-AFK">
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Notifications panel -->
		<section class="panel">
			<div class="panel-head">
				<span class="sec-eyebrow">N° 03 / NOTIFICATIONS</span>
				<span class="sec-value">{[pushEnabled, typingEnabled, readReceipts].filter(Boolean).length} / 3 ON</span>
			</div>
			<div class="panel-body">
				<div class="field-row">
					<span class="field-name">Push alerts</span>
					<div class="field-control">
						<span class="field-value">{pushEnabled ? 'ON' : 'OFF'}</span>
						<button class="toggle" class:on={pushEnabled} onclick={() => pushEnabled = !pushEnabled} aria-label="Toggle push">
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
				<div class="field-row">
					<span class="field-name">Typing indicators</span>
					<div class="field-control">
						<span class="field-value">{typingEnabled ? 'ON' : 'OFF'}</span>
						<button class="toggle" class:on={typingEnabled} onclick={() => typingEnabled = !typingEnabled} aria-label="Toggle typing">
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
				<div class="field-row">
					<span class="field-name">Read receipts</span>
					<div class="field-control">
						<span class="field-value">{readReceipts ? 'ON' : 'OFF'}</span>
						<button class="toggle" class:on={readReceipts} onclick={() => readReceipts = !readReceipts} aria-label="Toggle receipts">
							<span class="toggle-thumb"></span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Theme panel -->
		<section class="panel">
			<div class="panel-head">
				<span class="sec-eyebrow">N° 05 / THEME</span>
				<span class="sec-value">{themeName}</span>
			</div>
			<div class="panel-body">
				<div class="theme-grid">
					{#each themes as t}
						<button class="theme-btn" class:active={themeName === t.id} onclick={() => themeName = t.id}>
							<span class="theme-swatch" style:background={t.accent}></span>
							<span class="theme-label">{t.label}</span>
						</button>
					{/each}
				</div>
			</div>
		</section>

		<!-- Sign out -->
		<section class="panel panel-danger">
			<div class="panel-head">
				<span class="sec-eyebrow">N° 06 / SESSION</span>
				<span class="sec-value sec-value-danger">ACTIVE</span>
			</div>
			<div class="panel-body">
				<button class="signout">Sign out</button>
			</div>
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

	.head {
		position: relative; z-index: 1;
		padding: 32px 36px 22px;
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
		display: block; margin-bottom: 10px;
	}
	.display {
		font-size: 2.2rem; font-weight: 700;
		letter-spacing: -1.5px; line-height: 0.95;
		color: var(--p-text, oklch(0.93 0.012 280));
		margin: 0 0 6px;
	}
	.head-sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-muted, oklch(0.65 0.050 280));
		margin: 0;
	}

	.scroll {
		position: relative; z-index: 1;
		flex: 1; overflow-y: auto;
		padding: 22px 36px 36px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}
	@container (min-width: 700px) {
		.scroll {
			grid-template-columns: repeat(2, 1fr);
		}
		/* Identity + sign out span full width */
		.scroll > .panel:first-child,
		.scroll > .panel-danger {
			grid-column: 1 / -1;
		}
	}

	/* Outlined panels */
	.panel {
		border: 1px solid var(--p-line-2, oklch(0.78 0.090 280 / 0.22));
		border-radius: var(--r-md, 14px);
		overflow: hidden;
	}
	.panel-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 18px;
		background: oklch(1 0 0 / 0.03);
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.panel-body { padding: 18px; }

	.sec-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
	}
	.sec-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 1.5px;
		color: var(--p-accent, oklch(0.69 0.140 285));
		font-weight: 500;
	}
	.sec-value-danger {
		color: var(--p-warning, oklch(0.62 0.070 35));
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
	.id-meta { display: flex; flex-direction: column; gap: 4px; }
	.id-name {
		font-size: 1.15rem; font-weight: 600;
		letter-spacing: -0.3px;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.id-bio {
		font-size: 0.88rem;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		line-height: 1.5;
	}

	.field-stack { display: flex; flex-direction: column; gap: 8px; }
	.field-stack input {
		background: oklch(1 0 0 / 0.04);
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-sm, 8px);
		padding: 11px 14px;
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.86rem;
		transition: border-color 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.field-stack input:focus {
		outline: none;
		border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
	}

	/* Presence */
	.presence-picker {
		display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
		margin-bottom: 14px;
	}
	.presence-btn {
		display: flex; align-items: center; gap: 8px;
		padding: 10px 14px;
		background: transparent;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-md, 14px);
		color: var(--p-text-2, oklch(0.80 0.025 280));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.presence-btn.active {
		border-color: var(--p-accent, oklch(0.69 0.140 285));
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.presence-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	.presence-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.presence-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.presence-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.presence-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	/* Field row */
	.field-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.field-row:last-child { border-bottom: none; }
	.field-label { display: flex; flex-direction: column; gap: 3px; }
	.field-name {
		font-size: 0.95rem; font-weight: 500;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.field-help {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 1px;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}
	.field-control { display: flex; align-items: center; gap: 12px; }
	.field-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 1.5px;
		color: var(--p-muted, oklch(0.65 0.050 280));
		min-width: 32px; text-align: right;
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
	.wallpaper-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
	.wp-btn {
		display: flex; flex-direction: column; align-items: center; gap: 8px;
		padding: 10px 8px;
		background: transparent;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-md, 14px);
		color: var(--p-text-2, oklch(0.80 0.025 280));
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.wp-btn.active {
		border-color: var(--p-accent, oklch(0.69 0.140 285));
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
	}
	.wp-swatch {
		width: 100%; height: 32px;
		border-radius: var(--r-sm, 8px);
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.wp-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.2px; text-transform: uppercase;
	}

	/* Theme grid */
	.theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
	.theme-btn {
		display: flex; flex-direction: column; align-items: center; gap: 8px;
		padding: 12px;
		background: transparent;
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-md, 14px);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		color: var(--p-text-2, oklch(0.80 0.025 280));
	}
	.theme-btn.active {
		border-color: var(--p-accent, oklch(0.69 0.140 285));
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
	}
	.theme-swatch {
		width: 32px; height: 32px; border-radius: 50%;
		background: var(--p-accent, oklch(0.69 0.140 285));
		opacity: 0.7;
	}
	.theme-btn.active .theme-swatch { opacity: 1; }
	.theme-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.5px; text-transform: uppercase;
	}

	/* Sign out */
	.panel-danger {
		border-color: var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32));
	}
	.panel-danger .panel-head {
		background: var(--p-warning-soft, oklch(0.62 0.070 35 / 0.12));
		border-bottom-color: var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32));
	}
	.signout {
		width: 100%; padding: 12px;
		background: var(--p-warning-soft, oklch(0.62 0.070 35 / 0.12));
		color: var(--p-warning, oklch(0.62 0.070 35));
		border: 1px solid var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.signout:hover { background: var(--p-warning-edge, oklch(0.62 0.070 35 / 0.32)); }
</style>
