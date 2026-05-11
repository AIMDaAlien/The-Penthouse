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

<div class="settings-pane vaporwave">
  <div class="sun"></div>
  <div class="grid-floor"></div>

  <div class="content-layer">
    <div class="neon-box header">
      <div class="avatar-hex">AK</div>
      <div class="inputs">
        <input type="text" bind:value={displayName} class="vapor-input glow-text big" />
        <input type="text" bind:value={note} class="vapor-input synth-text" />
      </div>
    </div>

    <div class="panels">
      <div class="neon-box panel">
        <h2>:: SYS_STATUS ::</h2>
        <select bind:value={presence} class="vapor-select">
          <option value="available">ONLINE</option>
          <option value="busy">PROCESSING</option>
          <option value="dnd">SHIELD_UP</option>
        </select>
        <label class="vapor-toggle">
          <input type="checkbox" bind:checked={autoAfk} />
          <span class="track"></span>
          AUTO_SLEEP
        </label>
      </div>

      <div class="neon-box panel">
        <h2>:: COMMS_LINK ::</h2>
        <label class="vapor-toggle">
          <input type="checkbox" bind:checked={pushMentions} />
          <span class="track"></span>
          PING_DIRECT
        </label>
        <label class="vapor-toggle">
          <input type="checkbox" bind:checked={pushDms} />
          <span class="track"></span>
          MSG_STREAM
        </label>
      </div>
    </div>

    <div class="neon-box full-panel">
      <h2>:: HOLODECK_CFG ::</h2>
      <input type="text" bind:value={wallpaperUrl} class="vapor-input full" placeholder="ENTER_URL" />
      
      <div class="scanline-slider">
        <span>FADE_LVL</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} />
        <span>{wallpaperOpacity}%</span>
      </div>
    </div>

    <button class="vapor-btn logout">EJECT_DRIVE</button>
  </div>
</div>

<style>
  .settings-pane.vaporwave {
    width: 860px;
    height: 760px;
    background: #0b0b1a;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
    overflow: hidden;
    padding: 40px;
    --primary: #7070da;
    --secondary: #8282c3;
    --tertiary: #567dd4;
    --neon-blue: #00ffff;
    --neon-pink: #ff00ff;
  }

  /* Overriding standard synthwave colors to fit the mandated palette while keeping the vibe */
  .settings-pane.vaporwave {
    --neon-pink: #8282c3; 
    --neon-blue: #7070da;
  }

  .sun {
    position: absolute;
    width: 300px;
    height: 300px;
    background: linear-gradient(var(--secondary), transparent);
    border-radius: 50%;
    top: -50px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 100px var(--primary);
    z-index: 0;
  }

  .grid-floor {
    position: absolute;
    bottom: 0;
    left: -50%;
    width: 200%;
    height: 300px;
    background-image: 
      linear-gradient(rgba(112, 112, 218, 0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(112, 112, 218, 0.5) 1px, transparent 1px);
    background-size: 40px 40px;
    transform: perspective(500px) rotateX(60deg);
    z-index: 0;
  }

  .content-layer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 30px;
    height: 100%;
    overflow-y: auto;
  }

  .neon-box {
    background: rgba(11, 11, 26, 0.8);
    border: 2px solid var(--primary);
    box-shadow: inset 0 0 10px var(--primary), 0 0 10px var(--primary);
    padding: 20px;
    backdrop-filter: blur(5px);
  }

  .header { display: flex; gap: 30px; align-items: center; }

  .avatar-hex {
    width: 100px;
    height: 100px;
    background: var(--tertiary);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 900;
    color: #12121C;
    box-shadow: 0 0 20px var(--tertiary);
  }

  .inputs { flex: 1; display: flex; flex-direction: column; gap: 10px; }

  .vapor-input {
    background: transparent;
    border: none;
    font-family: inherit;
    outline: none;
  }
  .glow-text {
    color: #fff;
    text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px var(--primary), 0 0 40px var(--primary);
  }
  .big { font-size: 36px; font-weight: 900; font-style: italic; }
  .synth-text { color: var(--secondary); font-size: 16px; letter-spacing: 2px; }

  .panels { display: flex; gap: 30px; }
  .panel { flex: 1; display: flex; flex-direction: column; gap: 20px; }

  h2 { margin: 0; font-size: 16px; color: var(--secondary); text-shadow: 0 0 5px var(--secondary); letter-spacing: 2px; }

  .vapor-select {
    background: transparent;
    border: 1px solid var(--tertiary);
    color: var(--tertiary);
    padding: 10px;
    font-family: inherit;
    font-weight: bold;
    outline: none;
    box-shadow: inset 0 0 5px var(--tertiary);
  }
  .vapor-select option { background: #0b0b1a; }

  .vapor-toggle {
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    font-weight: bold;
    color: #ccc;
  }
  .vapor-toggle input { display: none; }
  .track {
    width: 50px;
    height: 10px;
    background: #222;
    position: relative;
    box-shadow: inset 0 0 5px #000;
  }
  .track::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: #555;
    top: -5px;
    left: 0;
    transition: 0.3s;
  }
  .vapor-toggle input:checked + .track { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
  .vapor-toggle input:checked + .track::after {
    left: 30px;
    background: #fff;
    box-shadow: 0 0 10px #fff;
  }

  .vapor-input.full {
    width: 100%;
    border-bottom: 2px solid var(--primary);
    padding: 10px 0;
    color: var(--primary);
    margin-top: 10px;
  }

  .scanline-slider {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 30px;
    font-weight: bold;
    color: var(--secondary);
  }
  .scanline-slider input[type="range"] {
    flex: 1;
    appearance: none;
    height: 4px;
    background: var(--tertiary);
    box-shadow: 0 0 5px var(--tertiary);
  }
  .scanline-slider input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 30px;
    background: #fff;
    box-shadow: 0 0 10px #fff;
    cursor: pointer;
  }

  .vapor-btn {
    align-self: center;
    background: transparent;
    border: 2px solid #ff3366;
    color: #ff3366;
    padding: 15px 40px;
    font-family: inherit;
    font-weight: 900;
    letter-spacing: 4px;
    cursor: pointer;
    box-shadow: inset 0 0 10px #ff3366, 0 0 10px #ff3366;
    transition: 0.2s;
    text-transform: uppercase;
  }
  .vapor-btn:hover {
    background: #ff3366;
    color: #12121C;
  }
</style>
