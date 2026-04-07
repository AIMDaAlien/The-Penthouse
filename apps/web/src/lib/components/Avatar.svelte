<script lang="ts">
	import { presenceStore } from '$stores/presence.svelte';

	interface Props {
		userId: string;
		displayName: string;
		avatarUrl?: string | null;
		size?: 'sm' | 'md' | 'lg';
		showPresence?: boolean;
	}

	let { userId, displayName, avatarUrl, size = 'md', showPresence = true } = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'avatar-sm',
		md: 'avatar-md',
		lg: 'avatar-lg'
	};

	const initials = (displayName || '')
		.split(' ')
		.map((n: string) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

	const isOnline = $derived(presenceStore.userPresenceMap.get(userId) ?? false);
</script>

<div class="avatar-container {sizeClasses[size]}">
	<div class="avatar">
		{#if avatarUrl}
			<img src={avatarUrl} alt={displayName} />
		{:else}
			<span class="initials">{initials}</span>
		{/if}
	</div>
	{#if showPresence && isOnline}
		<div class="presence-indicator" title={isOnline ? 'Online' : 'Offline'}></div>
	{/if}
</div>

<style>
	.avatar-container {
		position: relative;
		display: inline-block;
	}

	.avatar-container.avatar-sm {
		width: 32px;
		height: 32px;
	}

	.avatar-container.avatar-md {
		width: 48px;
		height: 48px;
	}

	.avatar-container.avatar-lg {
		width: 64px;
		height: 64px;
	}

	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: var(--color-accent-dim);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border: 2px solid var(--color-border);
		font-weight: 600;
		color: var(--color-accent);
		font-size: 0.875rem;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.presence-indicator {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 30%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-success);
		border: 2px solid var(--color-bg);
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
	}

	.avatar-container.avatar-sm .presence-indicator {
		width: 28%;
		border-width: 1.5px;
	}

	.avatar-container.avatar-lg .presence-indicator {
		width: 28%;
		border-width: 2.5px;
	}
</style>
