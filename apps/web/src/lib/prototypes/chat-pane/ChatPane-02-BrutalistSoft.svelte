<script lang="ts">
	// ChatPane-02-BrutalistSoft
	const messages = [
		{ id: 1, sender: 'Alice', text: 'Are we doing the brutalist thing?', time: '11:00 AM', isMine: false },
		{ id: 2, sender: 'Me', text: 'Yes. Soft but raw.', time: '11:02 AM', isMine: true },
		{ id: 3, sender: 'Alice', text: 'I love the high contrast borders.', time: '11:03 AM', isMine: false }
	];
</script>

<div class="chat-container">
	<div class="header">
		<div class="header-info">
			<div class="avatar mock-avatar">A</div>
			<div class="title-group">
				<h2>Alice</h2>
				<span class="status">● ONLINE</span>
			</div>
		</div>
		<div class="actions">
			<button class="brutal-btn">SEARCH</button>
			<button class="brutal-btn">PINNED</button>
		</div>
	</div>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
				<div class="message-bubble">
					<div class="msg-header">
						<span class="sender">{msg.sender}</span>
						<span class="time">{msg.time}</span>
					</div>
					<div class="text">{msg.text}</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<button class="brutal-icon-btn">+</button>
		<input type="text" placeholder="WRITE A MESSAGE" class="brutal-input" />
		<button class="brutal-btn send-btn">SEND</button>
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
		border: 4px solid #7070da;
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 12px 12px 0 #567dd4;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		background: #7070da;
		border-bottom: 4px solid #12121C;
		color: #12121C;
	}
	.header-info {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.title-group h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.status {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 1px;
	}

	.mock-avatar {
		width: 56px;
		height: 56px;
		background: #12121C;
		color: #7070da;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 1.5rem;
		border: 2px solid #12121C;
	}

	.actions {
		display: flex;
		gap: 12px;
	}

	.brutal-btn {
		background: #12121C;
		color: #7070da;
		border: 2px solid #12121C;
		padding: 8px 16px;
		border-radius: 9999px;
		font-weight: 700;
		cursor: pointer;
		text-transform: uppercase;
		transition: all 0.2s;
	}
	.brutal-btn:hover {
		background: #567dd4;
		color: #12121C;
		transform: translate(-2px, -2px);
		box-shadow: 4px 4px 0 #12121C;
	}

	.message-list {
		flex: 1;
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		overflow-y: auto;
		background: #1e1e2d;
	}
	.message-wrapper {
		display: flex;
		max-width: 85%;
	}
	.message-wrapper.mine {
		align-self: flex-end;
	}

	.message-bubble {
		background: #12121C;
		border: 2px solid #8282c3;
		padding: 16px 20px;
		border-radius: 16px;
		position: relative;
		transition: transform 0.2s;
	}
	.message-wrapper:not(.mine) .message-bubble {
		border-bottom-left-radius: 4px;
	}
	.message-wrapper.mine .message-bubble {
		background: #7070da;
		color: #12121C;
		border-color: #12121C;
		border-bottom-right-radius: 4px;
	}
	.message-bubble:hover {
		transform: scale(1.02);
	}

	.msg-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		opacity: 0.7;
	}
	.text {
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.composer {
		padding: 24px;
		display: flex;
		gap: 16px;
		background: #7070da;
		border-top: 4px solid #12121C;
	}

	.brutal-input {
		flex: 1;
		background: #12121C;
		border: 2px solid #12121C;
		border-radius: 12px;
		padding: 0 20px;
		color: #7070da;
		font-family: inherit;
		font-weight: 700;
		font-size: 1rem;
		outline: none;
	}
	.brutal-input::placeholder {
		color: rgba(112, 112, 218, 0.5);
	}
	.brutal-input:focus {
		background: #1e1e2d;
	}

	.brutal-icon-btn {
		width: 48px;
		height: 48px;
		background: #12121C;
		color: #7070da;
		border: 2px solid #12121C;
		border-radius: 12px;
		font-size: 1.5rem;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.brutal-icon-btn:hover {
		background: #8282c3;
		color: #12121C;
	}

	.send-btn {
		border-radius: 12px;
		padding: 0 32px;
	}
</style>