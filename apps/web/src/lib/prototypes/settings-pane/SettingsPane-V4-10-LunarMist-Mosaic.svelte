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
  <div class="mosaic-grid">
    <div class="tile profile-tile">
       <Avatar name={displayName} size={80} />
       <input type="text" bind:value={displayName} />
    </div>

    {#each presences as p}
      <button 
        class="tile presence-tile" 
        class:active={presence === p}
        onclick={() => presence = p}
      >
        {p}
      </button>
    {/each}

    <button class="tile toggle-tile" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
      <Icon name="mic" size={20} />
      <span>AUTO-AFK</span>
    </button>

    <button class="tile toggle-tile" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
      <Icon name="bell" size={20} />
      <span>PUSH</span>
    </button>

    <div class="tile wallpaper-tile">
      <div class="wp-row">
        <input type="color" bind:value={wallpaperColor} />
        <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
      </div>
      <input type="text" placeholder="URL" bind:value={wallpaperUrl} class="url-in" />
    </div>

    <button class="tile theme-tile" onclick={() => theme = theme === 'dark' ? 'light' : 'dark'}>
      <Icon name="image" size={20} />
      <span>{theme.toUpperCase()} MODE</span>
    </button>

    <button class="tile logout-tile">
      <Icon name="log-out" size={24} />
      <span>SIGN OUT</span>
    </button>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    padding: 2rem;
    font-family: 'JetBrains Mono', monospace;
    color: #e2e2ec;
  }

  .mosaic-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 1rem;
    height: 100%;
  }

  .tile {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(165, 165, 233, 0.1);
    border-radius: 20px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.3s;
  }

  .tile:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: scale(1.02);
    border-color: #8585F1;
  }

  .profile-tile { grid-column: span 2; grid-row: span 2; cursor: default; }
  .profile-tile input { background: transparent; border: none; font-size: 1.5rem; color: white; text-align: center; width: 100%; font-family: 'Ubuntu', sans-serif; }

  .presence-tile { font-size: 0.75rem; color: #8c8cc5; }
  .presence-tile.active { background: #8585F1; color: white; }

  .toggle-tile.active { color: #8585F1; border-color: #8585F1; background: rgba(133, 133, 241, 0.05); }

  .wallpaper-tile { grid-column: span 2; cursor: default; }
  .wp-row { display: flex; gap: 1rem; width: 100%; align-items: center; }
  .wp-row input[type="range"] { flex: 1; accent-color: #8585F1; }
  .url-in { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); padding: 0.5rem; border-radius: 8px; color: white; width: 100%; font-size: 0.7rem; }

  .theme-tile { grid-column: span 2; flex-direction: row; }

  .logout-tile { grid-column: span 2; background: rgba(233, 165, 165, 0.05); border-color: rgba(233, 165, 165, 0.2); color: #E9A5A5; font-weight: bold; flex-direction: row; }
  .logout-tile:hover { background: rgba(233, 165, 165, 0.1); }
</style>
