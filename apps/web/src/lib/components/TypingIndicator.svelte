<script lang="ts">
	interface Props {
		label: string;
	}
	let { label }: Props = $props();
</script>

{#if label}
	<span class="typing-indicator" aria-live="polite" aria-label="{label}...">
		{label}
		<span class="dots" aria-hidden="true">
			<span class="dot"></span>
			<span class="dot"></span>
			<span class="dot"></span>
		</span>
	</span>
{/if}

<style>
	.typing-indicator {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-xs);
		color: var(--color-accent);
		opacity: 0.75;
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.dots {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: currentColor;
		animation: typing-bounce 1.4s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing-bounce {
		0%,
		60%,
		100% {
			opacity: 0.3;
			transform: translateY(0);
		}
		30% {
			opacity: 1;
			transform: translateY(-2px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
