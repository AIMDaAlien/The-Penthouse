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

	function getPresenceColor(status: string) {
		switch(status) {
			case 'available': return '#34d399';
			case 'busy': return '#ff8ca6';
			case 'dnd': return '#ff8ca6';
			case 'afk': return '#567dd4';
			case 'offline': return '#646478';
			default: return '#646478';
		}
	}
</script>

<div class="pane-container">
	<header class="glass-header">
		<h2>People</h2>
		<div class="search-bar">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
			<input type="text" placeholder="Search by name or username..." bind:value={searchQuery} />
		</div>
	</header>

	<div class="content">
		{#if filteredUsers.length === 0}
			<div class="empty-state">
				<div class="glass-orb"></div>
				<p>No connections found in the void.</p>
			</div>
		{:else}
			<div class="user-grid">
				{#each filteredUsers as user (user.id)}
					<button class="user-card glass-panel" aria-label="Start DM with {user.name}">
						<div class="avatar-container">
							<img src={user.avatar} alt="{user.name}'s avatar" class="avatar" />
							<div class="presence-ring" style="--ring-color: {getPresenceColor(user.presence)}"></div>
						</div>
						<div class="user-info">
							<span class="name">{user.name}</span>
							<span class="username">{user.username}</span>
							{#if user.note}
								<span class="note">{user.note}</span>
							{/if}
						</div>
						<div class="meta">
							<span class="status-dot" style="background: {getPresenceColor(user.presence)}"></span>
							<span class="last-seen">{user.lastSeen}</span>
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
		background: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #12121C 70%);
		color: #E2E2EC;
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		border-radius: 24px;
		box-shadow: inset 0 0 100px rgba(112, 112, 218, 0.05);
	}

	.pane-container::before {
		content: '';
		position: absolute;
		top: -50%; left: -50%; width: 200%; height: 200%;
		background: radial-gradient(circle, rgba(112, 112, 218, 0.1) 0%, transparent 40%);
		animation: pulse-void 15s infinite alternate linear;
		pointer-events: none;
	}

	@keyframes pulse-void {
		0% { transform: scale(1) translate(0, 0); }
		100% { transform: scale(1.1) translate(5%, 5%); }
	}

	.glass-header {
		padding: 32px 40px;
		background: rgba(30, 30, 45, 0.4);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(130, 130, 195, 0.2);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.glass-header h2 {
		margin: 0;
		font-size: 28px;
		font-weight: 300;
		letter-spacing: -0.5px;
		color: #E2E2EC;
		text-shadow: 0 0 20px rgba(112,112,218,0.4);
	}

	.search-bar {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-bar svg {
		position: absolute;
		left: 16px;
		color: #8C8CC5;
	}

	.search-bar input {
		width: 100%;
		padding: 16px 16px 16px 48px;
		background: rgba(37, 37, 56, 0.3);
		border: 1px solid rgba(130, 130, 195, 0.3);
		border-radius: 9999px;
		color: #E2E2EC;
		font-size: 16px;
		font-family: inherit;
		outline: none;
		transition: all 0.3s ease;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
	}

	.search-bar input:focus {
		background: rgba(37, 37, 56, 0.6);
		border-color: #7070da;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.2), 0 0 20px rgba(112, 112, 218, 0.2);
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 40px;
		z-index: 5;
	}
	
	.content::-webkit-scrollbar { width: 8px; }
	.content::-webkit-scrollbar-track { background: transparent; }
	.content::-webkit-scrollbar-thumb { background: rgba(130, 130, 195, 0.2); border-radius: 10px; }

	.user-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 24px;
	}

	.glass-panel {
		background: rgba(30, 30, 45, 0.3);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(130, 130, 195, 0.15);
		border-radius: 20px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		cursor: pointer;
		text-align: left;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		position: relative;
		overflow: hidden;
	}

	.glass-panel::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.glass-panel:hover {
		transform: translateY(-4px) scale(1.02);
		border-color: rgba(112, 112, 218, 0.5);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(112, 112, 218, 0.15);
	}

	.glass-panel:hover::before {
		opacity: 1;
	}

	.avatar-container {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.presence-ring {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid var(--ring-color);
		opacity: 0.5;
		transition: all 0.3s ease;
	}

	.glass-panel:hover .presence-ring {
		inset: -2px;
		opacity: 1;
		box-shadow: 0 0 10px var(--ring-color);
	}

	.user-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.name {
		font-weight: 500;
		font-size: 16px;
		color: #E2E2EC;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.username {
		font-size: 13px;
		color: #567dd4;
	}

	.note {
		font-size: 12px;
		color: #8C8CC5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-style: italic;
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		flex-shrink: 0;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		box-shadow: 0 0 8px currentColor;
	}

	.last-seen {
		font-size: 11px;
		color: #646478;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 24px;
		color: #8C8CC5;
	}

	.glass-orb {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, rgba(130, 130, 195, 0.4), transparent);
		box-shadow: inset 0 0 20px rgba(112, 112, 218, 0.5), 0 0 50px rgba(112, 112, 218, 0.2);
		animation: float-orb 4s ease-in-out infinite;
		backdrop-filter: blur(10px);
	}

	@keyframes float-orb {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-20px); }
	}
</style>
