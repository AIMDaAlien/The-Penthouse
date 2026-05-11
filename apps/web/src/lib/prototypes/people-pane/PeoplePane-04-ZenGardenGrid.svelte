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
	<div class="zen-layout">
		<aside class="zen-sidebar">
			<h2 class="zen-title">People</h2>
			<div class="search-line">
				<input type="text" placeholder="Find..." bind:value={searchQuery} />
			</div>
			<div class="zen-stats">
				<span class="stat-number">{filteredUsers.length}</span>
				<span class="stat-label">Connections</span>
			</div>
		</aside>

		<main class="zen-main">
			{#if filteredUsers.length === 0}
				<div class="empty-state">
					<div class="zen-circle"></div>
					<p>Emptiness.</p>
				</div>
			{:else}
				<div class="zen-grid">
					{#each filteredUsers as user (user.id)}
						<button class="zen-card" aria-label="Start DM with {user.name}">
							<div class="zen-card-line"></div>
							
							<div class="zen-avatar">
								<img src={user.avatar} alt="{user.name}" />
								<div class="presence-dot {user.presence}"></div>
							</div>
							
							<div class="zen-info">
								<span class="zen-name">{user.name}</span>
								<span class="zen-username">{user.username}</span>
								{#if user.note}
									<span class="zen-note">{user.note}</span>
								{/if}
							</div>
							
							<div class="zen-hover-line"></div>
						</button>
					{/each}
				</div>
			{/if}
		</main>
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
		background-color: #12121C;
		color: #E2E2EC;
		font-family: var(--font-sans);
		border-radius: 12px;
		overflow: hidden;
	}

	.zen-layout {
		display: flex;
		height: 100%;
	}

	.zen-sidebar {
		width: 240px;
		padding: 60px 40px;
		border-right: 1px solid rgba(130, 130, 195, 0.1);
		display: flex;
		flex-direction: column;
		gap: 40px;
	}

	.zen-title {
		margin: 0;
		font-size: 24px;
		font-weight: 300;
		letter-spacing: 1px;
		color: #8282c3;
	}

	.search-line {
		position: relative;
	}

	.search-line input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(130, 130, 195, 0.3);
		padding: 8px 0;
		color: #E2E2EC;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.3s ease;
	}

	.search-line input:focus {
		border-bottom-color: #7070da;
	}

	.search-line input::placeholder {
		color: #646478;
	}

	.zen-stats {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-number {
		font-size: 32px;
		font-weight: 300;
		color: #7070da;
	}

	.stat-label {
		font-size: 12px;
		color: #8C8CC5;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.zen-main {
		flex: 1;
		padding: 60px;
		overflow-y: auto;
	}
	
	.zen-main::-webkit-scrollbar { width: 4px; }
	.zen-main::-webkit-scrollbar-track { background: transparent; }
	.zen-main::-webkit-scrollbar-thumb { background: rgba(130, 130, 195, 0.1); }

	.zen-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 60px 40px;
	}

	.zen-card {
		background: transparent;
		border: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
		cursor: pointer;
		text-align: left;
		position: relative;
	}

	.zen-card-line {
		width: 20px;
		height: 1px;
		background: #567dd4;
		transition: width 0.4s ease;
	}

	.zen-card:hover .zen-card-line {
		width: 100%;
		background: #7070da;
	}

	.zen-avatar {
		width: 80px;
		height: 80px;
		position: relative;
	}

	.zen-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 4px;
		filter: grayscale(100%) contrast(1.2);
		transition: filter 0.5s ease, transform 0.5s ease;
	}

	.zen-card:hover .zen-avatar img {
		filter: grayscale(0%) contrast(1);
		transform: scale(1.05);
	}

	.presence-dot {
		position: absolute;
		bottom: -4px;
		right: -4px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #646478;
		border: 2px solid #12121C;
	}

	.presence-dot.available { background: #34d399; }
	.presence-dot.busy { background: #ff8ca6; }
	.presence-dot.dnd { background: #ff8ca6; }
	.presence-dot.afk { background: #567dd4; }

	.zen-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.zen-name {
		font-size: 16px;
		font-weight: 400;
		color: #E2E2EC;
	}

	.zen-username {
		font-size: 12px;
		color: #8C8CC5;
	}

	.zen-note {
		margin-top: 8px;
		font-size: 12px;
		color: #567dd4;
		opacity: 0;
		transform: translateY(10px);
		transition: all 0.4s ease;
	}

	.zen-card:hover .zen-note {
		opacity: 1;
		transform: translateY(0);
	}

	.zen-hover-line {
		position: absolute;
		left: -20px;
		top: 20px;
		bottom: 0;
		width: 1px;
		background: #7070da;
		transform: scaleY(0);
		transform-origin: top;
		transition: transform 0.4s ease;
	}

	.zen-card:hover .zen-hover-line {
		transform: scaleY(1);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 30px;
		color: #646478;
	}

	.zen-circle {
		width: 100px;
		height: 100px;
		border: 1px solid rgba(130, 130, 195, 0.2);
		border-radius: 50%;
		position: relative;
	}

	.zen-circle::after {
		content: '';
		position: absolute;
		top: 50%; left: -20px; right: -20px;
		height: 1px;
		background: rgba(130, 130, 195, 0.2);
	}
</style>
