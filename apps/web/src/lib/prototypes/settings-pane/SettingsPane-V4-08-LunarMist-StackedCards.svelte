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
  <div class="card-stack">
    <div class="card profile-card" style:--index="0">
      <div class="content">
        <Avatar name={displayName} size={60} />
        <div class="info">
           <input type="text" bind:value={displayName} />
           <p>{presence}</p>
        </div>
      </div>
    </div>

    <div class="card settings-card" style:--index="1">
       <div class="grid">
         <div class="group">
            <label>Presence</label>
            <div class="chips">
              {#each presences as p}
                <button class:active={presence === p} onclick={() => presence = p}>{p}</button>
              {/each}
            </div>
         </div>
         <div class="group">
            <label>Auto-AFK</label>
            <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}></button>
         </div>
       </div>
    </div>

    <div class="card visual-card" style:--index="2">
       <div class="grid">
         <div class="group">
           <label>Wallpaper</label>
           <div class="row">
             <input type="color" bind:value={wallpaperColor} />
             <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
           </div>
         </div>
         <div class="group">
           <label>Interface</label>
           <div class="theme-row">
             <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>DARK</button>
             <button class:active={theme === 'light'} onclick={() => theme = 'light'}>LIGHT</button>
           </div>
         </div>
       </div>
    </div>

    <div class="card notify-card" style:--index="3">
       <div class="content">
         <Icon name="bell" size={24} />
         <div class="info">
           <label>Push Notifications</label>
           <p>{pushEnabled ? 'On' : 'Off'}</p>
         </div>
         <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}></button>
       </div>
    </div>

    <div class="card signout-card" style:--index="4">
       <button class="btn">SIGN OUT NOW</button>
    </div>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    color: #e2e2ec;
  }

  .card-stack {
    width: 600px;
    display: flex;
    flex-direction: column;
    gap: -40px; /* Overlap */
  }

  .card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(165, 165, 233, 0.1);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.3);
    transform: translateY(calc(var(--index) * -20px));
    transition: transform 0.3s;
  }

  .card:hover {
    transform: translateY(calc(var(--index) * -20px - 10px));
    z-index: 10;
    border-color: #8585F1;
  }

  .content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .info { flex: 1; }
  .info input { background: transparent; border: none; font-size: 1.5rem; color: white; width: 100%; font-family: 'Ubuntu', sans-serif; }
  .info p { margin: 0; font-size: 0.8rem; color: #A5A5E9; }

  label { font-size: 0.7rem; color: #8c8cc5; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }

  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .chips button { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); color: #8c8cc5; font-size: 0.7rem; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
  .chips button.active { background: #8585F1; color: white; }

  .toggle { width: 44px; height: 24px; border-radius: 12px; background: rgba(255, 255, 255, 0.1); border: none; position: relative; cursor: pointer; }
  .toggle::after { content: ''; position: absolute; left: 4px; top: 4px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: 0.2s; }
  .toggle.active { background: #8585F1; }
  .toggle.active::after { left: 24px; }

  .theme-row { display: flex; gap: 0.5rem; }
  .theme-row button { flex: 1; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(165, 165, 233, 0.1); color: #8c8cc5; border-radius: 4px; padding: 0.5rem; cursor: pointer; font-size: 0.7rem; }
  .theme-row button.active { background: rgba(133, 133, 241, 0.1); color: #8585F1; }

  .signout-card { background: rgba(233, 165, 165, 0.05); border-color: rgba(233, 165, 165, 0.2); }
  .signout-card .btn { width: 100%; background: transparent; border: none; color: #E9A5A5; font-weight: bold; cursor: pointer; letter-spacing: 2px; }
</style>
