<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let theme = $state<'dark' | 'light'>('dark');
	let showApk = $state(false);
	let apkUrl = $state('');

	let blobEl: HTMLDivElement = undefined!;
	let containerEl: HTMLDivElement = undefined!;

	onMount(async () => {
		try {
			const res = await fetch('https://api.penthouse.blog/api/v1/app-distribution');
			if (!res.ok) return;
			const data = await res.json();
			if (data?.legacyAndroid?.status === 'available') {
				apkUrl = data.legacyAndroid.url ?? '#';
				showApk = true;
			}
		} catch { /* silently hide */ }
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
	}

	function handleBlobMove(e: MouseEvent) {
		blobEl.style.opacity = '0.7';
		blobEl.style.left = e.clientX + 'px';
		blobEl.style.top = e.clientY + 'px';
	}

	function handleBlobLeave() {
		blobEl.style.opacity = '0';
	}

	function handleEnterApp() {
		const btn = document.getElementById('enter-btn') as HTMLButtonElement;
		const rect = btn.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		blobEl.style.opacity = '1';
		blobEl.style.left = x + 'px';
		blobEl.style.top = y + 'px';
		blobEl.style.transform = 'translate(-50%, -50%) scale(60)';
		blobEl.style.transition = 'transform 1.8s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.6s ease';

		containerEl.style.transition =
			'filter 1.2s ease, opacity 1s ease, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
		containerEl.style.filter = 'blur(20px)';
		containerEl.style.opacity = '0';
		containerEl.style.transform = 'scale(0.98)';

		setTimeout(() => {
			goto('/auth');
		}, 1400);
	}
</script>

<svelte:head>
	<title>The Penthouse</title>
	<link href="https://fonts.cdnfonts.com/css/erode?weights=400,600" rel="stylesheet" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Ubuntu:wght@300;400;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="welcome-root" data-theme={theme}>
	<!-- Fixed background layer: covers body gradient texture, contains atmospheric orbs -->
	<div class="bg-layer" aria-hidden="true">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
	</div>

	<!-- Film grain texture -->
	<div class="grain" aria-hidden="true"></div>

	<!-- Cursor-following liquid blob (appears on CTA hover) -->
	<div class="liquid-blob" bind:this={blobEl} aria-hidden="true"></div>

	<!-- Theme toggle -->
	<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
		<svg class="icon sun" viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			/>
		</svg>
		<svg class="icon moon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
		</svg>
	</button>

	<!-- Scrollable content layer (sits above fixed bg) -->
	<div class="content-layer">
		<div class="container" bind:this={containerEl}>
			<aside class="sidebar">
				<div class="label">Primary Wordmark</div>
				<div class="logo">
					<div class="logo-the">The</div>
					<div class="logo-pent">PENT</div>
					<div class="logo-house">HOUSE</div>
				</div>
			</aside>

			<main class="main-content">
				<div class="hero">
					<div class="label">Mission // 01</div>
					<h1>Quiet contact.<br />Reserved for yours.</h1>
					<p>
						A bright take on a private world. The Penthouse is where your most important
						conversations live, away from the glare of the public web.
					</p>
					<div class="cta-box">
						<button
							class="cta"
							id="enter-btn"
							onmousemove={handleBlobMove}
							onmouseleave={handleBlobLeave}
							onclick={handleEnterApp}
						>
							Enter the app
						</button>
					</div>
				</div>

				<div class="section">
					<div class="label">Values // 02</div>
					<h2>Human scale.</h2>
					<p>
						A deliberately small gathering space. No metrics, no global discovery. It exists solely
						to connect people who already know each other in real life, prioritizing genuine
						conversation over engagement loops.
					</p>
				</div>

				<div class="section">
					<div class="label">Delivery // 03</div>
					<h2>Installation.</h2>
					<p>
						The Penthouse is a Progressive Web App. To install it, open this link in Safari or
						Chrome, tap your browser's share icon, and select "Add to Home Screen".
					</p>
					{#if showApk}
						<div class="apk-block">
							<a href={apkUrl} class="apk-link" download>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
								</svg>
								Legacy Android APK
							</a>
						</div>
					{/if}
				</div>
			</main>

			<footer>
				<span>EST. 2024</span>
				<span>ALPHA RELEASE 2.1.0</span>
				<span>© THE PENTHOUSE</span>
			</footer>
		</div>
	</div>
</div>

<style>
	/* ── Welcome-page design tokens (isolated from app palette) ── */
	.welcome-root {
		--bg: #0d0d14;
		--bg-surface: #14141f;
		--accent: #7777c2;
		--text: #e2e2ec;
		--text-soft: #9a9ab4;
		--border: rgba(119, 119, 194, 0.15);
		--ease: cubic-bezier(0.22, 1, 0.36, 1);
		--font-erode: 'Erode', Georgia, 'Times New Roman', serif;
		--font-ubuntu: 'Ubuntu', -apple-system, BlinkMacSystemFont, sans-serif;
		--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
	}

	.welcome-root[data-theme='light'] {
		--bg: #f0f0f7;
		--bg-surface: #f8f8fd;
		--accent: #6666b3;
		--text: #1a1a2e;
		--text-soft: #666680;
		--border: rgba(102, 102, 179, 0.1);
	}

	/* ── Fixed background: covers the app layout's body gradient ── */
	.bg-layer {
		position: fixed;
		inset: 0;
		z-index: 0;
		background: var(--bg);
		pointer-events: none;
		overflow: hidden;
		transition: background 0.8s var(--ease);
	}

	/* ── Atmospheric orbs (absolute within fixed .bg-layer) ── */
	.orb {
		position: absolute;
		width: 60vmax;
		height: 60vmax;
		border-radius: 50%;
		filter: blur(120px);
		opacity: 0.2;
		background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
		animation: drift 20s infinite alternate ease-in-out;
	}

	.orb-1 {
		top: -20%;
		right: -10%;
	}

	.orb-2 {
		bottom: -20%;
		left: -10%;
		opacity: 0.1;
		animation-delay: -5s;
	}

	@keyframes drift {
		from {
			transform: translate(0, 0) scale(1);
		}
		to {
			transform: translate(5%, 10%) scale(1.1);
		}
	}

	/* ── Film grain ── */
	.grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 9999;
		opacity: 0.04;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	/* ── Liquid cursor blob ── */
	.liquid-blob {
		position: fixed;
		width: 12vw;
		height: 12vw;
		background: var(--accent);
		border-radius: 50%;
		filter: blur(60px);
		pointer-events: none;
		z-index: 9998;
		opacity: 0;
		transform: translate(-50%, -50%);
		transition:
			opacity 0.4s var(--ease),
			transform 1.2s cubic-bezier(0.7, 0, 0.3, 1);
	}

	/* ── Theme toggle ── */
	.theme-toggle {
		position: fixed;
		top: 2.5rem;
		right: 2.5rem;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		/* override global button styles */
		background: var(--bg-surface);
		border: 1px solid var(--border);
		color: var(--text);
		padding: 0;
		text-shadow: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		overflow: hidden;
		transition:
			border-color 0.5s var(--ease),
			transform 0.5s var(--ease),
			background 0.8s var(--ease);
	}

	.theme-toggle:hover {
		border-color: var(--accent);
		transform: scale(1.05);
		background: var(--bg-surface);
	}

	.theme-toggle:active {
		transform: scale(1.02);
	}

	.icon {
		position: absolute;
		width: 22px;
		height: 22px;
		stroke: var(--text);
		fill: none;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition:
			transform 0.8s var(--ease),
			opacity 0.5s;
	}

	/* Dark mode: sun visible, moon hidden */
	.welcome-root[data-theme='dark'] .sun {
		transform: translateY(0);
		opacity: 1;
	}
	.welcome-root[data-theme='dark'] .moon {
		transform: translateY(40px);
		opacity: 0;
	}
	/* Light mode: moon visible, sun hidden */
	.welcome-root[data-theme='light'] .moon {
		transform: translateY(0);
		opacity: 1;
	}
	.welcome-root[data-theme='light'] .sun {
		transform: translateY(40px);
		opacity: 0;
	}

	/* ── Content layer (above fixed bg) ── */
	.content-layer {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
	}

	/* ── Page grid ── */
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 10vh 2.5rem;
		display: grid;
		grid-template-columns: 1fr 1.2fr;
		gap: 8rem;
		color: var(--text);
		font-family: var(--font-ubuntu);
	}

	/* ── Sidebar ── */
	.sidebar {
		position: sticky;
		top: 10vh;
		height: fit-content;
	}

	/* ── Section label ── */
	.label {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--accent);
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.label::after {
		content: '';
		height: 1px;
		flex-grow: 1;
		background: var(--border);
	}

	/* ── Logo ── */
	.logo {
		font-family: var(--font-erode);
		margin-bottom: 3rem;
	}

	.logo-the {
		color: var(--accent);
		font-weight: 400;
		font-size: 2.2rem;
		margin-bottom: 0.5rem;
		opacity: 0.9;
	}

	.logo-pent,
	.logo-house {
		color: var(--text);
		font-weight: 600;
		font-size: 8.5rem;
		line-height: 0.8;
		text-transform: uppercase;
		letter-spacing: -0.05em;
	}

	/* ── Main content ── */
	.main-content {
		display: flex;
		flex-direction: column;
		gap: 10rem;
	}

	h1 {
		font-family: var(--font-erode);
		font-weight: 400;
		font-size: 3.8rem;
		line-height: 1.05;
		margin: 0 0 2.5rem 0;
		color: var(--accent);
		max-width: 12ch;
	}

	.main-content p {
		color: var(--text-soft);
		font-weight: 300;
		font-size: 1.3rem;
		line-height: 1.85;
		max-width: 540px;
		margin: 0;
	}

	/* ── CTA button ── */
	.cta-box {
		position: relative;
		margin-top: 2rem;
	}

	.cta {
		/* reset global button styles */
		background: var(--text);
		color: var(--bg);
		border: none;
		border-radius: 100px;
		padding: 1.8rem 4.5rem;
		font-family: var(--font-mono);
		font-size: 1rem;
		font-weight: 600;
		text-shadow: none;
		/* layout */
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		overflow: hidden;
		transition: all 0.5s var(--ease);
	}

	.cta:hover {
		transform: translateY(-3px);
		background: var(--accent);
		color: #fff;
		box-shadow: 0 20px 40px rgba(119, 119, 194, 0.25);
	}

	.cta:active {
		transform: translateY(-1px);
	}

	/* ── Value / Install sections ── */
	.section {
		border-left: 1px solid var(--border);
		padding-left: 3rem;
	}

	.section h2 {
		font-family: var(--font-erode);
		font-weight: 400;
		font-size: 2.6rem;
		margin: 0 0 1.5rem 0;
		color: var(--text);
	}

	/* ── APK download link ── */
	.apk-block {
		margin-top: 2rem;
	}

	.apk-link {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--accent);
		text-decoration: none;
		padding: 1rem 1.5rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		transition: all 0.3s;
	}

	.apk-link:hover {
		background: var(--bg-surface);
		border-color: var(--accent);
	}

	/* ── Footer ── */
	footer {
		grid-column: span 2;
		margin-top: 10rem;
		opacity: 0.35;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		text-align: center;
		border-top: 1px solid var(--border);
		padding-top: 5rem;
		padding-bottom: 3rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text);
	}

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.container {
			grid-template-columns: 1fr;
			gap: 5rem;
		}

		.logo-pent,
		.logo-house {
			font-size: 6.5rem;
		}

		.sidebar {
			position: static;
		}

		.main-content {
			gap: 6rem;
		}

		footer {
			grid-column: span 1;
		}
	}

	@media (max-width: 640px) {
		.container {
			padding: 8vh 1.5rem;
		}

		h1 {
			font-size: 2.8rem;
		}

		.main-content p {
			font-size: 1.1rem;
		}

		.logo-pent,
		.logo-house {
			font-size: 4.5rem;
		}

		.logo-the {
			font-size: 1.6rem;
		}

		.theme-toggle {
			top: 1.5rem;
			right: 1.5rem;
			width: 44px;
			height: 44px;
		}

		.cta {
			padding: 1.4rem 3rem;
		}

		.section {
			padding-left: 1.5rem;
		}

		footer {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}
	}

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		.orb {
			animation: none;
		}

		.liquid-blob {
			display: none;
		}
	}
</style>
