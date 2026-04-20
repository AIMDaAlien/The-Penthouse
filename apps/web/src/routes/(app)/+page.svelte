<!-- Desktop: empty right pane when no conversation is selected -->
<!-- Mobile: hidden by (app)/+layout.svelte (pane-right hidden when !show-thread) -->
<div class="select-placeholder">
	<div class="empty-book">
		<span class="empty-label">DIRECTORY IS EMPTY</span>
		<blockquote class="empty-quote">
			All distances are the same<br>to the person who longs.
		</blockquote>
		<cite class="empty-cite">— Rainer Maria Rilke</cite>
	</div>
</div>

<style>
	.select-placeholder {
		height: 100%;
		display: flex;
		align-items: center;
		min-height: 100dvh;
		padding: 0 48px;
	}

	.empty-book {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 320px;
	}

	.empty-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: var(--weight-medium);
		letter-spacing: 0.12em;
		color: var(--color-text-secondary);
		opacity: 0.6;
	}

	.empty-quote {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-xl);
		line-height: 1.4;
		background: linear-gradient(180deg, var(--color-text-primary) 40%, transparent 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	.empty-cite {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-style: normal;
		color: var(--color-text-secondary);
		opacity: 0.5;
	}

	@media (hover: hover) and (pointer: fine) {
		.select-placeholder {
			min-height: unset;
		}
	}
</style>
