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
	<header class="swiss-header">
		<div class="title-area">
			<h1 class="huge-title">PEOPLE</h1>
			<span class="count">0{filteredUsers.length}</span>
		</div>
		
		<div class="search-area">
			<input type="text" placeholder="Search directory" bind:value={searchQuery} />
		</div>
	</header>

	<div class="content-grid">
		<div class="grid-header">
			<span>IDENTIFIER</span>
			<span>STATUS</span>
			<span>LAST ACTIVE</span>
		</div>

		<div class="list-container">
			{#if filteredUsers.length === 0}
				<div class="empty">No entries found.</div>
			{:else}
				{#each filteredUsers as user (user.id)}
					<button class="swiss-row" aria-label="Open {user.name}">
						<div class="col-id">
							<img src={user.avatar} alt="{user.name}" class="avatar" />
							<div class="name-block">
								<span class="name">{user.name}</span>
								<span class="username">{user.username}</span>
							</div>
						</div>
						
						<div class="col-status">
							<div class="status-indicator {user.presence}"></div>
							<span class="status-text">{user.presence}</span>
							{#if user.note}
								<span class="note">— {user.note}</span>
							{/if}
						</div>
						
						<div class="col-time">
							{user.lastSeen}
						</div>
						
						<div class="hover-arrow">→</div>
					</button>
				{/each}
			{/if}
		</div>
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
		display: flex;
		flex-direction: column;
		border-radius: 24px;
		overflow: hidden;
	}

	.swiss-header {
		padding: 48px;
		border-bottom: 2px solid #7070da;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background: #1E1E2D;
	}

	.title-area {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.huge-title {
		margin: 0;
		font-size: 72px;
		font-weight: 700;
		line-height: 0.8;
		letter-spacing: -3px;
		color: #E2E2EC;
	}

	.count {
		font-size: 24px;
		font-weight: 500;
		color: #7070da;
	}

	.search-area {
		width: 320px;
	}

	.search-area input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 2px solid #567dd4;
		padding: 8px 0;
		color: #E2E2EC;
		font-size: 20px;
		font-weight: 500;
		font-family: inherit;
		outline: none;
		transition: border-color 0.3s ease;
	}

	.search-area input:focus {
		border-bottom-color: #7070da;
	}

	.content-grid {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #12121C;
	}

	.grid-header {
		display: grid;
		grid-template-columns: 2fr 2fr 1fr 40px;
		padding: 24px 48px 16px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 1px;
		color: #8282c3;
		border-bottom: 1px solid rgba(130, 130, 195, 0.2);
	}

	.list-container {
		flex: 1;
		overflow-y: auto;
	}

	.list-container::-webkit-scrollbar { width: 0px; }

	.swiss-row {
		display: grid;
		grid-template-columns: 2fr 2fr 1fr 40px;
		padding: 32px 48px;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(130, 130, 195, 0.1);
		width: 100%;
		text-align: left;
		cursor: pointer;
		align-items: center;
		transition: background 0.2s ease;
	}

	.swiss-row:hover {
		background: #1E1E2D;
	}

	.col-id {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		object-fit: cover;
		filter: grayscale(100%);
		transition: filter 0.3s ease;
	}

	.swiss-row:hover .avatar {
		filter: grayscale(0%);
	}

	.name-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.name {
		font-size: 24px;
		font-weight: 500;
		color: #E2E2EC;
		letter-spacing: -0.5px;
	}

	.username {
		font-size: 14px;
		color: #7070da;
	}

	.col-status {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.status-indicator {
		width: 16px;
		height: 16px;
		background: #646478;
	}

	.status-indicator.available { background: #34d399; }
	.status-indicator.busy { background: #ff8ca6; }
	.status-indicator.dnd { background: #ff8ca6; }
	.status-indicator.afk { background: #567dd4; }

	.status-text {
		font-size: 16px;
		font-weight: 500;
		text-transform: uppercase;
		color: #E2E2EC;
	}

	.note {
		font-size: 14px;
		color: #8C8CC5;
	}

	.col-time {
		font-size: 16px;
		color: #8C8CC5;
	}

	.hover-arrow {
		font-size: 24px;
		color: #7070da;
		opacity: 0;
		transform: translateX(-10px);
		transition: all 0.3s ease;
	}

	.swiss-row:hover .hover-arrow {
		opacity: 1;
		transform: translateX(0);
	}

	.empty {
		padding: 48px;
		font-size: 24px;
		color: #646478;
	}
</style>
