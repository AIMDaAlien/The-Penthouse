<script lang="ts">
	let searchQuery = $state('');

	const mockUsers = [
		{ id: 1, name: 'Alice Waverly', username: '@alice', presence: 'available', note: 'Designing things', lastSeen: 'Just now', avatar: 'https://i.pravatar.cc/150?u=alice' },
		{ id: 2, name: 'Bob Constructor', username: '@builder', presence: 'busy', note: 'In a meeting', lastSeen: '5m ago', avatar: 'https://i.pravatar.cc/150?u=bob' },
		{ id: 3, name: 'Charlie Scene', username: '@scene', presence: 'dnd', note: 'Focus mode', lastSeen: '1h ago', avatar: 'https://i.pravatar.cc/150?u=charlie' },
		{ id: 4, name: 'Diana Prince', username: '@wonder', presence: 'afk', note: 'Out for lunch', lastSeen: '2h ago', avatar: 'https://i.pravatar.cc/150?u=diana' },
		{ id: 5, name: 'Eve Hacker', username: '@eve', presence: 'offline', note: '', lastSeen: 'Yesterday', avatar: 'https://i.pravatar.cc/150?u=eve' },
		{ id: 6, name: 'Frank Castle', username: '@punish', presence: 'available', note: '', lastSeen: 'Just now', avatar: 'https://i.pravatar.cc/150?u=frank' },
	];

	const filteredUsers = $derived(
		mockUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()))
	);
</script>

<div class="pane-container">
	<div class="scanlines"></div>
	
	<div class="vapor-grid-container">
		<div class="vapor-grid"></div>
	</div>

	<header class="vapor-header">
		<h2 class="chrome-text" data-text="DIRECTORY">DIRECTORY</h2>
		<div class="vapor-search">
			<input type="text" placeholder="QUERY . . ." bind:value={searchQuery} />
		</div>
	</header>

	<div class="content">
		{#if filteredUsers.length === 0}
			<div class="empty-state">
				<div class="sun"></div>
				<p class="vapor-p">NO CONNECTION</p>
			</div>
		{:else}
			<div class="vapor-list">
				{#each filteredUsers as user (user.id)}
					<button class="vapor-card" aria-label="Start DM with {user.name}">
						<div class="card-bg"></div>
						
						<div class="avatar-box">
							<img src={user.avatar} alt="{user.name}" />
							<div class="glitch-layer"></div>
						</div>
						
						<div class="user-info">
							<span class="name">{user.name.toUpperCase()}</span>
							<span class="username">{user.username}</span>
							{#if user.note}
								<span class="note">{user.note.toUpperCase()}</span>
							{/if}
						</div>
						
						<div class="status-zone">
							<div class="status-indicator {user.presence}"></div>
							<span class="last-seen">{user.lastSeen.toUpperCase()}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	:root {
		--font-sans: 'Ubuntu', sans-serif;
	}
	.pane-container {
		width: 100%;
		height: 100%;
		max-width: 860px;
		height: 760px;
		background: linear-gradient(180deg, #12121C 0%, #1a1a3a 50%, #2a1a3a 100%);
		color: #E2E2EC;
		font-family: var(--font-sans);
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border: 2px solid #ff8ca6;
		box-shadow: inset 0 0 50px rgba(255, 140, 166, 0.2);
	}

	.scanlines {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
		background-size: 100% 4px;
		pointer-events: none;
		z-index: 100;
		opacity: 0.5;
	}

	.vapor-grid-container {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		height: 40%;
		perspective: 400px;
		z-index: 0;
		opacity: 0.3;
	}

	.vapor-grid {
		width: 200%; height: 200%;
		position: absolute;
		bottom: -50%; left: -50%;
		background-image: 
			linear-gradient(to right, #7070da 1px, transparent 1px),
			linear-gradient(to top, #ff8ca6 1px, transparent 1px);
		background-size: 40px 40px;
		transform: rotateX(60deg);
		animation: grid-move 5s linear infinite;
	}

	@keyframes grid-move {
		0% { transform: rotateX(60deg) translateY(0); }
		100% { transform: rotateX(60deg) translateY(40px); }
	}

	.vapor-header {
		padding: 40px 60px;
		position: relative;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid rgba(112, 112, 218, 0.4);
		background: rgba(18, 18, 28, 0.8);
		backdrop-filter: blur(5px);
	}

	.chrome-text {
		margin: 0;
		font-size: 48px;
		font-weight: 700;
		letter-spacing: 4px;
		position: relative;
		background: linear-gradient(180deg, #E2E2EC 0%, #8282c3 45%, #12121C 50%, #ff8ca6 55%, #7070da 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 0 10px rgba(255, 140, 166, 0.4));
	}

	.vapor-search input {
		width: 250px;
		background: rgba(255, 140, 166, 0.1);
		border: 2px solid #7070da;
		padding: 12px 20px;
		color: #E2E2EC;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		outline: none;
		transition: all 0.3s ease;
		text-shadow: 0 0 5px rgba(226, 226, 236, 0.5);
	}

	.vapor-search input:focus {
		border-color: #ff8ca6;
		background: rgba(112, 112, 218, 0.2);
		box-shadow: 0 0 15px rgba(255, 140, 166, 0.3);
	}

	.vapor-search input::placeholder {
		color: #8282c3;
	}

	.content {
		flex: 1;
		padding: 40px 60px;
		overflow-y: auto;
		position: relative;
		z-index: 10;
	}

	.content::-webkit-scrollbar { width: 8px; }
	.content::-webkit-scrollbar-track { background: rgba(18, 18, 28, 0.8); }
	.content::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #7070da, #ff8ca6); border-radius: 0; }

	.vapor-list {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.vapor-card {
		position: relative;
		padding: 16px 24px;
		display: flex;
		align-items: center;
		gap: 24px;
		background: rgba(30, 30, 45, 0.7);
		border: 1px solid #567dd4;
		cursor: pointer;
		text-align: left;
		transition: transform 0.2s;
	}

	.vapor-card:hover {
		transform: translateX(10px);
	}

	.card-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgba(112, 112, 218, 0.2), transparent);
		opacity: 0;
		transition: opacity 0.3s;
	}

	.vapor-card:hover .card-bg {
		opacity: 1;
	}

	.avatar-box {
		width: 64px;
		height: 64px;
		border: 2px solid #ff8ca6;
		position: relative;
	}

	.avatar-box img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: contrast(1.2) saturate(1.2) hue-rotate(90deg);
	}

	.glitch-layer {
		position: absolute;
		inset: 0;
		background: inherit;
		mix-blend-mode: color-dodge;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.vapor-card:hover .glitch-layer {
		opacity: 1;
		animation: glitch 0.2s infinite;
	}

	@keyframes glitch {
		0% { transform: translate(2px, 2px); }
		25% { transform: translate(-2px, -2px); }
		50% { transform: translate(2px, -2px); }
		75% { transform: translate(-2px, 2px); }
		100% { transform: translate(0); }
	}

	.user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 1;
	}

	.name {
		font-size: 20px;
		font-weight: 700;
		color: #E2E2EC;
		text-shadow: 2px 2px 0px rgba(112, 112, 218, 0.8);
	}

	.username {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: #ff8ca6;
	}

	.note {
		font-size: 12px;
		color: #8282c3;
		letter-spacing: 2px;
	}

	.status-zone {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		z-index: 1;
	}

	.status-indicator {
		width: 16px;
		height: 16px;
		border: 2px solid #12121C;
		box-shadow: 0 0 10px currentColor;
	}

	.status-indicator.available { background: #34d399; color: #34d399; }
	.status-indicator.busy { background: #ff8ca6; color: #ff8ca6; }
	.status-indicator.dnd { background: #ff8ca6; color: #ff8ca6; }
	.status-indicator.afk { background: #567dd4; color: #567dd4; }

	.last-seen {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: #567dd4;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 30px;
	}

	.sun {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		background: linear-gradient(180deg, #ff8ca6 0%, #7070da 100%);
		box-shadow: 0 0 50px rgba(255, 140, 166, 0.5);
		position: relative;
		overflow: hidden;
	}

	.sun::after {
		content: '';
		position: absolute;
		bottom: 0; left: 0; right: 0; height: 50%;
		background: repeating-linear-gradient(180deg, transparent, transparent 4px, #1a1a3a 4px, #1a1a3a 8px);
	}

	.vapor-p {
		font-size: 24px;
		letter-spacing: 8px;
		color: #E2E2EC;
		text-shadow: 0 0 10px #7070da;
	}
</style>
