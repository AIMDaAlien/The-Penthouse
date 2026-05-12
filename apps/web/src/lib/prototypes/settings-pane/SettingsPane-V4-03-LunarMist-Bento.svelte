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
  <div class="bento-grid">
    <div class="cell profile-cell">
      <div class="banner" style:background-color={wallpaperColor}></div>
      <div class="profile-content">
        <Avatar name={displayName} size={90} />
        <div class="text">
          <input type="text" bind:value={displayName} class="name-input" />
          <p>Current Status: {presence}</p>
        </div>
      </div>
    </div>

    <div class="cell presence-cell">
      <h3>Presence</h3>
      <div class="presence-options">
        {#each presences as p}
          <button 
            class="p-btn" 
            class:active={presence === p}
            onclick={() => presence = p}
          >
            {p}
          </button>
        {/each}
      </div>
    </div>

    <div class="cell switch-cell afk">
      <Icon name="mic" size={24} />
      <div class="info">
        <h3>Auto-AFK</h3>
        <span>Automatic status update</span>
      </div>
      <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
        <div class="handle"></div>
      </button>
    </div>

    <div class="cell switch-cell push">
      <Icon name="bell" size={24} />
      <div class="info">
        <h3>Push</h3>
        <span>System notifications</span>
      </div>
      <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
        <div class="handle"></div>
      </button>
    </div>

    <div class="cell wallpaper-cell">
      <h3>Wallpaper</h3>
      <div class="wp-controls">
        <input type="text" placeholder="Image URL..." bind:value={wallpaperUrl} />
        <div class="wp-row">
           <input type="color" bind:value={wallpaperColor} />
           <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
        </div>
      </div>
    </div>

    <div class="cell theme-cell">
      <h3>Interface Theme</h3>
      <div class="theme-btns">
        <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>Dark</button>
        <button class:active={theme === 'light'} onclick={() => theme = 'light'}>Light</button>
      </div>
    </div>

    <div class="cell signout-cell">
      <button onclick={() => console.log('Sign out')}>
        <Icon name="log-out" size={24} />
        SIGN OUT
      </button>
    </div>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    padding: 2rem;
    color: #e2e2ec;
    font-family: 'JetBrains Mono', monospace;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 1.5rem;
    height: 100%;
  }

  .cell {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(165, 165, 233, 0.1);
    border-radius: 24px;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(5px);
  }

  .profile-cell {
    grid-column: span 2;
    grid-row: span 2;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .banner {
    height: 120px;
    width: 100%;
  }

  .profile-content {
    padding: 0 1.5rem 1.5rem;
    margin-top: -45px;
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
  }

  .name-input {
    background: transparent;
    border: none;
    border-bottom: 2px solid rgba(133, 133, 241, 0.3);
    color: white;
    font-size: 2rem;
    font-family: 'Ubuntu', sans-serif;
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .name-input:focus {
    outline: none;
    border-color: #8585F1;
  }

  .presence-cell {
    grid-row: span 2;
  }

  h3 {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1rem;
    margin: 0 0 1rem 0;
    color: #A5A5E9;
  }

  .presence-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .p-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.05);
    padding: 0.75rem;
    border-radius: 12px;
    color: #8c8cc5;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .p-btn.active {
    background: rgba(133, 133, 241, 0.15);
    color: white;
    border-color: #8585F1;
  }

  .switch-cell {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .switch-cell .info {
    flex: 1;
  }

  .switch-cell span {
    font-size: 0.65rem;
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
    flex-shrink: 0;
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

  .wallpaper-cell {
    grid-column: span 2;
  }

  .wp-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input[type="text"] {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem;
    border-radius: 10px;
    color: white;
  }

  .wp-row {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  input[type="range"] {
    flex: 1;
    accent-color: #8585F1;
  }

  .theme-cell {
    grid-row: span 1;
  }

  .theme-btns {
    display: flex;
    gap: 0.5rem;
  }

  .theme-btns button {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.5rem;
    border-radius: 8px;
    color: #8c8cc5;
    cursor: pointer;
  }

  .theme-btns button.active {
    background: rgba(165, 165, 233, 0.15);
    color: white;
  }

  .signout-cell {
    grid-column: span 1;
    display: flex;
    padding: 0;
  }

  .signout-cell button {
    width: 100%;
    height: 100%;
    background: rgba(233, 165, 165, 0.1);
    border: none;
    color: #E9A5A5;
    font-weight: bold;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .signout-cell button:hover {
    background: rgba(233, 165, 165, 0.15);
  }
</style>
