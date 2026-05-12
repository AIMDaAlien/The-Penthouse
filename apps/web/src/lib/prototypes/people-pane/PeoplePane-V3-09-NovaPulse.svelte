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
			case 'busy': return '#f87171';
			case 'dnd': return '#f87171';
			case 'afk': return '#fbbf24';
			case 'offline': return '#94a3b8';
			default: return '#94a3b8';
		}
	}
</script>

<div class="pane-container v3-variant-9">
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
  .pane-container { 
    --bg-grad-1: #f8f8fc; 
    --bg-grad-2: #f0f0f9; 
    --text-main: #2f2f3e; 
    --text-muted: #6b6b8e; 
    --glass-bg: rgba(255, 255, 255, 0.6); 
    --glass-border: rgba(133, 133, 241, 0.3); 
    --glass-shadow: rgba(133, 133, 241, 0.05); 
    --accent-primary: #8585F1; 
    --accent-secondary: #A5A5E9;
    --accent-glow: rgba(133, 133, 241, 0.25); 
    --search-bg: rgba(255, 255, 255, 0.8); 
    --search-focus: rgba(255, 255, 255, 1); 
    --br: 38px; 
  }
	@media (prefers-color-scheme: dark) { 
    .pane-container { 
      --bg-grad-1: #12121C; 
      --bg-grad-2: #161623; 
      --text-main: #e2e2ec; 
      --text-muted: #8c8cc5; 
      --glass-bg: rgba(30, 30, 45, 0.4); 
      --glass-border: rgba(133, 133, 241, 0.15); 
      --glass-shadow: rgba(0, 0, 0, 0.3); 
      --search-bg: rgba(20, 20, 30, 0.6); 
      --search-focus: rgba(30, 30, 45, 0.8); 
    } 
  }

	.pane-container {
		width: 100%; height: 100%;
		background: linear-gradient(225deg, var(--bg-grad-1) 0%, var(--bg-grad-2) 100%);
		color: var(--text-main); font-family: var(--font-sans, 'Ubuntu', sans-serif);
		display: flex; flex-direction: column; position: relative; overflow: hidden;
		transition: background 0.5s ease, color 0.5s ease;
	}

	.glass-header {
		padding: 32px 40px; background: var(--glass-bg);
		backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
		border-bottom: 1px solid var(--glass-border);
		z-index: 10; display: flex; flex-direction: column; gap: 20px;
		transition: background 0.5s ease, border-color 0.5s ease;
	}

	.glass-header h2 {
		margin: 0; font-size: 28px; font-weight: 500; letter-spacing: -0.5px;
		color: var(--text-main); text-shadow: 0 0 20px var(--accent-glow);
	}

	.search-bar { position: relative; display: flex; align-items: center; }
	.search-bar svg { position: absolute; left: 16px; color: var(--text-muted); transition: color 0.3s ease; }
	.search-bar input {
		width: 100%; padding: 14px 16px 14px 48px;
		background: var(--search-bg); border: 1px solid var(--glass-border);
		border-radius: 9999px; color: var(--text-main); font-size: 15px; font-family: inherit;
		outline: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
	}
	.search-bar input::placeholder { color: var(--text-muted); opacity: 0.7; }
	.search-bar input:focus {
		background: var(--search-focus); border-color: var(--accent-primary);
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.02), 0 0 20px var(--accent-glow);
	}

	.content { flex: 1; overflow-y: auto; padding: 40px; z-index: 5; }
	.content::-webkit-scrollbar { width: 6px; }
	.content::-webkit-scrollbar-track { background: transparent; }
	.content::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }

	.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; }

	.glass-panel {
		background: rgba(133, 133, 241, 0.05); border: 1px solid rgba(133, 133, 241, 0.2);
    backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
		border-radius: var(--br);
		padding: 20px; display: flex; align-items: center; gap: 16px;
		cursor: pointer; text-align: left;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: var(--glass-shadow); position: relative; overflow: hidden;
	}

	.glass-panel::before {
		content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
		background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
		opacity: 0; transition: opacity 0.4s ease; pointer-events: none;
	}

	.glass-panel:hover {
		transform: translateY(-4px) scale(1.02);
		border-color: var(--accent-primary);
		box-shadow: 0 16px 40px rgba(133,133,241,0.15), 0 0 24px var(--accent-glow);
	}

	.glass-panel:hover::before { opacity: 1; }

	.avatar-container { position: relative; width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; }
	.avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--glass-bg); }

	.presence-ring {
		position: absolute; inset: -3px; border-radius: 50%;
		border: 2px solid var(--ring-color); opacity: 0; transform: scale(0.9);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.glass-panel:hover .presence-ring {
		opacity: 1; transform: scale(1);
		box-shadow: 0 0 12px var(--ring-color);
	}

	.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
	.name { font-weight: 500; font-size: 16px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.3s ease; }
	.username { font-size: 13px; color: var(--accent-primary); opacity: 0.9; }
	.note { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; }

	.meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
	.status-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
	.last-seen { font-size: 11px; color: var(--text-muted); }

	.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 24px; color: var(--text-muted); }
	.glass-orb {
		width: 120px; height: 120px; border-radius: 50%;
		background: radial-gradient(circle at 30% 30%, var(--glass-border), transparent);
		box-shadow: inset 0 0 20px var(--accent-glow), 0 0 50px var(--accent-glow);
		animation: float-orb 4s ease-in-out infinite; backdrop-filter: blur(10px);
	}
	@keyframes float-orb { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
</style>