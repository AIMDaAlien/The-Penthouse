<script lang="ts">
	// ChatPane V5-08 — Blush Pastel (T-L4 light)
	// Self-contained prototype. No external imports.
	// CRITICAL: pastel-tinted bubbles + dark text (per V5-HANDOFF risk #6).

	const me = { id: 'me', name: 'You', avatar: 'https://i.pravatar.cc/150?u=rose', status: 'online' as const };
	const them = { id: 'them', name: 'Lina', avatar: 'https://i.pravatar.cc/150?u=lina', status: 'online' as const };

	interface Msg {
		id: string;
		sender: typeof me;
		content: string;
		time: string;
		reactions?: { emoji: string; count: number }[];
	}

	const messages: Msg[] = [
		{ id: '1', sender: them, content: 'the peonies opened this morning', time: '09:04' },
		{ id: '2', sender: them, content: 'all at once, like a held breath released', time: '09:05' },
		{ id: '3', sender: me, content: 'what color?', time: '09:06' },
		{ id: '4', sender: them, content: 'the pale ones. almost white at the edges.', time: '09:07', reactions: [{ emoji: '✿', count: 1 }] },
		{ id: '5', sender: me, content: 'i will bring my camera after work', time: '09:08' },
		{ id: '6', sender: them, content: 'the light is best around five', time: '09:09' },
		{ id: '7', sender: me, content: 'i will be there', time: '09:10' },
		{ id: '8', sender: them, content: 'do not rush', time: '09:11' },
		{ id: '9', sender: me, content: 'i never do', time: '09:12', reactions: [{ emoji: '◇', count: 1 }] },
		{ id: '10', sender: them, content: 'see you then', time: '09:13' },
	];

	function isShort(text: string) { return text.length < 40 && !text.includes('\n'); }
	function isLastInCluster(i: number) {
		if (i === messages.length - 1) return true;
		return messages[i + 1].sender.id !== messages[i].sender.id;
	}
	function isFirstInCluster(i: number) {
		if (i === 0) return true;
		return messages[i - 1].sender.id !== messages[i].sender.id;
	}
</script>

<div class="pane">
	<div class="tex"></div>

	<header class="head">
		<div class="head-left">
			<div class="avatar-wrap">
				<img src={them.avatar} alt="" class="avatar" />
				<div class="tex tex-avatar"></div>
				<span class="dot online"></span>
			</div>
			<div class="head-meta">
				<span class="head-name">{them.name}</span>
				<span class="head-eyebrow">N° 04 / ONLINE</span>
			</div>
		</div>
	</header>

	<div class="messages">
		<div class="day-divider">
			<span class="day-line"></span>
			<span class="day-label">TODAY</span>
			<span class="day-line"></span>
		</div>

		{#each messages as msg, i (msg.id)}
			{@const own = msg.sender.id === me.id}
			{@const short = isShort(msg.content)}
			{@const showAvatar = isLastInCluster(i)}
			{@const firstInCluster = isFirstInCluster(i)}
			<div class="msg" class:own class:msg-cluster-gap={firstInCluster && i !== 0} class:msg-with-time={showAvatar}>
				<div class="row" class:own>
					<div class="avatar-col">
						{#if showAvatar}
							<div class="avatar-wrap small">
								<img src={msg.sender.avatar} alt="" class="avatar" />
								<div class="tex tex-avatar"></div>
							</div>
							<span class="time">{msg.time}</span>
						{:else}
							<div class="avatar-spacer"></div>
						{/if}
					</div>
					<div class="bub" class:short>
						<p class="bub-text">{msg.content}</p>
					</div>
				</div>
				{#if msg.reactions}
					<div class="reactions-row" class:own>
						<div class="reactions">
							{#each msg.reactions as r}
								<span class="reaction">{r.emoji}<span class="reaction-n">{r.count}</span></span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="composer-wrap">
		<div class="composer">
			<span class="composer-placeholder">Write something...</span>
			<button class="composer-send" aria-label="Send">↑</button>
		</div>
	</div>
</div>

<style>
	.pane {
		/* Blush Pastel — warm cream with rose-pink accent */
		--p-bg:          oklch(0.96 0.018 350);
		--p-text:        oklch(0.22 0.020 350);
		--p-text-2:      oklch(0.40 0.025 350);
		--p-muted:       oklch(0.55 0.030 350);
		--p-accent:      oklch(0.55 0.130 350);
		--p-accent-soft: oklch(0.78 0.090 350 / 0.28);
		--p-accent-edge: oklch(0.55 0.130 350 / 0.32);
		--p-line:        oklch(0.40 0.040 350 / 0.10);
		--p-line-2:      oklch(0.40 0.040 350 / 0.18);
		--p-secondary:   oklch(0.40 0.030 350);
		--p-success:     oklch(0.50 0.130 145);

		position: relative;
		width: 860px; height: 760px;
		background: var(--p-bg);
		color: var(--p-text);
		font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		overflow: hidden;
		display: flex; flex-direction: column;
		border-radius: var(--r-lg, 22px);
	}

	.tex {
		position: absolute; inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
		mix-blend-mode: overlay; opacity: 0.28; pointer-events: none; z-index: 0;
	}
	.tex-avatar { inset: 0; border-radius: 50%; opacity: 0.30; }

	.head {
		position: relative; z-index: 1;
		display: flex; align-items: center; justify-content: space-between;
		padding: 18px 32px;
		border-bottom: 1px solid var(--p-line);
	}
	.head-left { display: flex; align-items: center; gap: 14px; }
	.head-meta { display: flex; flex-direction: column; gap: 2px; }
	.head-name { font-size: 1.05rem; font-weight: 500; color: var(--p-text); letter-spacing: -0.3px; }
	.head-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-secondary);
	}

	.avatar-wrap { position: relative; width: 40px; height: 40px; flex-shrink: 0; }
	.avatar-wrap.small { width: 36px; height: 36px; }
	.avatar {
		width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
		position: relative; z-index: 1;
	}
	.dot {
		position: absolute; bottom: 2px; right: 2px;
		width: 10px; height: 10px; border-radius: 50%;
		border: 2px solid var(--p-bg); z-index: 2;
	}
	.dot.online { background: var(--p-success); }

	.messages {
		position: relative; z-index: 1; flex: 1; overflow-y: auto;
		padding: 28px 36px 18px;
		display: flex; flex-direction: column; gap: 4px;
	}

	.day-divider { display: flex; align-items: center; gap: 14px; margin: 4px 0 22px; }
	.day-line { flex: 1; height: 1px; background: var(--p-line); }
	.day-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
		color: var(--p-muted);
	}

	.msg { display: flex; flex-direction: column; }
	.msg.msg-cluster-gap { margin-top: 14px; }
	.msg.msg-with-time { margin-bottom: 18px; }

	.row { display: flex; align-items: flex-end; gap: 12px; max-width: 100%; }
	.row.own { flex-direction: row-reverse; }

	.avatar-col { position: relative; width: 36px; flex-shrink: 0; }
	.avatar-spacer { width: 36px; height: 0; }
	.time {
		position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
		margin-top: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem; letter-spacing: 1.2px;
		color: var(--p-muted); opacity: 0.85; white-space: nowrap;
	}

	.reactions-row { display: flex; justify-content: flex-start; padding-left: 48px; margin-top: 6px; }
	.reactions-row.own { justify-content: flex-end; padding-left: 0; padding-right: 48px; }

	/* Received bubble — soft blush-tinted */
	.bub {
		position: relative; padding: 12px 18px;
		background: oklch(0.88 0.018 350);
		border: 1px solid var(--p-line);
		border-radius: var(--r-lg, 22px); max-width: 70%;
	}
	.bub.short { border-radius: var(--r-pill, 999px); padding: 10px 20px; }
	/* Own bubble — pastel blush (~25% over bg), dark ink */
	.row.own .bub {
		background: var(--p-accent-soft);
		border-color: var(--p-accent-edge);
	}
	.bub-text {
		margin: 0; font-size: 0.94rem; line-height: 1.55;
		color: var(--p-text);
		word-wrap: break-word;
	}

	.reactions { display: flex; gap: 6px; }
	.reaction {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 3px 10px;
		border-radius: var(--r-pill, 999px);
		background: oklch(0.93 0.018 350);
		border: 1px solid var(--p-line);
		font-size: 0.82rem; cursor: pointer; transition: background 0.15s;
		color: var(--p-text);
	}
	.reaction:hover { background: var(--p-accent-soft); }
	.reaction-n {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem; color: var(--p-muted);
	}

	.composer-wrap { position: relative; z-index: 1; padding: 14px 32px 22px; }
	.composer {
		display: flex; align-items: center; gap: 10px;
		background: oklch(1 0 0 / 0.55);
		border: 1px solid var(--p-line-2);
		border-radius: var(--r-pill, 999px);
		padding: 6px 6px 6px 22px;
		backdrop-filter: blur(14px);
	}
	.composer-placeholder { flex: 1; font-size: 0.9rem; color: var(--p-muted); }
	.composer-send {
		width: 36px; height: 36px; border-radius: 50%;
		background: var(--p-accent); color: oklch(1 0 0 / 0.98);
		border: none; font-size: 1.1rem; line-height: 1;
		cursor: pointer; transition: opacity 0.15s, transform 0.15s;
		display: flex; align-items: center; justify-content: center; padding: 0;
	}
	.composer-send:hover { opacity: 0.88; transform: translateY(-1px); }
</style>
