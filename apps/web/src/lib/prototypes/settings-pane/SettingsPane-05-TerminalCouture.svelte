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

<div class="settings-pane terminal">
  <div class="crt-overlay"></div>
  
  <div class="window">
    <div class="title-bar">
      <span>root@the-penthouse:~# ./configure_settings.sh</span>
      <div class="controls">
        <span>_</span>
        <span>□</span>
        <span>×</span>
      </div>
    </div>

    <div class="term-content">
      <div class="ascii-banner">
        <pre>
 ____       _   _   _                 
/ ___|  ___| |_| |_(_)_ __   __ _ ___ 
\___ \ / _ \ __| __| | '_ \ / _` / __|
 ___) |  __/ |_| |_| | | | | (_| \__ \
|____/ \___|\__|\__|_|_| |_|\__, |___/
                            |___/     
        </pre>
      </div>

      <div class="line">
        <span class="prompt">$</span> <span class="cmd">whoami</span>
      </div>
      <div class="block profile">
        <div class="avatar">[img: AK]</div>
        <div class="fields">
          <div class="input-line">
            <span class="key">USER=</span>
            <input type="text" bind:value={displayName} class="term-input" />
          </div>
          <div class="input-line">
            <span class="key">STATUS_MOTD=</span>
            <input type="text" bind:value={note} class="term-input" />
          </div>
        </div>
      </div>

      <div class="line mt">
        <span class="prompt">$</span> <span class="cmd">systemctl status presence_daemon</span>
      </div>
      <div class="block">
        <select bind:value={presence} class="term-select">
          <option value="available">[OK] AVAILABLE</option>
          <option value="busy">[WARN] BUSY</option>
          <option value="dnd">[ERR] DND</option>
        </select>
        <div class="checkbox-line">
          <span class="key">AUTO_AFK_SERVICE: </span>
          <input type="checkbox" bind:checked={autoAfk} class="term-checkbox"/>
        </div>
      </div>

      <div class="line mt">
        <span class="prompt">$</span> <span class="cmd">cat /etc/notifications.conf</span>
      </div>
      <div class="block">
        <div class="checkbox-line">
          <span class="key">ALLOW_MENTIONS=</span>
          <input type="checkbox" bind:checked={pushMentions} class="term-checkbox"/>
        </div>
        <div class="checkbox-line">
          <span class="key">ALLOW_DMS=</span>
          <input type="checkbox" bind:checked={pushDms} class="term-checkbox"/>
        </div>
      </div>

      <div class="line mt">
        <span class="prompt">$</span> <span class="cmd">export DISPLAY_VARS</span>
      </div>
      <div class="block visual">
        <div class="input-line">
          <span class="key">WALLPAPER_SRC=</span>
          <input type="text" bind:value={wallpaperUrl} class="term-input full" />
        </div>
        <div class="input-line">
          <span class="key">ALPHA_CHANNEL=</span>
          <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="term-slider" />
          <span class="val">[{wallpaperOpacity}%]</span>
        </div>
      </div>

      <div class="line mt">
        <span class="prompt">$</span> <span class="cmd">exit</span>
        <button class="term-btn">EXECUTE_LOGOUT</button>
      </div>

      <div class="cursor-line">
        <span class="prompt">$</span> <span class="cursor">_</span>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-pane.terminal {
    width: 860px;
    height: 760px;
    background: #0a0a0a;
    color: #00ff00;
    font-family: 'JetBrains Mono', monospace;
    padding: 20px;
    position: relative;
    --primary: #7070da;
    --term-green: #00ff00;
  }

  .crt-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
    z-index: 10;
  }

  .window {
    border: 1px solid var(--term-green);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(0,20,0,0.8);
    box-shadow: 0 0 20px rgba(0,255,0,0.1);
  }

  .title-bar {
    background: var(--term-green);
    color: #000;
    padding: 4px 10px;
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 14px;
  }
  .controls span { cursor: pointer; margin-left: 10px; }

  .term-content {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
    font-size: 14px;
  }

  .ascii-banner pre {
    margin: 0 0 20px 0;
    color: var(--primary); /* Mixing terminal green with primary brand color */
    text-shadow: 0 0 5px var(--primary);
  }

  .line { margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
  .mt { margin-top: 24px; }
  .prompt { color: var(--primary); font-weight: bold; }
  .cmd { color: #fff; }

  .block {
    padding-left: 20px;
    border-left: 1px dashed var(--term-green);
    margin-left: 5px;
    margin-bottom: 10px;
  }

  .profile { display: flex; gap: 20px; align-items: center; }
  .avatar {
    width: 80px;
    height: 80px;
    border: 1px solid var(--term-green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }

  .input-line { display: flex; align-items: center; gap: 10px; }
  .key { color: #aaa; }

  .term-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--term-green);
    color: var(--term-green);
    font-family: inherit;
    outline: none;
    padding: 2px 0;
  }
  .term-input:focus { background: rgba(0,255,0,0.1); }
  .term-input.full { flex: 1; }

  .term-select {
    background: #000;
    color: var(--term-green);
    border: 1px solid var(--term-green);
    padding: 4px;
    font-family: inherit;
    outline: none;
    margin-bottom: 10px;
  }

  .checkbox-line { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
  .term-checkbox {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--term-green);
    background: #000;
    cursor: pointer;
    position: relative;
  }
  .term-checkbox:checked::after {
    content: 'X';
    position: absolute;
    top: -2px;
    left: 3px;
    color: var(--term-green);
    font-size: 14px;
  }

  .term-slider {
    flex: 1;
    appearance: none;
    height: 1px;
    background: var(--term-green);
  }
  .term-slider::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 20px;
    background: var(--term-green);
    cursor: pointer;
  }

  .term-btn {
    background: #000;
    color: #ff0000;
    border: 1px solid #ff0000;
    font-family: inherit;
    padding: 4px 12px;
    cursor: pointer;
  }
  .term-btn:hover { background: #ff0000; color: #000; }

  .cursor-line { margin-top: 20px; }
  .cursor { animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
</style>
