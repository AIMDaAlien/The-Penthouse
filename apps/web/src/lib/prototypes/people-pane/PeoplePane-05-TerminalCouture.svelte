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

	function getStatusIcon(status: string) {
		switch(status) {
			case 'available': return '[+]';
			case 'busy': return '[-]';
			case 'dnd': return '[x]';
			case 'afk': return '[?]';
			case 'offline': return '[ ]';
			default: return '[ ]';
		}
	}
</script>

<div class="pane-container">
	<div class="terminal-shell">
		<header class="term-header">
			<span class="prompt">root@penthouse:~#</span> ./query_directory.sh
		</header>
		
		<div class="search-input">
			<span class="prompt-arrow">&gt;</span>
			<input type="text" placeholder="ENTER SEARCH QUERY_" bind:value={searchQuery} spellcheck="false" />
			<span class="cursor"></span>
		</div>

		<div class="term-divider">
			+------------------------------------------------------------------------------+
		</div>

		<div class="term-content">
			{#if filteredUsers.length === 0}
				<div class="empty-res">
					> 0 RECORDS FOUND.<br>
					> EOF
				</div>
			{:else}
				<table class="term-table">
					<thead>
						<tr>
							<th>STAT</th>
							<th>ID_USER</th>
							<th>HANDLE</th>
							<th>CURRENT_PROC</th>
							<th>LAST_PING</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredUsers as user (user.id)}
							<tr class="term-row {user.presence}">
								<td class="col-stat">{getStatusIcon(user.presence)}</td>
								<td class="col-name">{user.name.toUpperCase()}</td>
								<td class="col-handle">{user.username}</td>
								<td class="col-note">{user.note ? `"${user.note}"` : '--'}</td>
								<td class="col-ping">{user.lastSeen.toUpperCase()}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
		
		<div class="term-footer">
			> SYSTEM READY. {filteredUsers.length} NODES ONLINE.
		</div>
	</div>
</div>

<style>
	:root {
		--font-mono: 'JetBrains Mono', monospace;
	}
	.pane-container {
		width: 100%;
		height: 100%;
		max-width: 860px;
		height: 760px;
		background-color: #12121C;
		padding: 24px;
	}

	.terminal-shell {
		width: 100%;
		height: 100%;
		background-color: #0b0b14;
		border: 1px solid #567dd4;
		border-radius: 8px;
		padding: 24px;
		font-family: var(--font-mono);
		color: #8282c3;
		display: flex;
		flex-direction: column;
		box-shadow: inset 0 0 20px rgba(112, 112, 218, 0.1);
		position: relative;
	}

	.terminal-shell::before {
		content: '';
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.1),
			rgba(0, 0, 0, 0.1) 1px,
			transparent 1px,
			transparent 2px
		);
		pointer-events: none;
	}

	.term-header {
		font-size: 14px;
		margin-bottom: 24px;
		color: #E2E2EC;
	}

	.prompt {
		color: #7070da;
		font-weight: bold;
	}

	.search-input {
		display: flex;
		align-items: center;
		margin-bottom: 16px;
		font-size: 16px;
		color: #E2E2EC;
		position: relative;
	}

	.prompt-arrow {
		color: #567dd4;
		margin-right: 12px;
	}

	.search-input input {
		background: transparent;
		border: none;
		color: #E2E2EC;
		font-family: inherit;
		font-size: inherit;
		outline: none;
		width: 300px;
	}

	.search-input input::placeholder {
		color: #567dd4;
		opacity: 0.5;
	}

	.term-divider {
		color: #567dd4;
		white-space: pre;
		margin-bottom: 24px;
		overflow: hidden;
	}

	.term-content {
		flex: 1;
		overflow-y: auto;
	}
	
	.term-content::-webkit-scrollbar { width: 8px; }
	.term-content::-webkit-scrollbar-track { background: #0b0b14; border-left: 1px solid #567dd4; }
	.term-content::-webkit-scrollbar-thumb { background: #567dd4; }

	.empty-res {
		color: #ff8ca6;
		font-size: 14px;
		line-height: 1.5;
	}

	.term-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		text-align: left;
	}

	.term-table th {
		color: #7070da;
		padding-bottom: 16px;
		font-weight: normal;
		border-bottom: 1px dashed #567dd4;
	}

	.term-table td {
		padding: 12px 0;
		border-bottom: 1px dotted rgba(86, 125, 212, 0.3);
	}

	.term-row {
		cursor: pointer;
		transition: background 0.1s;
	}

	.term-row:hover {
		background: rgba(112, 112, 218, 0.1);
	}

	.col-stat { width: 60px; color: #567dd4; }
	.col-name { color: #E2E2EC; padding-right: 16px; }
	.col-handle { color: #7070da; }
	.col-note { color: #8C8CC5; font-style: italic; }
	.col-ping { color: #646478; text-align: right; padding-right: 16px; }

	.term-row.available .col-stat { color: #34d399; }
	.term-row.busy .col-stat { color: #ff8ca6; }
	.term-row.dnd .col-stat { color: #ff8ca6; }
	.term-row.offline .col-stat, .term-row.offline .col-name { color: #646478; }

	.term-footer {
		margin-top: 24px;
		padding-top: 16px;
		border-top: 1px solid #567dd4;
		font-size: 12px;
		color: #567dd4;
		animation: blink-text 2s infinite;
	}

	@keyframes blink-text {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>
