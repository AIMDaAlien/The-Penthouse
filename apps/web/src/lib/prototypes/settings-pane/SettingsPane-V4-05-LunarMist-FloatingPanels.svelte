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
  <div class="background-glow"></div>
  
  <div class="panel user-panel">
    <div class="banner" style:background-color={wallpaperColor}></div>
    <div class="avatar-box">
      <Avatar name={displayName} size={100} />
      <div class="status-ring" style:border-color={presence === 'Available' ? '#85F1A5' : '#8585F1'}></div>
    </div>
    <div class="user-meta">
      <input type="text" bind:value={displayName} />
      <p>{presence}</p>
    </div>
  </div>

  <div class="panel presence-panel">
    <h3>Status</h3>
    <div class="presence-grid">
      {#each presences as p}
        <button 
          class:active={presence === p}
          onclick={() => presence = p}
        >{p}</button>
      {/each}
    </div>
  </div>

  <div class="panel toggle-panel">
    <div class="t-row">
      <Icon name="mic" size={18} />
      <span>Auto-AFK</span>
      <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}></button>
    </div>
    <div class="t-row">
      <Icon name="bell" size={18} />
      <span>Push</span>
      <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}></button>
    </div>
  </div>

  <div class="panel wallpaper-panel">
    <h3>Wallpaper</h3>
    <div class="wp-wrap">
      <input type="color" bind:value={wallpaperColor} />
      <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
    </div>
    <input type="text" placeholder="Wallpaper URL" bind:value={wallpaperUrl} />
  </div>

  <div class="panel theme-panel">
    <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>DARK</button>
    <button class:active={theme === 'light'} onclick={() => theme = 'light'}>LIGHT</button>
  </div>

  <button class="sign-out-float">
    <Icon name="log-out" size={20} />
    SIGN OUT
  </button>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #0a0a0f;
    position: relative;
    overflow: hidden;
    color: #e2e2ec;
    font-family: 'JetBrains Mono', monospace;
  }

  .background-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(133, 133, 241, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .panel {
    position: absolute;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(15px);
    border: 1px solid rgba(165, 165, 233, 0.15);
    border-radius: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .panel:hover {
    transform: translateY(-5px) scale(1.02);
    border-color: rgba(165, 165, 233, 0.3);
  }

  .user-panel {
    top: 40px;
    left: 40px;
    width: 320px;
    height: 340px;
    overflow: hidden;
    padding: 0;
  }

  .banner {
    height: 100px;
    width: 100%;
  }

  .avatar-box {
    position: relative;
    margin-top: -50px;
    margin-left: 30px;
    width: 100px;
    height: 100px;
  }

  .status-ring {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border: 3px solid #8585F1;
    border-radius: 50%;
  }

  .user-meta {
    padding: 2rem;
  }

  .user-meta input {
    background: transparent;
    border: none;
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.8rem;
    color: white;
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .user-meta p {
    color: #A5A5E9;
    font-size: 0.9rem;
    margin: 0;
  }

  .presence-panel {
    top: 40px;
    right: 40px;
    width: 440px;
    height: 200px;
    padding: 2rem;
  }

  h3 {
    margin: 0 0 1.5rem 0;
    font-size: 0.8rem;
    color: #8585F1;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .presence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .presence-grid button {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    color: #8c8cc5;
    padding: 0.75rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.75rem;
  }

  .presence-grid button.active {
    background: #8585F1;
    color: white;
  }

  .toggle-panel {
    top: 260px;
    right: 40px;
    width: 440px;
    height: 120px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0 2rem;
  }

  .t-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .t-row span {
    font-size: 0.7rem;
    color: #A5A5E9;
  }

  .toggle {
    width: 40px;
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    border: none;
    position: relative;
    cursor: pointer;
  }

  .toggle::after {
    content: '';
    position: absolute;
    top: -5px;
    left: 0;
    width: 20px;
    height: 20px;
    background: #8c8cc5;
    border-radius: 50%;
    transition: all 0.3s;
  }

  .toggle.active::after {
    left: 20px;
    background: #8585F1;
    box-shadow: 0 0 10px #8585F1;
  }

  .wallpaper-panel {
    bottom: 120px;
    left: 40px;
    right: 40px;
    height: 180px;
    padding: 2rem;
  }

  .wp-wrap {
    display: flex;
    gap: 2rem;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  input[type="color"] {
    background: none;
    border: none;
    width: 40px;
    height: 40px;
  }

  input[type="range"] {
    flex: 1;
    accent-color: #8585F1;
  }

  .wallpaper-panel input[type="text"] {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem;
    border-radius: 12px;
    color: white;
  }

  .theme-panel {
    bottom: 40px;
    left: 40px;
    width: 320px;
    height: 60px;
    display: flex;
    padding: 5px;
  }

  .theme-panel button {
    flex: 1;
    background: transparent;
    border: none;
    color: #8c8cc5;
    font-size: 0.7rem;
    letter-spacing: 2px;
    cursor: pointer;
    border-radius: 18px;
  }

  .theme-panel button.active {
    background: rgba(133, 133, 241, 0.1);
    color: #8585F1;
  }

  .sign-out-float {
    position: absolute;
    bottom: 40px;
    right: 40px;
    width: 440px;
    height: 60px;
    background: rgba(233, 165, 165, 0.1);
    border: 1px solid rgba(233, 165, 165, 0.3);
    border-radius: 24px;
    color: #E9A5A5;
    font-family: 'JetBrains Mono', monospace;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sign-out-float:hover {
    background: rgba(233, 165, 165, 0.2);
    box-shadow: 0 0 20px rgba(233, 165, 165, 0.2);
  }
</style>
