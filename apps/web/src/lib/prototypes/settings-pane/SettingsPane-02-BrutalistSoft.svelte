<script>
  let displayName = "Alex Kimi";
  let presence = "available";
  let note = "In deep focus mode";
  let autoAfk = true;
  let pushMentions = true;
  let pushDms = true;
  let wallpaperUrl = "https://example.com/wall.jpg";
  let wallpaperOpacity = 80;
  let theme = "dark";
</script>

<div class="settings-pane brutalist-soft">
  <div class="banner">
    <div class="stripe"></div>
    <div class="stripe"></div>
    <div class="stripe"></div>
  </div>
  
  <div class="content">
    <div class="profile-block neo-box">
      <div class="avatar-group">
        <div class="avatar">AK</div>
        <button class="brutal-btn upload-btn">EDIT</button>
      </div>
      <div class="info-group">
        <input type="text" bind:value={displayName} class="brutal-input mega-text" />
        <input type="text" bind:value={note} class="brutal-input note-text" />
      </div>
    </div>

    <div class="grid-layout">
      <div class="neo-box presence-box">
        <h3 class="brutal-title">STATUS</h3>
        <select bind:value={presence} class="brutal-input">
          <option value="available">AVAILABLE</option>
          <option value="busy">BUSY</option>
          <option value="dnd">DND</option>
          <option value="afk">AFK</option>
        </select>
        <div class="brutal-toggle mt-4">
          <input type="checkbox" id="afk1" bind:checked={autoAfk} />
          <label for="afk1">AUTO-AFK</label>
        </div>
      </div>

      <div class="neo-box notify-box">
        <h3 class="brutal-title">ALERTS</h3>
        <div class="brutal-check">
          <input type="checkbox" id="p1" bind:checked={pushMentions} />
          <label for="p1">MENTIONS</label>
        </div>
        <div class="brutal-check">
          <input type="checkbox" id="p2" bind:checked={pushDms} />
          <label for="p2">DMS</label>
        </div>
      </div>
    </div>

    <div class="neo-box wallpaper-box">
      <h3 class="brutal-title">WALLPAPER</h3>
      <input type="text" bind:value={wallpaperUrl} class="brutal-input full-w" placeholder="URL" />
      <div class="slider-group">
        <span>OPACITY: {wallpaperOpacity}%</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="brutal-slider" />
      </div>
      <div class="wall-grid">
        <div class="wall-item active"></div>
        <div class="wall-item"></div>
        <div class="wall-item"></div>
      </div>
    </div>

    <button class="brutal-btn logout-btn">TERMINATE SESSION</button>
  </div>
</div>

<style>
  .settings-pane.brutalist-soft {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    overflow-y: auto;
    --primary: #7070da;
    --secondary: #8282c3;
    --tertiary: #567dd4;
    --neutral: #12121C;
    padding: 20px;
  }

  .banner {
    height: 120px;
    background: var(--primary);
    border: 4px solid #fff;
    border-radius: 12px;
    margin-bottom: -60px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    overflow: hidden;
    box-shadow: 8px 8px 0 var(--secondary);
  }
  .stripe {
    height: 10px;
    background: #12121C;
    width: 100%;
    transform: skewY(-2deg);
  }

  .content {
    position: relative;
    z-index: 2;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-bottom: 40px;
  }

  .neo-box {
    background: var(--neutral);
    border: 4px solid #fff;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 8px 8px 0 var(--primary);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .neo-box:hover {
    transform: translate(-4px, -4px);
    box-shadow: 12px 12px 0 var(--primary);
  }

  .profile-block {
    display: flex;
    gap: 24px;
    align-items: flex-end;
  }

  .avatar-group {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    width: 100px;
    height: 100px;
    background: var(--tertiary);
    border: 4px solid #fff;
    border-radius: 12px; /* Soft brutalism: rounded corners instead of sharp */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 900;
  }

  .info-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .brutal-input {
    background: #12121C;
    border: 3px solid #fff;
    color: #fff;
    padding: 12px;
    font-family: inherit;
    font-weight: bold;
    border-radius: 8px;
    outline: none;
    transition: all 0.2s;
  }
  .brutal-input:focus {
    background: var(--primary);
    color: #12121C;
  }

  .mega-text { font-size: 28px; text-transform: uppercase; }
  .note-text { font-size: 16px; border-style: dashed; }

  .grid-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .brutal-title {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    border-bottom: 4px solid var(--secondary);
    display: inline-block;
    padding-bottom: 4px;
  }

  .brutal-btn {
    background: var(--primary);
    color: #fff;
    border: 3px solid #fff;
    padding: 10px 20px;
    font-family: inherit;
    font-weight: 900;
    cursor: pointer;
    border-radius: 8px;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 #fff;
    transition: all 0.1s;
  }
  .brutal-btn:active {
    transform: translate(4px, 4px);
    box-shadow: 0 0 0 #fff;
  }

  .mt-4 { margin-top: 16px; }

  .brutal-toggle input[type="checkbox"], .brutal-check input[type="checkbox"] {
    appearance: none;
    width: 24px;
    height: 24px;
    border: 3px solid #fff;
    background: #12121C;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    vertical-align: middle;
    margin-right: 10px;
  }
  .brutal-toggle input:checked, .brutal-check input:checked {
    background: var(--primary);
  }
  .brutal-toggle input:checked::after, .brutal-check input:checked::after {
    content: "✖";
    position: absolute;
    top: -2px;
    left: 2px;
    color: #fff;
    font-weight: 900;
  }

  .brutal-toggle label, .brutal-check label {
    font-weight: bold;
    cursor: pointer;
    vertical-align: middle;
  }

  .full-w { width: 100%; margin-bottom: 16px; }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 16px;
    font-weight: bold;
    margin-bottom: 16px;
  }
  .brutal-slider {
    appearance: none;
    flex: 1;
    height: 12px;
    background: #fff;
    border-radius: 6px;
  }
  .brutal-slider::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--tertiary);
    border: 3px solid #12121C;
    border-radius: 4px;
    cursor: pointer;
  }

  .wall-grid {
    display: flex;
    gap: 12px;
  }
  .wall-item {
    width: 100px;
    height: 60px;
    border: 3px solid #fff;
    border-radius: 8px;
    background: repeating-linear-gradient(45deg, var(--primary), var(--primary) 10px, var(--neutral) 10px, var(--neutral) 20px);
    cursor: pointer;
  }
  .wall-item.active {
    border-color: var(--tertiary);
    box-shadow: 4px 4px 0 var(--tertiary);
  }

  .logout-btn {
    background: #ff3366;
    font-size: 20px;
    padding: 16px;
    text-align: center;
    margin-top: 10px;
  }
  .logout-btn:hover { background: #ff1a53; }
</style>
