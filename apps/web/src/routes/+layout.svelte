<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { sessionStore } from '$stores/session.svelte';

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
</script>

<svelte:head>
	<meta name="theme-color" content="#0d0d0d" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		/* Core palette */
		--color-bg: #0d0d0d;
		--color-surface: #161616;
		--color-surface-raised: #1e1e1e;
		--color-border: #2a2a2a;
		--color-text-primary: #f0f0f0;
		--color-text-secondary: #888;
		--color-accent: #c9a84c;
		--color-accent-dim: #9a7a30;
		--color-danger: #e05252;
		--color-success: #52e07a;

		/* Typography */
		--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-mono: 'SF Mono', 'Fira Code', monospace;
		--text-xs: 0.75rem;
		--text-sm: 0.875rem;
		--text-base: 1rem;
		--text-lg: 1.125rem;
		--text-xl: 1.25rem;

		/* Spacing */
		--space-1: 0.25rem;
		--space-2: 0.5rem;
		--space-3: 0.75rem;
		--space-4: 1rem;
		--space-6: 1.5rem;
		--space-8: 2rem;

		/* Radii */
		--radius-sm: 6px;
		--radius-md: 12px;
		--radius-lg: 20px;
		--radius-full: 9999px;

		font-family: var(--font-sans);
		background: var(--color-bg);
		color: var(--color-text-primary);
		font-size: var(--text-base);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}

	:global(body) {
		min-height: 100dvh;
		overflow-x: hidden;
	}

	:global(button) {
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	:global(input, textarea) {
		font-family: inherit;
		font-size: inherit;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(*) {
			animation-duration: 0.01ms !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
