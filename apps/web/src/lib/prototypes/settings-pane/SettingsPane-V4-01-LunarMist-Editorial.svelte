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
  <div class="editorial-layout">
    <header class="main-header">
      <h1>PROFILE</h1>
      <span class="version">V4 / LUNAR MIST</span>
    </header>

    <div class="grid">
      <section class="identity-section">
        <div class="banner-area">
          <div class="banner-preview" style:background-color={wallpaperColor}></div>
          <div class="avatar-upload">
            <Avatar name={displayName} size={120} />
            <button class="upload-btn">
              <Icon name="edit" size={16} />
            </button>
          </div>
        </div>

        <div class="field-group">
          <label for="display-name">DISPLAY NAME</label>
          <input id="display-name" type="text" bind:value={displayName} />
        </div>

        <div class="field-group">
          <label>PRESENCE</label>
          <div class="presence-grid">
            {#each presences as p}
              <button 
                class="presence-btn" 
                class:active={presence === p}
                onclick={() => presence = p}
              >
                {p}
              </button>
            {/each}
          </div>
        </div>
      </section>

      <section class="config-section">
        <div class="glass-card">
          <h2>PREFERENCES</h2>
          
          <div class="toggle-row">
            <span>AUTO-AFK</span>
            <button class="toggle" class:active={autoAfk} onclick={() => autoAfk = !autoAfk}>
              <div class="handle"></div>
            </button>
          </div>

          <div class="toggle-row">
            <span>PUSH NOTIFICATIONS</span>
            <button class="toggle" class:active={pushEnabled} onclick={() => pushEnabled = !pushEnabled}>
              <div class="handle"></div>
            </button>
          </div>
        </div>

        <div class="glass-card wallpaper-manager">
          <h2>WALLPAPER</h2>
          <div class="input-stack">
            <input type="text" placeholder="URL" bind:value={wallpaperUrl} />
            <div class="color-opacity">
              <input type="color" bind:value={wallpaperColor} />
              <input type="range" min="0" max="1" step="0.05" bind:value={wallpaperOpacity} />
            </div>
          </div>
        </div>

        <div class="footer-actions">
          <div class="theme-toggle">
            <label>THEME</label>
            <div class="theme-btns">
              <button class:active={theme === 'dark'} onclick={() => theme = 'dark'}>DARK</button>
              <button class:active={theme === 'light'} onclick={() => theme = 'light'}>LIGHT</button>
            </div>
          </div>

          <button class="sign-out-btn">
            <Icon name="log-out" size={18} />
            SIGN OUT NOW
          </button>
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  .settings-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #e2e2ec;
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
    position: relative;
  }

  .editorial-layout {
    padding: 3rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .main-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(165, 165, 233, 0.2);
    padding-bottom: 1rem;
  }

  h1 {
    font-family: 'Ubuntu', sans-serif;
    font-size: 4rem;
    margin: 0;
    line-height: 0.8;
    color: #8585F1;
    letter-spacing: -2px;
  }

  .version {
    font-size: 0.75rem;
    color: #A5A5E9;
    letter-spacing: 2px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    flex: 1;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  h2 {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
    letter-spacing: 1px;
    color: #A5A5E9;
  }

  .banner-area {
    position: relative;
    height: 160px;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 4rem;
  }

  .banner-preview {
    width: 100%;
    height: 100%;
    transition: background 0.3s ease;
  }

  .avatar-upload {
    position: absolute;
    bottom: -40px;
    left: 20px;
    border: 4px solid #12121C;
    border-radius: 50%;
  }

  .upload-btn {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background: #8585F1;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  label {
    font-size: 0.7rem;
    color: #A5A5E9;
    letter-spacing: 1px;
  }

  input[type="text"] {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 1rem;
    border-radius: 12px;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: #8585F1;
    background: rgba(133, 133, 241, 0.05);
  }

  .presence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .presence-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.6rem;
    border-radius: 8px;
    color: #8c8cc5;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .presence-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .presence-btn.active {
    background: #8585F1;
    color: white;
    border-color: #8585F1;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(165, 165, 233, 0.1);
    border-radius: 24px;
    padding: 1.5rem;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.8rem;
  }

  .toggle {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
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
    transition: transform 0.3s ease;
  }

  .toggle.active .handle {
    transform: translateX(20px);
  }

  .input-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .color-opacity {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  input[type="color"] {
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }

  input[type="range"] {
    flex: 1;
    accent-color: #8585F1;
  }

  .footer-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .theme-btns {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .theme-btns button {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(165, 165, 233, 0.1);
    padding: 0.75rem;
    border-radius: 10px;
    color: #8c8cc5;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .theme-btns button.active {
    background: rgba(165, 165, 233, 0.15);
    color: white;
    border-color: #A5A5E9;
  }

  .sign-out-btn {
    width: 100%;
    background: rgba(233, 165, 165, 0.1);
    border: 1px solid rgba(233, 165, 165, 0.3);
    color: #E9A5A5;
    padding: 1.25rem;
    border-radius: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sign-out-btn:hover {
    background: rgba(233, 165, 165, 0.2);
    transform: translateY(-2px);
  }
</style>
