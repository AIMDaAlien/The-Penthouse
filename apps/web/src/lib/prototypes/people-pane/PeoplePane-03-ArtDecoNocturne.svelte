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
	<div class="deco-frame">
		<header class="deco-header">
			<div class="ornament-line"></div>
			<h2 class="deco-title">DIRECTORY</h2>
			<div class="ornament-line"></div>
		</header>

		<div class="search-wrap">
			<div class="diamond-icon"></div>
			<input type="text" placeholder="Search the archives..." bind:value={searchQuery} />
			<div class="diamond-icon"></div>
		</div>

		<div class="content">
			{#if filteredUsers.length === 0}
				<div class="empty-state">
					<div class="deco-emblem"></div>
					<p>No records found.</p>
				</div>
			{:else}
				<div class="deco-list">
					{#each filteredUsers as user (user.id)}
						<button class="deco-card" aria-label="Start DM with {user.name}">
							<div class="card-borders"></div>
							
							<div class="card-inner">
								<div class="avatar-frame">
									<img src={user.avatar} alt="{user.name}" />
								</div>
								
								<div class="user-meta">
									<span class="name">{user.name}</span>
									<span class="username">{user.username}</span>
									{#if user.note}
										<span class="note">✦ {user.note}</span>
									{/if}
								</div>

								<div class="presence-indicator" data-status={user.presence}>
									<span class="status-text">{user.presence.toUpperCase()}</span>
									<div class="status-gem"></div>
								</div>
							</div>
						</button>
					{/each}
				</div>
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
		background-color: #0b0b14;
		color: #E2E2EC;
		font-family: var(--font-sans);
		padding: 24px;
	}

	.deco-frame {
		height: 100%;
		border: 2px solid #567dd4;
		border-radius: 4px; /* minimal rounding for art deco */
		padding: 32px;
		display: flex;
		flex-direction: column;
		position: relative;
		background: linear-gradient(180deg, #12121C 0%, #1a1a2e 100%);
	}

	.deco-frame::before {
		content: '';
		position: absolute;
		top: 8px; left: 8px; right: 8px; bottom: 8px;
		border: 1px solid rgba(112, 112, 218, 0.3);
		pointer-events: none;
	}

	.deco-header {
		display: flex;
		align-items: center;
		gap: 24px;
		margin-bottom: 32px;
	}

	.ornament-line {
		flex: 1;
		height: 2px;
		background: linear-gradient(90deg, transparent, #7070da, transparent);
		position: relative;
	}

	.ornament-line::after {
		content: '';
		position: absolute;
		top: -4px; left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 10px; height: 10px;
		border: 1px solid #7070da;
		background: #12121C;
	}

	.deco-title {
		margin: 0;
		font-size: 24px;
		letter-spacing: 6px;
		font-weight: 300;
		color: #8282c3;
		text-transform: uppercase;
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 40px;
		padding: 0 40px;
	}

	.diamond-icon {
		width: 12px; height: 12px;
		background: #567dd4;
		transform: rotate(45deg);
	}

	.search-wrap input {
		flex: 1;
		background: transparent;
		border: none;
		border-bottom: 2px solid #567dd4;
		padding: 12px 0;
		color: #E2E2EC;
		font-size: 18px;
		text-align: center;
		letter-spacing: 2px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.3s;
	}

	.search-wrap input:focus {
		border-bottom-color: #7070da;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding-right: 16px;
	}
	
	.content::-webkit-scrollbar { width: 4px; }
	.content::-webkit-scrollbar-track { background: transparent; }
	.content::-webkit-scrollbar-thumb { background: #567dd4; }

	.deco-list {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.deco-card {
		position: relative;
		background: #1E1E2D;
		padding: 2px;
		cursor: pointer;
		text-align: left;
		transition: transform 0.3s ease;
	}

	.deco-card:hover {
		transform: translateY(-2px);
	}

	.card-borders {
		position: absolute;
		inset: 0;
		border: 1px solid #567dd4;
		opacity: 0.5;
		transition: opacity 0.3s ease;
	}

	.card-borders::before, .card-borders::after {
		content: '';
		position: absolute;
		width: 16px; height: 16px;
		border: 1px solid #7070da;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.card-borders::before { top: -4px; left: -4px; border-right: none; border-bottom: none; }
	.card-borders::after { bottom: -4px; right: -4px; border-left: none; border-top: none; }

	.deco-card:hover .card-borders { opacity: 1; }
	.deco-card:hover .card-borders::before, .deco-card:hover .card-borders::after { opacity: 1; }

	.card-inner {
		background: #12121C;
		padding: 20px 32px;
		display: flex;
		align-items: center;
		gap: 32px;
		position: relative;
		z-index: 1;
	}

	.avatar-frame {
		width: 60px; height: 60px;
		border-radius: 50%;
		border: 2px solid #7070da;
		padding: 4px;
		position: relative;
	}

	.avatar-frame::before {
		content: '';
		position: absolute;
		inset: -8px;
		border: 1px dashed rgba(130, 130, 195, 0.4);
		border-radius: 50%;
		animation: spin 20s linear infinite;
	}

	@keyframes spin { 100% { transform: rotate(360deg); } }

	.avatar-frame img {
		width: 100%; height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.name {
		font-size: 20px;
		font-weight: 300;
		letter-spacing: 2px;
		color: #E2E2EC;
	}

	.username {
		font-size: 12px;
		color: #8282c3;
		letter-spacing: 1px;
	}

	.note {
		font-size: 13px;
		color: #567dd4;
		font-style: italic;
		margin-top: 4px;
	}

	.presence-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.status-text {
		font-size: 10px;
		letter-spacing: 2px;
		color: #8C8CC5;
	}

	.status-gem {
		width: 16px; height: 16px;
		transform: rotate(45deg);
		background: #646478;
		border: 1px solid rgba(255,255,255,0.2);
	}

	.presence-indicator[data-status="available"] .status-gem { background: #34d399; box-shadow: 0 0 15px rgba(52, 211, 153, 0.4); }
	.presence-indicator[data-status="busy"] .status-gem { background: #ff8ca6; box-shadow: 0 0 15px rgba(255, 140, 166, 0.4); }
	.presence-indicator[data-status="dnd"] .status-gem { background: #ff8ca6; }
	.presence-indicator[data-status="afk"] .status-gem { background: #567dd4; }

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 24px;
		color: #8C8CC5;
		letter-spacing: 2px;
	}

	.deco-emblem {
		width: 80px; height: 80px;
		border: 2px solid #567dd4;
		transform: rotate(45deg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.deco-emblem::after {
		content: '';
		width: 60px; height: 60px;
		border: 1px solid #7070da;
	}
</style>
