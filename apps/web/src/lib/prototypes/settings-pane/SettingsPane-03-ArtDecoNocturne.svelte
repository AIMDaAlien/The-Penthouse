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

<div class="settings-pane art-deco">
  <div class="border-frame">
    <div class="banner">
      <div class="deco-pattern"></div>
    </div>
    
    <div class="content">
      <div class="header-arch">
        <div class="avatar-wrap">
          <div class="avatar">AK</div>
          <button class="gold-btn upload">UP</button>
        </div>
        <div class="title-group">
          <input type="text" bind:value={displayName} class="deco-input name" />
          <div class="divider-line"></div>
          <input type="text" bind:value={note} class="deco-input status" />
        </div>
      </div>

      <div class="columns">
        <div class="column">
          <div class="deco-panel">
            <h3>PRESENCE</h3>
            <select bind:value={presence} class="deco-select">
              <option value="available">AVAILABLE</option>
              <option value="busy">ENGAGED</option>
              <option value="dnd">DO NOT DISTURB</option>
            </select>
            <label class="deco-check mt">
              <input type="checkbox" bind:checked={autoAfk} />
              <span class="box"></span>
              AUTOMATIC AFK
            </label>
          </div>

          <div class="deco-panel">
            <h3>ALERTS</h3>
            <label class="deco-check">
              <input type="checkbox" bind:checked={pushMentions} />
              <span class="box"></span>
              MENTIONS
            </label>
            <label class="deco-check">
              <input type="checkbox" bind:checked={pushDms} />
              <span class="box"></span>
              DIRECT MESSAGES
            </label>
          </div>
        </div>

        <div class="column">
          <div class="deco-panel visual">
            <h3>AESTHETICS</h3>
            <input type="text" bind:value={wallpaperUrl} class="deco-input full" placeholder="IMAGE URL" />
            
            <div class="slider-wrap">
              <span>OPACITY {wallpaperOpacity}</span>
              <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="deco-slider" />
            </div>

            <div class="gallery">
              <div class="frame active"></div>
              <div class="frame"></div>
              <div class="frame"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <button class="gold-btn exit">DEPART</button>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-pane.art-deco {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
    padding: 16px;
    --primary: #7070da;
    --gold: #d4af37;
    --dark-gold: #998100;
  }

  .border-frame {
    border: 2px solid var(--primary);
    height: 100%;
    position: relative;
    padding: 2px;
  }
  .border-frame::before {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid var(--primary);
    pointer-events: none;
  }

  .banner {
    height: 140px;
    background: linear-gradient(to bottom, #12121C, #1a1a2e);
    border-bottom: 2px solid var(--primary);
    position: relative;
    overflow: hidden;
  }
  .deco-pattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(var(--primary) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.2;
  }

  .content {
    padding: 0 30px 30px;
    position: relative;
    z-index: 2;
    margin-top: -50px;
    height: calc(100% - 90px);
    display: flex;
    flex-direction: column;
  }

  .header-arch {
    display: flex;
    align-items: flex-end;
    gap: 30px;
    margin-bottom: 40px;
  }

  .avatar-wrap {
    position: relative;
    background: #12121C;
    padding: 5px;
    border-radius: 50%;
  }

  .avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 2px solid var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--primary);
    background: #1a1a2e;
    box-shadow: inset 0 0 20px rgba(112,112,218,0.2);
  }

  .upload {
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 0;
  }

  .title-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
  }

  .divider-line {
    height: 1px;
    background: var(--primary);
    width: 100%;
    position: relative;
  }
  .divider-line::after {
    content: '◈';
    position: absolute;
    right: 0;
    top: -10px;
    color: var(--primary);
    font-size: 14px;
  }

  .deco-input {
    background: transparent;
    border: none;
    color: #fff;
    font-family: inherit;
    outline: none;
  }
  .deco-input.name { font-size: 28px; letter-spacing: 2px; }
  .deco-input.status { font-size: 14px; font-style: italic; color: #aaa; }
  .deco-input.full {
    width: 100%;
    border-bottom: 1px solid rgba(112,112,218,0.5);
    padding: 8px 0;
    margin-bottom: 20px;
  }
  .deco-input.full:focus { border-color: var(--primary); }

  .columns {
    display: flex;
    gap: 40px;
    flex: 1;
  }
  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .deco-panel {
    border: 1px solid rgba(112,112,218,0.3);
    padding: 24px;
    position: relative;
    background: rgba(26,26,46,0.5);
  }
  .deco-panel::before, .deco-panel::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1px solid var(--primary);
  }
  .deco-panel::before { top: -5px; left: -5px; border-right: none; border-bottom: none; }
  .deco-panel::after { bottom: -5px; right: -5px; border-left: none; border-top: none; }

  h3 {
    margin: 0 0 20px 0;
    font-size: 14px;
    letter-spacing: 3px;
    color: var(--primary);
    text-align: center;
  }
  h3::before, h3::after { content: ' — '; opacity: 0.5; }

  .deco-select {
    width: 100%;
    background: transparent;
    border: 1px solid var(--primary);
    color: #fff;
    padding: 10px;
    font-family: inherit;
    letter-spacing: 1px;
    outline: none;
  }

  .deco-check {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 13px;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .deco-check.mt { margin-top: 20px; }
  .deco-check input { display: none; }
  .deco-check .box {
    width: 16px;
    height: 16px;
    border: 1px solid var(--primary);
    position: relative;
    transform: rotate(45deg);
    transition: 0.2s;
  }
  .deco-check input:checked + .box { background: var(--primary); }

  .slider-wrap {
    font-size: 12px;
    letter-spacing: 1px;
    margin-bottom: 24px;
  }
  .deco-slider {
    width: 100%;
    appearance: none;
    height: 1px;
    background: var(--primary);
    margin-top: 10px;
  }
  .deco-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #12121C;
    border: 2px solid var(--primary);
    transform: rotate(45deg);
    cursor: pointer;
  }

  .gallery {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
  .frame {
    width: 60px;
    height: 80px;
    border: 1px solid rgba(112,112,218,0.4);
    background: #1a1a2e;
    cursor: pointer;
    transition: 0.3s;
  }
  .frame.active {
    border-color: var(--primary);
    box-shadow: 0 0 10px rgba(112,112,218,0.3);
  }

  .footer {
    margin-top: auto;
    text-align: center;
    padding-top: 20px;
  }
  .gold-btn {
    background: transparent;
    border: 1px solid var(--primary);
    color: var(--primary);
    font-family: inherit;
    padding: 10px 30px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: 0.3s;
    text-transform: uppercase;
  }
  .gold-btn:hover {
    background: var(--primary);
    color: #12121C;
  }
  .gold-btn.exit {
    border-color: #ff4444;
    color: #ff4444;
  }
  .gold-btn.exit:hover {
    background: #ff4444;
    color: #12121C;
  }
</style>
