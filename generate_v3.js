const fs = require('fs');
const path = require('path');

const chatDir = 'apps/web/src/lib/prototypes/chat-pane';
const settingsDir = 'apps/web/src/lib/prototypes/settings-pane';
const peopleDir = 'apps/web/src/lib/prototypes/people-pane';
const pageFile = 'apps/web/src/routes/prototypes/+page.svelte';

const names = [
  'AuroraGlass', 'NebulaDrift', 'PrismaticCore', 'ZenithGlow', 'EtherealWave',
  'LunarMist', 'CelestiaForm', 'AstralMorph', 'NovaPulse', 'CosmicFroth'
];

function getChatTemplate(index, name) {
  return `<script lang="ts">
  const messages = [
    { id: 1, type: 'system', text: 'Today' },
    { id: 2, type: 'other', sender: 'Aria', text: 'Hey, checking out the new V3 iterations!' },
    { id: 3, type: 'self', text: 'Yes, no blues anymore. How does the frosted glass feel?' },
    { id: 4, type: 'other', sender: 'Aria', text: 'Much softer. I love the micro-interactions.' },
    { id: 5, type: 'self', text: 'Perfect. It should morph smoothly in the background.' }
  ];
</script>

<div class="chat-pane v3-variant-${index}">
  <div class="blobs">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    ${index % 2 === 0 ? `<div class="blob b3"></div>` : ''}
  </div>
  
  <div class="glass-layer">
    <header>
      <div class="avatar">A</div>
      <div class="info">
        <h2>Aria</h2>
        <span>Online</span>
      </div>
      <div class="actions">
        <button>…</button>
      </div>
    </header>
    
    <div class="messages">
      {#each messages as msg (msg.id)}
        {#if msg.type === 'system'}
          <div class="system-msg"><span class="dot"></span>{msg.text}<span class="dot"></span></div>
        {:else}
          <div class="msg-wrapper {msg.type}">
            {#if msg.type === 'other'}
              <div class="msg-avatar">A</div>
            {/if}
            <div class="msg-bubble">
              <p>{msg.text}</p>
              <span class="time">10:42 AM</span>
            </div>
          </div>
        {/if}
      {/each}
    </div>
    
    <div class="composer-container">
      <div class="composer-pill">
        <button class="btn-add">+</button>
        <input type="text" placeholder="Type a message..." />
        <button class="btn-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .chat-pane {
    --bg: #f2f2fa;
    --blob1: #8585F1;
    --blob2: #A5A5E9;
    --blob3: #c2c2f0;
    --glass: rgba(255, 255, 255, 0.4);
    --composer-glass: rgba(255, 255, 255, 0.65);
    --border: rgba(133, 133, 241, 0.2);
    --text: #2f2536;
    --muted: #80728a;
    --accent: #8585F1;
    --accent-light: #A5A5E9;
    --msg-self: rgba(165, 165, 233, 0.25);
    --msg-other: rgba(255, 255, 255, 0.7);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #12121C;
      --blob1: #8585F1;
      --blob2: #A5A5E9;
      --blob3: #6b6be6;
      --glass: rgba(18, 18, 28, 0.4);
      --composer-glass: rgba(30, 30, 45, 0.75);
      --border: rgba(133, 133, 241, 0.15);
      --text: #ece3f2;
      --muted: #9585a1;
      --accent: #8585F1;
      --accent-light: #A5A5E9;
      --msg-self: rgba(133, 133, 241, 0.2);
      --msg-other: rgba(255, 255, 255, 0.05);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(60px); z-index: 0; opacity: 0.6; }
  .blob { position: absolute; border-radius: 50%; }
  .b1 { top: ${10 + index*5}%; left: ${index*10}%; width: 80%; height: 80%; background: var(--blob1); transform: rotate(-15deg); animation: float${index} 15s infinite alternate ease-in-out; }
  .b2 { bottom: -20%; right: -10%; width: 90%; height: 70%; background: var(--blob2); transform: rotate(15deg); animation: float${index} 20s infinite alternate-reverse ease-in-out; opacity: 0.8; }
  .b3 { top: 40%; left: 30%; width: 60%; height: 60%; background: var(--blob3); mix-blend-mode: multiply; animation: float${index} 18s infinite alternate ease-in-out; }

  @keyframes float${index} {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(${20 + index*5}px, ${-30 + index*2}px) scale(1.1); }
  }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(40px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: linear-gradient(var(--glass), transparent); border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; box-shadow: 0 4px 15px rgba(133, 133, 241, 0.3); }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; padding-bottom: 100px; display: flex; flex-direction: column; gap: 20px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .dot { width: 4px; height: 4px; background: var(--muted); border-radius: 50%; animation: pulse 3s infinite ease-in-out; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 14px 18px; border-radius: 24px 24px 24px 8px; background: var(--msg-other); border: 1px solid var(--border); backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); border-radius: 24px 24px 8px 24px; border-color: transparent; }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 6px; display: block; text-align: right; opacity: 0.7; }

  .composer-container { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; display: flex; justify-content: center; pointer-events: none; background: linear-gradient(transparent, var(--bg) 80%); }
  .composer-pill { pointer-events: auto; width: 100%; max-width: 650px; display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 40px; background: var(--composer-glass); border: 1px solid var(--border); box-shadow: 0 15px 35px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.1); backdrop-filter: blur(25px) saturate(150%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s; }
  .composer-pill:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2); }

  .composer-pill input { flex: 1; padding: 12px 16px; border: none; background: transparent; color: var(--text); outline: none; font-size: 15px; }
  .composer-pill input::placeholder { color: var(--muted); }
  
  .btn-add { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(133, 133, 241, 0.1); color: var(--accent); border: none; transition: background 0.2s; font-size: 20px; }
  .btn-add:hover { background: rgba(133, 133, 241, 0.2); }
  
  .btn-send { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--accent); color: white; border: none; transition: transform 0.2s, background 0.2s; box-shadow: 0 4px 12px rgba(133, 133, 241, 0.4); }
  .btn-send:hover { transform: scale(1.05); background: var(--accent-light); }
</style>`;
}

function getSettingsTemplate(index, name) {
  const layouts = [
    'flex-row', 'flex-col', 'grid-2-col', 'masonry'
  ];
  const layout = layouts[index % 4];
  
  let layoutCSS = '';
  if (layout === 'flex-row') layoutCSS = '.layout-container { display: flex; gap: 30px; } .layout-container > * { flex: 1; }';
  else if (layout === 'flex-col') layoutCSS = '.layout-container { display: flex; flex-direction: column; gap: 30px; }';
  else if (layout === 'grid-2-col') layoutCSS = '.layout-container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }';
  else layoutCSS = '.layout-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; }';

  return `<script>
  let displayName = "Alex Kimi";
  let presence = "available";
  let note = "In deep focus mode";
  let autoAfk = true;
  let pushMentions = true;
  let pushDms = true;
  let wallpaperUrl = "https://example.com/wall.jpg";
  let wallpaperOpacity = 80;
</script>

<div class="settings-pane v3-variant-${index}">
  <div class="marquee-bg">
    <div class="track">
      <span>SETTINGS SETTINGS SETTINGS SETTINGS </span>
      <span>SETTINGS SETTINGS SETTINGS SETTINGS </span>
    </div>
    <div class="track reverse">
      <span>PREFERENCES PREFERENCES PREFERENCES </span>
      <span>PREFERENCES PREFERENCES PREFERENCES </span>
    </div>
  </div>

  <div class="content">
    
    <div class="hero-block card">
      <input type="text" bind:value={displayName} class="soft-input giant" />
      <input type="text" bind:value={note} class="soft-input sub" />
    </div>

    <div class="layout-container">
      <div class="interactive-panel card">
        <h1 class="bold-title">STATUS</h1>
        <select bind:value={presence} class="s-select">
          <option value="available">AVAILABLE NOW</option>
          <option value="busy">CURRENTLY BUSY</option>
          <option value="dnd">DO NOT DISTURB</option>
        </select>
        
        <label class="s-check mt">
          <span class="label-text">AUTO AFK</span>
          <div class="toggle-wrapper">
             <input type="checkbox" bind:checked={autoAfk} />
             <div class="s-toggle"></div>
          </div>
        </label>
      </div>

      <div class="interactive-panel card">
        <h1 class="bold-title">ALERTS</h1>
        <label class="s-check">
          <span class="label-text">MENTIONS</span>
          <div class="toggle-wrapper">
            <input type="checkbox" bind:checked={pushMentions} />
            <div class="s-toggle"></div>
          </div>
        </label>
        <label class="s-check">
          <span class="label-text">DIRECT MSGS</span>
          <div class="toggle-wrapper">
            <input type="checkbox" bind:checked={pushDms} />
            <div class="s-toggle"></div>
          </div>
        </label>
      </div>
    </div>

    <div class="interactive-panel visual card">
      <h1 class="bold-title">CANVAS</h1>
      <input type="text" bind:value={wallpaperUrl} class="s-input full" placeholder="WALLPAPER URL" />
      <div class="s-slider-group">
        <span class="sl-label">OPACITY</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="s-slider" />
        <span class="sl-val">{wallpaperOpacity}</span>
      </div>
    </div>

    <button class="s-btn-huge card">SIGN OUT NOW</button>
  </div>
</div>

<style>
  .settings-pane {
    width: 100%;
    height: 100%;
    background: var(--bg);
    color: var(--text);
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    
    /* Dark Mode Defaults */
    --bg: #12121C;
    --surface: rgba(40, 40, 55, 0.4);
    --surface-hover: rgba(50, 50, 70, 0.6);
    --primary: #8585F1;
    --secondary: #A5A5E9;
    --text: #e2e2ec;
    --text-muted: #8c8cc5;
    --btn-danger: rgba(250, 87, 112, 0.8);
    --btn-danger-hover: rgba(250, 124, 144, 0.9);
    --glass-border: rgba(133, 133, 241, 0.2);
    
    /* Typography Fix */
    --font-mono: 'JetBrains Mono', monospace;
    font-family: var(--font-mono);
  }

  @media (prefers-color-scheme: light) {
    .settings-pane {
      --bg: #f8f8fc;
      --surface: rgba(255, 255, 255, 0.6);
      --surface-hover: rgba(255, 255, 255, 0.9);
      --primary: #8585F1;
      --secondary: #A5A5E9;
      --text: #2f2f3e;
      --text-muted: #6b6b8e;
      --btn-danger: #fa5770;
      --btn-danger-hover: #fa7c90;
      --glass-border: rgba(133, 133, 241, 0.3);
    }
  }

  /* Explicitly setting headers to Ubuntu */
  h1 { font-family: var(--font-sans, 'Ubuntu', sans-serif) !important; }

  .marquee-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.03;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 140px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    z-index: 0;
    color: var(--primary);
  }
  .track {
    display: inline-block;
    animation: scroll ${25 + index}s linear infinite;
  }
  .track.reverse { animation-direction: reverse; }
  @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  .content {
    position: relative;
    z-index: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* Card Elegance */
  .card {
    background: var(--surface);
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
    border: 1px solid var(--glass-border);
    border-radius: ${30 + (index%3)*10}px; /* Variation in border radius */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s, background 0.4s;
  }

  .hero-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px;
  }
  .hero-block:hover { transform: scale(1.02); background: var(--surface-hover); }
  
  .soft-input {
    background: transparent;
    border: none;
    color: var(--text);
    font-family: var(--font-mono);
    outline: none;
    text-align: center;
    width: 100%;
  }
  .soft-input.giant {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -1px;
  }
  .soft-input.sub {
    font-size: 16px;
    margin-top: 8px;
    color: var(--secondary);
  }

  ${layoutCSS}

  .interactive-panel {
    padding: 35px;
  }
  .interactive-panel:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 15px 40px rgba(133, 133, 241, 0.15);
    background: var(--surface-hover);
  }

  .bold-title {
    margin: 0 0 25px 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--primary);
    text-align: center;
    letter-spacing: 1px;
  }

  .s-select {
    width: 100%;
    background: rgba(133, 133, 241, 0.1);
    color: var(--text);
    border: 1px solid var(--glass-border);
    padding: 16px 20px;
    font-family: var(--font-mono);
    font-size: 14px;
    outline: none;
    appearance: none;
    cursor: pointer;
    border-radius: 20px;
    text-align: center;
    transition: all 0.3s;
  }
  .s-select:hover, .s-select:focus { 
    background: var(--primary);
    color: #fff;
  }

  .s-check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 16px;
    padding: 12px 20px;
    background: rgba(0,0,0,0.1);
    border-radius: 20px;
    transition: background 0.3s;
  }
  .s-check:hover { background: rgba(133, 133, 241, 0.1); }
  .mt { margin-top: 30px; }
  .label-text { font-size: 14px; }
  .toggle-wrapper input { display: none; }
  .s-toggle {
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.1);
    border: 1px solid var(--glass-border);
    border-radius: 9999px;
    position: relative;
    transition: 0.3s;
  }
  .s-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: var(--text-muted);
    border-radius: 50%;
    transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .toggle-wrapper input:checked + .s-toggle { background: var(--primary); border-color: var(--primary); }
  .toggle-wrapper input:checked + .s-toggle::after {
    transform: translateX(20px);
    background: #fff;
  }

  .s-input.full {
    width: 100%;
    background: rgba(0,0,0,0.1);
    border: 1px solid var(--glass-border);
    color: var(--text);
    font-size: 14px;
    padding: 16px 20px;
    font-family: var(--font-mono);
    outline: none;
    border-radius: 20px;
    text-align: center;
    transition: all 0.3s;
  }
  .s-input.full:focus { border-color: var(--primary); box-shadow: 0 0 10px rgba(133,133,241,0.2); }

  .s-slider-group {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
    background: rgba(0,0,0,0.1);
    padding: 12px 20px;
    border-radius: 20px;
  }
  .sl-label { font-size: 14px; }
  .s-slider {
    flex: 1;
    appearance: none;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 9999px;
    outline: none;
  }
  .s-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px var(--primary);
    transition: transform 0.2s;
  }
  .s-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
  .sl-val { font-size: 14px; width: 30px; text-align: right; }

  .s-btn-huge {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    font-family: var(--font-mono);
    padding: 25px;
    cursor: pointer;
    background: var(--btn-danger);
    border: 1px solid rgba(255,255,255,0.1);
    text-align: center;
  }
  .s-btn-huge:hover {
    transform: translateY(-5px);
    background: var(--btn-danger-hover);
    box-shadow: 0 15px 30px rgba(250, 87, 112, 0.3);
  }
</style>`;
}

function getPeopleTemplate(index, name) {
  const layouts = ['grid', 'list', 'masonry'];
  const gridStyle = index % 2 === 0 
    ? 'grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));'
    : 'grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));';
  
  const glassStyle = index % 3 === 0
    ? `background: rgba(133, 133, 241, 0.05); border: 1px solid rgba(133, 133, 241, 0.2);`
    : `background: var(--glass-bg); border: 1px solid var(--glass-border);`;

  return `<script lang="ts">
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

<div class="pane-container v3-variant-${index}">
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
    --br: ${20 + index*2}px; 
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
		background: linear-gradient(${135 + index*10}deg, var(--bg-grad-1) 0%, var(--bg-grad-2) 100%);
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

	.user-grid { display: grid; ${gridStyle} gap: 24px; }

	.glass-panel {
		${glassStyle}
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
</style>`;
}

// Ensure directories exist
fs.mkdirSync(chatDir, { recursive: true });
fs.mkdirSync(settingsDir, { recursive: true });
fs.mkdirSync(peopleDir, { recursive: true });

let imports = '';
let chatArray = '';
let settingsArray = '';
let peopleArray = '';

for (let i = 1; i <= 10; i++) {
  const indexStr = i.toString().padStart(2, '0');
  const name = names[i-1];
  
  const chatFile = `ChatPane-V3-${indexStr}-${name}.svelte`;
  const settingsFile = `SettingsPane-V3-${indexStr}-${name}.svelte`;
  const peopleFile = `PeoplePane-V3-${indexStr}-${name}.svelte`;
  
  fs.writeFileSync(path.join(chatDir, chatFile), getChatTemplate(i, name));
  fs.writeFileSync(path.join(settingsDir, settingsFile), getSettingsTemplate(i, name));
  fs.writeFileSync(path.join(peopleDir, peopleFile), getPeopleTemplate(i, name));
  
  const chatVar = `ChatPaneV3_${indexStr}`;
  const settingsVar = `SettingsPaneV3_${indexStr}`;
  const peopleVar = `PeoplePaneV3_${indexStr}`;
  
  imports += `  import ${chatVar} from '$lib/prototypes/chat-pane/${chatFile}';\n`;
  imports += `  import ${settingsVar} from '$lib/prototypes/settings-pane/${settingsFile}';\n`;
  imports += `  import ${peopleVar} from '$lib/prototypes/people-pane/${peopleFile}';\n`;
  
  chatArray += `    { component: ${chatVar}, name: 'V3: ${name}' },\n`;
  settingsArray += `    { component: ${settingsVar}, name: 'V3: ${name}' },\n`;
  peopleArray += `    { component: ${peopleVar}, name: 'V3: ${name}' },\n`;
}

// Read +page.svelte and update it
let pageContent = fs.readFileSync(pageFile, 'utf8');

// Insert imports
pageContent = pageContent.replace('const chatPanes = [', imports + '\n  const chatPanes = [');

// Insert array items
pageContent = pageContent.replace('const chatPanes = [', 'const chatPanes = [\n' + chatArray);
pageContent = pageContent.replace('const settingsPanes = [', 'const settingsPanes = [\n' + settingsArray);
pageContent = pageContent.replace('const peoplePanes = [', 'const peoplePanes = [\n' + peopleArray);

fs.writeFileSync(pageFile, pageContent);

console.log('Successfully generated all V3 prototype files and updated +page.svelte');
