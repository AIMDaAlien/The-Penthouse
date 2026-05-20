<script lang="ts">
	import VariantNav from '../_VariantNav.svelte';
	import AuroraShell from '../_AuroraShell.svelte';
</script>

<div class="root">
	<VariantNav family="aurora" />
	<AuroraShell
		frost="glass"
		title="Aurora · Glass"
		subtitle="medium frost"
		description="A 28px sidebar blur and 18px frosted panes on each open folder body. The folder color leaks subtly into the glass tint at the top edge. Ghost is a glassy pill, drop targets keep their luminous bars. The vibe: looking through a window with rain on it; you see the colors behind, but the words are crisp."
	/>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; }
	.root { display: flex; flex-direction: column; height: 100vh; }
</style>
