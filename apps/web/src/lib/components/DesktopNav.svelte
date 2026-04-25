<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const pathname = $derived(page.url.pathname);
</script>

<nav class="desktop-nav" aria-label="Main navigation">
	<button
		class="nav-item"
		class:active={pathname === '/'}
		onclick={() => goto('/')}
	>
		Messages
	</button>
	<button
		class="nav-item"
		class:active={pathname === '/users' || pathname.startsWith('/users/')}
		onclick={() => goto('/users')}
	>
		People
	</button>
	<button
		class="nav-item"
		class:active={pathname === '/settings'}
		onclick={() => goto('/settings')}
	>
		Settings
	</button>
</nav>

<style>
	.desktop-nav {
		display: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.desktop-nav {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			position: absolute;
			bottom: 32px;
			left: 32px;
		}

		.nav-item {
			background: none;
			border: none;
			box-shadow: none;
			font-family: var(--font-display);
			font-size: 2.8rem;
			font-style: italic;
			font-weight: 400;
			line-height: 0.8;
			color: var(--color-text-secondary);
			opacity: 0.2;
			cursor: pointer;
			transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
			text-align: left;
			padding: 0;
			text-shadow: none;
			border-radius: 0;
		}

		.nav-item:hover {
			opacity: 0.6;
			background: none;
		}

		.nav-item:active {
			transform: none;
			background: none;
		}

		.nav-item.active {
			opacity: 1;
			color: var(--color-text-primary);
			transform: translateX(16px);
		}

		.nav-item.active:active {
			transform: translateX(16px);
		}
	}
</style>
