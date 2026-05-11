<script lang="ts">
	// ChatPane-03-ArtDecoNocturne
	const messages = [
		{ id: 1, sender: 'Alice', text: 'Shall we meet at the lounge?', time: 'IX:XV', isMine: false },
		{ id: 2, sender: 'Me', text: 'Indeed. The ambiance is perfect tonight.', time: 'IX:XVIII', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="deco-border">
		<div class="header">
			<div class="header-content">
				<div class="deco-lines left"></div>
				<div class="title-group">
					<h2>ALICE</h2>
					<span class="status">✦ PRESENT ✦</span>
				</div>
				<div class="deco-lines right"></div>
			</div>
		</div>

		<div class="message-list">
			{#each messages as msg (msg.id)}
				<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
					<div class="message-bubble">
						<div class="deco-corner top-left"></div>
						<div class="deco-corner top-right"></div>
						<div class="deco-corner bottom-left"></div>
						<div class="deco-corner bottom-right"></div>
						<div class="msg-inner">
							<span class="text">{msg.text}</span>
							<span class="time">{msg.time}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="composer">
			<div class="composer-inner">
				<button class="deco-btn">◈</button>
				<input type="text" placeholder="COMPOSE MISSIVE..." class="deco-input" />
				<button class="deco-btn send">►</button>
			</div>
		</div>
	</div>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	.chat-container {
		display: flex;
		height: 760px;
		max-width: 860px;
		width: 100%;
		background: #12121C;
		font-family: 'Ubuntu', sans-serif;
		color: #E2E2EC;
		padding: 16px;
		border-radius: 8px;
	}

	.deco-border {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 2px solid #567dd4;
		padding: 4px;
		position: relative;
	}
	.deco-border::before {
		content: '';
		position: absolute;
		top: 4px; left: 4px; right: 4px; bottom: 4px;
		border: 1px solid #7070da;
		pointer-events: none;
	}

	.header {
		padding: 24px;
		border-bottom: 2px solid #567dd4;
		text-align: center;
		background: linear-gradient(to bottom, rgba(112, 112, 218, 0.1), transparent);
	}
	.header-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 24px;
	}
	.deco-lines {
		flex: 1;
		height: 4px;
		border-top: 1px solid #7070da;
		border-bottom: 1px solid #7070da;
	}
	.title-group h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 4px;
		color: #8282c3;
	}
	.status {
		font-size: 0.7rem;
		letter-spacing: 2px;
		color: #567dd4;
		margin-top: 4px;
		display: block;
	}

	.message-list {
		flex: 1;
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		overflow-y: auto;
		background: radial-gradient(circle at center, #1e1e2d 0%, #12121C 100%);
	}
	.message-wrapper {
		display: flex;
		max-width: 70%;
	}
	.message-wrapper.mine {
		align-self: flex-end;
	}

	.message-bubble {
		position: relative;
		padding: 16px 24px;
		background: rgba(30, 30, 45, 0.8);
		border: 1px solid #7070da;
		transition: transform 0.3s ease;
	}
	.message-bubble:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 16px rgba(112, 112, 218, 0.1);
	}
	.message-wrapper.mine .message-bubble {
		background: rgba(112, 112, 218, 0.15);
	}

	.deco-corner {
		position: absolute;
		width: 8px;
		height: 8px;
		border: 1px solid #8282c3;
	}
	.top-left { top: -4px; left: -4px; border-right: none; border-bottom: none; }
	.top-right { top: -4px; right: -4px; border-left: none; border-bottom: none; }
	.bottom-left { bottom: -4px; left: -4px; border-right: none; border-top: none; }
	.bottom-right { bottom: -4px; right: -4px; border-left: none; border-top: none; }

	.msg-inner {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.text {
		font-size: 1.1rem;
		font-weight: 300;
		line-height: 1.6;
		letter-spacing: 0.5px;
	}
	.time {
		font-size: 0.7rem;
		color: #567dd4;
		align-self: flex-end;
		letter-spacing: 1px;
	}

	.composer {
		padding: 24px;
		border-top: 2px solid #567dd4;
		background: rgba(30, 30, 45, 0.5);
	}
	.composer-inner {
		display: flex;
		gap: 16px;
		border: 1px solid #7070da;
		padding: 4px;
		background: #12121C;
	}
	.deco-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #E2E2EC;
		font-family: inherit;
		font-weight: 300;
		letter-spacing: 1px;
		padding: 0 16px;
		outline: none;
	}
	.deco-input::placeholder {
		color: rgba(130, 130, 195, 0.5);
	}
	.deco-btn {
		background: transparent;
		color: #7070da;
		border: 1px solid #7070da;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.2s;
	}
	.deco-btn:hover {
		background: #7070da;
		color: #12121C;
	}
	.deco-btn.send {
		background: #567dd4;
		color: #12121C;
		border-color: #567dd4;
	}
	.deco-btn.send:hover {
		background: #8282c3;
	}
</style>