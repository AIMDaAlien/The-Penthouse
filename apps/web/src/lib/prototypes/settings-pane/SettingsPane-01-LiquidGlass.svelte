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

<div class="settings-pane liquid-glass">
  <div class="banner">
    <div class="glass-overlay"></div>
  </div>
  
  <div class="content">
    <div class="header">
      <div class="avatar-container">
        <div class="avatar">AK</div>
        <button class="upload-btn">📷</button>
      </div>
      <div class="user-info">
        <input type="text" bind:value={displayName} class="glass-input name-input" />
        <input type="text" bind:value={note} class="glass-input note-input" placeholder="Set a status..." />
      </div>
    </div>

    <div class="glass-card">
      <h3>Presence & Status</h3>
      <div class="row">
        <select bind:value={presence} class="glass-select">
          <option value="available">🟢 Available</option>
          <option value="busy">🔴 Busy</option>
          <option value="dnd">⛔ Do Not Disturb</option>
          <option value="afk">🌙 AFK</option>
          <option value="offline">⚫ Offline</option>
        </select>
        <label class="toggle">
          <input type="checkbox" bind:checked={autoAfk} />
          <span class="slider"></span>
          Auto-AFK
        </label>
      </div>
    </div>

    <div class="glass-card">
      <h3>Notifications</h3>
      <div class="checkbox-group">
        <label><input type="checkbox" bind:checked={pushMentions} /> <span>Mentions</span></label>
        <label><input type="checkbox" bind:checked={pushDms} /> <span>Direct Messages</span></label>
      </div>
    </div>

    <div class="glass-card wallpaper-manager">
      <h3>Appearance</h3>
      <div class="input-group">
        <label>Wallpaper URL</label>
        <input type="text" bind:value={wallpaperUrl} class="glass-input" />
      </div>
      <div class="input-group">
        <label>Opacity ({wallpaperOpacity}%)</label>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="glass-slider" />
      </div>
      <div class="saved-walls">
        <div class="wall-thumb active"></div>
        <div class="wall-thumb"></div>
        <div class="wall-thumb"></div>
      </div>
    </div>

    <div class="actions">
      <button class="glass-button logout">Logout</button>
    </div>
  </div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  .settings-pane.liquid-glass {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
    overflow-y: auto;
    --primary: #7070da;
    --secondary: #8282c3;
    --tertiary: #567dd4;
    --neutral: #12121C;
  }

  .banner {
    height: 180px;
    background: linear-gradient(135deg, var(--primary), var(--tertiary));
    position: relative;
    overflow: hidden;
  }
  .glass-overlay {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.1);
  }

  .content {
    padding: 0 40px 40px;
    margin-top: -60px;
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .header {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 20px;
  }

  .avatar-container {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(15px);
    border: 2px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: bold;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }

  .upload-btn {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary);
    border: none;
    color: white;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .upload-btn:hover { transform: scale(1.1); }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 10px;
  }

  .glass-input, .glass-select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    backdrop-filter: blur(5px);
    font-family: inherit;
    transition: all 0.3s;
  }
  .glass-input:focus, .glass-select:focus {
    outline: none;
    border-color: var(--primary);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 15px rgba(112, 112, 218, 0.3);
  }

  .name-input { font-size: 24px; font-weight: bold; }
  .note-input { font-size: 14px; opacity: 0.8; }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, border-color 0.3s ease;
  }
  .glass-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.1);
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: var(--secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .row { display: flex; gap: 20px; align-items: center; }

  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  .toggle input { display: none; }
  .slider {
    width: 40px;
    height: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 20px;
    position: relative;
    transition: 0.3s;
  }
  .slider::before {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: 0.3s;
  }
  .toggle input:checked + .slider { background: var(--primary); }
  .toggle input:checked + .slider::before { transform: translateX(20px); }

  .checkbox-group { display: flex; flex-direction: column; gap: 10px; }
  .checkbox-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .checkbox-group input { accent-color: var(--primary); width: 18px; height: 18px; }

  .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

  .glass-slider {
    appearance: none;
    background: rgba(255,255,255,0.1);
    height: 6px;
    border-radius: 3px;
    outline: none;
  }
  .glass-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
    box-shadow: 0 0 10px var(--primary);
  }

  .saved-walls { display: flex; gap: 10px; }
  .wall-thumb {
    width: 80px;
    height: 60px;
    border-radius: 8px;
    background: linear-gradient(45deg, var(--tertiary), var(--secondary));
    cursor: pointer;
    border: 2px solid transparent;
    transition: 0.3s;
  }
  .wall-thumb.active { border-color: white; transform: scale(1.05); }

  .glass-button {
    background: rgba(112, 112, 218, 0.2);
    border: 1px solid var(--primary);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    font-weight: bold;
    backdrop-filter: blur(5px);
    transition: 0.3s;
    width: 100%;
  }
  .glass-button:hover {
    background: var(--primary);
    box-shadow: 0 0 20px rgba(112, 112, 218, 0.4);
  }
  .glass-button.logout {
    border-color: #ff4444;
    color: #ff4444;
    background: rgba(255, 68, 68, 0.1);
  }
  .glass-button.logout:hover {
    background: #ff4444;
    color: white;
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);
  }

  @keyframes pulseGlow {
    0% { box-shadow: 0 0 15px rgba(112,112,218,0.2); }
    50% { box-shadow: 0 0 25px rgba(112,112,218,0.5); }
    100% { box-shadow: 0 0 15px rgba(112,112,218,0.2); }
  }
</style>
