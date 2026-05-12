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
  <div class="glass-container">
    <div class="glass-list">
      <header class="list-header">
        <Avatar name={displayName} size={64} />
        <div class="title">
          <h1>{displayName}</h1>
          <p>System Preferences</p>
        </div>
      </header>

      <div class="list-items">
        <div class="item">
          <div class="label">Display Name</div>
          <input type="text" bind:value={displayName} />
        </div>

        <div class="item">
          <div class="label">Presence Status</div>
          <select bind:value={presence}>
            {#each presences as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>

        <div class="item toggle-item">
          <div class="info">
            <div class="label">Auto-AFK</div>
            <div class="desc">Update status when idle</div>
          </div>
          <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
            <div class="handle"></div>
          </button>
        </div>

        <div class="item toggle-item">
          <div class="info">
            <div class="label">Push Notifications</div>
            <div class="desc">Enable browser alerts</div>
          </div>
          <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
            <div class="handle"></div>
          </button>
        </div>

        <div class="item">
          <div class="label">Wallpaper Base Color</div>
          <div class="color-picker-row">
            <div class="swatch" style:background-color={wallpaperColor}></div>
            <input type="color" bind:value={wallpaperColor} />
            <input type="range" min="0" max="1" step="0.1" bind:value={wallpaperOpacity} />
          </div>
        </div>

        <div class="item">
          <div class="label">Interface Theme</div>
          <div class="segmented-control">
            <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>Dark</button>
            <button class:active={theme === 'light'} onclick={() => theme = 'light'}>Light</button>
          </div>
        </div>
      </div>

      <footer class="list-footer">
        <button class="sign-out">
          <Icon name="log-out" size={16} />
          SIGN OUT NOW
        </button>
      </footer>
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

  .glass-container {
    width: 500px;
    background: linear-gradient(135deg, rgba(133, 133, 241, 0.1), rgba(165, 165, 233, 0.05));
    padding: 2px;
    border-radius: 40px;
  }

  .glass-list {
    background: rgba(18, 18, 28, 0.8);
    backdrop-filter: blur(20px);
    border-radius: 38px;
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .list-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  h1 {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.5rem;
    margin: 0;
    color: #8585F1;
  }

  .list-header p {
    margin: 0;
    font-size: 0.75rem;
    color: #A5A5E9;
  }

  .list-items {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #A5A5E9;
  }

  input[type="text"], select {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 12px;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem;
  }

  .toggle-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
  }

  .desc {
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

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  input[type="color"] {
    background: none;
    border: none;
    width: 32px;
    height: 32px;
    cursor: pointer;
  }

  input[type="range"] {
    flex: 1;
    accent-color: #8585F1;
  }

  .segmented-control {
    display: flex;
    background: rgba(255, 255, 255, 0.03);
    padding: 3px;
    border-radius: 10px;
  }

  .segmented-control button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.6rem;
    border-radius: 7px;
    color: #8c8cc5;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .segmented-control button.active {
    background: rgba(133, 133, 241, 0.2);
    color: white;
  }

  .sign-out {
    width: 100%;
    background: rgba(233, 165, 165, 0.05);
    border: 1px dashed rgba(233, 165, 165, 0.3);
    color: #E9A5A5;
    padding: 1rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sign-out:hover {
    background: rgba(233, 165, 165, 0.1);
    border-style: solid;
  }
</style>
