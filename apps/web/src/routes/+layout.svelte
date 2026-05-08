<script lang="ts">
	import '../app.css';
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import BottomNav from '$components/BottomNav.svelte';
	import PushPermissionBanner from '$components/PushPermissionBanner.svelte';

	let { children } = $props();

	// Auth guard: redirect unauthenticated users to /auth
	$effect(() => {
		const path = $page.url.pathname;
		const publicPaths = ['/auth', '/welcome'];
		if (!sessionStore.isAuthenticated && !publicPaths.includes(path)) {
			goto('/auth', { replaceState: true });
		}
	});

	// Auto-connect socket when authenticated, disconnect on logout
	$effect(() => {
		const token = sessionStore.accessToken;
		if (token) {
			socketStore.connect(token);
		} else {
			socketStore.disconnect();
		}
	});

	// Page transitions via View Transitions API
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	const showNav = $derived(
		sessionStore.isAuthenticated &&
		($page.url.pathname === '/' ||
			$page.url.pathname.startsWith('/chat/') ||
			$page.url.pathname.startsWith('/users') ||
			$page.url.pathname === '/settings')
	);
</script>

<svelte:head>
	<title>The Penthouse</title>
</svelte:head>

<div class="app" class:has-bottom-nav={showNav}>
	<PushPermissionBanner />
	{@render children()}
	{#if showNav}
		<BottomNav />
	{/if}
</div>

<style>
	:global(:root) {
		--color-bg: #12121C;
		--color-surface: #1A1A28;
		--color-surface-elevated: #222236;
		--color-text: #E8E8F0;
		--color-text-primary: #E8E8F0;
		--color-text-secondary: #9494A8;
		--color-text-muted: #646478;
		--color-accent: #C9A96E;
		--color-accent-hover: #D4B87A;
		--color-border: #2A2A3E;
		--color-error: #E06C75;
		--color-danger: #E06C75;
		--color-success: #98C379;
		--font-display: 'Gelasio', Georgia, serif;
		--font-body: 'Ubuntu', system-ui, sans-serif;
		--font-sans: 'Ubuntu', system-ui, sans-serif;
		--font-mono: 'JetBrains Mono', monospace;
		--text-xs: 0.75rem;
		--text-sm: 0.875rem;
		--text-base: 1rem;
		--text-lg: 1.125rem;
		--text-xl: 1.25rem;
		--space-xs: 0.25rem;
		--space-sm: 0.5rem;
		--space-md: 1rem;
		--space-lg: 1.5rem;
		--space-xl: 2rem;
		--space-2: 0.5rem;
		--space-3: 0.75rem;
		--space-4: 1rem;
		--space-6: 1.5rem;
		--space-8: 2rem;
		--radius-sm: 6px;
		--radius-md: 10px;
		--radius-lg: 16px;
		--radius-xl: 20px;
		--radius-pill: 9999px;
		--weight-medium: 500;
		--weight-bold: 700;
		--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
	}

	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: 16px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.app.has-bottom-nav {
		padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
	}

	/* Page transitions */
	:global(::view-transition-old(root)) {
		animation: 180ms ease both page-out;
	}

	:global(::view-transition-new(root)) {
		animation: 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both page-in;
	}

	@keyframes page-out {
		to {
			opacity: 0;
			transform: translateX(-10px);
		}
	}

	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateX(14px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(::view-transition-old(root)),
		:global(::view-transition-new(root)) {
			animation: none !important;
		}
	}
</style>
