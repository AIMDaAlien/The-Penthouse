<script lang="ts">
	import '../app.css';
</script>

<svelte:head>
	<title>The Penthouse</title>
</svelte:head>

<div class="app">
	<slot />
</div>

<style>
	:global(:root) {
		--color-bg: #12121C;
		--color-surface: #1A1A28;
		--color-surface-elevated: #222236;
		--color-text: #E8E8F0;
		--color-text-secondary: #9494A8;
		--color-text-muted: #646478;
		--color-accent: #C9A96E;
		--color-accent-hover: #D4B87A;
		--color-border: #2A2A3E;
		--color-error: #E06C75;
		--color-success: #98C379;
		--font-display: 'Gelasio', Georgia, serif;
		--font-body: 'Ubuntu', system-ui, sans-serif;
		--font-mono: 'JetBrains Mono', monospace;
		--space-xs: 0.25rem;
		--space-sm: 0.5rem;
		--space-md: 1rem;
		--space-lg: 1.5rem;
		--space-xl: 2rem;
		--radius-sm: 6px;
		--radius-md: 10px;
		--radius-lg: 16px;
	}

	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-body);
		font-size: 16px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
</style>
