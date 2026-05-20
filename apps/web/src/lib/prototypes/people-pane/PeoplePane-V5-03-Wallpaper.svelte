<script lang="ts">
	// PeoplePane V5-03 — Wallpaper (P1.2, banner is dominant, meta below in JBM N°04 style)
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
		{ id: '2', name: 'Jonas Hale', role: 'Architect', location: 'Copenhagen', bio: 'Concrete and light. Designing the Penthouse interiors and the conversation flows between them.', avatar: 'https://i.pravatar.cc/300?u=jonas', banner: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80', status: 'away' },
		{ id: '3', name: 'Suki Tanaka', role: 'Engineer', location: 'Tokyo', bio: 'Making the invisible visible. Systems and signals.', avatar: 'https://i.pravatar.cc/300?u=suki', banner: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80', status: 'online' },
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
		<!-- Full wallpaper background -->
		<div class="wallpaper-bg">
			<img src={focus.banner} alt="" class="wallpaper-img" />
			<div class="tex tex-wallpaper"></div>
			<div class="wallpaper-gradient"></div>
		</div>

		<!-- Floating identity card -->
		<div class="id-card">
			<div class="id-card-head">
				<div class="focus-pfp-wrap">
					<img src={focus.avatar} alt="" class="focus-pfp" />
					<div class="tex tex-pfp"></div>
					<span class="focus-dot {focus.status}"></span>
				</div>
				<div class="id-card-meta">
					<span class="focus-name">{focus.name}</span>
					<span class="focus-handle">@{focus.name.toLowerCase().replace(/\s/g, '.')}</span>
				</div>
			</div>

			<div class="meta-grid">
				<div class="meta-cell">
					<span class="meta-label">Role</span>
					<span class="meta-value">{focus.role}</span>
				</div>
				<div class="meta-cell">
					<span class="meta-label">Location</span>
					<span class="meta-value">{focus.location}</span>
				</div>
				<div class="meta-cell">
					<span class="meta-label">Status</span>
					<span class="meta-value">{focus.status}</span>
				</div>
			</div>

			<p class="focus-bio">{focus.bio}</p>

			<div class="focus-actions">
				<button class="btn-primary">Message</button>
				<button class="btn-ghost">Portfolio</button>
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
	.tex-wallpaper { inset: 0; opacity: 0.30; }
	.tex-pfp { inset: 0; border-radius: 50%; opacity: 0.45; z-index: 2; }
	.tex-avatar { inset: 0; border-radius: 50%; opacity: 0.45; }

	/* Roster (same as canonical) */
	.roster {
		position: relative; z-index: 2;
		width: 300px; flex-shrink: 0;
		display: flex; flex-direction: column;
		background: oklch(0.16 0.020 280 / 0.85);
		backdrop-filter: blur(18px);
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
	.roster-item:hover { background: oklch(1 0 0 / 0.06); }
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

	/* Wallpaper-led focus pane */
	.focus {
		position: relative; z-index: 1;
		flex: 1;
		overflow: hidden;
	}
	.wallpaper-bg {
		position: absolute; inset: 0;
		z-index: 0;
	}
	.wallpaper-img {
		width: 100%; height: 100%;
		object-fit: cover;
		filter: brightness(0.7);
	}
	.wallpaper-gradient {
		position: absolute; inset: 0;
		background:
			linear-gradient(135deg, oklch(0 0 0 / 0.3) 0%, transparent 50%),
			linear-gradient(0deg, oklch(0 0 0 / 0.55) 0%, transparent 50%);
	}

	/* Floating identity card — midheight */
	.id-card {
		position: absolute;
		left: 32px; right: 32px;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		padding: 24px 28px;
		background: oklch(0.16 0.020 280 / 0.75);
		backdrop-filter: blur(20px);
		border: 1px solid oklch(1 0 0 / 0.12);
		border-radius: var(--r-lg, 22px);
		box-shadow: 0 14px 36px oklch(0 0 0 / 0.45);
	}
	.id-card-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
	.focus-pfp-wrap {
		position: relative;
		width: 72px; height: 72px;
		flex-shrink: 0;
	}
	.focus-pfp {
		width: 100%; height: 100%;
		border-radius: 50%; object-fit: cover;
		border: 3px solid oklch(1 0 0 / 0.20);
		position: relative; z-index: 1;
	}
	.focus-dot {
		position: absolute; bottom: 2px; right: 2px;
		width: 16px; height: 16px;
		border-radius: 50%;
		border: 2px solid oklch(0.16 0.020 280);
		z-index: 3;
	}
	.focus-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.focus-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.focus-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }
	.id-card-meta { display: flex; flex-direction: column; gap: 4px; }
	.focus-name {
		font-size: 1.6rem; font-weight: 700;
		letter-spacing: -0.6px;
		color: oklch(1 0 0 / 0.98);
	}
	.focus-handle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.78rem; letter-spacing: 1px;
		color: oklch(1 0 0 / 0.65);
	}

	/* Meta grid — three labeled values */
	.meta-grid {
		display: grid; grid-template-columns: repeat(3, 1fr);
		gap: 18px;
		padding: 14px 0;
		margin-bottom: 16px;
		border-top: 1px solid oklch(1 0 0 / 0.12);
		border-bottom: 1px solid oklch(1 0 0 / 0.12);
	}
	.meta-cell { display: flex; flex-direction: column; gap: 4px; }
	.meta-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 1.8px; text-transform: uppercase;
		color: oklch(1 0 0 / 0.55);
	}
	.meta-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.8rem; letter-spacing: 0.8px;
		color: oklch(1 0 0 / 0.92);
		text-transform: capitalize;
	}

	.focus-bio {
		font-size: 0.95rem; line-height: 1.6;
		color: oklch(1 0 0 / 0.85);
		margin: 0 0 18px;
		max-width: 420px;
	}

	.focus-actions { display: flex; gap: 10px; }
	.btn-primary {
		padding: 10px 22px;
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.30));
		color: oklch(1 0 0 / 0.95);
		border: 1px solid var(--p-accent-edge, oklch(0.69 0.140 285 / 0.50));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-primary:hover { background: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.50)); }
	.btn-ghost {
		padding: 10px 22px;
		background: transparent;
		color: oklch(1 0 0 / 0.75);
		border: 1px solid oklch(1 0 0 / 0.20);
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.btn-ghost:hover { background: oklch(1 0 0 / 0.08); border-color: oklch(1 0 0 / 0.32); }
</style>
