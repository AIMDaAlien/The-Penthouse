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

	function getPresenceBadge(status: string) {
		switch(status) {
			case 'available': return { color: '#12121C', bg: '#34d399', text: 'AVL' };
			case 'busy': return { color: '#12121C', bg: '#ff8ca6', text: 'BSY' };
			case 'dnd': return { color: '#12121C', bg: '#ff8ca6', text: 'DND' };
			case 'afk': return { color: '#12121C', bg: '#567dd4', text: 'AFK' };
			case 'offline': return { color: '#12121C', bg: '#646478', text: 'OFF' };
			default: return { color: '#12121C', bg: '#646478', text: 'UNK' };
		}
	}
</script>

<div class="pane-container">
	<div class="header-block">
		<h2 class="title-huge">PEOPLE</h2>
		<div class="brutal-search">
			<input type="text" placeholder="QUERY DIRECTORY..." bind:value={searchQuery} />
		</div>
	</div>

	<div class="content-block">
		{#if filteredUsers.length === 0}
			<div class="empty-block">
				<span>[ NO MATCHES ]</span>
			</div>
		{:else}
			<div class="brutal-list">
				{#each filteredUsers as user (user.id)}
					<button class="brutal-card" aria-label="Start DM with {user.name}">
						<div class="card-left">
							<div class="avatar-wrap">
								<img src={user.avatar} alt="{user.name}" />
							</div>
							<div class="user-details">
								<span class="brutal-name">{user.name.toUpperCase()}</span>
								<span class="brutal-username">{user.username}</span>
							</div>
						</div>
						
						<div class="card-right">
							{#if user.note}
								<div class="brutal-note">"{user.note.toUpperCase()}"</div>
							{/if}
							<div class="badge" style="background: {getPresenceBadge(user.presence).bg}; color: {getPresenceBadge(user.presence).color};">
								{getPresenceBadge(user.presence).text}
							</div>
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
		background-color: #12121C;
		color: #E2E2EC;
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		border: 4px solid #7070da;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 12px 12px 0px #252538;
	}

	.header-block {
		background: #7070da;
		color: #12121C;
		padding: 40px;
		border-bottom: 4px solid #252538;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.title-huge {
		margin: 0;
		font-size: 56px;
		font-weight: 700;
		letter-spacing: -2px;
		line-height: 1;
	}

	.brutal-search input {
		width: 100%;
		padding: 20px 24px;
		background: #12121C;
		border: 4px solid #12121C;
		border-radius: 9999px;
		color: #E2E2EC;
		font-size: 20px;
		font-weight: 700;
		text-transform: uppercase;
		font-family: inherit;
		outline: none;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.brutal-search input:focus {
		transform: translate(-4px, -4px);
		box-shadow: 8px 8px 0px #252538;
	}

	.brutal-search input::placeholder {
		color: #567dd4;
	}

	.content-block {
		flex: 1;
		background: #1E1E2D;
		padding: 32px;
		overflow-y: auto;
	}
	
	.content-block::-webkit-scrollbar { width: 12px; }
	.content-block::-webkit-scrollbar-track { background: #12121C; }
	.content-block::-webkit-scrollbar-thumb { background: #567dd4; border-radius: 12px; border: 3px solid #12121C; }

	.brutal-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.brutal-card {
		background: #252538;
		border: 4px solid #12121C;
		border-radius: 9999px; /* Pill shape */
		padding: 12px 24px 12px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
	}

	.brutal-card:hover {
		background: #8282c3;
		transform: translate(-4px, -4px);
		box-shadow: 8px 8px 0px #12121C;
	}

	.card-left {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.avatar-wrap {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		border: 4px solid #12121C;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.brutal-name {
		font-size: 24px;
		font-weight: 700;
		color: #E2E2EC;
		letter-spacing: -1px;
	}

	.brutal-card:hover .brutal-name {
		color: #12121C;
	}

	.brutal-username {
		font-size: 16px;
		color: #7070da;
		font-weight: 700;
	}

	.brutal-card:hover .brutal-username {
		color: #12121C;
		opacity: 0.8;
	}

	.card-right {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.brutal-note {
		font-size: 14px;
		font-weight: 500;
		color: #8C8CC5;
		background: #12121C;
		padding: 8px 16px;
		border-radius: 9999px;
	}

	.badge {
		font-weight: 700;
		font-size: 14px;
		padding: 8px 16px;
		border-radius: 9999px;
		border: 2px solid #12121C;
	}

	.empty-block {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 40px;
		font-weight: 700;
		color: #567dd4;
		letter-spacing: -2px;
	}
</style>
