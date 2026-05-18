<script lang="ts">
	import VariantNav from '../_VariantNav.svelte';
	import AuroraShell from '../_AuroraShell.svelte';
</script>

<div class="root">
	<VariantNav family="aurora" />
	<AuroraShell
		frost="none"
		title="Aurora"
		subtitle="drenched color, no glass"
		description="Each open folder bathes its row stack in a soft vertical wash of its own color. Avatars stay solid lavender so the folder colors carry all the chromatic weight. Tap any folder's color dot to recolor."
	/>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; }
	.root { display: flex; flex-direction: column; height: 100vh; }
</style>
