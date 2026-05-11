<script lang="ts">
	// ChatPane-08-VaporwaveCathedral
	const messages = [
		{ id: 1, sender: 'A L I C E', text: 'd o  y o u  f e e l  i t ?', time: '19:84', isMine: false },
		{ id: 2, sender: 'M E', text: 'y e s .  i t s  a l l  a r o u n d .', time: '19:85', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="scanlines"></div>
	
	<div class="header">
		<h1 class="chrome-text">A L I C E</h1>
		<div class="status-bar">
			<span class="grid-line"></span>
			<span class="status">O N L I N E</span>
			<span class="grid-line"></span>
		</div>
	</div>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
				<div class="glass-panel">
					<div class="meta">
						<span class="sender">{msg.sender}</span>
						<span class="time">{msg.time}</span>
					</div>
					<div class="text">{msg.text}</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<input type="text" placeholder="e n t e r  v o i d . . ." class="vapor-input" />
		<button class="vapor-btn">S E N D</button>
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
		background: linear-gradient(180deg, #12121C 0%, rgba(86, 125, 212, 0.2) 100%);
		font-family: 'Ubuntu', sans-serif;
		color: #E2E2EC;
		position: relative;
		overflow: hidden;
		border: 1px solid #7070da;
		box-shadow: 0 0 20px rgba(112, 112, 218, 0.4);
	}

	.scanlines {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: linear-gradient(to bottom, rgba(112, 112, 218, 0), rgba(112, 112, 218, 0) 50%, rgba(18, 18, 28, 0.2) 50%, rgba(18, 18, 28, 0.2));
		background-size: 100% 4px;
		pointer-events: none;
		z-index: 10;
		opacity: 0.3;
	}

	.header {
		padding: 40px 24px 24px;
		text-align: center;
		position: relative;
		z-index: 2;
		border-bottom: 2px solid rgba(112, 112, 218, 0.3);
		background: rgba(18, 18, 28, 0.8);
		backdrop-filter: blur(4px);
	}
	.chrome-text {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: #E2E2EC;
		text-shadow: 
			0 -2px 4px #7070da,
			0 -4px 10px #567dd4,
			0 2px 4px #12121C;
		letter-spacing: 4px;
	}
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-top: 16px;
	}
	.grid-line {
		height: 1px;
		width: 60px;
		background: linear-gradient(90deg, transparent, #7070da, transparent);
	}
	.status {
		color: #8282c3;
		font-size: 0.8rem;
		letter-spacing: 2px;
		text-shadow: 0 0 4px #7070da;
	}

	.message-list {
		flex: 1;
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		overflow-y: auto;
		position: relative;
		z-index: 2;
	}

	.message-wrapper {
		display: flex;
		max-width: 80%;
	}
	.message-wrapper.mine {
		align-self: flex-end;
	}

	.glass-panel {
		background: rgba(30, 30, 45, 0.4);
		border: 1px solid rgba(130, 130, 195, 0.3);
		padding: 16px 24px;
		backdrop-filter: blur(8px);
		box-shadow: inset 0 0 20px rgba(112, 112, 218, 0.1);
		transform: skewX(-5deg);
		transition: transform 0.3s, box-shadow 0.3s;
	}
	.glass-panel:hover {
		transform: skewX(0deg) scale(1.02);
		box-shadow: inset 0 0 30px rgba(112, 112, 218, 0.3), 0 0 15px rgba(112, 112, 218, 0.2);
	}
	.message-wrapper.mine .glass-panel {
		background: rgba(112, 112, 218, 0.15);
		border-color: rgba(112, 112, 218, 0.5);
	}

	.meta {
		display: flex;
		justify-content: space-between;
		margin-bottom: 12px;
		transform: skewX(5deg);
	}
	.sender {
		color: #7070da;
		font-weight: 700;
		letter-spacing: 2px;
	}
	.message-wrapper.mine .sender {
		color: #E2E2EC;
	}
	.time {
		color: #567dd4;
		font-size: 0.8rem;
	}
	.text {
		font-size: 1.2rem;
		letter-spacing: 1px;
		transform: skewX(5deg);
		text-shadow: 0 0 2px rgba(226, 226, 236, 0.5);
	}

	.composer {
		padding: 24px;
		background: rgba(18, 18, 28, 0.9);
		border-top: 2px solid rgba(112, 112, 218, 0.3);
		display: flex;
		gap: 16px;
		position: relative;
		z-index: 2;
	}
	.vapor-input {
		flex: 1;
		background: rgba(30, 30, 45, 0.5);
		border: 1px solid #567dd4;
		padding: 0 24px;
		color: #E2E2EC;
		font-family: inherit;
		font-size: 1.1rem;
		letter-spacing: 2px;
		outline: none;
		box-shadow: inset 0 0 10px rgba(112, 112, 218, 0.2);
	}
	.vapor-input:focus {
		border-color: #7070da;
		box-shadow: inset 0 0 20px rgba(112, 112, 218, 0.4), 0 0 10px rgba(112, 112, 218, 0.2);
	}
	.vapor-btn {
		background: #7070da;
		color: #12121C;
		border: none;
		padding: 0 32px;
		font-weight: 700;
		letter-spacing: 4px;
		cursor: pointer;
		box-shadow: 0 0 15px rgba(112, 112, 218, 0.4);
		transition: all 0.2s;
	}
	.vapor-btn:hover {
		background: #E2E2EC;
		box-shadow: 0 0 25px #E2E2EC;
	}
</style>