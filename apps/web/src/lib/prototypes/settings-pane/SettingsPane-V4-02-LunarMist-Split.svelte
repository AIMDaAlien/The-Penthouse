<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';

  let displayName = $state('Kimi');
  let presence = $state('Available');
  let autoAfk = $state(true);
  let pushEnabled = $state(true);
  let wallpaperUrl = $state('');
  let wallpaperColor = $state('#8585F1');
  let wallpaperOpacity = $state(0.15);
  let theme = $state('dark');

  const presences = ['Available', 'Busy', 'DND', 'AFK', 'Offline'];
</script>

<div class="settings-pane">
  <div class="split-layout">
    <aside class="sidebar">
      <div class="user-header">
        <div class="avatar-wrap">
          <Avatar name={displayName} size={80} />
          <div class="presence-indicator" class:available={presence === 'Available'}></div>
        </div>
        <div class="user-info">
          <h3>{displayName}</h3>
          <p>{presence}</p>
        </div>
      </div>

      <nav class="side-nav">
        <button class="nav-item active">Account</button>
        <button class="nav-item">Interface</button>
        <button class="nav-item">Notifications</button>
        <button class="nav-item">Appearance</button>
      </nav>

      <button class="sign-out-btn">
        <Icon name="log-out" size={16} />
        Sign Out
      </button>
    </aside>

    <main class="content">
      <header>
        <h1>Settings</h1>
      </header>

      <section class="scroll-area">
        <div class="group">
          <label>Display Name</label>
          <div class="input-row">
            <input type="text" bind:value={displayName} />
            <Icon name="edit" size={16} />
          </div>
        </div>

        <div class="group">
          <label>Status Presence</label>
          <div class="presence-chips">
            {#each presences as p}
              <button 
                class="chip" 
                class:active={presence === p}
                onclick={() => presence = p}
              >
                {p}
              </button>
            {/each}
          </div>
        </div>

        <div class="divider"></div>

        <div class="group">
          <label>Wallpaper Manager</label>
          <div class="wallpaper-box">
             <div class="preview" style:background-color={wallpaperColor}></div>
             <div class="controls">
               <input type="text" placeholder="Wallpaper URL" bind:value={wallpaperUrl} />
               <div class="row">
                 <input type="color" bind:value={wallpaperColor} />
                 <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
               </div>
             </div>
          </div>
        </div>

        <div class="group row-toggle">
          <div>
            <label>Auto-AFK Mode</label>
            <p>Go AFK after 5 minutes of inactivity</p>
          </div>
          <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
            <div class="handle"></div>
          </button>
        </div>

        <div class="group row-toggle">
          <div>
            <label>Push Notifications</label>
            <p>Receive alerts even when offline</p>
          </div>
          <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
            <div class="handle"></div>
          </button>
        </div>

        <div class="group">
          <label>Theme</label>
          <div class="theme-switch">
            <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>Dark</button>
            <button class:active={theme === 'light'} onclick={() => theme = 'light'}>Light</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #e2e2ec;
    font-family: 'JetBrains Mono', monospace;
  }

  .split-layout {
    display: flex;
    height: 100%;
  }

  .sidebar {
    width: 260px;
    background: rgba(255, 255, 255, 0.02);
    border-right: 1px solid rgba(165, 165, 233, 0.1);
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
  }

  .user-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .avatar-wrap {
    position: relative;
  }

  .presence-indicator {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    background: #444;
    border: 2px solid #12121C;
    border-radius: 50%;
  }

  .presence-indicator.available {
    background: #85F1A5;
  }

  .user-info h3 {
    margin: 0;
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.1rem;
  }

  .user-info p {
    margin: 0;
    font-size: 0.7rem;
    color: #A5A5E9;
  }

  .side-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .nav-item {
    background: transparent;
    border: none;
    color: #8c8cc5;
    text-align: left;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.04);
    color: white;
  }

  .nav-item.active {
    background: rgba(133, 133, 241, 0.1);
    color: #8585F1;
    font-weight: bold;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 3rem;
  }

  h1 {
    font-family: 'Ubuntu', sans-serif;
    font-size: 2rem;
    margin: 0 0 2rem 0;
    color: #8585F1;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  label {
    display: block;
    font-size: 0.75rem;
    color: #A5A5E9;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .input-row {
    position: relative;
    display: flex;
    align-items: center;
  }

  input[type="text"] {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    color: white;
    font-family: 'JetBrains Mono', monospace;
  }

  .input-row :global(svg) {
    position: absolute;
    right: 1rem;
    color: #A5A5E9;
    opacity: 0.5;
  }

  .presence-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    color: #8c8cc5;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip.active {
    background: #8585F1;
    color: white;
    border-color: #8585F1;
  }

  .divider {
    height: 1px;
    background: rgba(165, 165, 233, 0.1);
    margin: 1rem 0;
  }

  .wallpaper-box {
    display: flex;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: 12px;
  }

  .preview {
    width: 60px;
    height: 60px;
    border-radius: 8px;
  }

  .controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .row-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .row-toggle p {
    margin: 0.25rem 0 0 0;
    font-size: 0.7rem;
    color: #8c8cc5;
  }

  .toggle {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    position: relative;
    cursor: pointer;
    transition: background 0.3s;
  }

  .toggle.active {
    background: #8585F1;
  }

  .handle {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.3s;
  }

  .toggle.active .handle {
    transform: translateX(20px);
  }

  .theme-switch {
    display: flex;
    background: rgba(255, 255, 255, 0.03);
    padding: 4px;
    border-radius: 8px;
    width: fit-content;
  }

  .theme-switch button {
    background: transparent;
    border: none;
    color: #8c8cc5;
    padding: 0.5rem 1.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .theme-switch button.active {
    background: rgba(165, 165, 233, 0.2);
    color: white;
  }

  .sign-out-btn {
    background: rgba(233, 165, 165, 0.1);
    border: 1px solid rgba(233, 165, 165, 0.2);
    color: #E9A5A5;
    padding: 0.75rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sign-out-btn:hover {
    background: rgba(233, 165, 165, 0.2);
  }
</style>
