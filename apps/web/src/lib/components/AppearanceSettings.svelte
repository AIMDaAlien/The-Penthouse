<script lang="ts">
	import ThemePicker from './ThemePicker.svelte';
	import { appearanceStore } from '$stores/appearance.svelte';
</script>

<div class="appearance-settings">
	<div class="appearance-row">
		<div class="appearance-col">
			<span class="col-label">Theme</span>
			<ThemePicker />
		</div>
		<div class="appearance-col">
			<span class="col-label">Mode</span>
			<div class="mode-grid">
				<button
					class="mode-card"
					class:active={appearanceStore.mode === 'dark'}
					onclick={() => appearanceStore.setMode('dark')}
				>
					<span class="mode-glyph">●</span>
					<span class="mode-card-label">Dark</span>
				</button>
				<button
					class="mode-card"
					class:active={appearanceStore.mode === 'light'}
					onclick={() => appearanceStore.setMode('light')}
				>
					<span class="mode-glyph">○</span>
					<span class="mode-card-label">Light</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.appearance-settings {
		container-type: inline-size;
		container-name: appearance;
	}

	.appearance-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--sp-3);
	}

	@container appearance (min-width: 600px) {
		.appearance-row {
			grid-template-columns: 1fr 200px;
		}
	}

	.appearance-col {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.col-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 1.8px;
		text-transform: uppercase;
		color: var(--p-muted);
	}

	.mode-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.mode-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 6px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-sm);
		color: var(--p-text-2);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.mode-card.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
		color: var(--p-text);
	}

	.mode-glyph {
		font-size: 1rem;
	}

	.mode-card-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 1.5px;
		text-transform: uppercase;
	}
</style>
