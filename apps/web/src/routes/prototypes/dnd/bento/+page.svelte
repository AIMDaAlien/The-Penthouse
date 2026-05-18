<script lang="ts">
	import VariantNav from '../_VariantNav.svelte';
	import { createDnd, initials } from '../_dnd.svelte';

	const dnd = createDnd();
	let listEl: HTMLElement;
	$effect(() => dnd.setListEl(listEl));
</script>

<svelte:window
	onpointermove={dnd.handlePointerMove}
	onpointerup={dnd.handlePointerUp}
	onkeydown={dnd.handleKeydown}
/>

<div class="root">
	<VariantNav family="all" />

	<div class="page">
		<aside class="sidebar" bind:this={listEl}>
			<header class="head">
				<h1>Messages</h1>
				<button class="reset" onclick={dnd.reset}>reset</button>
			</header>

			<div class="list" role="list">
				{#each dnd.folders as folder, fi (folder.id)}
					<div class="card-slot" class:line={dnd.folderIndicatorBetween(fi)}></div>

					<section
						class="card folder"
						class:open={folder.open}
						class:dimmed={dnd.isDragSource('folder', folder.id)}
						class:hover-receive={dnd.targetFolderId() === folder.id}
						style:--fc={folder.color}
					>
						<div
							class="card-head"
							data-folder-header
							data-folder-id={folder.id}
							tabindex="0"
							role="button"
							aria-grabbed={dnd.drag?.active && dnd.drag.source.id === folder.id}
							aria-expanded={folder.open}
							onpointerdown={(e) => dnd.pickUp(e, { kind: 'folder', id: folder.id }, e.currentTarget as HTMLElement)}
							onclick={() => dnd.toggleFolder(folder.id)}
							onkeydown={(e) => dnd.rowKeydown(e, 'folder', folder.id)}
						>
							<span class="folder-strip" aria-hidden="true"></span>
							<div class="card-head-row">
								<div class="folder-meta">
									<span class="dot" aria-hidden="true"></span>
									<span class="folder-name">{folder.name}</span>
								</div>
								<div class="card-meta">
									<span class="count">{folder.chatIds.length}</span>
									<span class="caret" aria-hidden="true">
										<svg viewBox="0 0 12 12" width="10" height="10">
											<path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									</span>
								</div>
							</div>
						</div>

						{#if folder.open && folder.chatIds.length > 0}
							<div class="card-body">
								{#each folder.chatIds as chatId, ci (chatId)}
									{@const chat = dnd.chats.find((c) => c.id === chatId)}
									{#if chat}
										<div class="row-slot" class:line={dnd.indicatorBetween(folder.id, ci)}></div>
										<div
											class="row"
											data-chat-row
											data-chat-id={chat.id}
											class:dimmed={dnd.isDragSource('chat', chat.id)}
											tabindex="0"
											aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
											onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id, fromFolderId: folder.id }, e.currentTarget as HTMLElement)}
											onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id, folder.id)}
										>
											<div class="avatar">{initials(chat.name)}</div>
											<div class="body">
												<div class="line-1"><span class="name">{chat.name}</span><span class="time">{chat.time}</span></div>
												<div class="line-2"><span class="preview">{chat.preview}</span>{#if chat.unread}<span class="badge">{chat.unread}</span>{/if}</div>
											</div>
										</div>
									{/if}
								{/each}
								<div class="row-slot tail" class:line={dnd.indicatorBetween(folder.id, folder.chatIds.length)}></div>
							</div>
						{/if}
					</section>
				{/each}
				<div class="card-slot" class:line={dnd.folderIndicatorBetween(dnd.folders.length)}></div>

				{#if dnd.unfoldered.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
					<div class="section-divider">
						<span>Direct</span>
						<span class="count-pill">{dnd.unfoldered.length}</span>
					</div>
				{/if}

				<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
					{#if dnd.unfoldered.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
						<div class="root-pill">drop to ungroup</div>
					{/if}
					{#each dnd.unfoldered as chat, ci (chat.id)}
						<div class="row-slot wide" class:line={dnd.indicatorBetween('root', ci)}></div>
						<div
							class="row unfoldered"
							data-chat-row
							data-chat-id={chat.id}
							class:dimmed={dnd.isDragSource('chat', chat.id)}
							class:combine={dnd.combineTargetId() === chat.id}
							tabindex="0"
							aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
							onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id }, e.currentTarget as HTMLElement)}
							onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id)}
						>
							<div class="avatar">{initials(chat.name)}</div>
							<div class="body">
								<div class="line-1"><span class="name">{chat.name}</span><span class="time">{chat.time}</span></div>
								<div class="line-2"><span class="preview">{chat.preview}</span>{#if chat.unread}<span class="badge">{chat.unread}</span>{/if}</div>
							</div>
							{#if dnd.combineTargetId() === chat.id}<span class="combine-pill">release → folder</span>{/if}
						</div>
					{/each}
					<div class="row-slot tail wide" class:line={dnd.indicatorBetween('root', dnd.unfoldered.length)}></div>
				</div>
			</div>
		</aside>

		<section class="canvas">
			<div class="head-text">
				<h2>Bento<span> · drawer cards</span></h2>
				<p>Each folder is its own rounded drawer. A colored bar runs along the top edge in the folder's color. Drawers sit on the page with breathing room — no shared borders, no mash. When you drag a chat over a folder's drawer, the entire card lifts 2px and outlines in accent. Tactile, like rearranging cards on a desk.</p>
			</div>

			<div class="actions">
				<header><h3>Store calls</h3><span class="muted">recent first</span></header>
				{#if dnd.actions.length === 0}
					<p class="empty">Drag any row to begin.</p>
				{:else}
					<ol>
						{#each dnd.actions as a, i (a.ts + i)}
							<li><code class="n">{a.label}</code><code class="p">{a.payload}</code><span class="t">{a.ts}</span></li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>

		{#if dnd.drag && dnd.drag.active}
			{@const d = dnd.drag}
			<div class="ghost card-style" style:left="{d.pointerX - d.offsetX}px" style:top="{d.pointerY - d.offsetY}px" aria-hidden="true">
				<div class="ghost-strip" style:background={d.source.kind === 'folder' ? dnd.folders.find((f) => f.id === d.source.id)?.color : 'oklch(0.69 0.140 285)'}></div>
				<div class="ghost-body">
					{#if d.source.kind === 'folder'}
						<span class="folder-name">{d.preview}</span>
					{:else}
						<div class="avatar small">{initials(d.preview)}</div>
						<span class="name">{d.preview}</span>
					{/if}
				</div>
			</div>
		{/if}

		<div class="live" aria-live="polite" aria-atomic="true">{dnd.liveMsg}</div>
	</div>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; background: oklch(0.10 0.015 280); }

	.root { display: flex; flex-direction: column; height: 100vh; }
	.page {
		display: grid; grid-template-columns: 380px 1fr; flex: 1; min-height: 0;
		background: oklch(0.14 0.018 280); color: oklch(0.93 0.012 280);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		font-size: 14px; user-select: none;
		--accent: oklch(0.74 0.130 200);
		--accent-soft: oklch(0.74 0.130 200 / 0.18);
		--accent-edge: oklch(0.74 0.130 200 / 0.42);
		--text: oklch(0.93 0.012 280);
		--text-2: oklch(0.80 0.025 280);
		--muted: oklch(0.62 0.040 280);
		--surface: oklch(0.20 0.022 280);
		--surface-2: oklch(0.24 0.026 280);
		--line: oklch(0.78 0.090 280 / 0.10);
	}

	.sidebar {
		display: flex; flex-direction: column; min-height: 0;
		background: oklch(0.14 0.018 280); border-right: 1px solid var(--line);
	}
	.head {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 22px 22px 14px;
	}
	h1 { font-size: 19px; font-weight: 600; letter-spacing: -0.015em; margin: 0; }
	.reset {
		background: oklch(0.20 0.022 280); border: 1px solid var(--line);
		color: var(--muted); padding: 5px 11px; border-radius: 8px; font-size: 11px;
		text-transform: lowercase; letter-spacing: 0.04em; cursor: pointer;
		transition: color 140ms, border-color 140ms;
	}
	.reset:hover { color: var(--text); border-color: var(--accent-edge); }

	.list { flex: 1; overflow-y: auto; padding: 6px 14px 24px; min-height: 0; display: flex; flex-direction: column; gap: 10px; }

	/* ----- Cards (folders) ----- */
	.card {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
		transition:
			transform 240ms cubic-bezier(0.16, 1, 0.3, 1),
			border-color 200ms,
			box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
	}
	.card.hover-receive {
		transform: translateY(-2px);
		border-color: var(--accent-edge);
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.04) inset,
			0 10px 24px oklch(0.05 0.02 280 / 0.5),
			0 0 0 1.5px var(--accent);
	}

	.card-head {
		padding: 13px 16px 12px;
		cursor: pointer;
		position: relative;
		transition: background 160ms;
	}
	.card-head:hover { background: oklch(1 0 0 / 0.02); }
	.card-head:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.folder-strip {
		position: absolute; top: 0; left: 0; right: 0;
		height: 3px;
		background: var(--fc);
		opacity: 0.85;
	}

	.card-head-row {
		display: flex; align-items: center; justify-content: space-between; gap: 12px;
	}
	.folder-meta { display: flex; align-items: center; gap: 9px; }
	.dot {
		width: 9px; height: 9px; border-radius: 50%;
		background: var(--fc);
		box-shadow: 0 0 0 2px color-mix(in oklch, var(--fc) 30%, transparent);
	}
	.folder-name {
		font-weight: 600; font-size: 14px; letter-spacing: -0.005em;
		color: var(--text);
	}

	.card-meta { display: flex; align-items: center; gap: 10px; }
	.count {
		font-size: 11px; font-weight: 600; color: var(--text-2);
		background: color-mix(in oklch, var(--fc) 14%, oklch(0 0 0 / 0.18));
		padding: 2px 8px; border-radius: 999px; min-width: 22px; text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.caret {
		display: inline-flex; align-items: center; justify-content: center;
		color: var(--muted);
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.folder:not(.open) .caret { transform: rotate(-90deg); }

	.card-body {
		border-top: 1px solid color-mix(in oklch, var(--fc) 14%, var(--line));
		padding: 4px 0;
	}

	.row {
		display: flex; align-items: center; gap: 11px;
		padding: 9px 16px; cursor: default; position: relative;
		transition: background 140ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms;
		touch-action: none;
	}
	.row.unfoldered { padding: 11px 16px; }
	.row:hover { background: color-mix(in oklch, var(--text) 4%, transparent); }
	.row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.avatar {
		width: 36px; height: 36px; border-radius: 12px;
		background: linear-gradient(160deg, oklch(0.45 0.10 285), oklch(0.32 0.07 320));
		display: grid; place-items: center; font-weight: 600;
		font-size: 12px; letter-spacing: 0.04em; color: oklch(0.95 0.01 280);
		flex-shrink: 0;
	}
	.avatar.small { width: 28px; height: 28px; font-size: 10.5px; border-radius: 8px; }
	.body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.line-1, .line-2 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; }
	.name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.time { font-size: 11px; color: var(--muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
	.preview { font-size: 12.5px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
	.badge {
		background: var(--accent); color: oklch(0.14 0.018 280); font-size: 10.5px; font-weight: 700;
		padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center; flex-shrink: 0;
	}
	.dimmed { opacity: 0.3; filter: saturate(0.6); }

	/* ----- Slots / indicators ----- */
	.card-slot, .row-slot { height: 0; position: relative; overflow: visible; }
	.row-slot.tail { height: 4px; }
	.card-slot.line::after {
		content: ''; position: absolute; left: 0; right: 0; top: -5px;
		height: 3px; background: var(--accent); border-radius: 3px;
		box-shadow: 0 0 0 4px var(--accent-soft);
		animation: bar-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.row-slot.line::after {
		content: ''; position: absolute; left: 16px; right: 16px; top: -1px;
		height: 2px; background: var(--accent); border-radius: 2px;
		box-shadow: 0 0 0 4px var(--accent-soft);
		animation: bar-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.row-slot.wide.line::after { left: 0; right: 0; }
	@keyframes bar-in {
		from { transform: scaleX(0.5); opacity: 0; }
		to   { transform: scaleX(1); opacity: 1; }
	}

	.row.combine {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1.5px var(--accent);
		border-radius: 10px;
		margin: 0 6px;
	}
	.combine-pill {
		position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
		background: var(--accent); color: oklch(0.14 0.018 280); font-size: 10.5px;
		font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
	}

	/* ----- Section / root ----- */
	.section-divider {
		display: flex; align-items: center; gap: 10px;
		padding: 18px 4px 8px;
		font-size: 13px; font-weight: 600; color: var(--text);
	}
	.section-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
	.count-pill {
		font-size: 10.5px; font-weight: 600; color: var(--muted);
		background: var(--surface); border: 1px solid var(--line);
		padding: 1px 7px; border-radius: 999px;
	}

	.root-zone {
		position: relative; min-height: 24px; padding: 0;
		border-radius: 12px;
		transition: background 200ms, box-shadow 200ms;
	}
	.root-zone.active {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1.5px var(--accent-edge), inset 0 0 0 4px oklch(0.14 0.018 280 / 0.4);
	}
	.root-pill {
		display: inline-block; margin: 18px; font-size: 11px; text-transform: uppercase;
		letter-spacing: 0.08em; color: var(--accent); background: var(--accent-soft);
		border: 1px dashed var(--accent-edge); padding: 6px 12px; border-radius: 999px;
	}

	/* ----- Ghost ----- */
	.ghost.card-style {
		position: fixed; z-index: 100; pointer-events: none;
		background: var(--surface-2); border: 1px solid var(--accent-edge);
		border-radius: 12px; overflow: hidden;
		min-width: 240px; max-width: 320px;
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.04) inset,
			0 18px 36px oklch(0.05 0.02 280 / 0.55),
			0 0 0 3px var(--accent-soft);
		transform: scale(1.04) rotate(-1deg);
		animation: ghost-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.ghost-strip { height: 3px; }
	.ghost-body { display: flex; align-items: center; gap: 10px; padding: 9px 14px; }
	@keyframes ghost-in {
		from { opacity: 0; transform: scale(1) rotate(0); }
		to   { opacity: 0.97; transform: scale(1.04) rotate(-1deg); }
	}

	/* ----- Canvas ----- */
	.canvas {
		display: flex; flex-direction: column; padding: 28px 36px; gap: 18px;
		overflow-y: auto; min-height: 0;
		background: radial-gradient(ellipse 80% 60% at 100% 0%, oklch(0.74 0.130 200 / 0.05), transparent 60%), oklch(0.14 0.018 280);
	}
	.head-text h2 { margin: 0 0 6px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
	.head-text h2 span { font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-left: 6px; }
	.head-text p { margin: 0; color: var(--text-2); font-size: 13.5px; line-height: 1.55; max-width: 70ch; }

	.actions {
		flex: 1; min-height: 200px; background: var(--surface); border: 1px solid var(--line);
		border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; max-width: 760px;
	}
	.actions header {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 14px 18px; border-bottom: 1px solid var(--line);
	}
	.actions h3 { margin: 0; font-size: 13px; font-weight: 600; }
	.muted { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
	.empty { padding: 28px 18px; color: var(--muted); font-size: 13px; }
	.actions ol {
		list-style: none; margin: 0; padding: 4px 0; overflow-y: auto;
		font-family: ui-monospace, "JetBrains Mono", monospace; font-size: 11.5px;
	}
	.actions li {
		display: grid; grid-template-columns: 240px 1fr auto; gap: 14px; padding: 8px 18px;
		border-bottom: 1px solid var(--line); align-items: baseline;
	}
	.n { color: var(--accent); font-weight: 600; white-space: nowrap; }
	.p { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.t { color: var(--muted); font-size: 10.5px; }

	.live { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
