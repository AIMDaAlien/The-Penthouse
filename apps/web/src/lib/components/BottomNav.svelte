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
		bottom: 0;
		left: 0;
		right: 0;
		height: 64px;
		display: flex;
		align-items: stretch;
		background: var(--color-surface-glass);
		backdrop-filter: var(--blur-glass);
		-webkit-backdrop-filter: var(--blur-glass);
		border-top: 1px solid var(--color-border);
		z-index: 100;
		padding-bottom: env(safe-area-inset-bottom, 0);
	}

	/* On desktop, keep nav aligned with the bounded app column */
	@media (min-width: 600px) {
		.bottom-nav {
			left: 50%;
			transform: translateX(-50%);
			width: min(480px, 100%);
			border-left: 1px solid var(--color-border);
			border-right: 1px solid var(--color-border);
		}
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
		padding: 0;
	}

	.nav-tab::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 2px;
		background: var(--color-accent);
		border-radius: 0 0 var(--radius-full) var(--radius-full);
		transition: width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.nav-tab.active {
		color: var(--color-accent);
	}

	.nav-tab.active::before {
		width: 32px;
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
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-family: var(--font-sans);
	}
</style>
