<script lang="ts">
	// PeoplePane V5-01 — Editorial (canonical)
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
		{ id: '1', name: 'Amelie Voss', role: 'Editor', location: 'Berlin', bio: 'Curating the spaces between words. Previously at Monocle, now building something quieter.', avatar: 'https://i.pravatar.cc/150?u=amelie', banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', status: 'online' },
		{ id: '2', name: 'Jonas Hale', role: 'Architect', location: 'Copenhagen', bio: 'Concrete and light. Designing the Penthouse interiors and the conversation flows between them.', avatar: 'https://i.pravatar.cc/150?u=jonas', banner: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80', status: 'away' },
		{ id: '3', name: 'Suki Tanaka', role: 'Engineer', location: 'Tokyo', bio: 'Making the invisible visible. Systems, signals, and the quiet hum of things working as they should.', avatar: 'https://i.pravatar.cc/150?u=suki', banner: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80', status: 'online' },
		{ id: '4', name: 'Marcus Reid', role: 'Producer', location: 'London', bio: 'Sound and silence in equal measure. Voice channels, audio messages, the texture of a room.', avatar: 'https://i.pravatar.cc/150?u=marcus', banner: 'https://images.unsplash.com/photo-1518173946687-a1f8a54d877a?w=800&q=80', status: 'offline' },
	];

	let focusId = $state('1');
	const focus = $derived(roster.find(p => p.id === focusId) ?? roster[0]);
</script>

<div class="pane">
	<div class="tex"></div>

	<!-- Roster (left side) -->
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

	<!-- Focus pane (right side) -->
	<div class="focus">
		<div class="focus-banner-wrap">
			<img src={focus.banner} alt="" class="focus-banner" />
			<div class="tex tex-banner"></div>
		</div>

		<div class="focus-body">
			<div class="focus-pfp-wrap">
				<img src={focus.avatar} alt="" class="focus-pfp" />
				<div class="tex tex-pfp"></div>
				<span class="focus-dot {focus.status}"></span>
			</div>

			<div class="focus-id">
				<span class="focus-name">{focus.name}</span>
				<span class="focus-handle">@{focus.name.toLowerCase().replace(/\s/g, '.')}</span>
				<div class="focus-meta">
					<span class="focus-meta-item">{focus.role}</span>
					<span class="focus-meta-div">·</span>
					<span class="focus-meta-item">{focus.location}</span>
				</div>
			</div>

			<div class="focus-bio">
				<p>{focus.bio}</p>
			</div>

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

	/* Texture */
	.tex {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay;
		opacity: 0.40;
		pointer-events: none;
		z-index: 0;
	}
	.tex-banner {
		inset: 0;
		border-radius: 0 0 var(--r-lg, 22px) 0;
		opacity: 0.35;
	}
	.tex-pfp {
		inset: 0;
		border-radius: 50%;
		opacity: 0.45;
	}
	.tex-avatar {
		inset: 0;
		border-radius: 50%;
		opacity: 0.45;
	}

	/* Roster */
	.roster {
		position: relative;
		z-index: 1;
		width: 320px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.roster-head {
		padding: 32px 28px 22px;
		border-bottom: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--p-secondary, oklch(0.78 0.090 280));
		display: block;
		margin-bottom: 10px;
	}
	.display {
		font-size: 2.2rem;
		font-weight: 700;
		letter-spacing: -1.5px;
		line-height: 0.95;
		color: var(--p-text, oklch(0.93 0.012 280));
		margin: 0;
	}

	.roster-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.roster-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm, 8px);
		cursor: pointer;
		transition: background 0.15s;
		width: 100%;
		text-align: left;
		color: inherit;
	}
	.roster-item:hover {
		background: oklch(1 0 0 / 0.04);
	}
	.roster-item.active {
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
	}

	.r-avatar-wrap {
		position: relative;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
	}
	.r-avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}
	.r-dot {
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--p-bg, oklch(0.16 0.020 280));
	}
	.r-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.r-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.r-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }

	.r-meta {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.r-name {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--p-text, oklch(0.93 0.012 280));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.r-role {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}

	/* Focus pane */
	.focus {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}
	.focus-banner-wrap {
		position: relative;
		width: 100%;
		height: 180px;
		overflow: hidden;
		flex-shrink: 0;
	}
	.focus-banner {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.focus-body {
		padding: 0 40px 40px;
		position: relative;
	}

	.focus-pfp-wrap {
		position: relative;
		width: 112px;
		height: 112px;
		margin-top: -56px;
		margin-bottom: 18px;
	}
	.focus-pfp {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 4px solid var(--p-bg, oklch(0.16 0.020 280));
	}
	.focus-dot {
		position: absolute;
		bottom: 6px;
		right: 6px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 3px solid var(--p-bg, oklch(0.16 0.020 280));
		z-index: 2;
	}
	.focus-dot.online  { background: var(--p-success, oklch(0.68 0.140 145)); }
	.focus-dot.away    { background: var(--p-warning, oklch(0.62 0.070 35)); }
	.focus-dot.offline { background: var(--p-muted, oklch(0.65 0.050 280)); }

	.focus-id {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 20px;
	}
	.focus-name {
		font-size: 1.8rem;
		font-weight: 700;
		letter-spacing: -0.8px;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.focus-handle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.82rem;
		letter-spacing: 1px;
		color: var(--p-accent, oklch(0.69 0.140 285));
	}
	.focus-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 6px;
	}
	.focus-meta-item {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: var(--p-muted, oklch(0.65 0.050 280));
	}
	.focus-meta-div {
		color: var(--p-line, oklch(0.78 0.090 280 / 0.12));
		font-size: 0.8rem;
	}

	.focus-bio {
		margin-bottom: 28px;
		max-width: 420px;
	}
	.focus-bio p {
		font-size: 1rem;
		line-height: 1.6;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		margin: 0;
	}

	.focus-actions {
		display: flex;
		gap: 12px;
	}

	/* Buttons */
	.btn-primary {
		padding: 11px 24px;
		background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
		color: var(--p-accent, oklch(0.69 0.140 285));
		border: 1px solid var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s;
	}
	.btn-primary:hover {
		background: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
	}

	.btn-ghost {
		padding: 11px 24px;
		background: transparent;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-pill, 999px);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.btn-ghost:hover {
		background: oklch(1 0 0 / 0.04);
		border-color: var(--p-line-2, oklch(0.78 0.090 280 / 0.22));
	}
</style>
