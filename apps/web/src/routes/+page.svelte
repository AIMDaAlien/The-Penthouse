<script lang="ts">
	import { sessionStore } from '$stores/session.svelte';
	import { socketStore } from '$stores/socket.svelte';

	const statusColor = $derived(
		socketStore.state === 'connected' ? 'var(--color-success)' :
		socketStore.state === 'connecting' ? 'var(--color-accent)' :
		'var(--color-error)'
	);
</script>

<main class="home">
	<header class="header">
		<h1>The Penthouse</h1>
		<div class="status" style:color={statusColor}>
			● {socketStore.state}
		</div>
	</header>

	<section class="chat-list">
		<p class="empty">No chats yet.</p>
	</section>

	<nav class="bottom-nav">
		<button class="nav-btn active">Chats</button>
		<button class="nav-btn">Users</button>
		<button class="nav-btn">Settings</button>
	</nav>
</main>

<style>
	.home {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	.status {
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		text-transform: uppercase;
	}

	.chat-list {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.empty {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.bottom-nav {
		display: flex;
		border-top: 1px solid var(--color-border);
		padding: var(--space-sm);
		gap: var(--space-sm);
	}

	.nav-btn {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.nav-btn.active {
		background: var(--color-surface-elevated);
		color: var(--color-text);
	}

	.nav-btn:not(:disabled):hover {
		background: var(--color-surface-elevated);
	}
</style>
