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

<div class="settings-pane kinetic">
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
      <input type="text" bind:value={displayName} class="kinetic-input giant" />
      <input type="text" bind:value={note} class="kinetic-input sub" />
    </div>

    <div class="flex-row">
      <div class="interactive-panel">
        <h1 class="bold-title">STATUS</h1>
        <select bind:value={presence} class="k-select">
          <option value="available">AVAILABLE NOW</option>
          <option value="busy">CURRENTLY BUSY</option>
          <option value="dnd">DO NOT DISTURB</option>
        </select>
        
        <label class="k-check mt">
          <span class="label-text">AUTO AFK</span>
          <input type="checkbox" bind:checked={autoAfk} />
          <span class="k-box"></span>
        </label>
      </div>

      <div class="interactive-panel">
        <h1 class="bold-title">ALERTS</h1>
        <label class="k-check">
          <span class="label-text">MENTIONS</span>
          <input type="checkbox" bind:checked={pushMentions} />
          <span class="k-box"></span>
        </label>
        <label class="k-check">
          <span class="label-text">DIRECT MSGS</span>
          <input type="checkbox" bind:checked={pushDms} />
          <span class="k-box"></span>
        </label>
      </div>
    </div>

    <div class="interactive-panel visual">
      <h1 class="bold-title">CANVAS</h1>
      <input type="text" bind:value={wallpaperUrl} class="k-input full" placeholder="WALLPAPER URL" />
      <div class="k-slider-group">
        <span class="sl-label">OPACITY</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="k-slider" />
        <span class="sl-val">{wallpaperOpacity}</span>
      </div>
    </div>

    <button class="k-btn-huge">SIGN OUT NOW</button>
  </div>
</div>

<style>
  .settings-pane.kinetic {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    --primary: #7070da;
    --secondary: #8282c3;
  }

  .marquee-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.05;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 120px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    z-index: 0;
  }
  .track {
    display: inline-block;
    animation: scroll 20s linear infinite;
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
  }
  .kinetic-input {
    background: transparent;
    border: none;
    color: #fff;
    font-family: inherit;
    outline: none;
    width: 100%;
  }
  .kinetic-input.giant {
    font-size: 64px;
    font-weight: 900;
    text-transform: uppercase;
    border-bottom: 8px solid var(--primary);
  }
  .kinetic-input.giant:focus { background: var(--primary); color: #12121C; }
  
  .kinetic-input.sub {
    font-size: 24px;
    margin-top: 10px;
    color: var(--secondary);
  }

  .flex-row { display: flex; gap: 40px; }

  .interactive-panel {
    flex: 1;
    background: rgba(255,255,255,0.05);
    padding: 30px;
    transition: transform 0.3s;
  }
  .interactive-panel:hover { transform: scale(1.02); background: rgba(255,255,255,0.1); }

  .bold-title {
    margin: 0 0 20px 0;
    font-size: 32px;
    font-weight: 900;
    color: var(--primary);
  }

  .k-select {
    width: 100%;
    background: #12121C;
    color: #fff;
    border: 4px solid #fff;
    padding: 15px;
    font-family: inherit;
    font-size: 18px;
    font-weight: bold;
    outline: none;
    appearance: none;
    cursor: pointer;
  }
  .k-select:focus { border-color: var(--primary); }

  .k-check {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 15px;
  }
  .mt { margin-top: 30px; }
  .label-text { font-size: 24px; font-weight: bold; }
  .k-check input { display: none; }
  .k-box {
    width: 30px;
    height: 30px;
    border: 4px solid #fff;
    transition: 0.2s;
  }
  .k-check input:checked + .k-box {
    background: var(--primary);
    border-color: var(--primary);
    transform: rotate(180deg);
  }

  .k-input.full {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 4px solid #fff;
    color: #fff;
    font-size: 20px;
    padding: 10px 0;
    font-family: inherit;
    outline: none;
  }
  .k-input.full:focus { border-color: var(--primary); }

  .k-slider-group {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
  }
  .sl-label { font-size: 20px; font-weight: bold; }
  .k-slider {
    flex: 1;
    appearance: none;
    height: 8px;
    background: #fff;
  }
  .k-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 40px;
    background: var(--primary);
    cursor: pointer;
  }
  .sl-val { font-size: 24px; font-weight: bold; width: 60px; text-align: right; }

  .k-btn-huge {
    background: #ff2222;
    color: #fff;
    border: none;
    font-size: 48px;
    font-weight: 900;
    font-family: inherit;
    padding: 20px;
    cursor: pointer;
    transition: 0.2s;
  }
  .k-btn-huge:hover {
    background: #fff;
    color: #ff2222;
    letter-spacing: 5px;
  }

</style>
