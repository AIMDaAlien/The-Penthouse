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

<div class="settings-pane organic">
  <div class="blob bg-blob-1"></div>
  <div class="blob bg-blob-2"></div>
  
  <div class="content-layer">
    <div class="header-blob">
      <div class="avatar-blob">AK</div>
      <div class="header-text">
        <input type="text" bind:value={displayName} class="blob-input title" />
        <input type="text" bind:value={note} class="blob-input subtitle" />
      </div>
    </div>

    <div class="card-container">
      <div class="blob-card">
        <h3>Vibe</h3>
        <select bind:value={presence} class="blob-select">
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="dnd">DND</option>
        </select>
        <label class="blob-check mt">
          <input type="checkbox" bind:checked={autoAfk} />
          <span class="bubble"></span>
          Auto-AFK
        </label>
      </div>

      <div class="blob-card">
        <h3>Pings</h3>
        <label class="blob-check">
          <input type="checkbox" bind:checked={pushMentions} />
          <span class="bubble"></span>
          Mentions
        </label>
        <label class="blob-check mt">
          <input type="checkbox" bind:checked={pushDms} />
          <span class="bubble"></span>
          DMs
        </label>
      </div>
    </div>

    <div class="blob-card wide">
      <h3>Backdrop</h3>
      <input type="text" bind:value={wallpaperUrl} class="blob-input full" />
      <div class="slider-wrap">
        <span>Opacity</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="blob-slider" />
      </div>
    </div>

    <div class="actions">
      <button class="blob-btn logout">Farewell</button>
    </div>
  </div>
</div>

<style>
  .settings-pane.organic {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
    overflow: hidden;
    padding: 40px;
    --primary: #7070da;
    --secondary: #8282c3;
    --tertiary: #567dd4;
  }

  .blob {
    position: absolute;
    filter: blur(40px);
    opacity: 0.3;
    z-index: 0;
    animation: morph 15s ease-in-out infinite alternate;
  }
  .bg-blob-1 {
    width: 400px;
    height: 400px;
    background: var(--primary);
    top: -100px;
    left: -100px;
  }
  .bg-blob-2 {
    width: 500px;
    height: 500px;
    background: var(--tertiary);
    bottom: -150px;
    right: -100px;
    animation-delay: -5s;
  }

  @keyframes morph {
    0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(360deg); }
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

  .header-blob {
    display: flex;
    align-items: center;
    gap: 30px;
    background: rgba(255,255,255,0.05);
    padding: 20px;
    border-radius: 100px;
    backdrop-filter: blur(10px);
  }

  .avatar-blob {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, var(--primary), var(--tertiary));
    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: bold;
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }

  .blob-input {
    background: transparent;
    border: none;
    color: #fff;
    font-family: inherit;
    outline: none;
  }
  .title { font-size: 28px; font-weight: bold; }
  .subtitle { font-size: 16px; opacity: 0.7; }
  .full {
    width: 100%;
    background: rgba(0,0,0,0.2);
    padding: 15px;
    border-radius: 20px;
    margin-top: 10px;
  }

  .card-container {
    display: flex;
    gap: 30px;
  }

  .blob-card {
    flex: 1;
    background: rgba(255,255,255,0.03);
    padding: 30px;
    border-radius: 30px 50px 40px 30px;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .blob-card.wide { flex: none; width: 100%; border-radius: 40px 30px 50px 40px; }

  h3 { margin: 0 0 20px 0; font-weight: normal; color: var(--secondary); font-size: 20px; }

  .blob-select {
    width: 100%;
    background: rgba(0,0,0,0.2);
    color: #fff;
    border: none;
    padding: 15px;
    border-radius: 20px;
    font-family: inherit;
    outline: none;
  }

  .blob-check {
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
  }
  .mt { margin-top: 20px; }
  .blob-check input { display: none; }
  .bubble {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--primary);
    position: relative;
    transition: 0.3s;
  }
  .blob-check input:checked + .bubble {
    background: var(--primary);
    transform: scale(1.1);
  }

  .slider-wrap {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 20px;
  }
  .blob-slider {
    flex: 1;
    appearance: none;
    height: 8px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
  }
  .blob-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: var(--primary);
    border-radius: 40% 60% 50% 40%;
    cursor: pointer;
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
  .blob-btn {
    background: rgba(255,50,50,0.2);
    color: #ff5555;
    border: none;
    padding: 15px 40px;
    border-radius: 30px;
    font-family: inherit;
    font-size: 16px;
    cursor: pointer;
    transition: 0.3s;
  }
  .blob-btn:hover {
    background: #ff5555;
    color: #fff;
    border-radius: 40% 60% 70% 30%;
  }

</style>
