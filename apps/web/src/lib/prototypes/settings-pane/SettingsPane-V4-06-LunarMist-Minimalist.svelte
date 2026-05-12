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
  <div class="minimal-wrap">
    <section class="top-meta">
      <Avatar name={displayName} size={48} />
      <div class="text">
        <input type="text" bind:value={displayName} class="minimal-input" />
        <span class="presence-tag">{presence}</span>
      </div>
    </section>

    <div class="settings-stack">
      <div class="row">
        <span class="label">Presence</span>
        <div class="options">
          {#each presences as p}
            <button class:active={presence === p} onclick={() => presence = p}>{p}</button>
          {/each}
        </div>
      </div>

      <div class="row">
        <span class="label">Auto-AFK Inactivity</span>
        <button class="subtle-toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
          {autoAfk ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>

      <div class="row">
        <span class="label">Push Notifications</span>
        <button class="subtle-toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
          {pushEnabled ? 'ACTIVE' : 'SILENCED'}
        </button>
      </div>

      <div class="row">
        <span class="label">Wallpaper Base</span>
        <div class="wp-mini">
          <input type="color" bind:value={wallpaperColor} />
          <input type="range" min="0" max="1" step="0.01" bind:value={wallpaperOpacity} />
        </div>
      </div>

      <div class="row">
        <span class="label">Interface</span>
        <div class="options">
          <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>Dark</button>
          <button class:active={theme === 'light'} onclick={() => theme = 'light'}>Light</button>
        </div>
      </div>
    </div>

    <footer class="minimal-footer">
      <button class="sign-out-link">
        SIGN OUT / END SESSION
      </button>
    </footer>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    display: flex;
    justify-content: center;
    padding-top: 5rem;
    color: #e2e2ec;
    font-family: 'JetBrains Mono', monospace;
  }

  .minimal-wrap {
    width: 600px;
    display: flex;
    flex-direction: column;
    gap: 4rem;
  }

  .top-meta {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .minimal-input {
    background: transparent;
    border: none;
    font-family: 'Ubuntu', sans-serif;
    font-size: 2.5rem;
    color: white;
    width: 100%;
    outline: none;
    letter-spacing: -1px;
  }

  .presence-tag {
    font-size: 0.75rem;
    color: #8585F1;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .settings-stack {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(165, 165, 233, 0.05);
    padding-bottom: 1.5rem;
  }

  .label {
    font-size: 0.8rem;
    color: #8c8cc5;
  }

  .options {
    display: flex;
    gap: 1rem;
  }

  .options button {
    background: transparent;
    border: none;
    color: #4c4c6a;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .options button:hover {
    color: #8c8cc5;
  }

  .options button.active {
    color: #8585F1;
    font-weight: bold;
  }

  .subtle-toggle {
    background: rgba(133, 133, 241, 0.05);
    border: 1px solid rgba(133, 133, 241, 0.1);
    color: #8585F1;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    letter-spacing: 1px;
  }

  .subtle-toggle.active {
    background: rgba(133, 133, 241, 0.2);
  }

  .wp-mini {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 200px;
  }

  input[type="color"] {
    background: none;
    border: none;
    width: 20px;
    height: 20px;
  }

  input[type="range"] {
    flex: 1;
    accent-color: #8585F1;
  }

  .minimal-footer {
    margin-top: auto;
    padding-bottom: 4rem;
  }

  .sign-out-link {
    background: transparent;
    border: none;
    color: #E9A5A5;
    font-size: 0.75rem;
    letter-spacing: 1px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .sign-out-link:hover {
    opacity: 1;
    text-decoration: underline;
  }
</style>
