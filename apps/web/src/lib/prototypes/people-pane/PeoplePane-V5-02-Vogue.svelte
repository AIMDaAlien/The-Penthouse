<script lang="ts">
	// PeoplePane V5-02 — Vogue (P1.1, large display name + big pfp overlap)
	// Self-contained prototype. No external imports.

	interface Person {
		id: string;
		name: string;
		role: string;
		location: string;
		bio: string;
		avatar: string;
		banner: string;
		status: 'online' | 'away' | 'offline';
	}

	const roster: Person[] = [
		{ id: '1', name: 'Amelie Voss', role: 'Editor', location: 'Berlin', bio: 'Curating the spaces between words. Previously at Monocle, now building something quieter.', avatar: 'https://i.pravatar.cc/300?u=amelie', banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', status: 'online' },
		{ id: '2', name: 'Jonas Hale', role: 'Architect', location: 'Copenhagen', bio: 'Concrete and light. Designing the Penthouse interiors.', avatar: 'https://i.pravatar.cc/300?u=jonas', banner: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80', status: 'away' },
		{ id: '3', name: 'Suki Tanaka', role: 'Engineer', location: 'Tokyo', bio: 'Making the invisible visible.', avatar: 'https://i.pravatar.cc/300?u=suki', banner: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80', status: 'online' },
		{ id: '4', name: 'Marcus Reid', role: 'Producer', location: 'London', bio: 'Sound and silence in equal measure.', avatar: 'https://i.pravatar.cc/300?u=marcus', banner: 'https://images.unsplash.com/photo-1518173946687-a1f8a54d877a?w=1200&q=80', status: 'offline' },
	];

	let focusId = $state('1');
	const focus = $derived(roster.find(p => p.id === focusId) ?? roster[0]);
</script>

<div class="pane">
	<div class="tex"></div>

	<aside class="roster">
		<header class="roster-head">
			<span class="eyebrow">N° 04 / DIRECTORY</span>
			<h1 class="display">People</h1>
		</header>
		<div class="roster-list">
			{#each roster as person}
				<button
					class="roster-item"
					class:active={focusId === person.id}
					onclick={() => focusId = person.id}
				>
					<div class="r-avatar-wrap">
						<img src={person.avatar} alt="" class="r-avatar" />
						<div class="tex tex-avatar"></div>
						<span class="r-dot {person.status}"></span>
					</div>
					<div class="r-meta">
						<span class="r-name">{person.name}</span>
						<span class="r-role">{person.role}</span>
					</div>
				</button>
			{/each}
		</div>
	</aside>

	<div class="focus">
		<!-- Banner -->
		<div class="focus-banner-wrap">
			<img src={focus.banner} alt="" class="focus-banner" />
			<div class="tex tex-banner"></div>
			<div class="banner-gradient"></div>

			<!-- Display name overlays banner -->
			<div class="display-overlay">
				<span class="display-eyebrow">N° 0{focus.id}</span>
				<h2 class="display-name">{focus.name.split(' ')[0]}<br/>{focus.name.split(' ')[1] ?? ''}</h2>
			</div>
		</div>

		<!-- Body with big pfp overlap -->
		<div class="focus-body">
			<div class="focus-pfp-wrap">
				<img src={focus.avatar} alt="" class="focus-pfp" />
				<div class="tex tex-pfp"></div>
				<span class="focus-dot {focus.status}"></span>
			</div>

			<div class="focus-meta-line">
				<span>{focus.role}</span>
				<span class="focus-meta-div">/</span>
				<span>{focus.location.toUpperCase()}</span>
				<span class="focus-meta-div">/</span>
				<span>@{focus.name.toLowerCase().replace(/\s/g, '.')}</span>
			</div>

			<p class="focus-bio">{focus.bio}</p>

			<div class="focus-actions">
				<button class="btn-primary">Message</button>
				<button class="btn-ghost">View portfolio</button>
			</div>
		</div>
	</div>
</div>

<style>
	.pane {
		position: relative;
		width: 860px;
		height: 760px;
		background: var(--p-bg, oklch(0.16 0.020 280));
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
		display: flex;
		border-radius: var(--r-lg, 22px);
	}

	.tex {
		position: absolute; inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay; opacity: 0.40; pointer-events: none; z-index: 0;
	}
	.tex-banner { inset: 0; border-radius: 0 0 var(--r-lg, 22px) 0; opacity: 0.35; }
	.tex-pfp { inset: 0; border-radius: 50%; opacity: 0.45; z-index: 2; }
	.tex-avatar { inset: 0; border-radius: 50%; opacity: 0.45; }

	/* Roster */
	.roster {
		position: relative; z-index: 1;
		width: 300px; flex-shrink: 0;
		display: flex; flex-direction: column;
		border-right: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.roster-head {
		padding: 32px 28px 22px;
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
		margin: 0;
	}

	.roster-list {
		flex: 1; overflow-y: auto;
		padding: 12px 16px;
		display: flex; flex-direction: column; gap: 4px;
	}
	.roster-item {
		display: flex; align-items: center; gap: 12px;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm, 8px);
		cursor: pointer;
		transition: background 0.15s;
		width: 100%; text-align: left; color: inherit;
	}
	.roster-item:hover { background: oklch(1 0 0 / 0.04); }
	.roster-item.active { background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16)); }
	.r-avatar-wrap { position: relative; width: 38px; height: 38px; flex-shrink: 0; }
	.r-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.r-dot {
		position: absolute; bottom: 1px; right: 1px;
		width: 10px; height: 10px; border-radius: 50%;
		border: 2px solid var(--p-bg, oklch(0.16 0.020 280));
	}
	.r-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.r-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.r-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.r-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
	.r-name {
		font-size: 0.9rem; font-weight: 500;
		color: var(--p-text, oklch(0.93 0.012 280));
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.r-role {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem; letter-spacing: 1.2px; text-transform: uppercase;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}

	/* Focus pane — Vogue style */
	.focus {
		position: relative; z-index: 1;
		flex: 1;
		display: flex; flex-direction: column;
		overflow-y: auto;
	}
	.focus-banner-wrap {
		position: relative;
		width: 100%; height: 340px;
		overflow: hidden;
		flex-shrink: 0;
	}
	.focus-banner {
		width: 100%; height: 100%; object-fit: cover; display: block;
		filter: brightness(0.6);
	}
	.banner-gradient {
		position: absolute; inset: 0;
		background: linear-gradient(180deg, oklch(0 0 0 / 0.4) 0%, transparent 40%, var(--p-bg, oklch(0.16 0.020 280)) 100%);
	}
	.display-overlay {
		position: absolute;
		left: 36px; bottom: 90px;
		z-index: 3;
	}
	.display-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 3px;
		color: oklch(1 0 0 / 0.85);
		display: block; margin-bottom: 12px;
	}
	.display-name {
		font-size: 3.8rem;
		font-weight: 700;
		letter-spacing: -2.5px;
		line-height: 0.86;
		color: oklch(1 0 0 / 0.98);
		margin: 0;
		text-transform: uppercase;
	}

	.focus-body {
		padding: 0 36px 36px;
		position: relative;
		margin-top: -50px;
	}
	.focus-pfp-wrap {
		position: relative;
		width: 130px; height: 130px;
		margin-bottom: 22px;
	}
	.focus-pfp {
		width: 100%; height: 100%;
		border-radius: 50%; object-fit: cover;
		border: 5px solid var(--p-bg, oklch(0.16 0.020 280));
		position: relative; z-index: 1;
	}
	.focus-dot {
		position: absolute; bottom: 8px; right: 8px;
		width: 20px; height: 20px;
		border-radius: 50%;
		border: 3px solid var(--p-bg, oklch(0.16 0.020 280));
		z-index: 3;
	}
	.focus-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.focus-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.focus-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }

	.focus-meta-line {
		display: flex; align-items: center; gap: 10px;
		margin-bottom: 18px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
		flex-wrap: wrap;
	}
	.focus-meta-div { color: var(--p-line-2, oklch(0.78 0.090 280 / 0.22)); }

	.focus-bio {
		font-size: 1.05rem; line-height: 1.65;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		margin: 0 0 26px;
		max-width: 460px;
	}

	.focus-actions { display: flex; gap: 12px; }
	.btn-primary {
		padding: 11px 24px;
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
		color: var(--p-accent, oklch(0.69 0.140 285));
		border: 1px solid var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-primary:hover { background: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36)); }
	.btn-ghost {
		padding: 11px 24px;
		background: transparent;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.btn-ghost:hover {
		background: oklch(1 0 0 / 0.04);
		border-color: var(--p-line-2, oklch(0.78 0.090 280 / 0.22));
	}
</style>
