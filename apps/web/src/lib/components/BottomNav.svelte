<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		active?: 'chats' | 'users' | 'settings';
	}

	let { active = 'chats' }: Props = $props();
</script>

<nav class="bottom-nav">
	<a href="/" class="nav-item" class:active={active === 'chats'}>
		<Icon name="message" size={22} />
		<span>Chats</span>
	</a>
	<a href="/users" class="nav-item" class:active={active === 'users'}>
		<Icon name="users" size={22} />
		<span>Users</span>
	</a>
	<a href="/settings" class="nav-item" class:active={active === 'settings'}>
		<Icon name="settings" size={22} />
		<span>Settings</span>
	</a>
</nav>

<style>
	.bottom-nav {
		display: flex;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: var(--space-xs) 0 calc(var(--space-xs) + env(safe-area-inset-bottom));
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-xs) 0;
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		transition: color 0.15s;
	}

	.nav-item.active {
		color: var(--color-accent);
	}

	.nav-item:not(.active):hover {
		color: var(--color-text-secondary);
	}
</style>
