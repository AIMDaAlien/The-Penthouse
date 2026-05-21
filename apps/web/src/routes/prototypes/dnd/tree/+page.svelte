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
				<span class="path">~/messages</span>
				<button class="reset" onclick={dnd.reset}>reset</button>
			</header>

			<div class="list" role="list">
				{#each dnd.folders as folder, fi (folder.id)}
					<div class="row-slot" class:line={dnd.folderIndicatorBetween(fi)} data-depth="0"></div>
					<section
						class="folder"
						class:open={folder.open}
						class:dimmed={dnd.isDragSource('folder', folder.id)}
						style:--fc={folder.color}
					>
						<div
							class="folder-row"
							data-folder-header
							data-folder-id={folder.id}
							class:drop-fill={dnd.targetFolderId() === folder.id}
							tabindex="0"
							role="button"
							aria-grabbed={dnd.drag?.active && dnd.drag.source.id === folder.id}
							aria-expanded={folder.open}
							onpointerdown={(e) => dnd.pickUp(e, { kind: 'folder', id: folder.id }, e.currentTarget as HTMLElement)}
							onclick={() => dnd.toggleFolder(folder.id)}
							onkeydown={(e) => dnd.rowKeydown(e, 'folder', folder.id)}
						>
							<span class="tw">{folder.open ? '▾' : '▸'}</span>
							<span class="tw fc"></span>
							<span class="fname">{folder.name.toLowerCase()}</span>
							<span class="meta">{folder.chatIds.length}</span>
						</div>

						{#if folder.open && folder.chatIds.length > 0}
							<div class="folder-body">
								<div class="indent-guide" aria-hidden="true"></div>
								{#each folder.chatIds as chatId, ci (chatId)}
									{@const chat = dnd.chats.find((c) => c.id === chatId)}
									{#if chat}
										<div class="row-slot indent" class:line={dnd.indicatorBetween(folder.id, ci)}></div>
										<div
											class="chat-row in-folder"
											data-chat-row
											data-chat-id={chat.id}
											class:dimmed={dnd.isDragSource('chat', chat.id)}
											role="button"
											tabindex="0"
											aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
											onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id, fromFolderId: folder.id }, e.currentTarget as HTMLElement)}
											onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id, folder.id)}
										>
											<span class="tw branch">├</span>
											<div class="sq">{initials(chat.name)}</div>
											<span class="cname">{chat.name}</span>
											<span class="meta">{chat.time}</span>
											{#if chat.unread}<span class="badge">{chat.unread}</span>{/if}
										</div>
									{/if}
								{/each}
								<div class="row-slot indent tail" class:line={dnd.indicatorBetween(folder.id, folder.chatIds.length)}></div>
							</div>
						{/if}
					</section>
				{/each}
				<div class="row-slot" class:line={dnd.folderIndicatorBetween(dnd.folders.length)}></div>

				{#if dnd.unfoldered.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
					<div class="section-label">direct/</div>
				{/if}

				<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
					{#if dnd.unfoldered.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
						<div class="root-hint">// drop to ungroup</div>
					{/if}
					{#each dnd.unfoldered as chat, ci (chat.id)}
						<div class="row-slot" class:line={dnd.indicatorBetween('root', ci)}></div>
						<div
							class="chat-row"
							data-chat-row
							data-chat-id={chat.id}
							class:dimmed={dnd.isDragSource('chat', chat.id)}
							class:combine={dnd.combineTargetId() === chat.id}
							role="button"
							tabindex="0"
							aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
							onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id }, e.currentTarget as HTMLElement)}
							onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id)}
						>
							<span class="tw"></span>
							<div class="sq">{initials(chat.name)}</div>
							<span class="cname">{chat.name}</span>
							<span class="meta">{chat.time}</span>
							{#if chat.unread}<span class="badge">{chat.unread}</span>{/if}
							{#if dnd.combineTargetId() === chat.id}<span class="merge-pill">→ new/</span>{/if}
						</div>
					{/each}
					<div class="row-slot tail" class:line={dnd.indicatorBetween('root', dnd.unfoldered.length)}></div>
				</div>
			</div>
		</aside>

		<section class="canvas">
			<div class="head-text">
				<h2>Tree<span class="rev"> · ide / file-tree precision</span></h2>
				<p>Editorial, code-editor-adjacent. Lowercased folder names, monospace metadata, dotted indent guides spanning each folder. Drop indicators are a thin caret line at the insertion point. Ghost is a hairline outline — no fill, no shadow. Designed for users who think in trees.</p>
			</div>

			<div class="actions">
				<header><h3>store calls</h3><span class="muted">// recent first</span></header>
				{#if dnd.actions.length === 0}
					<p class="empty">$ // grab any row to begin</p>
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
			<div class="ghost" style:left="{d.pointerX - d.offsetX}px" style:top="{d.pointerY - d.offsetY}px" aria-hidden="true">
				{#if d.source.kind === 'folder'}
					<span class="tw">▸</span><span>{d.preview.toLowerCase()}</span>
				{:else}
					<span class="tw">├</span><div class="sq">{initials(d.preview)}</div><span>{d.preview}</span>
				{/if}
			</div>
		{/if}

		<div class="live" aria-live="polite" aria-atomic="true">{dnd.liveMsg}</div>
	</div>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; background: oklch(0.10 0.015 280); }

	.root { display: flex; flex-direction: column; height: 100vh; }
	.page {
		display: grid; grid-template-columns: 360px 1fr; flex: 1; min-height: 0;
		background: oklch(0.13 0.014 250); color: oklch(0.93 0.012 250);
		font-family: ui-monospace, "JetBrains Mono", "IBM Plex Mono", "SF Mono", monospace;
		font-size: 13px;
		user-select: none;
		--accent: oklch(0.78 0.110 195);
		--accent-soft: oklch(0.78 0.110 195 / 0.18);
		--accent-edge: oklch(0.78 0.110 195 / 0.42);
		--text: oklch(0.93 0.012 250);
		--text-2: oklch(0.78 0.020 250);
		--muted: oklch(0.55 0.040 250);
		--surface: oklch(0.17 0.018 250);
		--surface-2: oklch(0.20 0.020 250);
		--line: oklch(0.78 0.030 250 / 0.10);
	}

	.sidebar {
		display: flex; flex-direction: column; min-height: 0;
		background: oklch(0.13 0.014 250); border-right: 1px solid var(--line);
	}
	.head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 18px; border-bottom: 1px solid var(--line);
	}
	.path { font-size: 11.5px; color: var(--accent); letter-spacing: 0.02em; }
	.reset {
		background: none; border: 1px solid var(--line); color: var(--muted);
		font-family: inherit; font-size: 11px;
		padding: 3px 9px; border-radius: 4px; cursor: pointer;
		transition: color 140ms, border-color 140ms;
	}
	.reset:hover { color: var(--text); border-color: var(--accent-edge); }

	.list { flex: 1; overflow-y: auto; padding: 6px 0 20px; }

	.folder { position: relative; }
	.folder-row {
		display: grid;
		grid-template-columns: 14px 8px 1fr auto;
		align-items: center; gap: 8px;
		padding: 5px 16px 5px 14px;
		font-size: 12.5px; cursor: pointer;
		transition: background 120ms;
	}
	.folder-row:hover { background: color-mix(in oklch, var(--fc) 8%, transparent); }
	.folder-row:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }

	.tw {
		display: inline-flex; align-items: center; justify-content: center;
		font-size: 11px; color: var(--muted); width: 14px; line-height: 1;
	}
	.tw.fc { width: 8px; height: 8px; border-radius: 2px; background: var(--fc); }
	.fname {
		color: var(--text); font-weight: 500;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.folder.open .fname { color: oklch(0.96 0.012 250); }
	.meta {
		color: var(--muted); font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.folder-body {
		position: relative;
		padding-bottom: 4px;
	}
	.indent-guide {
		position: absolute; left: 20px; top: 0; bottom: 6px;
		border-left: 1px dotted color-mix(in oklch, var(--fc) 50%, transparent);
	}

	.chat-row {
		display: grid;
		grid-template-columns: 14px 22px 1fr auto auto;
		align-items: center; gap: 8px;
		padding: 4px 16px 4px 14px;
		font-size: 12.5px; position: relative; cursor: default;
		transition: background 120ms;
		touch-action: none;
	}
	.chat-row.in-folder { padding-left: 32px; }
	.chat-row:hover { background: oklch(1 0 0 / 0.03); }
	.chat-row:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }

	.branch { color: color-mix(in oklch, var(--fc) 60%, var(--muted)); }
	.sq {
		width: 22px; height: 22px; border-radius: 4px;
		background: linear-gradient(160deg, oklch(0.35 0.05 250), oklch(0.25 0.03 270));
		color: oklch(0.85 0.04 220); font-size: 9.5px; font-weight: 600;
		display: grid; place-items: center; letter-spacing: 0.04em;
		font-family: -apple-system, system-ui, sans-serif;
	}
	.cname {
		color: var(--text); font-weight: 400;
		font-family: -apple-system, system-ui, sans-serif;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.badge {
		background: var(--accent); color: oklch(0.12 0.014 250);
		font-size: 10px; font-weight: 700; padding: 0 5px;
		border-radius: 3px; min-width: 14px; text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.dimmed { opacity: 0.3; }

	.row-slot { height: 0; position: relative; overflow: visible; }
	.row-slot.tail { height: 4px; }
	.row-slot.line::before {
		content: '▸'; position: absolute; left: 6px; top: -7px;
		color: var(--accent); font-size: 10px;
		animation: caret-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.row-slot.line::after {
		content: ''; position: absolute; left: 18px; right: 14px; top: -1px;
		height: 1px; background: var(--accent);
		box-shadow: 0 0 6px var(--accent-soft);
		animation: line-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.row-slot.indent.line::before { left: 22px; }
	.row-slot.indent.line::after { left: 34px; }
	@keyframes line-in { from { transform: scaleX(0.3); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
	@keyframes caret-in { from { opacity: 0; transform: translateX(-3px); } to { opacity: 1; transform: translateX(0); } }

	.folder-row.drop-fill {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1px var(--accent-edge);
	}
	.folder-row.drop-fill::after {
		content: 'cd→'; position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
		color: var(--accent); font-size: 11px;
	}

	.chat-row.combine {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.merge-pill {
		color: var(--accent); font-size: 10.5px; padding: 0 6px;
	}

	.section-label {
		padding: 16px 18px 4px; color: var(--muted); font-size: 11px; letter-spacing: 0.02em;
	}
	.root-zone { position: relative; min-height: 20px; transition: background 200ms; }
	.root-zone.active {
		background: var(--accent-soft);
		box-shadow: inset 0 1px 0 var(--accent-edge);
	}
	.root-hint { padding: 18px; color: var(--accent); font-size: 11.5px; }

	.ghost {
		position: fixed; z-index: 100; pointer-events: none;
		display: flex; align-items: center; gap: 8px;
		padding: 5px 12px 5px 10px;
		background: oklch(0.13 0.014 250 / 0.85);
		border: 1px solid var(--accent);
		border-radius: 4px;
		box-shadow: 0 0 12px var(--accent-soft);
		font-size: 12.5px; backdrop-filter: blur(8px);
		animation: ghost-in 120ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes ghost-in { from { opacity: 0; } to { opacity: 1; } }

	.canvas {
		display: flex; flex-direction: column; padding: 28px 36px; gap: 18px;
		overflow-y: auto; min-height: 0;
		background: oklch(0.13 0.014 250);
		font-family: -apple-system, system-ui, sans-serif;
	}
	.head-text h2 {
		margin: 0 0 6px; font-size: 26px; font-weight: 500;
		letter-spacing: -0.02em; color: oklch(0.96 0.012 250);
	}
	.rev { font-size: 11px; color: var(--muted); text-transform: lowercase; letter-spacing: 0.02em; font-family: ui-monospace, monospace; }
	.head-text p { margin: 0; color: var(--text-2); font-size: 13.5px; line-height: 1.6; max-width: 70ch; }

	.actions {
		flex: 1; min-height: 200px; background: var(--surface); border: 1px solid var(--line);
		border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; max-width: 760px;
		font-family: ui-monospace, "JetBrains Mono", monospace;
	}
	.actions header {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 12px 16px; border-bottom: 1px solid var(--line);
	}
	.actions h3 { margin: 0; font-size: 12px; font-weight: 600; color: var(--accent); }
	.muted { color: var(--muted); font-size: 11px; }
	.empty { padding: 24px 16px; color: var(--muted); font-size: 12px; }
	.actions ol {
		list-style: none; margin: 0; padding: 4px 0; overflow-y: auto; font-size: 11.5px;
	}
	.actions li {
		display: grid; grid-template-columns: 220px 1fr auto; gap: 12px;
		padding: 6px 16px; border-bottom: 1px solid var(--line); align-items: baseline;
	}
	.n { color: var(--accent); font-weight: 600; }
	.p { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.t { color: var(--muted); font-size: 10.5px; }

	.live { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
