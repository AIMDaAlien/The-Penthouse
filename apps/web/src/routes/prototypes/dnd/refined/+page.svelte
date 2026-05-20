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
			<header class="sidebar-head">
				<h1>Messages</h1>
				<button class="reset" onclick={dnd.reset}>Reset</button>
			</header>

			<div class="list" role="list">
				{#each dnd.folders as folder, fi (folder.id)}
					<div class="folder-slot" class:line={dnd.folderIndicatorBetween(fi)}></div>
					<section
						class="folder"
						class:dimmed={dnd.isDragSource('folder', folder.id)}
						class:open={folder.open}
						style:--folder-color={folder.color}
					>
						<div
							class="folder-header"
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
							<span class="caret" aria-hidden="true">
								<svg viewBox="0 0 12 12" width="9" height="9">
									<path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</span>
							<span class="folder-dot" style:background={folder.color}></span>
							<span class="folder-name">{folder.name}</span>
							<span class="folder-count">{folder.chatIds.length}</span>
						</div>

						{#if folder.open && folder.chatIds.length > 0}
							<div class="folder-items">
								<div class="rail" aria-hidden="true"></div>
								{#each folder.chatIds as chatId, ci (chatId)}
									{@const chat = dnd.chats.find((c) => c.id === chatId)}
									{#if chat}
										<div class="row-slot" class:line={dnd.indicatorBetween(folder.id, ci)}></div>
										<div
											class="row in-folder"
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
				<div class="folder-slot" class:line={dnd.folderIndicatorBetween(dnd.folders.length)}></div>

				{#if dnd.unfoldered.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
					<div class="direct-divider" aria-hidden="true"><span>direct</span></div>
				{/if}

				<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
					{#if dnd.unfoldered.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
						<div class="root-pill">drop to ungroup</div>
					{/if}
					{#each dnd.unfoldered as chat, ci (chat.id)}
						<div class="row-slot" class:line={dnd.indicatorBetween('root', ci)}></div>
						<div
							class="row"
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
							{#if dnd.combineTargetId() === chat.id}
								<span class="combine-pill">release → folder</span>
							{/if}
						</div>
					{/each}
					<div class="row-slot tail" class:line={dnd.indicatorBetween('root', dnd.unfoldered.length)}></div>
				</div>
			</div>
		</aside>

		<section class="canvas">
			<div class="head-text">
				<h2>Refined<span> · v2 default</span></h2>
				<p>The grounded baseline. Folder color binds the group — header is tinted, contents share a fainter wash, a 1px color rail runs the height of the indent. Drop indicators: thin accent line (reorder), filled header (drop into), ring + pill (combine), dashed top edge (remove to direct).</p>
			</div>

			<div class="actions">
				<header><h3>Store calls</h3><span class="muted">recent first</span></header>
				{#if dnd.actions.length === 0}
					<p class="empty">No drops yet — grab a row to start.</p>
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
					<span class="folder-dot" style:background={dnd.folders.find((f) => f.id === d.source.id)?.color}></span>
					<span class="folder-name">{d.preview}</span>
				{:else}
					<div class="avatar">{initials(d.preview)}</div>
					<span class="name">{d.preview}</span>
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
		display: grid;
		grid-template-columns: 360px 1fr;
		flex: 1;
		min-height: 0;
		background: oklch(0.16 0.020 280);
		color: oklch(0.93 0.012 280);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		font-size: 14px;
		user-select: none;
		--accent: oklch(0.69 0.140 285);
		--accent-soft: oklch(0.69 0.140 285 / 0.16);
		--accent-edge: oklch(0.69 0.140 285 / 0.36);
		--text: oklch(0.93 0.012 280);
		--text-2: oklch(0.80 0.025 280);
		--muted: oklch(0.65 0.050 280);
		--surface: oklch(0.21 0.025 280);
		--line: oklch(0.78 0.090 280 / 0.12);
		--line-2: oklch(0.78 0.090 280 / 0.22);
	}

	.sidebar { display: flex; flex-direction: column; min-height: 0; background: oklch(0.16 0.020 280); border-right: 1px solid var(--line); }

	.sidebar-head {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 18px 22px 14px; border-bottom: 1px solid var(--line);
	}
	h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }

	.reset {
		background: none; border: 1px solid var(--line-2); color: var(--muted);
		padding: 4px 10px; border-radius: 999px; font-size: 11px; letter-spacing: 0.04em;
		text-transform: uppercase; cursor: pointer; transition: color 160ms, border-color 160ms;
	}
	.reset:hover { color: var(--text); border-color: var(--accent-edge); }

	.list { flex: 1; overflow-y: auto; padding: 6px 0 24px; min-height: 0; }

	.folder { position: relative; }
	.folder-header {
		display: flex; align-items: center; gap: 8px;
		padding: 10px 18px 10px 14px;
		background: color-mix(in oklch, var(--folder-color) 8%, var(--surface) 92%);
		cursor: pointer; font-weight: 600; font-size: 12.5px;
		letter-spacing: 0.005em; position: relative;
		transition: background 160ms cubic-bezier(0.22, 1, 0.36, 1);
		border-top: 1px solid color-mix(in oklch, var(--folder-color) 22%, transparent);
	}
	.folder-header:hover { background: color-mix(in oklch, var(--folder-color) 14%, var(--surface) 86%); }
	.folder-header:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.caret { display: inline-flex; width: 12px; height: 12px; align-items: center; justify-content: center; color: var(--text-2); transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
	.folder.open .caret { transform: rotate(90deg); }
	.folder-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.folder-name { flex: 1; color: var(--text); }
	.folder-count {
		font-size: 10.5px; font-weight: 600;
		color: color-mix(in oklch, var(--folder-color) 70%, var(--text-2));
		background: color-mix(in oklch, var(--folder-color) 16%, oklch(0 0 0 / 0.18));
		padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center;
	}

	.folder-items {
		position: relative;
		background: color-mix(in oklch, var(--folder-color) 4%, oklch(0.16 0.020 280) 96%);
		padding-bottom: 4px;
	}
	.folder.open::after {
		content: ''; display: block; height: 1px; margin-top: 4px;
		background: color-mix(in oklch, var(--folder-color) 28%, transparent);
	}
	.rail {
		position: absolute; left: 18px; top: 0; bottom: 6px; width: 1px;
		background: color-mix(in oklch, var(--folder-color) 60%, transparent);
	}

	.row {
		display: flex; align-items: center; gap: 11px;
		padding: 9px 16px 9px 14px; position: relative;
		transition: background 140ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms;
		touch-action: none;
	}
	.row.in-folder { padding-left: 30px; }
	.row:hover { background: color-mix(in oklch, var(--text) 5%, transparent); }
	.row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.avatar {
		width: 34px; height: 34px; border-radius: 50%;
		background: linear-gradient(160deg, oklch(0.45 0.10 285), oklch(0.30 0.08 320));
		display: grid; place-items: center; font-weight: 600;
		font-size: 11.5px; letter-spacing: 0.04em; color: oklch(0.95 0.01 280); flex-shrink: 0;
	}
	.body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.line-1, .line-2 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; }
	.name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.time { font-size: 11px; color: var(--muted); flex-shrink: 0; }
	.preview {
		font-size: 12.5px; color: var(--text-2); white-space: nowrap;
		overflow: hidden; text-overflow: ellipsis; flex: 1;
	}
	.badge {
		background: var(--accent); color: oklch(0.16 0.020 280); font-size: 10.5px;
		font-weight: 700; padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center; flex-shrink: 0;
	}
	.dimmed { opacity: 0.32; filter: saturate(0.6); }

	.row-slot, .folder-slot { height: 0; position: relative; overflow: visible; }
	.row-slot.tail { height: 4px; }
	.row-slot.line::after, .folder-slot.line::after {
		content: ''; position: absolute; left: 18px; right: 14px; top: -1px;
		height: 2px; background: var(--accent); border-radius: 2px;
		box-shadow: 0 0 0 4px var(--accent-soft);
		animation: line-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.folder-items .row-slot.line::after { left: 30px; }
	@keyframes line-in { from { transform: scaleX(0.4); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }

	.folder-header.drop-fill {
		background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-edge);
	}
	.folder-header.drop-fill::after {
		content: '↳'; position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
		color: var(--accent); font-size: 16px;
	}

	.row.combine {
		background: var(--accent-soft); box-shadow: inset 0 0 0 1.5px var(--accent);
	}
	.combine-pill {
		position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
		background: var(--accent); color: oklch(0.16 0.020 280); font-size: 10.5px;
		font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
		animation: pill-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes pill-in {
		from { opacity: 0; transform: translateY(-50%) translateX(6px); }
		to   { opacity: 1; transform: translateY(-50%) translateX(0); }
	}

	.direct-divider {
		padding: 18px 22px 6px; font-size: 10.5px; text-transform: uppercase;
		letter-spacing: 0.12em; color: var(--muted); font-weight: 600; display: flex; align-items: center; gap: 10px;
	}
	.direct-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }

	.root-zone { position: relative; min-height: 24px; transition: background 200ms; }
	.root-zone.active { background: var(--accent-soft); }
	.root-zone.active::before {
		content: ''; position: absolute; left: 18px; right: 14px; top: 0; border-top: 1.5px dashed var(--accent-edge);
	}
	.root-pill {
		display: inline-block; margin: 18px; font-size: 11px; text-transform: uppercase;
		letter-spacing: 0.08em; color: var(--accent); background: var(--accent-soft);
		border: 1px dashed var(--accent-edge); padding: 6px 12px; border-radius: 999px;
	}

	.ghost {
		position: fixed; z-index: 100; pointer-events: none; display: flex;
		align-items: center; gap: 10px; padding: 8px 14px 8px 12px;
		min-width: 220px; max-width: 300px; background: oklch(0.26 0.030 280);
		border: 1px solid var(--accent-edge); border-radius: 10px;
		box-shadow: 0 1px 0 oklch(1 0 0 / 0.04) inset,
			0 12px 28px oklch(0.05 0.02 280 / 0.55), 0 0 0 3px var(--accent-soft);
		transform: scale(1.02); opacity: 0.97;
		animation: ghost-in 140ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.ghost .avatar { width: 28px; height: 28px; font-size: 11px; }
	@keyframes ghost-in { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1.02); opacity: 0.97; } }

	.canvas {
		display: flex; flex-direction: column; padding: 28px 36px; gap: 18px;
		overflow-y: auto; min-height: 0;
		background: radial-gradient(ellipse 80% 60% at 100% 0%, oklch(0.69 0.140 285 / 0.06), transparent 60%), oklch(0.16 0.020 280);
	}
	.head-text h2 { margin: 0 0 6px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
	.head-text h2 span { font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-left: 6px; }
	.head-text p { margin: 0; color: var(--text-2); font-size: 13.5px; line-height: 1.55; max-width: 70ch; }

	.actions { flex: 1; min-height: 200px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; max-width: 760px; }
	.actions header { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); }
	.actions h3 { margin: 0; font-size: 13px; font-weight: 600; }
	.muted { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
	.empty { padding: 28px 18px; color: var(--muted); font-size: 13px; }
	.actions ol { list-style: none; margin: 0; padding: 4px 0; overflow-y: auto; font-family: ui-monospace, "JetBrains Mono", monospace; font-size: 11.5px; }
	.actions li { display: grid; grid-template-columns: 240px 1fr auto; gap: 14px; padding: 8px 18px; border-bottom: 1px solid var(--line); align-items: baseline; }
	.n { color: var(--accent); font-weight: 600; white-space: nowrap; }
	.p { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.t { color: var(--muted); font-size: 10.5px; }

	.live { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
