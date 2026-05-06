<script lang="ts">
</script>

<main class="home">
	<h1>The Penthouse</h1>
	<p class="tagline">A privacy-focused messaging app as dynamic as your personality</p>
	<a href="/auth" class="enter">Enter</a>
</main>

<style>
	.home {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		text-align: center;
		gap: var(--space-md);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: -0.02em;
	}

	.tagline {
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--color-text-secondary);
		max-width: 280px;
		line-height: 1.4;
	}

	.enter {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-accent);
		color: var(--color-bg);
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 500;
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: background 0.2s ease;
	}

	.enter:hover {
		background: var(--color-accent-hover);
	}

	@media (min-width: 768px) {
		h1 {
			font-size: 3.5rem;
		}

		.tagline {
			font-size: 1.125rem;
			max-width: 360px;
		}
	}
</style>
