<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';

	const tabs = [
		{ href: '/',        icon: 'chat'     as const, label: 'Chats'    },
		{ href: '/users',   icon: 'users'    as const, label: 'People'   },
		{ href: '/settings',icon: 'settings' as const, label: 'Settings' }
	];

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="bottom-nav" aria-label="Main navigation">
	{#each tabs as tab}
		<button
			class="nav-tab"
			class:active={isActive(tab.href)}
			onclick={() => goto(tab.href)}
			aria-label={tab.label}
			aria-current={isActive(tab.href) ? 'page' : undefined}
		>
			<span class="tab-icon">
				<Icon name={tab.icon} size={22} strokeWidth={isActive(tab.href) ? 2 : 1.75} />
			</span>
			<span class="tab-label">{tab.label}</span>
		</button>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: calc(24px + env(safe-area-inset-bottom, 0px));
		left: 24px;
		right: 24px;
		height: 60px;
		display: flex;
		align-items: stretch;
		background: rgba(18, 18, 28, 0.80);
		backdrop-filter: blur(24px) saturate(1.6);
		-webkit-backdrop-filter: blur(24px) saturate(1.6);
		border: 1px solid var(--color-border-solid);
		border-radius: var(--radius-xl);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.5);
		z-index: 100;
		overflow: hidden;
	}

	.nav-tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color 0.2s;
		position: relative;
		padding: 0 4px;
	}

	.nav-tab::before {
		content: '';
		position: absolute;
		inset: 6px 4px;
		background: var(--color-accent-dim);
		border-radius: var(--radius-pill);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.nav-tab.active {
		color: var(--color-accent);
	}

	.nav-tab.active::before {
		opacity: 1;
	}

	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.nav-tab.active .tab-icon {
		transform: translateY(-1px);
	}

	.tab-label {
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-family: var(--font-sans);
	}
</style>
