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
  <div class="asymmetric-grid">
    <div class="box box-1">
      <div class="banner" style:background-color={wallpaperColor}></div>
      <div class="profile">
        <Avatar name={displayName} size={70} />
        <input type="text" bind:value={displayName} />
      </div>
    </div>

    <div class="box box-2">
      <h3>Status</h3>
      <div class="p-tags">
        {#each presences as p}
          <button class:active={presence === p} onclick={() => presence = p}>{p}</button>
        {/each}
      </div>
    </div>

    <div class="box box-3">
       <h3>Controls</h3>
       <div class="toggles">
         <button class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
           <Icon name="mic" size={16} /> Auto-AFK
         </button>
         <button class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
           <Icon name="bell" size={16} /> Push
         </button>
       </div>
    </div>

    <div class="box box-4">
      <h3>Wallpaper</h3>
      <input type="text" placeholder="URL" bind:value={wallpaperUrl} />
      <div class="wp-row">
        <input type="color" bind:value={wallpaperColor} />
        <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
      </div>
    </div>

    <div class="box box-5">
      <h3>Theme</h3>
      <div class="theme-select">
        <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>D</button>
        <button class:active={theme === 'light'} onclick={() => theme = 'light'}>L</button>
      </div>
    </div>

    <div class="box box-6">
      <button class="logout">LOG OUT</button>
    </div>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    padding: 3rem;
    font-family: 'JetBrains Mono', monospace;
    color: #e2e2ec;
  }

  .asymmetric-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: repeat(12, 1fr);
    gap: 1rem;
    height: 100%;
  }

  .box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(165, 165, 233, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
    overflow: hidden;
  }

  .box-1 { grid-column: 1 / 9; grid-row: 1 / 5; padding: 0; position: relative; }
  .box-1 .banner { height: 100%; width: 100%; opacity: 0.3; position: absolute; }
  .box-1 .profile { position: relative; z-index: 1; padding: 2rem; display: flex; align-items: center; gap: 2rem; }
  .box-1 input { background: transparent; border: none; font-family: 'Ubuntu', sans-serif; font-size: 2.5rem; color: white; width: 100%; }

  .box-2 { grid-column: 9 / 13; grid-row: 1 / 7; }
  .p-tags { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
  .p-tags button { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); color: #8c8cc5; padding: 0.5rem; border-radius: 4px; cursor: pointer; text-align: left; }
  .p-tags button.active { background: #8585F1; color: white; }

  .box-3 { grid-column: 1 / 5; grid-row: 5 / 9; }
  .toggles { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
  .toggles button { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); color: #8c8cc5; padding: 1rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; }
  .toggles button.active { border-color: #8585F1; color: #8585F1; background: rgba(133, 133, 241, 0.05); }

  .box-4 { grid-column: 5 / 13; grid-row: 7 / 11; }
  .wp-row { display: flex; gap: 2rem; align-items: center; margin-top: 1rem; }
  .box-4 input[type="text"] { width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); padding: 0.75rem; border-radius: 8px; color: white; }

  .box-5 { grid-column: 1 / 5; grid-row: 9 / 13; }
  .theme-select { display: flex; gap: 1rem; margin-top: 1rem; }
  .theme-select button { flex: 1; height: 60px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); color: #8c8cc5; cursor: pointer; font-size: 1.2rem; }
  .theme-select button.active { background: #A5A5E9; color: #12121C; }

  .box-6 { grid-column: 5 / 13; grid-row: 11 / 13; padding: 0; }
  .logout { width: 100%; height: 100%; background: rgba(233, 165, 165, 0.1); border: none; color: #E9A5A5; font-weight: bold; cursor: pointer; font-size: 1.2rem; letter-spacing: 4px; }
  .logout:hover { background: rgba(233, 165, 165, 0.2); }

  h3 { font-size: 0.7rem; color: #A5A5E9; text-transform: uppercase; margin: 0; }
</style>
