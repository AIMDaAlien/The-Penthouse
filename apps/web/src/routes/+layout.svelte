<script lang="ts">
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
		const publicPaths: string[] = ['/auth', '/welcome', '/prototypes'];
		const isPublicPath = publicPaths.includes(path) || path.startsWith('/prototypes/');
		if (!sessionStore.isAuthenticated && !isPublicPath) {
			goto('/auth', { replaceState: true });
		}
		if (sessionStore.isAuthenticated && path === '/auth') {
			goto('/', { replaceState: true });
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

	// Routes handled by the two-pane monolith layout
	const isMonolithRoute = $derived(
		$page.url.pathname === '/' ||
		$page.url.pathname.startsWith('/chat/') ||
		$page.url.pathname === '/users' ||
		$page.url.pathname.startsWith('/users/') ||
		$page.url.pathname === '/settings'
	);

	const showBottomNav = $derived(
		sessionStore.isAuthenticated &&
		($page.url.pathname === '/' ||
			$page.url.pathname.startsWith('/chat/') ||
			$page.url.pathname === '/users' ||
			$page.url.pathname === '/settings')
	);
</script>

<svelte:head>
	<title>The Penthouse</title>
</svelte:head>

<div class="app-shell" class:app-monolith={isMonolithRoute}>
	<PushPermissionBanner />
	{#if isMonolithRoute}
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
		/* ── Nocturne palette (v3) ── */
		--color-bg:                #12121C;
		--color-surface:           #1A1A24;
		--color-surface-elevated:  #242432;
		--color-surface-glass:     rgba(26, 26, 36, 0.45);
		--color-surface-raised:    rgba(26, 26, 36, 0.6);
		--color-border:            rgba(140, 140, 197, 0.2);
		--color-border-solid:      rgba(140, 140, 197, 0.35);
		--color-text-primary:      #E2E2EC;
		--color-text:              #E2E2EC;
		--color-text-secondary:    #8C8CC5;
		--color-text-muted:        #646478;
		--color-accent:            #7070DA;
		--color-accent-dim:        rgba(112, 112, 218, 0.15);
		--color-accent-hover:      #C6C6E6;
		--color-accent-secondary:  #8282C3;
		--color-accent-light:      #C0C0F0;
		--color-accent-periwinkle: #B4B4FF;
		--color-danger:            #D65A4A;
		--color-danger-dim:        rgba(214, 90, 74, 0.15);
		--color-error:             #D65A4A;
		--color-success:           #34d399;

		/* ── Typography ── */
		--font-sans:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-body:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-display: 'Gelasio', Georgia, 'Times New Roman', serif;
		--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

		/* Font sizes */
		--text-xs:   0.75rem;
		--text-sm:   0.875rem;
		--text-base: 1rem;
		--text-lg:   1.125rem;
		--text-xl:   1.25rem;
		--text-2xl:  1.5rem;

		/* Font weights */
		--weight-light:    300;
		--weight-regular:  400;
		--weight-medium:   500;
		--weight-bold:     700;

		/* ── Spacing ── */
		--space-xs:  0.25rem;
		--space-sm:  0.5rem;
		--space-md:  1rem;
		--space-lg:  1.5rem;
		--space-xl:  2rem;
		--space-1:   0.25rem;
		--space-2:   0.5rem;
		--space-3:   0.75rem;
		--space-4:   1rem;
		--space-5:   1.25rem;
		--space-6:   1.5rem;
		--space-8:   2rem;

		/* ── Radii ── */
		--radius-sm:   6px;
		--radius-md:   12px;
		--radius-lg:   20px;
		--radius-xl:   24px;
		--radius-full: 9999px;
		--radius-pill: 9999px;

		/* ── Shadows / Glass ── */
		--shadow-card: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
		--blur-glass:  blur(40px);

		/* Nav height */
		--nav-height: 64px;
		--bottom-nav-offset: 0px;

		/* Base */
		font-family: var(--font-sans);
		font-weight: var(--weight-regular);
		background: var(--color-bg);
		color: var(--color-text-primary);
		font-size: var(--text-base);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global([data-theme="light"]) {
		--color-bg:                #F5F5F7;
		--color-surface:           #FFFFFF;
		--color-surface-elevated:  #FFFFFF;
		--color-surface-glass:     rgba(255, 255, 255, 0.45);
		--color-surface-raised:    rgba(255, 255, 255, 0.6);
		--color-border:            rgba(140, 140, 197, 0.25);
		--color-border-solid:      rgba(140, 140, 197, 0.4);
		--color-text-primary:      #1A1A2E;
		--color-text:              #1A1A2E;
		--color-text-secondary:    #6B6B80;
		--color-text-muted:        #9A9AAF;
		--color-accent:            #5A5AC4;
		--color-accent-dim:        rgba(112, 112, 218, 0.15);
		--color-accent-hover:      #4A4AB0;
		--color-accent-secondary:  #8282C3;
		--color-accent-light:      #8080D0;
		--color-accent-periwinkle: #7070DA;
		--color-danger:            #D73A3A;
		--color-danger-dim:        rgba(214, 90, 74, 0.15);
		--color-error:             #D73A3A;
		--color-success:           #2D8A3E;
		--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.08);
	}

	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html, body) {
		height: 100%;
		width: 100%;
	}

	:global(body) {
		min-height: 100dvh;
		background-image:
			radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 24px 24px;
		background-position: 0 0;
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
		border: 1px solid rgba(112, 112, 218, 0.3);
		border-radius: var(--radius-pill);
		padding: var(--space-3) var(--space-4);
		transition: background 0.2s, border-color 0.2s, opacity 0.15s;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	:global(button:active) {
		transform: scale(0.98);
		background: rgba(112, 112, 218, 0.25);
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

	/* ── Visually hidden ── */
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

	/* ── App shell ── */
	.app-shell {
		position: relative;
		min-height: 100dvh;
		width: 100%;
	}

	/* ── Desktop monolith routes: full-viewport positioning context ── */
	@media (hover: hover) and (pointer: fine) {
		.app-shell.app-monolith {
			height: 100dvh;
			overflow: hidden;
		}
	}
</style>
