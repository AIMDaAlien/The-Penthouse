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

<div class="settings-pane swiss">
  <header class="swiss-header">
    <h1>SETTINGS</h1>
    <span class="meta">SYS.001 / PREF</span>
  </header>

  <div class="layout-grid">
    
    <div class="sidebar">
      <div class="nav-item active">01 IDENTITY</div>
      <div class="nav-item">02 STATUS</div>
      <div class="nav-item">03 NOTIFY</div>
      <div class="nav-item">04 DISPLAY</div>
      <div class="nav-item danger">05 LOGOUT</div>
    </div>

    <div class="main-content">
      
      <section class="block">
        <h2 class="section-num">01</h2>
        <div class="profile-area">
          <div class="avatar-box">AK</div>
          <div class="form-group">
            <label>DISPLAY NAME</label>
            <input type="text" bind:value={displayName} class="swiss-input large" />
          </div>
          <div class="form-group">
            <label>CURRENT NOTE</label>
            <input type="text" bind:value={note} class="swiss-input" />
          </div>
        </div>
      </section>

      <div class="split">
        <section class="block half">
          <h2 class="section-num">02</h2>
          <div class="form-group">
            <label>PRESENCE MODE</label>
            <select bind:value={presence} class="swiss-select">
              <option value="available">AVAILABLE</option>
              <option value="busy">BUSY</option>
              <option value="dnd">DO NOT DISTURB</option>
            </select>
          </div>
          <div class="swiss-toggle mt">
            <span>AUTO-AFK STATE</span>
            <input type="checkbox" bind:checked={autoAfk} class="toggle-cb"/>
          </div>
        </section>

        <section class="block half">
          <h2 class="section-num">03</h2>
          <div class="swiss-toggle">
            <span>MENTIONS ALERTS</span>
            <input type="checkbox" bind:checked={pushMentions} class="toggle-cb"/>
          </div>
          <div class="swiss-toggle mt-sm">
            <span>DIRECT MSG ALERTS</span>
            <input type="checkbox" bind:checked={pushDms} class="toggle-cb"/>
          </div>
        </section>
      </div>

      <section class="block last">
        <h2 class="section-num">04</h2>
        <div class="form-group">
          <label>WALLPAPER SOURCE URL</label>
          <input type="text" bind:value={wallpaperUrl} class="swiss-input" />
        </div>
        <div class="form-group row">
          <label class="w-auto">OPACITY</label>
          <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="swiss-slider" />
          <span class="val">{wallpaperOpacity}</span>
        </div>
      </section>

    </div>
  </div>
</div>

<style>
  .settings-pane.swiss {
    width: 860px;
    height: 760px;
    background: #e5e5e5; /* Swiss design often uses stark white/light gray for high contrast */
    color: #12121C;
    font-family: 'JetBrains Mono', monospace; /* Instructed to use monospace, but layout is Swiss */
    padding: 40px;
    box-sizing: border-box;
    overflow-y: auto;
    --primary: #7070da;
  }

  .swiss-header {
    border-bottom: 4px solid #12121C;
    padding-bottom: 20px;
    margin-bottom: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .swiss-header h1 {
    margin: 0;
    font-size: 48px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -2px;
  }
  .meta { font-weight: bold; font-size: 14px; }

  .layout-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 60px;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-size: 18px;
    font-weight: bold;
  }
  .nav-item {
    cursor: pointer;
    opacity: 0.5;
    transition: 0.2s;
  }
  .nav-item.active { opacity: 1; border-left: 4px solid var(--primary); padding-left: 10px; color: var(--primary); }
  .nav-item.danger { opacity: 1; color: #ff3333; margin-top: auto; padding-top: 40px;}

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .block {
    position: relative;
    border-top: 2px solid #12121C;
    padding-top: 20px;
  }
  .block.last { margin-bottom: 40px; }

  .section-num {
    position: absolute;
    top: 20px;
    right: 0;
    margin: 0;
    font-size: 24px;
    opacity: 0.2;
  }

  .profile-area { display: flex; flex-direction: column; gap: 20px; }
  .avatar-box {
    width: 120px;
    height: 120px;
    background: var(--primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 900;
  }

  .form-group { display: flex; flex-direction: column; gap: 8px; }
  .form-group.row { flex-direction: row; align-items: center; gap: 20px; }
  label { font-weight: bold; font-size: 12px; }
  .w-auto { width: auto; }

  .swiss-input {
    background: transparent;
    border: none;
    border-bottom: 2px solid #ccc;
    font-family: inherit;
    font-size: 16px;
    padding: 8px 0;
    color: #12121C;
    outline: none;
    transition: 0.2s;
  }
  .swiss-input:focus { border-color: var(--primary); }
  .swiss-input.large { font-size: 32px; font-weight: bold; }

  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }

  .swiss-select {
    background: transparent;
    border: 2px solid #12121C;
    font-family: inherit;
    font-size: 16px;
    padding: 12px;
    font-weight: bold;
    outline: none;
    width: 100%;
    cursor: pointer;
  }

  .swiss-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
    font-size: 14px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
  }
  .mt { margin-top: 30px; }
  .mt-sm { margin-top: 15px; }

  .toggle-cb {
    appearance: none;
    width: 40px;
    height: 20px;
    background: #ccc;
    border-radius: 20px;
    position: relative;
    cursor: pointer;
  }
  .toggle-cb::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: 0.2s;
  }
  .toggle-cb:checked { background: var(--primary); }
  .toggle-cb:checked::after { transform: translateX(20px); }

  .swiss-slider {
    flex: 1;
    appearance: none;
    height: 4px;
    background: #ccc;
  }
  .swiss-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 24px;
    background: #12121C;
    cursor: pointer;
  }
  .val { font-weight: bold; width: 30px; text-align: right; }

</style>
