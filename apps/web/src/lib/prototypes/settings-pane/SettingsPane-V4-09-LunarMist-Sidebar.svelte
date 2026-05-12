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
  <div class="sidebar-layout">
    <div class="wide-sidebar">
      <div class="banner" style:background-color={wallpaperColor}></div>
      <div class="user-focus">
        <Avatar name={displayName} size={120} />
        <input type="text" bind:value={displayName} />
        <p>{presence}</p>
      </div>
      <div class="p-list">
        {#each presences as p}
          <button class:active={presence === p} onclick={() => presence = p}>{p}</button>
        {/each}
      </div>
    </div>

    <div class="main-content">
       <section class="group">
         <h2>Preferences</h2>
         <div class="row">
           <span>Auto-AFK</span>
           <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}></button>
         </div>
         <div class="row">
           <span>Push Alerts</span>
           <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}></button>
         </div>
       </section>

       <section class="group">
         <h2>Wallpaper</h2>
         <div class="wp-input">
           <input type="text" placeholder="Wallpaper URL" bind:value={wallpaperUrl} />
           <div class="wp-controls">
             <input type="color" bind:value={wallpaperColor} />
             <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
           </div>
         </div>
       </section>

       <section class="group">
         <h2>Theme</h2>
         <div class="theme-btns">
           <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>DARK</button>
           <button class:active={theme === 'light'} onclick={() => theme = 'light'}>LIGHT</button>
         </div>
       </section>

       <button class="sign-out">
         SIGN OUT NOW
       </button>
    </div>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    font-family: 'JetBrains Mono', monospace;
    color: #e2e2ec;
  }

  .sidebar-layout {
    display: flex;
    height: 100%;
  }

  .wide-sidebar {
    width: 340px;
    background: rgba(255, 255, 255, 0.02);
    border-right: 1px solid rgba(165, 165, 233, 0.1);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .banner {
    height: 160px;
    width: 100%;
    opacity: 0.5;
  }

  .user-focus {
    margin-top: -60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    text-align: center;
  }

  .user-focus input {
    background: transparent;
    border: none;
    font-family: 'Ubuntu', sans-serif;
    font-size: 2rem;
    color: white;
    text-align: center;
    margin-top: 1rem;
    width: 100%;
  }

  .user-focus p {
    color: #8585F1;
    font-size: 0.8rem;
    letter-spacing: 2px;
  }

  .p-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 1rem 2rem;
  }

  .p-list button {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    color: #8c8cc5;
    padding: 0.5rem;
    border-radius: 8px;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .p-list button.active {
    background: #8585F1;
    color: white;
  }

  .main-content {
    flex: 1;
    padding: 4rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  h2 {
    font-size: 0.75rem;
    color: #A5A5E9;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 1.5rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .toggle {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    position: relative;
    cursor: pointer;
  }

  .toggle::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 4px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }

  .toggle.active { background: #8585F1; }
  .toggle.active::after { left: 24px; }

  .wp-input {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .wp-input input[type="text"] {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem;
    border-radius: 8px;
    color: white;
  }

  .wp-controls {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  input[type="range"] { flex: 1; accent-color: #8585F1; }

  .theme-btns {
    display: flex;
    gap: 1rem;
  }

  .theme-btns button {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    color: #8c8cc5;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
  }

  .theme-btns button.active { background: rgba(133, 133, 241, 0.1); color: #8585F1; border-color: #8585F1; }

  .sign-out {
    margin-top: auto;
    background: rgba(233, 165, 165, 0.1);
    border: 1px solid rgba(233, 165, 165, 0.2);
    color: #E9A5A5;
    padding: 1.5rem;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 2px;
  }
</style>
