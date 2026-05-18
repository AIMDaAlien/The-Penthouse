<script lang="ts">
	import VariantNav from '../_VariantNav.svelte';
	import AuroraShell from '../_AuroraShell.svelte';
</script>

<div class="root">
	<VariantNav family="aurora" />
	<AuroraShell
		frost="crystal"
		title="Aurora · Crystal"
		subtitle="sharp glass, cooler"
		description="40px sidebar blur with saturation 180 and contrast bumped to 108, plus a 26px frost on folder bodies. Inner edges get a faint cool-blue highlight, so the glass reads as a beveled crystal slab. Ghost glows hard with a tinted halo. The backdrop has stronger color and the glass refracts more, so the whole pane feels like polished frozen surface."
	/>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; }
	.root { display: flex; flex-direction: column; height: 100vh; }
</style>
