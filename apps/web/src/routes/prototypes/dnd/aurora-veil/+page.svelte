<script lang="ts">
	import VariantNav from '../_VariantNav.svelte';
	import AuroraShell from '../_AuroraShell.svelte';
</script>

<div class="root">
	<VariantNav family="aurora" />
	<AuroraShell
		frost="veil"
		title="Aurora · Veil"
		subtitle="soft frost"
		description="The lightest touch. A 14px backdrop blur on the sidebar lets the canvas's distant color washes drift through; folder bodies pick up a faint 8px glass when expanded. Glass is barely there, but the color binding gets a little more atmosphere. Text stays on solid plates."
	/>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; }
	.root { display: flex; flex-direction: column; height: 100vh; }
</style>
