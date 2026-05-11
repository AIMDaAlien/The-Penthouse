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
	<div class="blob-bg blob-1"></div>
	<div class="blob-bg blob-2"></div>
	<div class="blob-bg blob-3"></div>

	<header class="blob-header">
		<h2>Directory</h2>
		<div class="search-blob">
			<input type="text" placeholder="Search the fluid..." bind:value={searchQuery} />
		</div>
	</header>

	<div class="content">
		{#if filteredUsers.length === 0}
			<div class="empty-state">
				<div class="empty-blob"></div>
				<p>Nothing floats here.</p>
			</div>
		{:else}
			<div class="blob-list">
				{#each filteredUsers as user (user.id)}
					<button class="user-blob" aria-label="Start DM with {user.name}">
						<div class="avatar-blob">
							<img src={user.avatar} alt="{user.name}" />
						</div>
						
						<div class="info-flow">
							<span class="name">{user.name}</span>
							<span class="username">{user.username}</span>
							{#if user.note}
								<span class="note">{user.note}</span>
							{/if}
						</div>
						
						<div class="status-fluid">
							<div class="status-blob {user.presence}"></div>
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
		background-color: #12121C;
		color: #E2E2EC;
		font-family: var(--font-sans);
		border-radius: 40px;
		overflow: hidden;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.blob-bg {
		position: absolute;
		filter: blur(60px);
		z-index: 0;
		opacity: 0.4;
		border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
		animation: morph 15s infinite ease-in-out;
	}

	.blob-1 { top: -100px; left: -100px; width: 400px; height: 400px; background: #7070da; animation-delay: 0s; }
	.blob-2 { bottom: -150px; right: -50px; width: 500px; height: 500px; background: #567dd4; animation-delay: -5s; }
	.blob-3 { top: 30%; left: 40%; width: 300px; height: 300px; background: #8282c3; animation-delay: -10s; opacity: 0.2; }

	@keyframes morph {
		0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(0deg) scale(1); }
		33% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: rotate(120deg) scale(1.1); }
		66% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: rotate(240deg) scale(0.9); }
		100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(360deg) scale(1); }
	}

	.blob-header {
		padding: 40px;
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.blob-header h2 {
		margin: 0;
		font-size: 32px;
		font-weight: 400;
		color: #E2E2EC;
	}

	.search-blob input {
		width: 100%;
		background: rgba(30, 30, 45, 0.5);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(130, 130, 195, 0.2);
		padding: 20px 30px;
		color: #E2E2EC;
		font-size: 18px;
		font-family: inherit;
		outline: none;
		border-radius: 50px 30px 40px 60px / 40px 60px 30px 50px;
		transition: all 0.4s ease;
	}

	.search-blob input:focus {
		background: rgba(112, 112, 218, 0.2);
		border-color: #7070da;
		border-radius: 30px 50px 60px 40px / 50px 30px 60px 40px;
	}

	.content {
		flex: 1;
		padding: 0 40px 40px;
		overflow-y: auto;
		position: relative;
		z-index: 10;
	}

	.content::-webkit-scrollbar { width: 0px; }

	.blob-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.user-blob {
		background: rgba(30, 30, 45, 0.6);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(130, 130, 195, 0.1);
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 24px;
		cursor: pointer;
		text-align: left;
		border-radius: 60px 30px 50px 40px / 40px 50px 30px 60px;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.user-blob:hover {
		background: rgba(112, 112, 218, 0.2);
		transform: scale(1.02) translateY(-4px);
		border-radius: 30px 60px 40px 50px / 60px 40px 50px 30px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.2);
	}

	.avatar-blob {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
		overflow: hidden;
		border: 2px solid rgba(130, 130, 195, 0.4);
		transition: border-radius 0.4s ease;
	}

	.user-blob:hover .avatar-blob {
		border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%;
	}

	.avatar-blob img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.info-flow {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.name {
		font-size: 18px;
		font-weight: 500;
		color: #E2E2EC;
	}

	.username {
		font-size: 14px;
		color: #8282c3;
	}

	.note {
		font-size: 13px;
		color: #567dd4;
		opacity: 0.8;
	}

	.status-fluid {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.status-blob {
		width: 20px;
		height: 20px;
		border-radius: 40% 60% 50% 50% / 50% 50% 60% 40%;
		background: #646478;
		animation: morph-mini 3s infinite alternate ease-in-out;
	}

	.status-blob.available { background: #34d399; box-shadow: 0 0 10px rgba(52, 211, 153, 0.5); }
	.status-blob.busy { background: #ff8ca6; box-shadow: 0 0 10px rgba(255, 140, 166, 0.5); }
	.status-blob.dnd { background: #ff8ca6; }
	.status-blob.afk { background: #567dd4; box-shadow: 0 0 10px rgba(86, 125, 212, 0.5); }

	@keyframes morph-mini {
		0% { border-radius: 40% 60% 50% 50% / 50% 50% 60% 40%; }
		100% { border-radius: 60% 40% 50% 50% / 40% 60% 50% 50%; }
	}

	.last-seen {
		font-size: 12px;
		color: #8C8CC5;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 20px;
		color: #8282c3;
		font-size: 18px;
	}

	.empty-blob {
		width: 100px;
		height: 100px;
		background: rgba(112, 112, 218, 0.1);
		border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
		animation: morph 5s infinite ease-in-out;
		border: 1px dashed rgba(130, 130, 195, 0.4);
	}
</style>
