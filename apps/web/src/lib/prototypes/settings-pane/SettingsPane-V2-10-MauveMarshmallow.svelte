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

<div class="settings-pane soft-kinetic">
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
    
    <div class="hero-block">
      <input type="text" bind:value={displayName} class="soft-input giant" />
      <input type="text" bind:value={note} class="soft-input sub" />
    </div>

    <div class="flex-row">
      <div class="interactive-panel">
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

      <div class="interactive-panel">
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

    <div class="interactive-panel visual">
      <h1 class="bold-title">CANVAS</h1>
      <input type="text" bind:value={wallpaperUrl} class="s-input full" placeholder="WALLPAPER URL" />
      <div class="s-slider-group">
        <span class="sl-label">OPACITY</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="s-slider" />
        <span class="sl-val">{wallpaperOpacity}</span>
      </div>
    </div>

    <button class="s-btn-huge">SIGN OUT NOW</button>
  </div>
</div>

<style>
  .settings-pane.soft-kinetic {
    width: 860px;
    height: 760px;
    background: var(--bg);
    color: var(--text);
    font-family: 'Nunito', 'Quicksand', system-ui, sans-serif;
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    
    /* Dark Mode Defaults */
    --bg: #272134;
    --surface: #362e45;
    --primary: #bcacf4;
    --secondary: #d1c5fa;
    --text: #efeaf7;
    --btn-danger: #fc6488;
    --btn-danger-hover: #fc90a9;
  }

  @media (prefers-color-scheme: light) {
    .settings-pane.soft-kinetic {
      --bg: #faf7ff;
      --surface: #e9e4f2;
      --primary: #9b81d6;
      --secondary: #b5a2e6;
      --text: #413751;
      --btn-danger: #fc6488;
      --btn-danger-hover: #fc90a9;
    }
  }

  .marquee-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.05;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 140px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    z-index: 0;
  }
  .track {
    display: inline-block;
    animation: scroll 25s linear infinite;
  }
  .track.reverse { animation-direction: reverse; }
  @keyframes scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .content {
    position: relative;
    z-index: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .hero-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--surface);
    padding: 30px;
    border-radius: 9999px;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .hero-block:hover { transform: scale(1.03); }
  
  .soft-input {
    background: transparent;
    border: none;
    color: var(--text);
    font-family: inherit;
    outline: none;
    text-align: center;
    width: 100%;
  }
  .soft-input.giant {
    font-size: 56px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -1px;
  }
  .soft-input.sub {
    font-size: 20px;
    margin-top: 5px;
    color: var(--primary);
    font-weight: bold;
  }

  .flex-row { display: flex; gap: 30px; }

  .interactive-panel {
    flex: 1;
    background: var(--surface);
    padding: 35px;
    border-radius: 40px;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  }
  .interactive-panel:hover { 
    transform: translateY(-5px) scale(1.02); 
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }

  .bold-title {
    margin: 0 0 25px 0;
    font-size: 28px;
    font-weight: 900;
    color: var(--primary);
    text-align: center;
    letter-spacing: 1px;
  }

  .s-select {
    width: 100%;
    background: var(--bg);
    color: var(--text);
    border: none;
    padding: 20px 25px;
    font-family: inherit;
    font-size: 16px;
    font-weight: bold;
    outline: none;
    appearance: none;
    cursor: pointer;
    border-radius: 9999px;
    text-align: center;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-select:hover, .s-select:focus { 
    transform: scale(1.05);
    background: var(--primary);
    color: var(--bg);
  }

  .s-check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 20px;
    padding: 15px 25px;
    background: var(--bg);
    border-radius: 9999px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-check:hover { transform: scale(1.03); }
  .mt { margin-top: 30px; }
  .label-text { font-size: 16px; font-weight: bold; }
  .toggle-wrapper input { display: none; }
  .s-toggle {
    width: 50px;
    height: 28px;
    background: var(--surface);
    border-radius: 9999px;
    position: relative;
    transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-toggle::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    background: var(--text);
    border-radius: 50%;
    transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .toggle-wrapper input:checked + .s-toggle {
    background: var(--primary);
  }
  .toggle-wrapper input:checked + .s-toggle::after {
    transform: translateX(22px);
    background: var(--bg);
  }

  .s-input.full {
    width: 100%;
    background: var(--bg);
    border: none;
    color: var(--text);
    font-size: 16px;
    padding: 20px 25px;
    font-family: inherit;
    outline: none;
    border-radius: 9999px;
    text-align: center;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-input.full:hover, .s-input.full:focus { 
    transform: scale(1.02);
  }

  .s-slider-group {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
    background: var(--bg);
    padding: 15px 25px;
    border-radius: 9999px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-slider-group:hover { transform: scale(1.02); }
  .sl-label { font-size: 16px; font-weight: bold; }
  .s-slider {
    flex: 1;
    appearance: none;
    height: 12px;
    background: var(--surface);
    border-radius: 9999px;
    outline: none;
  }
  .s-slider::-webkit-slider-thumb {
    appearance: none;
    width: 28px;
    height: 28px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .s-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
  .sl-val { font-size: 18px; font-weight: bold; width: 40px; text-align: right; }

  .s-btn-huge {
    background: var(--btn-danger);
    color: #fff;
    border: none;
    font-size: 32px;
    font-weight: 900;
    font-family: inherit;
    padding: 25px;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 10px 20px rgba(255, 107, 107, 0.2);
  }
  .s-btn-huge:hover {
    transform: translateY(-5px) scale(1.02);
    background: var(--btn-danger-hover);
    box-shadow: 0 15px 30px rgba(255, 107, 107, 0.3);
  }
</style>