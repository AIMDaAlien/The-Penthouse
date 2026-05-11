<script lang="ts">
	// ChatPane-06-SwissEditorial
	const messages = [
		{ id: 1, sender: 'ALICE', text: 'Have you reviewed the final copy?', time: '08:00', isMine: false },
		{ id: 2, sender: 'ME', text: 'Yes. It meets all constraints.', time: '08:15', isMine: true }
	];
</script>

<div class="chat-container">
	<header class="header">
		<div class="grid-col left-col">
			<h1>ALICE</h1>
			<p class="status">ONLINE / 14:00 UTC</p>
		</div>
		<div class="grid-col right-col">
			<button class="menu-btn">INDEX</button>
		</div>
	</header>

	<div class="message-list">
		{#each messages as msg (msg.id)}
			<div class="message-row {msg.isMine ? 'mine' : 'theirs'}">
				<div class="grid-col left-col meta-col">
					<span class="sender">{msg.sender}</span>
					<span class="time">{msg.time}</span>
				</div>
				<div class="grid-col right-col text-col">
					<p class="text">{msg.text}</p>
				</div>
			</div>
		{/each}
	</div>

	<div class="composer">
		<div class="grid-col left-col">
			<button class="action-btn">APPEND</button>
		</div>
		<div class="grid-col right-col input-col">
			<input type="text" placeholder="ENTER TEXT..." class="swiss-input" />
			<button class="submit-btn">SEND</button>
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
		background: #000000; /* Pure black for strict contrast */
		font-family: 'Ubuntu', sans-serif;
		color: #E2E2EC;
		padding: 32px;
	}

	.grid-col {
		display: flex;
		flex-direction: column;
	}
	.left-col {
		width: 25%;
		padding-right: 24px;
		border-right: 2px solid #7070da;
	}
	.right-col {
		width: 75%;
		padding-left: 24px;
	}

	.header {
		display: flex;
		padding-bottom: 32px;
		border-bottom: 2px solid #7070da;
	}
	h1 {
		margin: 0;
		font-size: 3rem;
		font-weight: 700;
		line-height: 1;
		color: #7070da;
		text-transform: uppercase;
		letter-spacing: -1px;
	}
	.status {
		margin: 8px 0 0 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: #8282c3;
	}
	.menu-btn {
		align-self: flex-end;
		background: none;
		border: none;
		color: #7070da;
		font-size: 1.5rem;
		font-weight: 700;
		cursor: pointer;
		text-transform: uppercase;
	}
	.menu-btn:hover {
		color: #E2E2EC;
	}

	.message-list {
		flex: 1;
		padding: 32px 0;
		display: flex;
		flex-direction: column;
		gap: 48px;
		overflow-y: auto;
	}
	.message-row {
		display: flex;
	}
	.meta-col {
		gap: 8px;
	}
	.sender {
		font-size: 1.2rem;
		font-weight: 700;
		color: #7070da;
	}
	.time {
		font-size: 1rem;
		font-weight: 400;
		color: #567dd4;
	}
	.text {
		margin: 0;
		font-size: 2rem;
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: -0.5px;
	}
	.message-row.mine .text {
		color: #8282c3;
	}

	.composer {
		display: flex;
		padding-top: 32px;
		border-top: 2px solid #7070da;
	}
	.action-btn {
		background: none;
		border: none;
		color: #7070da;
		font-size: 1.2rem;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
		padding: 0;
	}
	.action-btn:hover {
		color: #E2E2EC;
	}
	.input-col {
		flex-direction: row;
		align-items: center;
		gap: 16px;
	}
	.swiss-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #E2E2EC;
		font-family: inherit;
		font-size: 1.5rem;
		font-weight: 500;
		outline: none;
	}
	.swiss-input::placeholder {
		color: #567dd4;
	}
	.submit-btn {
		background: #7070da;
		color: #000;
		border: none;
		padding: 12px 24px;
		font-size: 1.2rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;
	}
	.submit-btn:hover {
		background: #E2E2EC;
	}
</style>