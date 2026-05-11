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

<div class="settings-pane zen-grid">
  <div class="grid-container">
    
    <div class="cell banner-cell">
      <div class="minimal-banner"></div>
    </div>

    <div class="cell profile-cell">
      <div class="avatar-col">
        <div class="avatar">AK</div>
        <button class="text-btn">Change</button>
      </div>
      <div class="info-col">
        <input type="text" bind:value={displayName} class="zen-input big" />
        <input type="text" bind:value={note} class="zen-input small" />
      </div>
    </div>

    <div class="cell settings-cell">
      <div class="sub-grid">
        
        <div class="section">
          <span class="label">Presence</span>
          <select bind:value={presence} class="zen-select">
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="dnd">Do Not Disturb</option>
          </select>
          <label class="zen-check mt-1">
            <input type="checkbox" bind:checked={autoAfk} />
            <span class="indicator"></span>
            Auto-AFK
          </label>
        </div>

        <div class="section">
          <span class="label">Notifications</span>
          <label class="zen-check">
            <input type="checkbox" bind:checked={pushMentions} />
            <span class="indicator"></span>
            Mentions
          </label>
          <label class="zen-check">
            <input type="checkbox" bind:checked={pushDms} />
            <span class="indicator"></span>
            Direct Messages
          </label>
        </div>

      </div>
    </div>

    <div class="cell visual-cell">
      <span class="label">Environment</span>
      <input type="text" bind:value={wallpaperUrl} class="zen-input outline full" placeholder="Wallpaper URL" />
      
      <div class="flex-row">
        <span class="sub-label">Opacity</span>
        <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="zen-slider" />
        <span class="val">{wallpaperOpacity}%</span>
      </div>

      <div class="thumb-row">
        <div class="thumb active"></div>
        <div class="thumb"></div>
        <div class="thumb"></div>
      </div>
    </div>

    <div class="cell footer-cell">
      <button class="zen-btn logout">Sign Out</button>
    </div>

  </div>
</div>

<style>
  .settings-pane.zen-grid {
    width: 860px;
    height: 760px;
    background: #12121C;
    color: #e2e2e2;
    font-family: 'JetBrains Mono', monospace;
    padding: 40px;
    --primary: #7070da;
    --border: rgba(255,255,255,0.1);
  }

  .grid-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: 100px auto 1fr auto;
    gap: 40px;
    height: 100%;
  }

  .cell {
    position: relative;
  }
  
  .banner-cell {
    grid-column: 1 / -1;
  }
  .minimal-banner {
    height: 100%;
    width: 100%;
    background: var(--primary);
    opacity: 0.1;
    border-radius: 2px;
  }

  .profile-cell {
    grid-column: 1 / -1;
    display: flex;
    gap: 40px;
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    padding-bottom: 40px;
  }

  .avatar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    border: 1px solid var(--primary);
    color: var(--primary);
  }

  .text-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
  }
  .text-btn:hover { color: #fff; }

  .info-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
  }

  .zen-input {
    background: transparent;
    border: none;
    color: #fff;
    font-family: inherit;
    outline: none;
    padding: 0;
  }
  .zen-input.big { font-size: 32px; font-weight: 300; }
  .zen-input.small { font-size: 14px; color: #888; }
  .zen-input.outline {
    border: 1px solid var(--border);
    padding: 12px;
    border-radius: 2px;
    transition: 0.2s;
  }
  .zen-input.outline:focus { border-color: var(--primary); }
  .zen-input.full { width: 100%; margin-bottom: 24px; }

  .settings-cell {
    grid-column: 1 / 2;
    border-right: 1px solid var(--border);
    padding-right: 40px;
  }

  .sub-grid {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #666;
    margin-bottom: 16px;
  }

  .zen-select {
    width: 100%;
    background: #1a1a2e;
    border: 1px solid var(--border);
    color: #fff;
    padding: 12px;
    border-radius: 2px;
    font-family: inherit;
    outline: none;
    margin-bottom: 16px;
  }

  .zen-check {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 12px;
    color: #aaa;
    transition: 0.2s;
  }
  .zen-check:hover { color: #fff; }
  .zen-check input { display: none; }
  .indicator {
    width: 12px;
    height: 12px;
    border: 1px solid #666;
    border-radius: 50%;
    transition: 0.2s;
  }
  .zen-check input:checked + .indicator {
    background: var(--primary);
    border-color: var(--primary);
  }

  .visual-cell {
    grid-column: 2 / 3;
  }

  .flex-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }
  .sub-label { font-size: 12px; color: #888; }
  .val { font-size: 12px; color: #fff; width: 30px; }
  
  .zen-slider {
    flex: 1;
    appearance: none;
    height: 2px;
    background: var(--border);
  }
  .zen-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
  }

  .thumb-row {
    display: flex;
    gap: 16px;
  }
  .thumb {
    width: 80px;
    height: 80px;
    background: #1a1a2e;
    border-radius: 2px;
    cursor: pointer;
    transition: 0.2s;
    opacity: 0.5;
  }
  .thumb:hover { opacity: 0.8; }
  .thumb.active { opacity: 1; box-shadow: inset 0 0 0 2px var(--primary); }

  .footer-cell {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
  }

  .zen-btn {
    background: transparent;
    border: none;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
    padding: 10px 0;
    position: relative;
  }
  .zen-btn::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0%;
    height: 1px;
    background: #fff;
    transition: 0.3s;
  }
  .zen-btn:hover::after { width: 100%; }
  .zen-btn.logout { color: #ff5555; }
  .zen-btn.logout::after { background: #ff5555; }

</style>
