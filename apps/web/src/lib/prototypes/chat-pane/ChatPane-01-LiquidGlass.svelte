<script lang="ts">
	// ChatPane-01-LiquidGlass
	const messages = [
		{ id: 1, sender: 'Alice', text: 'Hey, did you see the new designs?', time: '10:42 AM', isMine: false },
		{ id: 2, sender: 'Me', text: 'Yeah, the periwinkle looks incredible.', time: '10:45 AM', isMine: true },
		{ id: 3, sender: 'Alice', text: 'It feels very ethereal.', time: '10:46 AM', isMine: false }
	];
</script>

<div class="chat-container">
	<div class="header">
		<div class="header-info">
			<div class="avatar mock-avatar">A</div>
			<div class="title-group">
				<h2>Alice</h2>
				<span class="status">Online</span>
			</div>
		</div>
		<div class="actions">
			<button class="glass-btn">🔍</button>
			<button class="glass-btn">📌</button>
		</div>
	</div>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
				{#if !msg.isMine}
					<div class="avatar small-avatar">{msg.sender[0]}</div>
				{/if}
				<div class="message-bubble">
					<span class="text">{msg.text}</span>
					<span class="time">{msg.time}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<button class="glass-btn icon-btn">📎</button>
		<input type="text" placeholder="Type a message..." class="glass-input" />
		<button class="glass-btn send-btn">➤</button>
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
		font-family: 'Ubuntu', sans-serif;
		color: #E2E2EC;
		position: relative;
		overflow: hidden;
		border-radius: 24px;
	}
	/* Background blobs for liquid glass effect */
	.chat-container::before, .chat-container::after {
		content: '';
		position: absolute;
		width: 400px;
		height: 400px;
		border-radius: 50%;
		filter: blur(80px);
		z-index: 0;
		opacity: 0.3;
		animation: float 10s infinite ease-in-out alternate;
	}
	.chat-container::before {
		background: #7070da;
		top: -100px;
		left: -100px;
	}
	.chat-container::after {
		background: #567dd4;
		bottom: -100px;
		right: -100px;
		animation-delay: -5s;
	}
	@keyframes float {
		0% { transform: translate(0, 0); }
		100% { transform: translate(50px, 50px); }
	}

	.header, .message-list, .composer {
		position: relative;
		z-index: 1;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		background: rgba(30, 30, 45, 0.4);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(130, 130, 195, 0.2);
	}
	.header-info {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.title-group h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 500;
	}
	.status {
		font-size: 0.8rem;
		color: #8282c3;
	}

	.mock-avatar {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #7070da, #567dd4);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 1.2rem;
		box-shadow: 0 4px 12px rgba(112, 112, 218, 0.3);
	}
	.small-avatar {
		width: 32px;
		height: 32px;
		background: rgba(130, 130, 195, 0.2);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		align-self: flex-end;
		margin-bottom: 4px;
	}

	.message-list {
		flex: 1;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
	}
	.message-wrapper {
		display: flex;
		gap: 12px;
		max-width: 80%;
	}
	.message-wrapper.mine {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.message-bubble {
		background: rgba(30, 30, 45, 0.4);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(130, 130, 195, 0.2);
		padding: 12px 16px;
		border-radius: 20px;
		border-bottom-left-radius: 4px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s, background 0.2s;
	}
	.message-wrapper.mine .message-bubble {
		background: rgba(112, 112, 218, 0.2);
		border: 1px solid rgba(112, 112, 218, 0.4);
		border-bottom-left-radius: 20px;
		border-bottom-right-radius: 4px;
	}
	.message-bubble:hover {
		transform: translateY(-2px);
		background: rgba(130, 130, 195, 0.15);
	}
	.message-wrapper.mine .message-bubble:hover {
		background: rgba(112, 112, 218, 0.3);
	}

	.time {
		font-size: 0.7rem;
		color: #8C8CC5;
		align-self: flex-end;
	}

	.composer {
		padding: 20px 24px;
		display: flex;
		gap: 12px;
		background: rgba(30, 30, 45, 0.4);
		backdrop-filter: blur(20px);
		border-top: 1px solid rgba(130, 130, 195, 0.2);
	}

	.glass-input {
		flex: 1;
		background: rgba(18, 18, 28, 0.6);
		border: 1px solid rgba(130, 130, 195, 0.3);
		border-radius: 9999px;
		padding: 0 20px;
		color: #E2E2EC;
		font-family: inherit;
		outline: none;
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.glass-input:focus {
		border-color: #7070da;
		box-shadow: 0 0 12px rgba(112, 112, 218, 0.3);
	}
	.glass-btn {
		background: rgba(130, 130, 195, 0.1);
		border: 1px solid rgba(130, 130, 195, 0.2);
		color: #E2E2EC;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}
	.glass-btn:hover {
		background: rgba(112, 112, 218, 0.3);
		border-color: #7070da;
		transform: scale(1.05);
	}
	.send-btn {
		background: #7070da;
		border-color: #7070da;
		color: #12121C;
	}
	.send-btn:hover {
		background: #8282c3;
	}
</style>