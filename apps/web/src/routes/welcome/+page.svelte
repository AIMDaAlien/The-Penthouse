<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>The Penthouse — Private Messaging, Rebuilt</title>
	<meta name="description" content="A privacy-focused messaging app as dynamic as your personality. Self-hosted, PWA-ready, beautifully themed." />
</svelte:head>

<div class="welcome">
	<div class="tex"></div>

	<header class="top">
		<div class="logo">
			<span class="logo-the">The</span>
			<span class="logo-pent">PENT</span>
			<span class="logo-house">HOUSE</span>
		</div>
		<nav>
			<button class="nav-btn" onclick={() => goto('/auth')}>Sign in</button>
			<button class="nav-btn primary" onclick={() => goto('/auth?mode=register')}>Get invited</button>
		</nav>
	</header>

	<main>
		<section class="hero">
			<div class="eyebrow">N° 04 / ALPHA</div>
			<h1>Messaging that respects<br />your space.</h1>
			<p class="lead">
				The Penthouse is a self-hosted, privacy-first messaging app.
				No phone numbers. No tracking. No servers you do not control.
				Just conversations, folders, and a design system that adapts to you.
			</p>
			<div class="hero-cta">
				<button class="cta primary" onclick={() => goto('/auth?mode=register')}>Request an invite</button>
				<button class="cta ghost" onclick={() => goto('/auth')}>Sign in</button>
			</div>
		</section>

		<section class="features">
			<h2>What is new in this release</h2>
			<div class="feature-grid">
				<div class="feature">
					<div class="feature-icon">◐</div>
					<h3>Production Ready</h3>
					<p>Docker Compose + Caddy deployment. One command to self-host on your own hardware. TrueNAS, Unraid, or any VPS.</p>
				</div>
				<div class="feature">
					<div class="feature-icon">✿</div>
					<h3>Ten Themes</h3>
					<p>From charcoal rust to oat stone. Every theme is hand-tuned in OKLCH with textured surfaces and accessible contrast.</p>
				</div>
				<div class="feature">
					<div class="feature-icon">◇</div>
					<h3>Folder Organization</h3>
					<p>Drag and drop chats into folders. Collapse, expand, reorder. Real-time sync across all your devices.</p>
				</div>
				<div class="feature">
					<div class="feature-icon">☁</div>
					<h3>PWA Install</h3>
					<p>Add The Penthouse to your home screen. Offline support, push notifications, and a native-app feel.</p>
				</div>
				<div class="feature">
					<div class="feature-icon">◐</div>
					<h3>Private by Design</h3>
					<p>Invite-only registration. Username-only identity. Recovery codes instead of email. Your data, your server.</p>
				</div>
				<div class="feature">
					<div class="feature-icon">⚒</div>
					<h3>Channels &amp; Groups</h3>
					<p>Create group chats with channels. Threaded conversations without the noise of traditional servers.</p>
				</div>
			</div>
		</section>

		<section class="compare">
			<h2>Coming from somewhere else?</h2>
			<div class="compare-grid">
				<div class="compare-card">
					<h4>Discord</h4>
					<p><strong>No servers.</strong> Just chats and folders. No noise, no bots, no algorithmic sorting. You own the data.</p>
				</div>
				<div class="compare-card">
					<h4>Signal</h4>
					<p><strong>No phone number required.</strong> Username-only. Self-hostable. Ten visual themes instead of one.</p>
				</div>
				<div class="compare-card">
					<h4>WhatsApp</h4>
					<p><strong>No Meta.</strong> Web-first PWA. Folders instead of labels. Works on any device with a browser.</p>
				</div>
				<div class="compare-card">
					<h4>Telegram</h4>
					<p><strong>No cloud.</strong> Self-hosted. Smaller, tighter scope. No bots or channels — just people you choose.</p>
				</div>
			</div>
		</section>

		<section class="tech">
			<h2>Built with</h2>
			<div class="tech-list">
				<span class="tech-item">SvelteKit 2</span>
				<span class="tech-item">Svelte 5 Runes</span>
				<span class="tech-item">Fastify 5</span>
				<span class="tech-item">Socket.IO</span>
				<span class="tech-item">Drizzle ORM</span>
				<span class="tech-item">PostgreSQL 16</span>
				<span class="tech-item">Workbox PWA</span>
				<span class="tech-item">OKLCH Color</span>
			</div>
		</section>
	</main>

	<footer>
		<div class="footer-inner">
			<span class="footer-eyebrow">N° 04 / THE PENTHOUSE</span>
			<p class="footer-copy">Alpha release. Self-hosted. Invite-only. Built for people who value their space.</p>
			<div class="footer-links">
				<button class="footer-link" onclick={() => goto('/auth')}>Sign in</button>
				<span class="footer-divider">&#9671;</span>
				<button class="footer-link" onclick={() => goto('/auth?mode=register')}>Request invite</button>
			</div>
		</div>
	</footer>
</div>

<style>
	.welcome {
		position: relative;
		min-height: 100dvh;
		background: var(--p-bg, oklch(0.16 0.020 280));
		color: var(--p-text, oklch(0.93 0.012 280));
		font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow-x: hidden;
	}

	.tex {
		position: fixed; inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay; opacity: 0.35; pointer-events: none; z-index: 0;
	}

	/* Header */
	.top {
		position: relative; z-index: 1;
		display: flex; align-items: center; justify-content: space-between;
		padding: 24px 32px;
		max-width: 1200px; margin: 0 auto;
	}
	.logo {
		display: flex; flex-direction: column;
		font-family: var(--font-display, 'Ubuntu');
		line-height: 0.88;
	}
	.logo-the {
		font-size: 0.85rem; font-weight: 400;
		color: var(--p-accent, oklch(0.69 0.140 285));
		letter-spacing: 0.08em; margin-bottom: 0.15em;
	}
	.logo-pent, .logo-house {
		font-size: 1.6rem; font-weight: 600;
		color: var(--p-text, oklch(0.93 0.012 280));
		letter-spacing: -0.015em; line-height: 0.95;
	}
	nav { display: flex; gap: 12px; }
	.nav-btn {
		padding: 10px 20px; border-radius: var(--r-pill, 999px);
		background: transparent; color: var(--p-text-2, oklch(0.80 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		font-size: 0.85rem; font-weight: 500; cursor: pointer;
		transition: all 0.15s; font-family: inherit;
	}
	.nav-btn:hover { background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16)); }
	.nav-btn.primary {
		background: var(--p-accent, oklch(0.69 0.140 285));
		color: var(--p-bg, oklch(0.16 0.020 280));
		border-color: var(--p-accent);
	}
	.nav-btn.primary:hover { opacity: 0.88; }

	/* Main */
	main {
		position: relative; z-index: 1;
		max-width: 1200px; margin: 0 auto;
		padding: 0 32px 80px;
	}

	/* Hero */
	.hero {
		padding: 80px 0 100px;
		text-align: center;
		max-width: 720px; margin: 0 auto;
	}
	.eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem; letter-spacing: 3px; text-transform: uppercase;
		color: var(--p-accent, oklch(0.69 0.140 285));
		margin-bottom: 20px;
	}
	.hero h1 {
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 700; letter-spacing: -1.8px;
		line-height: 1.05; margin: 0 0 24px;
		color: var(--p-text, oklch(0.93 0.012 280));
	}
	.lead {
		font-size: 1.05rem; line-height: 1.65;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		max-width: 560px; margin: 0 auto 36px;
	}
	.hero-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
	.cta {
		padding: 13px 28px; border-radius: var(--r-pill, 999px);
		font-size: 0.9rem; font-weight: 500; cursor: pointer;
		transition: all 0.15s; font-family: inherit; border: none;
	}
	.cta.primary {
		background: var(--p-accent, oklch(0.69 0.140 285));
		color: var(--p-bg, oklch(0.16 0.020 280));
	}
	.cta.primary:hover { opacity: 0.88; transform: translateY(-1px); }
	.cta.ghost {
		background: transparent;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
	}
	.cta.ghost:hover { background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16)); }

	/* Features */
	.features { padding: 60px 0; }
	.features h2 {
		font-size: 1.4rem; font-weight: 600;
		letter-spacing: -0.5px; margin-bottom: 48px;
		text-align: center;
	}
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 24px;
	}
	.feature {
		background: var(--p-surface, oklch(0.21 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-lg, 22px);
		padding: 28px;
		transition: border-color 0.2s;
	}
	.feature:hover { border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36)); }
	.feature-icon {
		font-size: 1.4rem; margin-bottom: 14px;
		color: var(--p-accent, oklch(0.69 0.140 285));
	}
	.feature h3 {
		font-size: 1.05rem; font-weight: 600;
		margin-bottom: 8px; letter-spacing: -0.3px;
	}
	.feature p {
		font-size: 0.88rem; line-height: 1.55;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		margin: 0;
	}

	/* Compare */
	.compare { padding: 60px 0; }
	.compare h2 {
		font-size: 1.4rem; font-weight: 600;
		letter-spacing: -0.5px; margin-bottom: 48px;
		text-align: center;
	}
	.compare-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 20px;
	}
	.compare-card {
		background: var(--p-surface, oklch(0.21 0.025 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-lg, 22px);
		padding: 24px;
	}
	.compare-card h4 {
		font-size: 0.95rem; font-weight: 600;
		margin-bottom: 10px;
		color: var(--p-accent, oklch(0.69 0.140 285));
	}
	.compare-card p {
		font-size: 0.85rem; line-height: 1.55;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		margin: 0;
	}
	.compare-card strong { color: var(--p-text, oklch(0.93 0.012 280)); }

	/* Tech */
	.tech { padding: 60px 0; text-align: center; }
	.tech h2 {
		font-size: 1.4rem; font-weight: 600;
		letter-spacing: -0.5px; margin-bottom: 32px;
	}
	.tech-list {
		display: flex; flex-wrap: wrap; gap: 10px;
		justify-content: center;
	}
	.tech-item {
		padding: 8px 16px;
		background: var(--p-surface-2, oklch(0.26 0.030 280));
		border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		border-radius: var(--r-pill, 999px);
		font-size: 0.8rem;
		font-family: 'JetBrains Mono', monospace;
		color: var(--p-text-2, oklch(0.80 0.025 280));
	}

	/* Footer */
	footer {
		position: relative; z-index: 1;
		border-top: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
		padding: 48px 32px;
	}
	.footer-inner {
		max-width: 1200px; margin: 0 auto;
		text-align: center;
	}
	.footer-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 3px; text-transform: uppercase;
		color: var(--p-muted, oklch(0.65 0.050 280));
		margin-bottom: 12px;
	}
	.footer-copy {
		font-size: 0.88rem; line-height: 1.55;
		color: var(--p-text-2, oklch(0.80 0.025 280));
		max-width: 480px; margin: 0 auto 20px;
	}
	.footer-links {
		display: flex; gap: 16px; justify-content: center; align-items: center;
	}
	.footer-link {
		background: none; border: none;
		color: var(--p-accent, oklch(0.69 0.140 285));
		font-size: 0.85rem; font-weight: 500; cursor: pointer;
		font-family: inherit; padding: 0;
	}
	.footer-link:hover { text-decoration: underline; }
	.footer-divider {
		color: var(--p-line, oklch(0.78 0.090 280 / 0.12));
		font-size: 0.7rem;
	}

	@media (max-width: 640px) {
		.top { flex-direction: column; gap: 16px; align-items: flex-start; }
		.hero { padding: 48px 0 64px; }
		main { padding: 0 20px 60px; }
	}
</style>
