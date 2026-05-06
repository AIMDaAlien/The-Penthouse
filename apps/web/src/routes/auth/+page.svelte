<script lang="ts">
</script>

<main class="auth">
	<h1>Authentication</h1>
	<p>Login / Register placeholder</p>
	<a href="/">Back</a>
</main>

<style>
	.auth {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
		gap: var(--space-md);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.75rem;
		color: var(--color-accent);
	}

	p {
		color: var(--color-text-secondary);
	}

	a {
		color: var(--color-accent);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
