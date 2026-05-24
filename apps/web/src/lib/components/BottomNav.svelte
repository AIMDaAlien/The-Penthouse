<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';

	const tabs = [
		{ href: '/',        icon: 'message'  as const, label: 'Chats'    },
		{ href: '/users',   icon: 'users'    as const, label: 'People'   },
		{ href: '/settings',icon: 'settings' as const, label: 'Settings' }
	];

	const pathname = $derived($page.url.pathname);

	const tabStates = $derived(
		tabs.map((tab) => ({
			...tab,
			active:
				tab.href === '/'
					? pathname === '/' || pathname.startsWith('/chat/')
					: pathname === tab.href || pathname.startsWith(tab.href + '/')
		}))
	);

	const showFab = $derived(pathname === '/');

	function handleFab() {
		goto('/users');
	}
</script>

<div class="nav-wrapper">
	{#if showFab}
		<button class="fab" onclick={handleFab} aria-label="Start new chat">
			<Icon name="plus" size={24} strokeWidth={2.5} />
		</button>
	{/if}

	<nav class="bottom-nav" aria-label="Main navigation">
		{#each tabStates as tab}
			<a
				href={tab.href}
				class="nav-tab"
				class:active={tab.active}
				aria-current={tab.active ? 'page' : undefined}
			>
				<span class="tab-glow" aria-hidden="true"></span>
				<span class="tab-indicator" aria-hidden="true"></span>
				<span class="tab-icon">
					<Icon name={tab.icon} size={22} strokeWidth={tab.active ? 2.2 : 1.75} />
				</span>
				<span class="tab-label">{tab.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.nav-wrapper {
		position: fixed;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		left: 16px;
		right: 16px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 12px;
		pointer-events: none;
	}

	.fab {
		pointer-events: auto;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow:
			0 4px 14px color-mix(in srgb, var(--p-accent) 35%, transparent),
			0 0 0 1px color-mix(in srgb, var(--p-accent) 20%, transparent) inset;
		transition:
			transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.25s ease,
			background 0.2s ease;
		margin-right: 12px;
	}

	.fab:hover {
		transform: scale(1.1);
		box-shadow:
			0 6px 22px oklch(0.7 0.08 80 / 0.5),
			0 0 0 1px oklch(0.7 0.08 80 / 0.3) inset;
	}

	.fab:active {
		transform: scale(0.94);
	}

	.bottom-nav {
		pointer-events: auto;
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		height: 68px;
		display: flex;
		align-items: stretch;
		background: oklch(0.16 0.020 280 / 0.85);
		backdrop-filter: blur(24px) saturate(1.5);
		-webkit-backdrop-filter: blur(24px) saturate(1.5);
		border: 1px solid oklch(0.6 0.03 280 / 0.15);
		border-radius: 24px;
		box-shadow:
			0 20px 40px oklch(0 0 0 / 0.55),
			0 2px 8px oklch(0 0 0 / 0.35),
			0 0 0 1px oklch(1 0 0 / 0.03) inset;
		overflow: hidden;
		position: relative;
	}

	.nav-tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		text-decoration: none;
		color: var(--p-muted);
		position: relative;
		padding: 0 4px;
		transition: color 0.3s ease;
		outline: none;
		-webkit-tap-highlight-color: transparent;
	}

	.tab-indicator {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%) scaleX(0);
		width: 24px;
		height: 2.5px;
		background: var(--p-accent);
		border-radius: 0 0 3px 3px;
		opacity: 0;
		transition:
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.25s ease;
	}

	.tab-glow {
		position: absolute;
		inset: 6px 4px;
		background: oklch(0.7 0.08 80 / 0.08);
		border: 1px solid oklch(0.7 0.08 80 / 0.12);
		border-radius: 16px;
		opacity: 0;
		transform: scale(0.9);
		transition:
			transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.3s ease;
	}

	.nav-tab.active {
		color: var(--p-accent);
	}

	.nav-tab.active .tab-indicator {
		opacity: 1;
		transform: translateX(-50%) scaleX(1);
	}

	.nav-tab.active .tab-glow {
		opacity: 1;
		transform: scale(1);
	}

	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
		z-index: 1;
	}

	.nav-tab.active .tab-icon {
		transform: translateY(-1px) scale(1.1);
		filter: drop-shadow(0 0 6px oklch(0.7 0.08 80 / 0.25));
	}

	.tab-label {
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-family: var(--font-sans);
		z-index: 1;
		transition: font-weight 0.2s ease, transform 0.2s ease;
	}

	.nav-tab.active .tab-label {
		font-weight: 700;
		transform: translateY(-0.5px);
	}

	/* Hide on desktop (mouse/trackpad) — DesktopNav replaces this */
	@media (hover: hover) and (pointer: fine) {
		.nav-wrapper {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fab,
		.tab-indicator,
		.tab-glow,
		.tab-icon,
		.tab-label,
		.nav-tab,
		.bottom-nav {
			transition: none !important;
			animation: none !important;
		}

		.fab:hover {
			transform: none;
		}

		.nav-tab.active .tab-icon {
			transform: none;
			filter: none;
		}

		.nav-tab.active .tab-label {
			transform: none;
		}
	}
</style>
