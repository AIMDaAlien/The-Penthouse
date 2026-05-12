<script>
  let displayName = "Alex Kimi";
  let presence = "available";
  let note = "In deep focus mode";
  let autoAfk = true;
  let pushMentions = true;
  let pushDms = true;
  let wallpaperUrl = "https://example.com/wall.jpg";
  let wallpaperOpacity = 80;
</script>

<div class="settings-pane v3-variant-3">
  <div class="marquee-bg">
    <div class="track">
      <span>SETTINGS SETTINGS SETTINGS SETTINGS </span>
      <span>SETTINGS SETTINGS SETTINGS SETTINGS </span>
    </div>
    <div class="track reverse">
      <span>PREFERENCES PREFERENCES PREFERENCES </span>
      <span>PREFERENCES PREFERENCES PREFERENCES </span>
    </div>
  </div>

  <div class="content">
    
    <div class="hero-block card">
      <input type="text" bind:value={displayName} class="soft-input giant" />
      <input type="text" bind:value={note} class="soft-input sub" />
    </div>

    <div class="layout-container">
      <div class="interactive-panel card">
        <h1 class="bold-title">STATUS</h1>
        <select bind:value={presence} class="s-select">
          <option value="available">AVAILABLE NOW</option>
          <option value="busy">CURRENTLY BUSY</option>
          <option value="dnd">DO NOT DISTURB</option>
        </select>
        
        <label class="s-check mt">
          <span class="label-text">AUTO AFK</span>
          <div class="toggle-wrapper">
             <input type="checkbox" bind:checked={autoAfk} />
             <div class="s-toggle"></div>
          </div>
        </label>
      </div>

      <div class="interactive-panel card">
        <h1 class="bold-title">ALERTS</h1>
        <label class="s-check">
          <span class="label-text">MENTIONS</span>
          <div class="toggle-wrapper">
            <input type="checkbox" bind:checked={pushMentions} />
            <div class="s-toggle"></div>
          </div>
        </label>
        <label class="s-check">
          <span class="label-text">DIRECT MSGS</span>
          <div class="toggle-wrapper">
            <input type="checkbox" bind:checked={pushDms} />
            <div class="s-toggle"></div>
          </div>
        </label>
      </div>
    </div>

    <div class="interactive-panel visual card">
      <h1 class="bold-title">CANVAS</h1>
      <input type="text" bind:value={wallpaperUrl} class="s-input full" placeholder="WALLPAPER URL" />
      <div class="s-slider-group">
        <span class="sl-label">OPACITY</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="s-slider" />
        <span class="sl-val">{wallpaperOpacity}</span>
      </div>
    </div>

    <button class="s-btn-huge card">SIGN OUT NOW</button>
  </div>
</div>

<style>
  .settings-pane {
    width: 100%;
    height: 100%;
    background: var(--bg);
    color: var(--text);
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    
    /* Dark Mode Defaults */
    --bg: #12121C;
    --surface: rgba(40, 40, 55, 0.4);
    --surface-hover: rgba(50, 50, 70, 0.6);
    --primary: #8585F1;
    --secondary: #A5A5E9;
    --text: #e2e2ec;
    --text-muted: #8c8cc5;
    --btn-danger: rgba(250, 87, 112, 0.8);
    --btn-danger-hover: rgba(250, 124, 144, 0.9);
    --glass-border: rgba(133, 133, 241, 0.2);
    
    /* Typography Fix */
    --font-mono: 'JetBrains Mono', monospace;
    font-family: var(--font-mono);
  }

  @media (prefers-color-scheme: light) {
    .settings-pane {
      --bg: #f8f8fc;
      --surface: rgba(255, 255, 255, 0.6);
      --surface-hover: rgba(255, 255, 255, 0.9);
      --primary: #8585F1;
      --secondary: #A5A5E9;
      --text: #2f2f3e;
      --text-muted: #6b6b8e;
      --btn-danger: #fa5770;
      --btn-danger-hover: #fa7c90;
      --glass-border: rgba(133, 133, 241, 0.3);
    }
  }

  /* Explicitly setting headers to Ubuntu */
  h1 { font-family: var(--font-sans, 'Ubuntu', sans-serif) !important; }

  .marquee-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.03;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 140px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    z-index: 0;
    color: var(--primary);
  }
  .track {
    display: inline-block;
    animation: scroll 28s linear infinite;
  }
  .track.reverse { animation-direction: reverse; }
  @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  .content {
    position: relative;
    z-index: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* Card Elegance */
  .card {
    background: var(--surface);
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
    border: 1px solid var(--glass-border);
    border-radius: 30px; /* Variation in border radius */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s, background 0.4s;
  }

  .hero-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px;
  }
  .hero-block:hover { transform: scale(1.02); background: var(--surface-hover); }
  
  .soft-input {
    background: transparent;
    border: none;
    color: var(--text);
    font-family: var(--font-mono);
    outline: none;
    text-align: center;
    width: 100%;
  }
  .soft-input.giant {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -1px;
  }
  .soft-input.sub {
    font-size: 16px;
    margin-top: 8px;
    color: var(--secondary);
  }

  .layout-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; }

  .interactive-panel {
    padding: 35px;
  }
  .interactive-panel:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 15px 40px rgba(133, 133, 241, 0.15);
    background: var(--surface-hover);
  }

  .bold-title {
    margin: 0 0 25px 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--primary);
    text-align: center;
    letter-spacing: 1px;
  }

  .s-select {
    width: 100%;
    background: rgba(133, 133, 241, 0.1);
    color: var(--text);
    border: 1px solid var(--glass-border);
    padding: 16px 20px;
    font-family: var(--font-mono);
    font-size: 14px;
    outline: none;
    appearance: none;
    cursor: pointer;
    border-radius: 20px;
    text-align: center;
    transition: all 0.3s;
  }
  .s-select:hover, .s-select:focus { 
    background: var(--primary);
    color: #fff;
  }

  .s-check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 16px;
    padding: 12px 20px;
    background: rgba(0,0,0,0.1);
    border-radius: 20px;
    transition: background 0.3s;
  }
  .s-check:hover { background: rgba(133, 133, 241, 0.1); }
  .mt { margin-top: 30px; }
  .label-text { font-size: 14px; }
  .toggle-wrapper input { display: none; }
  .s-toggle {
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.1);
    border: 1px solid var(--glass-border);
    border-radius: 9999px;
    position: relative;
    transition: 0.3s;
  }
  .s-toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: var(--text-muted);
    border-radius: 50%;
    transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .toggle-wrapper input:checked + .s-toggle { background: var(--primary); border-color: var(--primary); }
  .toggle-wrapper input:checked + .s-toggle::after {
    transform: translateX(20px);
    background: #fff;
  }

  .s-input.full {
    width: 100%;
    background: rgba(0,0,0,0.1);
    border: 1px solid var(--glass-border);
    color: var(--text);
    font-size: 14px;
    padding: 16px 20px;
    font-family: var(--font-mono);
    outline: none;
    border-radius: 20px;
    text-align: center;
    transition: all 0.3s;
  }
  .s-input.full:focus { border-color: var(--primary); box-shadow: 0 0 10px rgba(133,133,241,0.2); }

  .s-slider-group {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
    background: rgba(0,0,0,0.1);
    padding: 12px 20px;
    border-radius: 20px;
  }
  .sl-label { font-size: 14px; }
  .s-slider {
    flex: 1;
    appearance: none;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 9999px;
    outline: none;
  }
  .s-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px var(--primary);
    transition: transform 0.2s;
  }
  .s-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
  .sl-val { font-size: 14px; width: 30px; text-align: right; }

  .s-btn-huge {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    font-family: var(--font-mono);
    padding: 25px;
    cursor: pointer;
    background: var(--btn-danger);
    border: 1px solid rgba(255,255,255,0.1);
    text-align: center;
  }
  .s-btn-huge:hover {
    transform: translateY(-5px);
    background: var(--btn-danger-hover);
    box-shadow: 0 15px 30px rgba(250, 87, 112, 0.3);
  }
</style>