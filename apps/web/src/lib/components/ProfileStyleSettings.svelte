<script lang="ts">
	import { appearanceStore } from '$stores/appearance.svelte';

	interface Props {
		value?: 'editorial' | 'vogue' | 'wallpaper';
		onChange?: (style: 'editorial' | 'vogue' | 'wallpaper') => void;
	}

	let { value = 'editorial', onChange }: Props = $props();

	const options = [
		{ id: 'editorial' as const, label: 'Editorial', description: 'Banner above, roster + focus pane.' },
		{ id: 'vogue' as const, label: 'Vogue', description: 'Display-name hero, large pfp overlap.' },
		{ id: 'wallpaper' as const, label: 'Wallpaper', description: 'Banner fills the space, floating identity card.' },
	];
</script>

<div class="profile-style-list">
	{#each options as opt}
		<button
			class="profile-style-btn"
			class:active={value === opt.id}
			onclick={() => onChange?.(opt.id)}
			style="min-height: 44px;"
		>
			<span class="psb-label">{opt.label}</span>
			<span class="psb-desc">{opt.description}</span>
		</button>
	{/each}
</div>

<style>
	.profile-style-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.profile-style-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 3px;
		padding: 14px 20px;
		min-height: 44px;
		background: transparent;
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-md);
		color: var(--p-text-2);
		text-align: left;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.profile-style-btn.active {
		border-color: var(--p-accent);
		background: var(--p-accent-soft);
		color: var(--p-text);
	}

	.psb-label {
		font-size: 0.92rem;
		font-weight: 500;
		color: var(--p-text);
	}

	.psb-desc {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 1px;
		color: var(--p-muted);
	}
</style>
