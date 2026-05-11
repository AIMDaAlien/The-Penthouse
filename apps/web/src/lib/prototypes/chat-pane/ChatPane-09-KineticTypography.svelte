<script lang="ts">
	// ChatPane-09-KineticTypography
	const messages = [
		{ id: 1, sender: 'Alice', text: 'Watch it move.', time: 'Just now', isMine: false },
		{ id: 2, sender: 'Me', text: 'Everything is breathing.', time: 'Just now', isMine: true }
	];
</script>

<div class="chat-container">
	<header class="header">
		<div class="presence-orb"></div>
		<div class="header-text">
			<h1 class="bounce-text">Alice</h1>
			<p class="fade-text">typing...</p>
		</div>
	</header>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-wrapper {msg.isMine ? 'mine' : 'theirs'}">
				<div class="msg-content">
					<span class="sender slide-in">{msg.sender}</span>
					<p class="text pop-in">{msg.text}</p>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<input type="text" placeholder="Type..." class="kinetic-input expand-in" />
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
	}

	.header {
		padding: 40px;
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.presence-orb {
		width: 40px;
		height: 40px;
		background: radial-gradient(circle at 30% 30%, #E2E2EC, #7070da);
		border-radius: 50%;
		box-shadow: 0 0 20px #7070da;
		animation: pulse-orb 2s ease-in-out infinite alternate;
	}
	@keyframes pulse-orb {
		0% { transform: scale(0.9); box-shadow: 0 0 10px #7070da; }
		100% { transform: scale(1.1); box-shadow: 0 0 30px #8282c3; }
	}

	.header-text {
		display: flex;
		flex-direction: column;
	}
	h1 {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
	}
	.bounce-text {
		animation: bounce 3s infinite;
		transform-origin: bottom;
	}
	@keyframes bounce {
		0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
		40% { transform: translateY(-10px); }
		60% { transform: translateY(-5px); }
	}
	.fade-text {
		margin: 4px 0 0 0;
		color: #567dd4;
		animation: fade 1.5s infinite alternate;
	}
	@keyframes fade {
		from { opacity: 0.3; }
		to { opacity: 1; }
	}

	.message-list {
		flex: 1;
		padding: 0 40px;
		display: flex;
		flex-direction: column;
		gap: 40px;
		overflow-y: auto;
	}
	.message-wrapper {
		display: flex;
	}
	.message-wrapper.mine {
		justify-content: flex-end;
		text-align: right;
	}

	.msg-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 80%;
	}
	.sender {
		font-size: 1rem;
		color: #8282c3;
		font-weight: 700;
	}
	.slide-in {
		animation: slideIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) both;
	}
	@keyframes slideIn {
		from { transform: translateX(-20px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	.message-wrapper.mine .slide-in {
		animation-name: slideInRight;
	}
	@keyframes slideInRight {
		from { transform: translateX(20px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}

	.text {
		margin: 0;
		font-size: 2rem;
		line-height: 1.2;
		font-weight: 500;
	}
	.pop-in {
		animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
		animation-delay: 0.1s;
	}
	@keyframes popIn {
		from { transform: scale(0.8); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	.message-wrapper:hover .text {
		animation: jiggle 0.4s ease-in-out;
	}
	@keyframes jiggle {
		0% { transform: rotate(0deg); }
		25% { transform: rotate(-2deg); }
		50% { transform: rotate(2deg); }
		75% { transform: rotate(-1deg); }
		100% { transform: rotate(0deg); }
	}

	.composer {
		padding: 40px;
	}
	.kinetic-input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 4px solid #7070da;
		color: #E2E2EC;
		font-size: 2rem;
		font-family: inherit;
		padding: 16px 0;
		outline: none;
		transition: border-width 0.2s, color 0.2s;
	}
	.kinetic-input:focus {
		border-bottom-width: 8px;
		color: #8282c3;
	}
	.expand-in {
		animation: expand 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
	}
	@keyframes expand {
		from { width: 0; opacity: 0; }
		to { width: 100%; opacity: 1; }
	}
</style>