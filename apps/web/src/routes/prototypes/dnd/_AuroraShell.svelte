<script lang="ts">
	import FolderColorPopover from './_FolderColorPopover.svelte';
	import { createDnd, initials } from './_dnd.svelte';

	type FrostLevel = 'none' | 'veil' | 'glass' | 'crystal';

	interface Props {
		frost: FrostLevel;
		title: string;
		subtitle: string;
		description: string;
	}

	let { frost, title, subtitle, description }: Props = $props();

	const dnd = createDnd();
	let listEl: HTMLElement;
	$effect(() => dnd.setListEl(listEl));

	let colorEdit = $state<{ folderId: string; anchorRect: DOMRect } | null>(null);

	function openColorPicker(e: MouseEvent, folderId: string) {
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		colorEdit = { folderId, anchorRect: rect };
	}

	const popoverVariant = $derived(frost === 'none' ? 'solid' : 'frost');
</script>

<svelte:window
	onpointermove={dnd.handlePointerMove}
	onpointerup={dnd.handlePointerUp}
	onkeydown={dnd.handleKeydown}
/>

<div class="page frost-{frost}">
	<aside class="sidebar" bind:this={listEl}>
		<header class="head">
			<h1>Messages</h1>
			<button class="reset" onclick={dnd.reset}>Reset</button>
		</header>

		<div class="list" role="list">
			{#each dnd.folders as folder, fi (folder.id)}
				<div class="slot" class:line={dnd.folderIndicatorBetween(fi)}></div>
				<section
					class="folder"
					class:open={folder.open}
					class:dimmed={dnd.isDragSource('folder', folder.id)}
					class:receiving={dnd.targetFolderId() === folder.id}
					style:--fc={folder.color}
				>
					<div
						class="aura-bg" aria-hidden="true"
						style:background={`radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, ${folder.color} 26%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklch, ${folder.color} 14%, transparent), color-mix(in oklch, ${folder.color} 2%, transparent) 70%, transparent)`}
					></div>

					<div
						class="frow"
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
						<button
							class="dot-btn"
							type="button"
							aria-label="Change folder color"
							onclick={(e) => openColorPicker(e, folder.id)}
							onpointerdown={(e) => e.stopPropagation()}
						>
							<span class="dot" aria-hidden="true"></span>
						</button>
						<span class="fname">{folder.name}</span>
						<span class="fcount">{folder.chatIds.length}</span>
						<span class="caret" aria-hidden="true">
							<svg viewBox="0 0 12 12" width="10" height="10">
								<path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</span>
					</div>

					{#if folder.open && folder.chatIds.length > 0}
						<div class="fbody">
							<div class="fbody-frost" aria-hidden="true"></div>
							{#each folder.chatIds as chatId, ci (chatId)}
								{@const chat = dnd.chats.find((c) => c.id === chatId)}
								{#if chat}
									<div class="slot" class:line={dnd.indicatorBetween(folder.id, ci)}></div>
									<div
										class="crow in-folder"
										data-chat-row
										data-chat-id={chat.id}
										class:dimmed={dnd.isDragSource('chat', chat.id)}
										role="button"
										tabindex="0"
										aria-grabbed={dnd.drag?.active && dnd.drag.source.id === chat.id}
										onpointerdown={(e) => dnd.pickUp(e, { kind: 'chat', id: chat.id, fromFolderId: folder.id }, e.currentTarget as HTMLElement)}
										onkeydown={(e) => dnd.rowKeydown(e, 'chat', chat.id, folder.id)}
									>
										<div class="ava">{initials(chat.name)}</div>
										<div class="body">
											<div class="r1"><span class="name">{chat.name}</span><span class="time">{chat.time}</span></div>
											<div class="r2"><span class="preview">{chat.preview}</span>{#if chat.unread}<span class="b">{chat.unread}</span>{/if}</div>
										</div>
									</div>
								{/if}
							{/each}
							<div class="slot tail" class:line={dnd.indicatorBetween(folder.id, folder.chatIds.length)}></div>
						</div>
					{/if}
				</section>
			{/each}
			<div class="slot" class:line={dnd.folderIndicatorBetween(dnd.folders.length)}></div>

			{#if dnd.unfoldered.length > 0 || (dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId)}
				<div class="sec"><span class="sec-glyph">◌</span> Direct</div>
			{/if}

			<div class="root-zone" data-root-zone class:active={dnd.rootIsTarget()}>
				{#if dnd.unfoldered.length === 0 && dnd.drag?.active && dnd.drag.source.kind === 'chat' && dnd.drag.source.fromFolderId}
					<div class="root-pill">release to ungroup</div>
				{/if}
				{#each dnd.unfoldered as chat, ci (chat.id)}
					<div class="slot" class:line={dnd.indicatorBetween('root', ci)}></div>
					<div
						class="crow"
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
						<div class="ava">{initials(chat.name)}</div>
						<div class="body">
							<div class="r1"><span class="name">{chat.name}</span><span class="time">{chat.time}</span></div>
							<div class="r2"><span class="preview">{chat.preview}</span>{#if chat.unread}<span class="b">{chat.unread}</span>{/if}</div>
						</div>
						{#if dnd.combineTargetId() === chat.id}<span class="combine-pill">merge ↗</span>{/if}
					</div>
				{/each}
				<div class="slot tail" class:line={dnd.indicatorBetween('root', dnd.unfoldered.length)}></div>
			</div>
		</div>
	</aside>

	<section class="canvas">
		<div class="head-text">
			<h2>{title}<span> · {subtitle}</span></h2>
			<p>{description}</p>
		</div>

		<div class="actions">
			<header><h3>Store calls</h3><span class="muted">recent first</span></header>
			{#if dnd.actions.length === 0}
				<p class="empty">Pick up a row, or tap a folder color dot to recolor.</p>
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
		{@const folderColor = d.source.kind === 'folder' ? dnd.folders.find((f) => f.id === d.source.id)?.color : (dnd.folders.find((f) => f.chatIds.includes(d.source.id))?.color ?? 'oklch(0.72 0.090 305)')}
		<div
			class="ghost frost-{frost}"
			style:left="{d.pointerX - d.offsetX}px"
			style:top="{d.pointerY - d.offsetY}px"
			style:--gc={folderColor}
			aria-hidden="true"
		>
			{#if d.source.kind === 'folder'}
				<span class="dot" style:background={folderColor}></span>
				<span class="fname">{d.preview}</span>
			{:else}
				<div class="ava">{initials(d.preview)}</div>
				<span class="name">{d.preview}</span>
			{/if}
		</div>
	{/if}

	{#if colorEdit}
		{@const folder = dnd.folders.find((f) => f.id === colorEdit?.folderId)}
		{#if folder}
			<FolderColorPopover
				current={folder.color}
				anchorRect={colorEdit.anchorRect}
				onSelect={(c) => dnd.setFolderColor(folder.id, c)}
				onClose={() => (colorEdit = null)}
				variant={popoverVariant}
			/>
		{/if}
	{/if}

	<div class="live" aria-live="polite" aria-atomic="true">{dnd.liveMsg}</div>
</div>

<style>
	:global(html), :global(body) { margin: 0; padding: 0; background: oklch(0.07 0.012 280); }

	.page {
		display: grid; grid-template-columns: 380px 1fr; flex: 1; min-height: 0;
		color: oklch(0.94 0.012 280);
		font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
		font-size: 14px; user-select: none;
		height: calc(100vh - 47px);
		--accent: oklch(0.78 0.130 305);
		--accent-soft: oklch(0.78 0.130 305 / 0.20);
		--accent-edge: oklch(0.78 0.130 305 / 0.48);
		--text: oklch(0.95 0.012 280);
		--text-2: oklch(0.82 0.025 280);
		--muted: oklch(0.62 0.040 280);
		--surface: oklch(0.18 0.022 280);
		--line: oklch(0.78 0.040 280 / 0.12);
		--lav: oklch(0.66 0.085 300);
	}

	/* ----- Page-level backdrops (where the frost actually has something to blur over) ----- */
	.page.frost-none {
		background: oklch(0.12 0.018 280);
	}
	.page.frost-veil {
		background:
			radial-gradient(ellipse 60% 50% at 20% 10%, oklch(0.78 0.130 305 / 0.18), transparent 60%),
			radial-gradient(ellipse 50% 40% at 90% 80%, oklch(0.65 0.110 145 / 0.12), transparent 60%),
			radial-gradient(ellipse 50% 60% at 40% 95%, oklch(0.70 0.090 195 / 0.08), transparent 60%),
			oklch(0.10 0.020 280);
	}
	.page.frost-glass {
		background:
			radial-gradient(ellipse 70% 60% at 15% 15%, oklch(0.78 0.130 305 / 0.30), transparent 60%),
			radial-gradient(ellipse 60% 50% at 85% 75%, oklch(0.66 0.110 5 / 0.18), transparent 60%),
			radial-gradient(ellipse 50% 70% at 50% 100%, oklch(0.70 0.090 195 / 0.14), transparent 60%),
			oklch(0.09 0.020 280);
	}
	.page.frost-crystal {
		background:
			radial-gradient(ellipse 70% 60% at 25% 0%, oklch(0.84 0.080 220 / 0.22), transparent 60%),
			radial-gradient(ellipse 60% 50% at 80% 80%, oklch(0.78 0.130 305 / 0.28), transparent 60%),
			radial-gradient(ellipse 50% 70% at 50% 110%, oklch(0.72 0.110 165 / 0.16), transparent 60%),
			oklch(0.08 0.018 270);
	}

	.sidebar {
		display: flex; flex-direction: column; min-height: 0;
		border-right: 1px solid var(--line);
		position: relative;
		background: oklch(0.12 0.018 280);
	}

	/* Frost levels apply blur to the sidebar so the page backdrop shows through */
	.frost-veil .sidebar {
		background: oklch(0.12 0.018 280 / 0.72);
		backdrop-filter: blur(14px) saturate(140%);
		-webkit-backdrop-filter: blur(14px) saturate(140%);
		border-right-color: oklch(0.78 0.040 280 / 0.16);
	}
	.frost-glass .sidebar {
		background: oklch(0.14 0.020 280 / 0.50);
		backdrop-filter: blur(28px) saturate(150%);
		-webkit-backdrop-filter: blur(28px) saturate(150%);
		border-right-color: oklch(0.85 0.040 280 / 0.18);
		box-shadow: inset -1px 0 0 oklch(1 0 0 / 0.04);
	}
	.frost-crystal .sidebar {
		background: oklch(0.13 0.018 270 / 0.36);
		backdrop-filter: blur(40px) saturate(180%) contrast(108%);
		-webkit-backdrop-filter: blur(40px) saturate(180%) contrast(108%);
		border-right: 1px solid oklch(0.92 0.050 240 / 0.20);
		box-shadow:
			inset -1px 0 0 oklch(1 0 0 / 0.06),
			inset 1px 0 0 oklch(0.88 0.080 240 / 0.10);
	}

	.sidebar::before {
		content: ''; position: absolute; inset: 0; pointer-events: none;
		background:
			radial-gradient(ellipse 60% 30% at 0% 0%, oklch(0.78 0.130 305 / 0.05), transparent 70%),
			radial-gradient(ellipse 60% 40% at 100% 100%, oklch(0.65 0.110 145 / 0.04), transparent 70%);
	}
	.frost-veil .sidebar::before,
	.frost-glass .sidebar::before,
	.frost-crystal .sidebar::before { display: none; }

	.head {
		display: flex; align-items: baseline; justify-content: space-between;
		padding: 20px 22px 14px; position: relative;
	}
	h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; margin: 0; color: oklch(0.96 0.020 305); }
	.reset {
		background: oklch(0.18 0.022 280); border: 1px solid var(--line);
		color: var(--muted); padding: 5px 11px; border-radius: 999px; font-size: 11px;
		text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer;
		transition: color 180ms, border-color 180ms, background 180ms;
	}
	.frost-veil .reset, .frost-glass .reset, .frost-crystal .reset {
		background: oklch(1 0 0 / 0.04);
		border-color: oklch(0.85 0.040 280 / 0.20);
	}
	.reset:hover { color: var(--text); border-color: var(--accent-edge); background: var(--accent-soft); }

	.list { flex: 1; overflow-y: auto; padding: 4px 0 24px; min-height: 0; position: relative; z-index: 1; }

	/* ----- Folder ----- */
	.folder { position: relative; }
	.aura-bg {
		position: absolute; inset: 0; pointer-events: none;
		opacity: 0;
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.folder.open .aura-bg { opacity: 1; }

	.frow {
		display: grid; grid-template-columns: 22px 1fr auto 14px;
		align-items: center; gap: 10px;
		padding: 12px 18px;
		position: relative; z-index: 2; cursor: pointer;
		transition: padding 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.frow:hover .fname { color: oklch(0.98 0.012 280); }
	.frow:focus-visible { outline: 2px solid var(--fc); outline-offset: -2px; border-radius: 2px; }

	.dot-btn {
		width: 22px; height: 22px;
		padding: 0; margin: 0;
		background: none; border: 1px solid transparent;
		border-radius: 6px; cursor: pointer;
		display: grid; place-items: center;
		transition: border-color 160ms, background 160ms;
	}
	.dot-btn:hover { border-color: oklch(0.85 0.040 280 / 0.24); background: oklch(1 0 0 / 0.04); }
	.dot-btn:focus-visible { outline: 2px solid var(--fc); outline-offset: 0; }
	.dot {
		display: block; width: 10px; height: 10px; border-radius: 50%;
		background: var(--fc);
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--fc) 22%, transparent),
			0 0 10px color-mix(in oklch, var(--fc) 50%, transparent);
		transition: box-shadow 200ms;
	}
	.frost-glass .dot, .frost-crystal .dot {
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--fc) 30%, transparent),
			0 0 12px color-mix(in oklch, var(--fc) 60%, transparent);
	}
	.dot-btn:hover .dot {
		box-shadow:
			0 0 0 2px color-mix(in oklch, var(--fc) 32%, transparent),
			0 0 14px color-mix(in oklch, var(--fc) 65%, transparent);
	}

	.fname {
		font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em;
		color: var(--text); transition: color 160ms;
	}
	.fcount {
		font-size: 10.5px; font-weight: 600;
		color: color-mix(in oklch, var(--fc) 80%, var(--text-2));
		background: color-mix(in oklch, var(--fc) 18%, oklch(0 0 0 / 0.20));
		padding: 1.5px 8px; border-radius: 999px; min-width: 20px; text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.frost-glass .fcount, .frost-crystal .fcount {
		background: color-mix(in oklch, var(--fc) 22%, oklch(1 0 0 / 0.04));
		box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fc) 20%, transparent);
	}
	.caret {
		display: inline-flex; align-items: center; justify-content: center;
		color: var(--muted); transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.folder:not(.open) .caret { transform: rotate(-90deg); }

	.folder.receiving { background: color-mix(in oklch, var(--fc) 14%, transparent); }
	.folder.receiving .frow { box-shadow: inset 0 0 0 1.5px var(--fc); }
	.folder.receiving .frow::after {
		content: '↳'; position: absolute; right: 36px; top: 50%; transform: translateY(-50%);
		color: var(--fc); font-size: 16px;
	}

	.fbody { position: relative; z-index: 1; padding-bottom: 4px; }

	/* Frost on folder body — this is the purposeful glass */
	.fbody-frost {
		position: absolute; inset: 0; pointer-events: none;
		opacity: 0;
		transition: opacity 280ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.frost-veil .folder.open .fbody-frost {
		opacity: 1;
		background: oklch(1 0 0 / 0.02);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.frost-glass .folder.open .fbody-frost {
		opacity: 1;
		background:
			linear-gradient(180deg, color-mix(in oklch, var(--fc) 6%, oklch(1 0 0 / 0.03)), transparent 80%),
			oklch(1 0 0 / 0.025);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.06),
			inset 0 -1px 0 color-mix(in oklch, var(--fc) 16%, transparent);
	}
	.frost-crystal .folder.open .fbody-frost {
		opacity: 1;
		background:
			linear-gradient(180deg, color-mix(in oklch, var(--fc) 8%, oklch(1 0 0 / 0.04)), transparent 80%),
			oklch(1 0 0 / 0.03);
		backdrop-filter: blur(26px) saturate(160%) contrast(105%);
		-webkit-backdrop-filter: blur(26px) saturate(160%) contrast(105%);
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.08),
			inset 0 -1px 0 color-mix(in oklch, var(--fc) 22%, transparent),
			inset 1px 0 0 color-mix(in oklch, var(--fc) 12%, transparent);
	}

	.crow {
		display: flex; align-items: center; gap: 12px;
		padding: 10px 18px;
		position: relative; z-index: 2; cursor: default; touch-action: none;
		transition: background 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms;
	}
	.crow.in-folder { padding-left: 30px; }
	.crow:hover { background: oklch(1 0 0 / 0.025); }
	.crow:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.ava {
		width: 36px; height: 36px; border-radius: 50%;
		background: var(--lav);
		display: grid; place-items: center; font-weight: 600;
		font-size: 12px; letter-spacing: 0.04em; color: oklch(0.18 0.040 300); flex-shrink: 0;
		box-shadow: 0 0 0 1px oklch(0 0 0 / 0.20);
	}
	.body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.r1, .r2 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; }
	.name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.time { font-size: 11px; color: var(--muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
	.preview { font-size: 12.5px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
	.b {
		background: var(--accent); color: oklch(0.12 0.018 280);
		font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
		min-width: 18px; text-align: center; flex-shrink: 0;
		box-shadow: 0 0 8px color-mix(in oklch, var(--accent) 60%, transparent);
	}
	.dimmed { opacity: 0.28; filter: saturate(0.5); }

	.slot { height: 0; position: relative; overflow: visible; z-index: 3; }
	.slot.tail { height: 4px; }
	.slot.line::after {
		content: ''; position: absolute; left: 18px; right: 18px; top: -1.5px;
		height: 3px; border-radius: 3px;
		background: linear-gradient(90deg, transparent, var(--accent) 18%, var(--accent) 82%, transparent);
		box-shadow: 0 0 8px var(--accent), 0 0 16px var(--accent-soft);
		animation: bar-in 240ms cubic-bezier(0.16, 1, 0.3, 1), bar-pulse 1600ms ease-in-out 240ms infinite;
	}
	.fbody .slot.line::after { left: 30px; }
	@keyframes bar-in { from { transform: scaleX(0.3); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
	@keyframes bar-pulse {
		0%, 100% { box-shadow: 0 0 8px var(--accent), 0 0 16px var(--accent-soft); }
		50%      { box-shadow: 0 0 14px var(--accent), 0 0 28px var(--accent-soft); }
	}

	.crow.combine {
		background: color-mix(in oklch, var(--accent) 18%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--accent);
	}
	.combine-pill {
		position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
		background: var(--accent); color: oklch(0.12 0.018 280);
		font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
		box-shadow: 0 0 12px color-mix(in oklch, var(--accent) 60%, transparent);
	}

	.sec {
		padding: 22px 22px 6px; font-size: 11px; text-transform: uppercase;
		letter-spacing: 0.14em; color: var(--muted); font-weight: 600;
		display: flex; align-items: center; gap: 8px;
	}
	.sec-glyph { color: var(--accent); font-size: 13px; }

	.root-zone { position: relative; min-height: 24px; transition: background 240ms; }
	.root-zone.active {
		background: linear-gradient(180deg, color-mix(in oklch, var(--accent) 18%, transparent), transparent);
	}
	.root-pill {
		display: inline-block; margin: 20px;
		font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
		color: var(--accent); background: var(--accent-soft);
		border: 1px solid var(--accent-edge);
		padding: 7px 14px; border-radius: 999px;
		box-shadow: 0 0 14px color-mix(in oklch, var(--accent) 30%, transparent);
	}

	.ghost {
		position: fixed; z-index: 100; pointer-events: none;
		display: flex; align-items: center; gap: 10px;
		padding: 9px 14px 9px 12px;
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklch, var(--gc) 30%, transparent), transparent 60%),
			oklch(0.20 0.022 280);
		border: 1px solid var(--gc);
		border-radius: 12px;
		box-shadow:
			0 0 0 4px color-mix(in oklch, var(--gc) 22%, transparent),
			0 18px 36px oklch(0.04 0.02 280 / 0.55),
			0 0 36px color-mix(in oklch, var(--gc) 28%, transparent);
		transform: scale(1.03);
		animation: ghost-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.ghost.frost-veil {
		background: oklch(0.20 0.022 280 / 0.50);
		backdrop-filter: blur(12px) saturate(140%);
		-webkit-backdrop-filter: blur(12px) saturate(140%);
	}
	.ghost.frost-glass {
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklch, var(--gc) 36%, transparent), transparent 60%),
			oklch(0.20 0.022 280 / 0.36);
		backdrop-filter: blur(22px) saturate(160%);
		-webkit-backdrop-filter: blur(22px) saturate(160%);
	}
	.ghost.frost-crystal {
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklch, var(--gc) 42%, transparent), transparent 60%),
			oklch(0.18 0.022 270 / 0.24);
		backdrop-filter: blur(30px) saturate(180%) contrast(108%);
		-webkit-backdrop-filter: blur(30px) saturate(180%) contrast(108%);
		box-shadow:
			0 0 0 4px color-mix(in oklch, var(--gc) 28%, transparent),
			inset 0 1px 0 oklch(1 0 0 / 0.10),
			0 18px 36px oklch(0.02 0.02 270 / 0.6),
			0 0 50px color-mix(in oklch, var(--gc) 32%, transparent);
	}
	.ghost .ava { width: 28px; height: 28px; font-size: 11px; background: var(--lav); }
	@keyframes ghost-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1.03); } }

	.canvas {
		display: flex; flex-direction: column; padding: 28px 36px; gap: 18px;
		overflow-y: auto; min-height: 0;
	}
	.head-text h2 { margin: 0 0 6px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
	.head-text h2 span { font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-left: 6px; }
	.head-text p { margin: 0; color: var(--text-2); font-size: 13.5px; line-height: 1.6; max-width: 70ch; }

	.actions {
		flex: 1; min-height: 200px; background: oklch(0.16 0.020 280 / 0.7);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid var(--line);
		border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; max-width: 760px;
	}
	.frost-none .actions { background: oklch(0.16 0.020 280); backdrop-filter: none; -webkit-backdrop-filter: none; }
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
