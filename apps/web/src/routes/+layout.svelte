<script lang="ts">
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { presenceStore } from '$stores/presence.svelte';
	import { readReceiptsStore } from '$stores/readReceipts.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();

	// Auth guard: redirect unauthenticated users to /auth
	$effect(() => {
		const isAuthRoute = page.url.pathname.startsWith('/auth');
		if (!sessionStore.isAuthenticated && !isAuthRoute) {
			goto('/auth');
		}
		if (sessionStore.isAuthenticated && isAuthRoute) {
			goto('/');
		}
	});

	const connectionStatus = $derived(socketStore.state);
	const statusLabel = $derived.by(() => {
		switch (connectionStatus) {
			case 'connected':
				return 'Connected';
			case 'connecting':
				return 'Connecting...';
			case 'degraded':
				return 'Reconnecting...';
			case 'failed':
				return 'Offline';
			case 'idle':
				return 'Idle';
			default:
				return 'Unknown';
		}
	});
	const statusDot = $derived.by(() => {
		switch (connectionStatus) {
			case 'connected':
				return '🟢';
			case 'connecting':
				return '🟡';
			case 'degraded':
				return '🟡';
			case 'failed':
				return '🔴';
			case 'idle':
				return '⚪';
			default:
				return '⚪';
		}
	});

	// Initialize presence socket listeners when connected

	// View transitions — slide/fade between pages
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Show bottom tab nav only on top-level tab pages
	const showBottomNav = $derived(
		sessionStore.isAuthenticated &&
		(page.url.pathname === '/' ||
		 page.url.pathname === '/users' ||
		 page.url.pathname === '/settings')
	);

	// Initialize read receipts socket listeners when connected
	$effect(() => {
		if (connectionStatus === 'connected') {
			readReceiptsStore.initializeSocketListeners();
		}
	});
	$effect(() => {
		if (connectionStatus === 'connected') {
			presenceStore.initializeSocketListeners();
		}
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#12121C" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

{@render children()}

{#if showBottomNav}
	<BottomNav />
{/if}

<style>
	/* ── Reset ── */
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		/* ── Brand palette (v2) ── */
		--color-bg:             #12121C;
		--color-surface:        #1E1E2D;
		--color-surface-glass:  rgba(30, 30, 45, 0.45);
		--color-surface-raised: rgba(30, 30, 45, 0.6);
		--color-border:         rgba(140, 140, 197, 0.2);
		--color-border-solid:   rgba(140, 140, 197, 0.35);
		--color-text-primary:   #E2E2EC;
		--color-text-secondary: #8C8CC5;
		--color-accent:         #7777C2;
		--color-accent-dim:     rgba(119, 119, 194, 0.15);
		--color-accent-hover:   #C6C6E6;
		--color-danger:         #ff8ca6;
		--color-danger-dim:     rgba(255, 140, 166, 0.15);
		--color-success:        #34d399;

		/* ── Typography ── */
		/* UI body: Ubuntu (falls back to system sans) */
		--font-sans:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		/* Display/logo: Gelasio (elegant refined serif) */
		--font-display: 'Gelasio', Georgia, 'Times New Roman', serif;
		/* Settings/code: JetBrains Mono */
		--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

		/* Font sizes */
		--text-xs:   0.75rem;
		--text-sm:   0.875rem;
		--text-base: 1rem;
		--text-lg:   1.125rem;
		--text-xl:   1.25rem;
		--text-2xl:  1.5rem;

		/* Font weights (Ubuntu variable axis) */
		--weight-light:    300;
		--weight-regular:  400;
		--weight-medium:   500;
		--weight-bold:     700;

		/* ── Spacing ── */
		--space-1: 0.25rem;
		--space-2: 0.5rem;
		--space-3: 0.75rem;
		--space-4: 1rem;
		--space-5: 1.25rem;
		--space-6: 1.5rem;
		--space-8: 2rem;

		/* ── Radii ── */
		--radius-sm:   6px;
		--radius-md:   12px;
		--radius-lg:   20px;
		--radius-xl:   24px;
		--radius-full: 9999px;

		/* ── Shadows / Glass ── */
		--shadow-card: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
		--blur-glass:  blur(40px);

		/* Apply base */
		font-family: var(--font-sans);
		font-weight: var(--weight-regular);
		background: var(--color-bg);
		color: var(--color-text-primary);
		font-size: var(--text-base);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* ── Body / HTML ── */
	:global(html, body) {
		height: 100%;
		width: 100%;
		/* No overflow:hidden here — chat list and other pages need window scroll.
		   The chat thread page manages its own scroll inside .thread-shell. */
	}

	:global(body) {
		min-height: 100dvh;
		/* Subtle dot-grid ambient texture from v2 */
		background-image:
			radial-gradient(rgba(119, 119, 194, 0.35) 0px, transparent 260px),
			radial-gradient(rgba(80, 80, 150, 0.2) 0px, transparent 400px),
			radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 100% 100%, 100% 100%, 24px 24px;
		background-position: top right, bottom left, 0 0;
		background-attachment: fixed;
	}

	/* ── Buttons ── */
	:global(button) {
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: inherit;
		font-weight: var(--weight-medium);
		background: var(--color-accent-dim);
		color: var(--color-accent);
		border: 1px solid rgba(119, 119, 194, 0.3);
		border-radius: var(--radius-lg);
		padding: var(--space-3) var(--space-4);
		transition: background 0.2s, border-color 0.2s, opacity 0.15s;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	:global(button:active) {
		transform: scale(0.98);
		background: rgba(119, 119, 194, 0.25);
	}

	:global(button:disabled) {
		opacity: 0.5;
		pointer-events: none;
	}

	/* ── Inputs ── */
	:global(input, textarea, select) {
		font-family: var(--font-sans);
		font-size: inherit;
	}

	/* ── Glass panel utility ── */
	:global(.glass) {
		background: var(--color-surface-glass);
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-card);
		border-radius: var(--radius-xl);
	}

	/* ── Settings pages: mono font ── */
	:global([data-settings]) {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	/* ── Nav height token ── */
	:global(:root) {
		--nav-height: 64px;
	}

	/* ── View transitions ── */
	:global(::view-transition-old(root)) {
		animation: 160ms ease both vt-out;
	}

	:global(::view-transition-new(root)) {
		animation: 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both vt-in;
	}

	@keyframes vt-out {
		to { opacity: 0; transform: translateY(-5px); }
	}

	@keyframes vt-in {
		from { opacity: 0; transform: translateY(8px); }
	}

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		:global(*) {
			animation-duration: 0.01ms !important;
			transition-duration: 0.01ms !important;
		}

		:global(::view-transition-old(root)),
		:global(::view-transition-new(root)) {
			animation: none !important;
		}
	}

</style>
