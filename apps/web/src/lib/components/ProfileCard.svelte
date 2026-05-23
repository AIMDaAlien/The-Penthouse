<script lang="ts">
	interface Props {
		person: {
			id: string;
			name: string;
			role?: string;
			location?: string;
			bio: string | null;
			avatar: string | null;
			banner: string | null;
			status?: 'online' | 'away' | 'offline';
		};
		style: 'editorial' | 'vogue' | 'wallpaper';
		onMessage?: (userId: string) => void;
	}

	let { person, style, onMessage }: Props = $props();

	const handle = $derived(person.name.toLowerCase().replace(/\s/g, '.'));
</script>

{#if style === 'editorial'}
	<div class="pc pc-editorial">
		{#if person.banner}
			<div class="pc-banner-wrap">
				<img src={person.banner} alt="" />
			</div>
		{/if}
		<div class="pc-body">
			<div class="pc-pfp-wrap">
				{#if person.avatar}
					<img src={person.avatar} alt="" class="pc-pfp" />
				{:else}
					<div class="pc-pfp fallback">{person.name.slice(0, 2).toUpperCase()}</div>
				{/if}
				{#if person.status}
					<span class="status-dot lg {person.status}"></span>
				{/if}
			</div>
			<span class="pc-name">{person.name}</span>
			<span class="pc-handle">@{handle}</span>
			{#if person.role || person.location}
				<div class="pc-meta">
					{#if person.role}<span>{person.role}</span>{/if}
					{#if person.role && person.location}<span class="dot-sep">·</span>{/if}
					{#if person.location}<span>{person.location}</span>{/if}
				</div>
			{/if}
			{#if person.bio}
				<p class="pc-bio">{person.bio}</p>
			{/if}
			<div class="pc-actions">
				{#if onMessage}
					<button class="btn-primary" onclick={() => onMessage(person.id)}>Message</button>
				{/if}
				<button class="btn-ghost">View portfolio</button>
			</div>
		</div>
	</div>
{:else if style === 'vogue'}
	<div class="pc pc-vogue">
		{#if person.banner}
			<div class="pc-banner-wrap big">
				<img src={person.banner} alt="" />
				<div class="pc-shade"></div>
				<div class="pc-overlay">
					<span class="pc-overlay-eyebrow">N° 0{person.id.slice(-1)}</span>
					<h2 class="pc-display-name">{person.name.split(' ')[0]}<br/>{person.name.split(' ')[1] ?? ''}</h2>
				</div>
			</div>
		{/if}
		<div class="pc-body pc-body-vogue">
			<div class="pc-pfp-wrap big">
				{#if person.avatar}
					<img src={person.avatar} alt="" class="pc-pfp" />
				{:else}
					<div class="pc-pfp fallback">{person.name.slice(0, 2).toUpperCase()}</div>
				{/if}
				{#if person.status}
					<span class="status-dot lg {person.status}"></span>
				{/if}
			</div>
			{#if person.role || person.location}
				<div class="pc-meta-line">
					{#if person.role}<span>{person.role}</span>{/if}
					{#if person.role && person.location}<span class="dot-sep">/</span>{/if}
					{#if person.location}<span>{person.location.toUpperCase()}</span>{/if}
				</div>
			{/if}
			{#if person.bio}
				<p class="pc-bio">{person.bio}</p>
			{/if}
			<div class="pc-actions">
				{#if onMessage}
					<button class="btn-primary" onclick={() => onMessage(person.id)}>Message</button>
				{/if}
				<button class="btn-ghost">Portfolio</button>
			</div>
		</div>
	</div>
{:else}
	<div class="pc pc-wallpaper">
		{#if person.banner}
			<img src={person.banner} alt="" class="pc-bg" />
		{/if}
		<div class="pc-bg-shade"></div>
		<div class="pc-floating">
			<div class="pcf-head">
				<div class="pc-pfp-wrap">
					{#if person.avatar}
						<img src={person.avatar} alt="" class="pc-pfp" />
					{:else}
						<div class="pc-pfp fallback">{person.name.slice(0, 2).toUpperCase()}</div>
					{/if}
					{#if person.status}
						<span class="status-dot lg {person.status}"></span>
					{/if}
				</div>
				<div class="pcf-id">
					<span class="pc-name light">{person.name}</span>
					<span class="pc-handle light">@{handle}</span>
				</div>
			</div>
			{#if person.role || person.location || person.status}
				<div class="pcf-grid">
					{#if person.role}<div><span class="pcf-label">Role</span><span class="pcf-value">{person.role}</span></div>{/if}
					{#if person.location}<div><span class="pcf-label">Location</span><span class="pcf-value">{person.location}</span></div>{/if}
					{#if person.status}<div><span class="pcf-label">Status</span><span class="pcf-value">{person.status}</span></div>{/if}
				</div>
			{/if}
			{#if person.bio}
				<p class="pc-bio light">{person.bio}</p>
			{/if}
			<div class="pc-actions">
				{#if onMessage}
					<button class="btn-primary on-dark" onclick={() => onMessage(person.id)}>Message</button>
				{/if}
				<button class="btn-ghost on-dark">Portfolio</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Shared ── */
	.pc {
		width: 100%;
		max-width: 540px;
		background: var(--p-surface);
		border: 1px solid var(--p-line);
		border-radius: var(--r-lg);
		overflow: hidden;
	}

	.pc-banner-wrap {
		width: 100%;
		height: 150px;
		overflow: hidden;
	}
	.pc-banner-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.pc-banner-wrap.big {
		height: 240px;
		position: relative;
	}
	.pc-vogue .pc-banner-wrap.big img {
		filter: brightness(0.6);
	}

	.pc-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, oklch(0 0 0 / 0.3) 0%, transparent 35%, var(--p-surface) 100%);
	}

	.pc-overlay {
		position: absolute;
		left: var(--sp-4);
		bottom: 56px;
	}
	.pc-overlay-eyebrow {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 3px;
		text-transform: uppercase;
		color: oklch(1 0 0 / 0.85);
		display: block;
		margin-bottom: 8px;
	}
	.pc-display-name {
		font-size: 3rem;
		font-weight: 700;
		letter-spacing: -2px;
		line-height: 0.86;
		color: oklch(1 0 0 / 0.98);
		margin: 0;
		text-transform: uppercase;
	}

	.pc-body {
		padding: 0 var(--sp-4) var(--sp-4);
	}
	.pc-body-vogue {
		margin-top: -36px;
	}

	.pc-pfp-wrap {
		position: relative;
		width: 96px;
		height: 96px;
		margin-top: -48px;
		margin-bottom: var(--sp-3);
	}
	.pc-pfp-wrap.big {
		width: 108px;
		height: 108px;
		margin-top: 0;
	}
	.pc-pfp {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 4px solid var(--p-surface);
	}
	.pc-pfp.fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--p-surface-2);
		color: var(--p-text);
		font-family: var(--font-sans);
		font-size: 1.8rem;
		font-weight: 700;
	}

	.pc-pfp-wrap .status-dot {
		position: absolute;
		bottom: 4px;
		right: 4px;
		border-color: var(--p-surface);
	}

	.pc-name {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.5px;
		color: var(--p-text);
	}
	.pc-handle {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		letter-spacing: 1px;
		color: var(--p-accent);
		margin-top: 2px;
	}
	.pc-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 8px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--p-muted);
	}
	.dot-sep {
		color: var(--p-line-2);
	}
	.pc-meta-line {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: var(--sp-2);
		margin-bottom: var(--sp-3);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--p-secondary);
	}
	.pc-bio {
		font-size: 0.96rem;
		line-height: 1.6;
		color: var(--p-text-2);
		margin: var(--sp-3) 0 var(--sp-4);
	}
	.pc-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* Status dots */
	.status-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--p-surface);
	}
	.status-dot.lg {
		width: 16px;
		height: 16px;
		border-width: 3px;
	}
	.status-dot.online {
		background: var(--p-success);
	}
	.status-dot.away {
		background: var(--p-warning);
	}
	.status-dot.offline {
		background: var(--p-muted);
	}

	/* ── Wallpaper variant ── */
	.pc-wallpaper {
		position: relative;
		height: 440px;
		padding: 0;
	}
	.pc-wallpaper .pc-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.7);
	}
	.pc-wallpaper .pc-bg-shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(135deg, oklch(0 0 0 / 0.32) 0%, transparent 50%),
			linear-gradient(0deg, oklch(0 0 0 / 0.50) 0%, transparent 50%);
	}
	.pc-floating {
		position: absolute;
		left: var(--sp-4);
		right: var(--sp-4);
		top: 50%;
		transform: translateY(-50%);
		padding: var(--sp-4);
		background: color-mix(in oklch, var(--p-bg) 78%, transparent);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid oklch(1 0 0 / 0.14);
		border-radius: var(--r-lg);
	}
	.pcf-head {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: var(--sp-3);
	}
	.pcf-head .pc-pfp-wrap {
		width: 64px;
		height: 64px;
		margin: 0;
	}
	.pcf-head .pc-pfp {
		border: 3px solid oklch(1 0 0 / 0.22);
	}
	.pcf-head .status-dot {
		border-color: var(--p-bg);
	}
	.pcf-id {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.pc-name.light {
		font-size: 1.35rem;
		color: oklch(1 0 0 / 0.98);
	}
	.pc-handle.light {
		color: oklch(1 0 0 / 0.65);
	}
	.pc-bio.light {
		color: oklch(1 0 0 / 0.85);
		margin-bottom: var(--sp-3);
	}
	.pcf-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--sp-3);
		padding: 10px 0;
		border-top: 1px solid oklch(1 0 0 / 0.14);
		border-bottom: 1px solid oklch(1 0 0 / 0.14);
		margin-bottom: var(--sp-3);
	}
	.pcf-grid > div {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.pcf-label {
		font-family: var(--font-mono);
		font-size: 0.56rem;
		letter-spacing: 1.6px;
		text-transform: uppercase;
		color: oklch(1 0 0 / 0.55);
	}
	.pcf-value {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.8px;
		color: oklch(1 0 0 / 0.92);
		text-transform: capitalize;
	}

	/* Button overrides for dark surfaces */
	:global(.btn-primary.on-dark) {
		color: oklch(1 0 0 / 0.98);
	}
	:global(.btn-ghost.on-dark) {
		color: oklch(1 0 0 / 0.85);
		border-color: oklch(1 0 0 / 0.25);
	}
	:global(.btn-ghost.on-dark:hover) {
		background: oklch(1 0 0 / 0.08);
	}
</style>
