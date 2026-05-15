<script lang="ts">
	import { themes } from '$lib/themes';
	import { appearanceStore } from '$stores/appearance.svelte';

	const currentMode = $derived(appearanceStore.resolvedMode);
</script>

<div class="theme-grid">
	{#each themes as t}
		<button
			class="theme-btn"
			class:active={appearanceStore.themeId === t.id}
			onclick={() => appearanceStore.setTheme(t.id)}
			aria-label="Theme: {t.label}"
		>
			<span class="theme-swatch" style:background={t[currentMode].accent}></span>
			<span class="theme-label">{t.label}</span>
		</button>
	{/each}
</div>

<style>
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
	}

	.theme-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 4px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-sm);
		color: var(--p-text-2);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.theme-btn.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
	}

	.theme-swatch {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1px solid var(--p-line-2);
	}

	.theme-btn.active .theme-swatch {
		box-shadow: 0 0 0 2px var(--p-accent-soft);
	}

	.theme-label {
		font-family: var(--font-mono);
		font-size: 0.54rem;
		letter-spacing: 1px;
		text-transform: uppercase;
	}
</style>
