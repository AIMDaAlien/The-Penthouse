<script lang="ts">
	// ChatPane-05-TerminalCouture
	const messages = [
		{ id: 1, sender: 'Alice', text: 'ping 127.0.0.1', time: '16:01:00', isMine: false },
		{ id: 2, sender: 'Me', text: 'PONG. Connection established.', time: '16:01:05', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="term-header">
		<span>[ ALICE.EXE ]</span>
		<span>TTY2</span>
	</div>

	<div class="message-list">
		<div class="system-msg">Initializing secure connection... OK.</div>
		<div class="system-msg">Periwinkle encryption enabled.</div>
		
		{#each messages as msg (msg.id)}
			<div class="message-wrapper">
				<div class="meta">
					<span class="time">[{msg.time}]</span>
					<span class="sender {msg.isMine ? 'mine' : 'theirs'}"><{msg.sender}></span>
				</div>
				<div class="text">{msg.text}</div>
			</div>
		{/each}
		
		<div class="cursor-line">
			<span class="prompt">guest@penthouse:~$</span>
			<span class="blinking-cursor">_</span>
		</div>
	</div>

	<div class="composer">
		<span class="prompt">guest@penthouse:~$</span>
		<input type="text" class="term-input" autofocus />
	</div>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 760px;
		max-width: 860px;
		width: 100%;
		background: #12121C;
		font-family: 'JetBrains Mono', monospace; /* Monospace for terminal */
		color: #7070da;
		border: 1px solid #567dd4;
		padding: 8px;
		box-shadow: 0 0 20px rgba(112, 112, 218, 0.1) inset;
	}

	.term-header {
		display: flex;
		justify-content: space-between;
		padding: 8px;
		border-bottom: 1px dashed #567dd4;
		font-size: 0.9rem;
		color: #8282c3;
	}

	.message-list {
		flex: 1;
		padding: 16px 8px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.system-msg {
		color: #567dd4;
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.message-wrapper {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.meta {
		display: flex;
		gap: 12px;
		font-size: 0.9rem;
	}
	.time {
		color: #8282c3;
	}
	.sender {
		font-weight: bold;
	}
	.sender.mine {
		color: #E2E2EC;
	}
	.sender.theirs {
		color: #7070da;
	}
	.text {
		padding-left: 24px;
		color: #E2E2EC;
		font-size: 1rem;
		line-height: 1.4;
		position: relative;
	}
	.text::before {
		content: '│';
		position: absolute;
		left: 8px;
		color: #567dd4;
	}
	.text:hover {
		background: rgba(112, 112, 218, 0.1);
	}

	.cursor-line {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.prompt {
		color: #567dd4;
	}
	.blinking-cursor {
		color: #E2E2EC;
		animation: blink 1s step-end infinite;
	}
	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	.composer {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 8px;
		border-top: 1px dashed #567dd4;
	}
	.term-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #E2E2EC;
		font-family: inherit;
		font-size: 1rem;
		outline: none;
	}
</style>