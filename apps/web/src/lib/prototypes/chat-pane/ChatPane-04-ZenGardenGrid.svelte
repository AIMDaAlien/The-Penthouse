<script lang="ts">
	// ChatPane-04-ZenGardenGrid
	const messages = [
		{ id: 1, sender: 'Alice', text: 'Peaceful here.', time: '14:00', isMine: false },
		{ id: 2, sender: 'Me', text: 'Very quiet.', time: '14:05', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="sidebar-line"></div>
	
	<div class="main-content">
		<header class="header">
			<div class="meta">
				<h1>Alice</h1>
				<span class="status">active</span>
			</div>
			<div class="tools">
				<button class="icon-btn">○</button>
			</div>
		</header>

		<div class="message-list">
			{#each messages as msg (msg.id)}
				<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
					<div class="time-col">{msg.time}</div>
					<div class="text-col">
						<span class="sender">{msg.sender}</span>
						<p class="text">{msg.text}</p>
					</div>
				</div>
			{/each}
		</div>

		<div class="composer">
			<input type="text" placeholder="write..." class="zen-input" />
			<button class="zen-submit">→</button>
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
		position: relative;
	}

	.sidebar-line {
		width: 64px;
		border-right: 1px solid rgba(112, 112, 218, 0.2);
		position: relative;
	}
	.sidebar-line::after {
		content: '';
		position: absolute;
		top: 100px;
		right: -3px;
		width: 5px;
		height: 5px;
		background: #7070da;
		border-radius: 50%;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.header {
		padding: 48px 64px 24px 64px;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}
	.meta h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 300;
		color: #E2E2EC;
	}
	.status {
		font-size: 0.9rem;
		color: #8282c3;
		font-weight: 300;
		margin-top: 8px;
		display: inline-block;
	}
	.icon-btn {
		background: none;
		border: none;
		color: #7070da;
		font-size: 1.5rem;
		cursor: pointer;
		transition: opacity 0.3s;
	}
	.icon-btn:hover {
		opacity: 0.6;
	}

	.message-list {
		flex: 1;
		padding: 48px 64px;
		display: flex;
		flex-direction: column;
		gap: 40px;
		overflow-y: auto;
	}
	.message-wrapper {
		display: flex;
		gap: 32px;
		opacity: 0.8;
		transition: opacity 0.4s, transform 0.4s;
	}
	.message-wrapper:hover {
		opacity: 1;
		transform: translateX(4px);
	}
	.time-col {
		width: 60px;
		font-size: 0.8rem;
		color: #567dd4;
		padding-top: 4px;
	}
	.text-col {
		flex: 1;
	}
	.sender {
		font-size: 0.8rem;
		color: #8282c3;
		text-transform: lowercase;
		display: block;
		margin-bottom: 8px;
	}
	.text {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 300;
		line-height: 1.6;
		max-width: 80%;
	}
	.message-wrapper.mine .text-col {
		border-left: 1px solid #7070da;
		padding-left: 24px;
	}

	.composer {
		padding: 24px 64px 48px 64px;
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.zen-input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(112, 112, 218, 0.3);
		padding: 12px 0;
		color: #E2E2EC;
		font-family: inherit;
		font-size: 1.1rem;
		font-weight: 300;
		outline: none;
		transition: border-color 0.4s;
	}
	.zen-input:focus {
		border-bottom-color: #7070da;
	}
	.zen-input::placeholder {
		color: #646478;
		font-style: italic;
	}
	.zen-submit {
		background: none;
		border: none;
		color: #7070da;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 12px;
		transition: transform 0.3s;
	}
	.zen-submit:hover {
		transform: translateX(4px);
	}
</style>