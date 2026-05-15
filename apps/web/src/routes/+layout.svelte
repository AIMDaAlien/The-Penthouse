<script lang="ts">
	import { sessionStore } from '$stores/session.svelte';
	import { channelsStore } from '$stores/channels.svelte';
		import { emotesStore } from '$stores/emotes.svelte';
	import { stickersStore } from '$stores/stickers.svelte';
	import { gifsStore } from '$stores/gifs.svelte';
	import { chatsStore } from '$stores/chats.svelte';
	import { foldersStore } from '$stores/folders.svelte';
	import { socketStore } from '$stores/socket.svelte';
	import { syncEngine } from '$lib/sync/sync-engine.svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import BottomNav from '$components/BottomNav.svelte';
	import PushPermissionBanner from '$components/PushPermissionBanner.svelte';
	import DesktopShell from '$components/DesktopShell.svelte';
	import { appearanceStore } from '$stores/appearance.svelte';

	let { children } = $props();
	let activeUserId = $state(sessionStore.user?.id ?? null);

	const k = $derived(appearanceStore.tokens);

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

	// Shadow local-first sync: fill the browser DB while HTTP remains the visible read path.
	$effect(() => {
		const userId = sessionStore.user?.id;
		if (userId) {
			void syncEngine.start(userId);
		} else {
			void syncEngine.stop({ clear: true });
		}
	});

	$effect(() => {
		const socket = socketStore.instance;
		if (!socket || !syncEngine.enabled) return;
		return syncEngine.attachSocket();
	});

	$effect(() => {
		if (socketStore.isConnected && syncEngine.activeUserId) {
			void syncEngine.requestSocketSync();
		}
	});

	// Clear user-scoped state on login/logout/user switches.
	$effect(() => {
		const nextUserId = sessionStore.user?.id ?? null;
		if (nextUserId === activeUserId) return;
		chatsStore.reset();
		foldersStore.reset();
		channelsStore.reset();
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

<div
	class="app-shell"
	class:app-monolith={isMonolithRoute}
	data-theme={appearanceStore.themeId}
	data-mode={appearanceStore.resolvedMode}
	style:--p-accent={k.accent}
	style:--p-accent-soft={k.accentSoft}
	style:--p-accent-edge={k.accentEdge}
	style:--p-bg={k.bg}
	style:--p-surface={k.surface}
	style:--p-surface-2={k.surface2}
	style:--p-text={k.text}
	style:--p-text-2={k.text2}
	style:--p-muted={k.muted}
	style:--p-secondary={k.secondary}
	style:--p-line={k.line}
	style:--p-line-2={k.line2}
	style:--p-success={k.success}
	style:--p-success-soft={k.successSoft}
	style:--p-success-edge={k.successEdge}
	style:--p-info={k.info}
	style:--p-info-soft={k.infoSoft}
	style:--p-info-edge={k.infoEdge}
	style:--p-warning={k.warning}
	style:--p-warning-soft={k.warningSoft}
	style:--p-warning-edge={k.warningEdge}
	style:--p-error={k.error}
	style:--p-error-soft={k.errorSoft}
	style:--p-error-edge={k.errorEdge}
>
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
	/* ═════════════════════════════════════════════════════════════════
	   V5 Fallback Tokens — T-D1 Periwinkle (dark)
	   Overridden by inline styles on .app-shell at runtime.
	   ═════════════════════════════════════════════════════════════════ */
	:global(:root) {
		/* ── OKLCH Palette ── */
		--p-bg:           oklch(0.16 0.020 280);
		--p-surface:      oklch(0.21 0.025 280);
		--p-surface-2:    oklch(0.26 0.030 280);
		--p-text:         oklch(0.93 0.012 280);
		--p-text-2:       oklch(0.80 0.025 280);
		--p-muted:        oklch(0.65 0.050 280);
		--p-muted-2:      oklch(0.50 0.040 280);
		--p-accent:       oklch(0.69 0.140 285);
		--p-accent-soft:  oklch(0.69 0.140 285 / 0.16);
		--p-accent-edge:  oklch(0.69 0.140 285 / 0.36);
		--p-secondary:    oklch(0.78 0.090 280);
		--p-line:         oklch(0.78 0.090 280 / 0.12);
		--p-line-2:       oklch(0.78 0.090 280 / 0.22);

		/* ── Semantic status tokens ── */
		--p-success:      oklch(0.68 0.140 145);
		--p-success-soft: oklch(0.68 0.140 145 / 0.14);
		--p-success-edge: oklch(0.68 0.140 145 / 0.32);

		--p-info:         oklch(0.68 0.100 240);
		--p-info-soft:    oklch(0.68 0.100 240 / 0.14);
		--p-info-edge:    oklch(0.68 0.100 240 / 0.32);

		--p-warning:      oklch(0.62 0.070 35);
		--p-warning-soft: oklch(0.62 0.070 35 / 0.12);
		--p-warning-edge: oklch(0.62 0.070 35 / 0.32);

		--p-error:        oklch(0.58 0.110 25);
		--p-error-soft:   oklch(0.58 0.110 25 / 0.12);
		--p-error-edge:   oklch(0.58 0.110 25 / 0.32);

		/* ── Backward-compat aliases (delete after migration) ── */
		--color-bg:                var(--p-bg);
		--color-surface:           var(--p-surface);
		--color-surface-elevated:  var(--p-surface-2);
		--color-surface-glass:     oklch(1 0 0 / 0.03);
		--color-surface-raised:    oklch(1 0 0 / 0.06);
		--color-border:            var(--p-line);
		--color-border-solid:      var(--p-line-2);
		--color-text-primary:      var(--p-text);
		--color-text:              var(--p-text);
		--color-text-secondary:    var(--p-text-2);
		--color-text-muted:        var(--p-muted);
		--color-accent:            var(--p-accent);
		--color-accent-dim:        var(--p-accent-soft);
		--color-accent-hover:      var(--p-accent-edge);
		--color-accent-secondary:  var(--p-secondary);
		--color-accent-light:      var(--p-secondary);
		--color-accent-periwinkle: var(--p-accent);
		--color-danger:            var(--p-error);
		--color-danger-dim:        var(--p-error-soft);
		--color-error:             var(--p-error);
		--color-success:           var(--p-success);

		/* ── Typography ── */
		--font-sans:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-body:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

		/* Font sizes (legacy — map to new scale gradually) */
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

		/* ── V5 Spacing ── */
		--sp-1:  4px;
		--sp-2:  8px;
		--sp-3:  14px;
		--sp-4:  22px;
		--sp-5:  40px;
		--sp-6:  64px;

		/* Legacy spacing aliases */
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

		/* ── V5 Radii ── */
		--r-pill: 999px;
		--r-lg:   22px;
		--r-md:   14px;
		--r-sm:   8px;
		--r-xs:   4px;

		/* Legacy radii aliases */
		--radius-sm:   var(--r-sm);
		--radius-md:   var(--r-md);
		--radius-lg:   var(--r-lg);
		--radius-xl:   var(--r-lg);
		--radius-full: 9999px;
		--radius-pill: 9999px;

		/* ── Motion ── */
		--ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
		--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
		--dur-fast: 180ms;
		--dur-base: 280ms;
		--dur-slow: 420ms;
		--pulse-1: 1500ms;
		--pulse-2: 1000ms;

		/* ── Texture ── */
		--tex: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");

		/* ── Shadows ── */
		--shadow-card: 0 14px 36px oklch(0 0 0 / 0.45);
		--blur-glass:  blur(18px);

		/* Nav height */
		--nav-height: 64px;
		--bottom-nav-offset: 0px;

		/* Base */
		font-family: var(--font-sans);
		font-weight: var(--weight-regular);
		background: var(--p-bg);
		color: var(--p-text);
		font-size: var(--text-base);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
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

	/* ── Body texture (replaces radial-dot pattern) ── */
	:global(body) {
		min-height: 100dvh;
		position: relative;
	}
	:global(body)::before {
		content: '';
		position: fixed;
		inset: 0;
		background-image: var(--tex);
		mix-blend-mode: overlay;
		opacity: 0.30;
		pointer-events: none;
		z-index: 0;
	}

	/* ── Buttons ── */
	:global(button) {
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: inherit;
		font-weight: var(--weight-medium);
		background: var(--p-accent-soft);
		color: var(--p-accent);
		border: 1px solid var(--p-accent-edge);
		border-radius: var(--r-pill);
		padding: 11px 24px;
		transition: background var(--dur-fast) var(--ease-out),
		            border-color var(--dur-fast) var(--ease-out),
		            opacity var(--dur-fast) var(--ease-out);
	}

	:global(button:hover) {
		background: var(--p-accent-edge);
	}

	:global(button:active) {
		transform: scale(0.98);
	}

	:global(button:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* ── Inputs ── */
	:global(input, textarea, select) {
		font-family: var(--font-sans);
		font-size: inherit;
	}

	/* ── Glass panel utility ── */
	:global(.glass) {
		background: oklch(1 0 0 / 0.03);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid var(--p-line);
		box-shadow: var(--shadow-card);
		border-radius: var(--r-lg);
	}

	/* ── Texture overlay utility ── */
	:global(.tex-overlay) {
		position: absolute;
		inset: 0;
		background-image: var(--tex);
		mix-blend-mode: overlay;
		opacity: 0.40;
		pointer-events: none;
		z-index: 0;
	}

	/* ── Menu / context menu utility ── */
	:global(.menu) {
		background: oklch(0.21 0.025 280 / 0.85);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		border: 1px solid var(--p-line);
		border-radius: var(--r-md);
		padding: 6px;
		min-width: 180px;
		max-width: 280px;
		box-shadow: 0 14px 36px oklch(0 0 0 / 0.45);
		animation: menuIn 220ms var(--ease-out);
	}
	@keyframes menuIn {
		from { opacity: 0; transform: translateY(-4px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	:global(.menu-section) {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--p-secondary);
		padding: 10px 14px 4px;
	}

	:global(.menu-divider) {
		height: 1px;
		background: var(--p-line);
		margin: 4px 0;
	}

	:global(.menu-item) {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 14px;
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		color: var(--p-text-2);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		cursor: pointer;
		transition: background var(--dur-fast) var(--ease-out),
		            color var(--dur-fast) var(--ease-out);
		text-align: left;
	}
	:global(.menu-item:hover),
	:global(.menu-item[data-active="true"]) {
		background: var(--p-accent-soft);
		color: var(--p-text);
	}
	:global(.menu-item[data-danger="true"]) {
		color: var(--p-error);
	}
	:global(.menu-item[data-danger="true"]:hover) {
		background: var(--p-error-soft);
		color: var(--p-error);
	}

	/* ── Input patterns ── */
	:global(.input-filled) {
		background: oklch(1 0 0 / 0.04);
		border: 1px solid var(--p-line);
		border-radius: var(--r-sm);
		padding: 11px 14px;
		color: var(--p-text);
		font-family: var(--font-mono);
		font-size: 0.86rem;
		transition: border-color var(--dur-base) var(--ease-out),
		            background var(--dur-base) var(--ease-out);
	}
	:global(.input-filled:focus) {
		outline: none;
		border-color: var(--p-accent-edge);
		background: var(--p-accent-soft);
	}
	:global(.input-filled[data-style="prose"]) {
		font-family: var(--font-sans);
	}

	:global(.input-underline) {
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--p-line-2);
		border-radius: 0;
		padding: 12px 2px;
		color: var(--p-text);
		font-family: var(--font-sans);
		font-size: 1.05rem;
		transition: border-color var(--dur-base) var(--ease-out);
	}
	:global(.input-underline:focus) {
		outline: none;
		border-bottom-color: var(--p-accent);
	}

	/* ── Composer pill (chat-only) ── */
	:global(.composer) {
		background: oklch(1 0 0 / 0.04);
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill);
		padding: 6px 6px 6px 22px;
		backdrop-filter: blur(14px);
	}
	:global(.composer:focus-within) {
		border-color: var(--p-accent-edge);
	}

	/* ── Notice pill (info/warning/error banners) ── */
	:global(.notice-pill) {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		padding: 10px 14px;
		border-radius: var(--r-md);
	}
	:global(.notice-pill[data-kind="info"]) {
		color: var(--p-info);
		background: var(--p-info-soft);
	}
	:global(.notice-pill[data-kind="warning"]) {
		color: var(--p-warning);
		background: var(--p-warning-soft);
	}
	:global(.notice-pill[data-kind="error"]) {
		color: var(--p-error);
		background: var(--p-error-soft);
	}

	/* ── Focus rings ── */
	:global(*:focus-visible) {
		outline: 2px solid var(--p-accent-edge);
		outline-offset: 2px;
		border-radius: var(--r-sm);
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

	/* ── Animations ── */
	@keyframes pPulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%      { opacity: 0.55; transform: scale(1.04); }
	}
	@keyframes pBreath {
		0%, 100% { opacity: 0.55; }
		50%      { opacity: 1; }
	}

	/* ── View transitions ── */
	:global(::view-transition-old(root)) {
		animation: 160ms ease both vt-out;
	}
	:global(::view-transition-new(root)) {
		animation: 260ms var(--ease-out-soft) both vt-in;
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
		transition: background var(--dur-base) var(--ease-out),
		            color var(--dur-base) var(--ease-out);
	}

	/* ── Desktop monolith routes ── */
	@media (hover: hover) and (pointer: fine) {
		.app-shell.app-monolith {
			height: 100dvh;
			overflow: hidden;
		}
	}
</style>
