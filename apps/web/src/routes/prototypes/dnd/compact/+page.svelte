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
				<div class="head-l">
					<span class="title">Messages</span>
					<span class="counts">{dnd.folders.length}f · {dnd.chats.length}c</span>
				</div>
				<button class="reset" onclick={dnd.reset} title="Reset demo">↺</button>
			</header>

			<div class="list" role="list">
				{#each dnd.folders as folder, fi (folder.id)}
					<div class="slot" class:line={dnd.folderIndicatorBetween(fi)}></div>
					<section
						class="folder"
						class:open={folder.open}
						class:dimmed={dnd.isDragSource('folder', folder.id)}
						style:--fc={folder.color}
					>
						<div
							class="frow"
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
							<span class="caret">{folder.open ? '▾' : '▸'}</span>
							<span class="sq" aria-hidden="true"></span>
							<span class="fname">{folder.name}</span>
							<span class="fcount">{folder.chatIds.length}</span>
						</div>
						{#if folder.open && folder.chatIds.length > 0}
							<div class="fbody">
								{#each folder.chatIds as chatId, ci (chatId)}
									{@const chat = dnd.chats.find((c) => c.id === chatId)}
									{#if chat}
										<div class="slot" class:line={dnd.indicatorBetween(folder.id, ci)} class:indent={true}></div>
										<div
											class="crow indent"
											data-chat-row
											data-chat-id={chat.id}
											class:dimmed={dnd.isDragSource('chat', chat.id)}
											tabindex="0"
											aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
											onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id, fromFolderId: folder.id }, e.currentTarget as HTMLElement)}
											onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id, folder.id)}
										>
											<div class="ava">{initials(chat.name)}</div>
											<span class="cname">{chat.name}</span>
											{#if chat.unread}<span class="b">{chat.unread}</span>{/if}
											<span class="t">{chat.time}</span>
										</div>
									{/if}
								{/each}
								<div class="slot tail" class:line={dnd.indicatorBetween(folder.id, folder.chatIds.length)} class:indent={true}></div>
							</div>
						{/if}
					</section>
				{/each}
				<div class="slot" class:line={dnd.folderIndicatorBetween(dnd.folders.length)}></div>

				{#if dnd.unfoldered.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
					<div class="sec">direct <span>·</span> {dnd.unfoldered.length}</div>
				{/if}

				<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
					{#if dnd.unfoldered.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
						<div class="root-pill">drop to ungroup</div>
					{/if}
					{#each dnd.unfoldered as chat, ci (chat.id)}
						<div class="slot" class:line={dnd.indicatorBetween('root', ci)}></div>
						<div
							class="crow"
							data-chat-row
							data-chat-id={chat.id}
							class:dimmed={dnd.isDragSource('chat', chat.id)}
							class:combine={dnd.combineTargetId() === chat.id}
							tabindex="0"
							aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
							onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id }, e.currentTarget as HTMLElement)}
							onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id)}
						>
							<div class="ava">{initials(chat.name)}</div>
							<span class="cname">{chat.name}</span>
							{#if chat.unread}<span class="b">{chat.unread}</span>{/if}
							<span class="t">{chat.time}</span>
							{#if dnd.combineTargetId() === chat.id}<span class="combine-tag">+folder</span>{/if}
						</div>
					{/each}
					<div class="slot tail" class:line={dnd.indicatorBetween('root', dnd.unfoldered.length)}></div>
				</div>
			</div>
		</aside>

		<section class="canvas">
			<div class="head-text">
				<h2>Compact<span> · power-user density</span></h2>
				<p>26px rows, single line, no preview text. For inboxes that hold hundreds. Drop indicator is a 1px hairline. Ghost is an outlined trace with no fill — the dragged item stays in its slot, only its silhouette follows the cursor. Motion drops from 200ms to 80ms; everything snaps.</p>
			</div>

			<div class="actions">
				<header><h3>store calls</h3><span class="muted">latest</span></header>
				{#if dnd.actions.length === 0}
					<p class="empty">// no drops yet</p>
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
			<div class="ghost-outline" style:left="{d.pointerX - d.offsetX}px" style:top="{d.pointerY - d.offsetY}px" aria-hidden="true">
				{#if d.source.kind === 'folder'}
					<span class="sq" style:background={dnd.folders.find((f) => f.id === d.source.id)?.color}></span>
					<span>{d.preview}</span>
				{:else}
					<div class="ava">{initials(d.preview)}</div>
					<span>{d.preview}</span>
				{/if}
			</div>
		{/if}

		<div class="live" aria-live="polite" aria-atomic="true">{dnd.liveMsg}</div>
	</div>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; background: oklch(0.08 0.010 280); }

	.root { display: flex; flex-direction: column; height: 100vh; }
	.page {
		display: grid; grid-template-columns: 320px 1fr; flex: 1; min-height: 0;
		background: oklch(0.13 0.014 280); color: oklch(0.93 0.010 280);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		font-size: 12.5px; user-select: none;
		--accent: oklch(0.86 0.030 200);
		--accent-soft: oklch(0.86 0.030 200 / 0.16);
		--accent-edge: oklch(0.86 0.030 200 / 0.42);
		--accent-strong: oklch(0.78 0.030 200);
		--text: oklch(0.93 0.010 280);
		--text-2: oklch(0.78 0.018 280);
		--muted: oklch(0.55 0.030 280);
		--surface: oklch(0.17 0.018 280);
		--line: oklch(0.78 0.030 280 / 0.10);
	}

	.sidebar {
		display: flex; flex-direction: column; min-height: 0;
		background: oklch(0.13 0.014 280); border-right: 1px solid var(--line);
	}
	.head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 10px 14px; border-bottom: 1px solid var(--line);
		font-size: 12px;
	}
	.head-l { display: flex; align-items: baseline; gap: 8px; }
	.title { font-weight: 600; font-size: 13px; }
	.counts { font-size: 10.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
	.reset {
		width: 22px; height: 22px;
		background: none; border: 1px solid var(--line); color: var(--muted);
		border-radius: 4px; cursor: pointer; font-size: 13px;
		transition: color 80ms, border-color 80ms;
	}
	.reset:hover { color: var(--text); border-color: var(--accent-edge); }

	.list { flex: 1; overflow-y: auto; padding: 2px 0 16px; min-height: 0; }

	.folder { position: relative; }
	.frow {
		display: grid; grid-template-columns: 12px 7px 1fr auto;
		align-items: center; gap: 7px;
		padding: 4px 14px 4px 12px;
		font-size: 12px; font-weight: 600; cursor: pointer; line-height: 1.4;
		transition: background 80ms;
	}
	.frow:hover { background: oklch(1 0 0 / 0.025); }
	.frow:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
	.caret { color: var(--muted); font-size: 9px; line-height: 1; text-align: center; }
	.sq { width: 7px; height: 7px; border-radius: 2px; background: var(--fc); }
	.fname {
		color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		letter-spacing: 0;
	}
	.fcount {
		color: var(--muted); font-weight: 500; font-size: 10.5px;
		font-variant-numeric: tabular-nums;
	}

	.fbody { padding-bottom: 2px; }

	.crow {
		display: grid; grid-template-columns: 18px 1fr auto auto;
		align-items: center; gap: 8px;
		padding: 3px 14px 3px 12px;
		font-size: 12px; height: 26px;
		position: relative; cursor: default; touch-action: none;
		transition: background 80ms;
	}
	.crow.indent { padding-left: 26px; }
	.crow:hover { background: oklch(1 0 0 / 0.025); }
	.crow:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }

	.ava {
		width: 18px; height: 18px; border-radius: 4px;
		background: linear-gradient(160deg, oklch(0.45 0.08 285), oklch(0.30 0.06 320));
		display: grid; place-items: center; font-weight: 600; font-size: 9px;
		letter-spacing: 0.04em; color: oklch(0.95 0.01 280); flex-shrink: 0;
	}
	.cname { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
	.b {
		background: var(--accent-strong); color: oklch(0.13 0.014 280);
		font-size: 9.5px; font-weight: 700;
		padding: 0 5px; border-radius: 3px; min-width: 13px; text-align: center;
		font-variant-numeric: tabular-nums; line-height: 14px; height: 14px;
	}
	.t { color: var(--muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }

	.dimmed { opacity: 0.3; }

	.slot { height: 0; position: relative; }
	.slot.tail { height: 3px; }
	.slot.line::after {
		content: ''; position: absolute; left: 12px; right: 14px; top: -1px;
		height: 1px; background: var(--accent);
		animation: line-in 80ms linear;
	}
	.slot.indent.line::after { left: 26px; }
	@keyframes line-in { from { opacity: 0; transform: scaleX(0.6); } to { opacity: 1; transform: scaleX(1); } }

	.frow.drop-fill {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1px var(--accent-edge);
	}
	.frow.drop-fill::after {
		content: '↳'; position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
		color: var(--accent); font-size: 11px;
	}

	.crow.combine {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.combine-tag {
		position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
		color: var(--accent-strong); font-size: 10.5px; font-weight: 600;
	}

	.sec {
		padding: 12px 14px 2px;
		font-size: 10.5px; color: var(--muted);
		text-transform: uppercase; letter-spacing: 0.10em; font-weight: 600;
	}
	.sec span { margin: 0 4px; opacity: 0.5; }

	.root-zone { position: relative; min-height: 16px; transition: background 80ms; }
	.root-zone.active {
		background: var(--accent-soft);
		box-shadow: inset 0 1px 0 var(--accent-edge);
	}
	.root-pill {
		display: inline-block; margin: 10px 14px; font-size: 10.5px;
		text-transform: uppercase; letter-spacing: 0.08em;
		color: var(--accent-strong); background: var(--accent-soft);
		padding: 3px 9px; border-radius: 3px;
	}

	.ghost-outline {
		position: fixed; z-index: 100; pointer-events: none;
		display: flex; align-items: center; gap: 7px;
		padding: 3px 10px 3px 8px;
		background: transparent;
		border: 1px solid var(--accent);
		border-radius: 4px;
		font-size: 12px;
		box-shadow: 0 0 0 3px oklch(0.13 0.014 280 / 0.6);
		animation: ghost-in 80ms linear;
	}
	.ghost-outline .ava { width: 16px; height: 16px; font-size: 8.5px; }
	.ghost-outline .sq { width: 8px; height: 8px; border-radius: 2px; }
	@keyframes ghost-in { from { opacity: 0; } to { opacity: 1; } }

	.canvas {
		display: flex; flex-direction: column; padding: 28px 36px; gap: 18px;
		overflow-y: auto; min-height: 0;
		background: oklch(0.13 0.014 280);
		font-size: 13.5px;
	}
	.head-text h2 {
		margin: 0 0 6px; font-size: 24px; font-weight: 600;
		letter-spacing: -0.02em; color: oklch(0.96 0.010 280);
	}
	.head-text h2 span { font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-left: 6px; }
	.head-text p { margin: 0; color: var(--text-2); font-size: 13px; line-height: 1.55; max-width: 70ch; }

	.actions {
		flex: 1; min-height: 200px; background: var(--surface); border: 1px solid var(--line);
		border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; max-width: 760px;
	}
	.actions header {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 10px 14px; border-bottom: 1px solid var(--line);
	}
	.actions h3 { margin: 0; font-size: 12px; font-weight: 600; }
	.muted { color: var(--muted); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; }
	.empty { padding: 22px 14px; color: var(--muted); font-size: 12px; font-family: ui-monospace, monospace; }
	.actions ol {
		list-style: none; margin: 0; padding: 2px 0; overflow-y: auto;
		font-family: ui-monospace, "JetBrains Mono", monospace; font-size: 11px;
	}
	.actions li {
		display: grid; grid-template-columns: 220px 1fr auto; gap: 12px; padding: 5px 14px;
		border-bottom: 1px solid var(--line); align-items: baseline;
	}
	.n { color: var(--accent-strong); font-weight: 600; white-space: nowrap; }
	.p { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.live { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
