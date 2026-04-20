<script lang="ts">
	import { page } from '$app/state';
	import ChatListPane from '$lib/components/ChatListPane.svelte';

	let { children } = $props();

	// Mobile: track whether we're inside a thread to toggle visible pane
	const isThread = $derived(page.url.pathname.startsWith('/chat/'));
</script>

<div class="monolith" class:show-thread={isThread}>
	<div class="pane-left" aria-hidden={isThread ? true : undefined}>
		<ChatListPane />
	</div>
	<div class="pane-right">
		{@render children()}
	</div>
</div>

<style>
	/* ── Mobile base (touch / coarse pointer devices) ── */
	.monolith {
		display: block;
		min-height: 100dvh;
	}

	/* Hide whichever pane is not active on mobile */
	.monolith:not(.show-thread) .pane-right {
		display: none;
	}

	.monolith.show-thread .pane-left {
		display: none;
	}

	/* ── Desktop: mouse/trackpad (hover:hover + pointer:fine) ── */
	@media (hover: hover) and (pointer: fine) {
		.monolith {
			display: flex;
			width: 100%;
			max-width: 1200px;
			height: 760px;
			border-radius: var(--radius-xl);
			overflow: hidden;
			box-shadow:
				0 16px 64px rgba(0, 0, 0, 0.6),
				0 0 0 1px var(--color-border);
			/* Center inside app-shell on desktop */
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			animation: monolith-expand 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
		}

		.pane-left {
			width: 340px;
			flex-shrink: 0;
			background: var(--color-bg);
			border-right: 1px solid var(--color-border);
			overflow-y: auto;
			overflow-x: hidden;
			display: flex;
			flex-direction: column;
			/* Always visible on desktop — both panes show */
			display: flex !important;
		}

		.pane-right {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			position: relative;
			/* Always visible on desktop */
			display: block !important;
			/* Scoped view transition: only this pane animates between threads */
			view-transition-name: pane-right;
		}

		/* Chat list bottom padding meant for floating nav — not needed in pane */
		.pane-left :global(.chat-list) {
			padding-bottom: 0;
		}

		/* Shell should fill the pane, not 100dvh */
		.pane-left :global(.shell) {
			min-height: 100%;
		}

		/* Thread shell fills pane height instead of full viewport */
		.pane-right :global(.thread-shell) {
			height: 100%;
		}

		/* Suppress full-page root transition on desktop — pane-right handles it */
		:global(::view-transition-old(root)),
		:global(::view-transition-new(root)) {
			animation: none;
		}

		:global(::view-transition-old(pane-right)) {
			animation: 120ms ease both pane-out;
		}

		:global(::view-transition-new(pane-right)) {
			animation: 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both pane-in;
		}
	}

	@keyframes pane-out {
		to { opacity: 0; transform: translateY(-4px); }
	}

	@keyframes pane-in {
		from { opacity: 0; transform: translateY(6px); }
	}

	@keyframes monolith-expand {
		from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
		to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
	}
</style>
