<script lang="ts">
	// ChatPane-07-OrganicBlobs
	const messages = [
		{ id: 1, sender: 'Alice', text: 'This is very relaxing.', time: '7:00 PM', isMine: false },
		{ id: 2, sender: 'Me', text: 'Almost like floating in water.', time: '7:02 PM', isMine: true }
	];
</script>

<div class="chat-container">
	<div class="header">
		<div class="avatar-blob">
			<span class="initial">A</span>
		</div>
		<div class="meta">
			<h2>Alice</h2>
			<span class="status">breathing</span>
		</div>
	</div>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
				{#if !msg.isMine}
					<div class="small-blob"></div>
				{/if}
				<div class="bubble-blob">
					<p>{msg.text}</p>
					<span class="time">{msg.time}</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<div class="input-blob">
			<button class="blob-btn icon">✿</button>
			<input type="text" placeholder="flow..." class="blob-input" />
			<button class="blob-btn send">➔</button>
		</div>
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
		overflow: hidden;
		position: relative;
		border-radius: 40px;
	}

	.chat-container::before {
		content: '';
		position: absolute;
		top: -20%; left: -20%;
		width: 60%; height: 60%;
		background: radial-gradient(circle, rgba(86, 125, 212, 0.15) 0%, transparent 70%);
		border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
		animation: morph 15s ease-in-out infinite alternate;
		pointer-events: none;
	}

	.chat-container::after {
		content: '';
		position: absolute;
		bottom: -20%; right: -20%;
		width: 60%; height: 60%;
		background: radial-gradient(circle, rgba(112, 112, 218, 0.15) 0%, transparent 70%);
		border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
		animation: morph 20s ease-in-out infinite alternate-reverse;
		pointer-events: none;
	}

	@keyframes morph {
		0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
		100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
	}

	.header, .message-list, .composer {
		position: relative;
		z-index: 1;
	}

	.header {
		padding: 32px;
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.avatar-blob {
		width: 64px; height: 64px;
		background: linear-gradient(135deg, #7070da, #567dd4);
		border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 1.5rem; font-weight: bold;
		animation: morph 5s infinite alternate;
	}
	.meta h2 {
		margin: 0; font-size: 1.8rem; font-weight: 400;
	}
	.status {
		color: #8282c3; font-size: 0.9rem; font-style: italic;
	}

	.message-list {
		flex: 1;
		padding: 24px 32px;
		display: flex; flex-direction: column; gap: 32px;
		overflow-y: auto;
	}

	.message-wrapper {
		display: flex; align-items: flex-end; gap: 16px;
		max-width: 75%;
	}
	.message-wrapper.mine {
		align-self: flex-end; flex-direction: row-reverse;
	}

	.small-blob {
		width: 24px; height: 24px;
		background: #567dd4;
		border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
		opacity: 0.5;
	}

	.bubble-blob {
		background: rgba(30, 30, 45, 0.6);
		padding: 24px 32px;
		border-radius: 40px 40px 40px 8px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(112, 112, 218, 0.2);
		transition: all 0.3s ease;
	}
	.bubble-blob:hover {
		border-radius: 30px 50px 30px 20px;
		background: rgba(30, 30, 45, 0.8);
	}
	.message-wrapper.mine .bubble-blob {
		background: rgba(112, 112, 218, 0.2);
		border-radius: 40px 40px 8px 40px;
		border-color: rgba(112, 112, 218, 0.4);
	}
	.message-wrapper.mine .bubble-blob:hover {
		border-radius: 50px 30px 20px 30px;
		background: rgba(112, 112, 218, 0.3);
	}
	.bubble-blob p {
		margin: 0 0 8px 0; font-size: 1.1rem; line-height: 1.5;
	}
	.time {
		font-size: 0.8rem; color: #8282c3;
	}

	.composer {
		padding: 32px;
	}
	.input-blob {
		display: flex; align-items: center; gap: 16px;
		background: rgba(30, 30, 45, 0.6);
		padding: 12px 24px;
		border-radius: 60px;
		border: 1px solid rgba(112, 112, 218, 0.3);
		backdrop-filter: blur(10px);
	}
	.blob-input {
		flex: 1; background: transparent; border: none;
		color: #E2E2EC; font-size: 1.1rem; font-family: inherit;
		outline: none;
	}
	.blob-input::placeholder { color: #646478; }
	.blob-btn {
		background: transparent; border: none;
		color: #7070da; font-size: 1.5rem; cursor: pointer;
		width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
		border-radius: 50%; transition: background 0.3s;
	}
	.blob-btn:hover {
		background: rgba(112, 112, 218, 0.2);
	}
</style>