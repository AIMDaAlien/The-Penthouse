<script lang="ts">
	import '../app.css';
	import { sessionStore } from '$stores/session.svelte';
	import { channelsStore } from '$stores/channels.svelte';
	import { wallpapersStore } from '$stores/wallpapers.svelte';
	import { emotesStore } from '$stores/emotes.svelte';
	import { stickersStore } from '$stores/stickers.svelte';
	import { gifsStore } from '$stores/gifs.svelte';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import BottomNav from '$components/BottomNav.svelte';
	import PushPermissionBanner from '$components/PushPermissionBanner.svelte';
	import DesktopShell from '$components/DesktopShell.svelte';
	import { initTheme } from '$utils/theme';

	let { children } = $props();
	let activeUserId = $state(sessionStore.user?.id ?? null);

	// Initialize theme before first paint (script in app.html handles FOUC)
	$effect(() => {
		initTheme();
	});

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

	// Clear user-scoped state on login/logout/user switches.
	$effect(() => {
		const nextUserId = sessionStore.user?.id ?? null;
		if (nextUserId === activeUserId) return;
		chatsStore.reset();
		foldersStore.reset();
		channelsStore.reset();
		wallpapersStore.reset();
		emotesStore.reset();
		stickersStore.reset();
		gifsStore.reset();
		activeUserId = nextUserId;
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

	const showShell = $derived(
		sessionStore.isAuthenticated &&
		($page.url.pathname === '/' ||
			$page.url.pathname.startsWith('/chat/') ||
			$page.url.pathname.startsWith('/users') ||
			$page.url.pathname === '/settings')
	);

	const showBottomNav = $derived(
		sessionStore.isAuthenticated &&
		($page.url.pathname === '/' ||
			$page.url.pathname.startsWith('/users') ||
			$page.url.pathname === '/settings')
	);
</script>

<svelte:head>
	<title>The Penthouse</title>
</svelte:head>

<div class="app" class:has-bottom-nav={showBottomNav}>
	<PushPermissionBanner />
	{#if showShell}
		<DesktopShell>
			{@render children()}
		</DesktopShell>
	{:else}
		{@render children()}
	{/if}
	{#if showBottomNav}
		<BottomNav />
	{/if}
</div>

<style>
	:global(:root) {
		/* Dark theme (default) */
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

	:global([data-theme="light"]) {
		--color-bg: #F5F5F7;
		--color-surface: #FFFFFF;
		--color-surface-elevated: #FFFFFF;
		--color-text: #1A1A2E;
		--color-text-primary: #1A1A2E;
		--color-text-secondary: #6B6B80;
		--color-text-muted: #9A9AAF;
		--color-accent: #B8944F;
		--color-accent-hover: #A8843F;
		--color-border: #E0E0E8;
		--color-error: #D73A3A;
		--color-danger: #D73A3A;
		--color-success: #2D8A3E;
		--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.08);
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
		--bottom-nav-offset: 0px;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.app.has-bottom-nav {
		--bottom-nav-offset: calc(88px + env(safe-area-inset-bottom, 0px));
		padding-bottom: var(--bottom-nav-offset);
	}

	:global(.visually-hidden) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (min-width: 768px) {
		.app.has-bottom-nav {
			padding-bottom: 0;
		}
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
