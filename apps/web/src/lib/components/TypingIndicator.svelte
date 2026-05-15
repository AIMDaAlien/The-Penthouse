<script lang="ts">
	interface Props {
		users: Map<string, string>;
		chatType?: 'dm' | 'channel';
	}

	let { users, chatType }: Props = $props();

	const entries = $derived(Array.from(users.entries()));
	const visible = $derived(entries.slice(0, 3));
	const overflow = $derived(Math.max(0, entries.length - 3));

	const ariaLabel = $derived.by(() => {
		const names = visible.map(([, displayName]) => displayName);
		if (names.length === 0) return '';
		if (names.length === 1) return `${names[0]} is typing`;
		if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
		if (overflow === 0) return `${names[0]}, ${names[1]} and ${names[2]} are typing`;
		return `${names[0]}, ${names[1]} and ${overflow} ${overflow === 1 ? 'other' : 'others'} are typing`;
	});

	const textLabel = $derived.by(() => {
		if (entries.length <= 3) return ariaLabel;
		return `and ${overflow} ${overflow === 1 ? 'other' : 'others'} are typing`;
	});

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}
</script>

<div class="typing-indicator" aria-live="polite" aria-atomic="true">
	{#if users.size > 0}
		<div class="typing-row">
			<span class="sr-only">{ariaLabel}</span>
			<div class="typers" aria-hidden="true">
				{#each visible as [userId, displayName] (userId)}
					<div class="typer">
						<span class="avatar">{getInitials(displayName)}</span>
						{#if entries.length <= 3}
							<span class="dots">
								<span class="dot"></span>
								<span class="dot"></span>
								<span class="dot"></span>
							</span>
						{/if}
					</div>
				{/each}
				{#if overflow > 0}
					<span class="label">{textLabel}</span>
				{:else}
					<span class="dots">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.typing-row {
		display: flex;
		align-items: center;
		padding: 4px 0 2px;
	}

	.typers {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.typer {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.avatar {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--p-accent) 20%, transparent);
		border: 1px solid color-mix(in srgb, var(--p-accent) 30%, transparent);
		font-size: 9px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: var(--p-accent);
	}

	.dots {
		display: inline-flex;
		gap: 3px;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--p-accent);
		animation: bounce 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
	}

	.dot:nth-child(1) {
		animation-delay: -0.32s;
	}

	.dot:nth-child(2) {
		animation-delay: -0.16s;
	}

	.dot:nth-child(3) {
		animation-delay: 0s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: translateY(0);
			opacity: 0.3;
		}
		40% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}

	.label {
		font-size: 12px;
		font-style: italic;
		color: var(--p-accent);
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sr-only {
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

	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
