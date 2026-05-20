<!--
  Wordmark.svelte — the sacred wordmark.
  Treatment matches the original /auth route exactly:
    'The'  : Gelasio italic, periwinkle accent, 1.25rem, 0.08em letter-spacing
    'PENT' : Gelasio bold, large, -0.015em letter-spacing
    'HOUSE': Gelasio bold, large, -0.015em letter-spacing
  Stacked. line-height 0.88.
  size prop scales PENT/HOUSE; 'The' scales in proportion.
-->
<script lang="ts">
	type Size = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
	let {
		size = 'lg',
		align = 'start'
	}: { size?: Size; align?: 'start' | 'center' | 'end' } = $props();

	const pentSize: Record<Size, string> = {
		sm:  '2rem',
		md:  '2.75rem',
		lg:  'clamp(3rem, 6vw, 4rem)',
		xl:  'clamp(4rem, 10vw, 6rem)',
		xxl: 'clamp(5rem, 13vw, 8.5rem)'
	};
	const theSize: Record<Size, string> = {
		sm:  '0.78rem',
		md:  '1rem',
		lg:  '1.25rem',
		xl:  '1.5rem',
		xxl: '1.8rem'
	};
</script>

<div
	class="wm"
	style="--wm-pent: {pentSize[size]}; --wm-the: {theSize[size]}; --wm-align: {align};"
>
	<span class="wm-the">The</span>
	<span class="wm-pent">PENT</span>
	<span class="wm-house">HOUSE</span>
</div>

<style>
	.wm {
		display: flex;
		flex-direction: column;
		align-items: var(--wm-align);
		font-family: var(--font-display);
		line-height: 0.88;
		user-select: none;
	}

	.wm-the {
		font-style: italic;
		font-weight: 400;
		font-size: var(--wm-the);
		color: var(--p-accent);
		letter-spacing: 0.08em;
		margin-bottom: 0.2em;
	}

	.wm-pent,
	.wm-house {
		font-weight: 700;
		font-size: var(--wm-pent);
		color: var(--p-text);
		letter-spacing: -0.015em;
		line-height: 0.95;
	}
</style>
