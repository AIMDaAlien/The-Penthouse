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

<div class="settings-pane museum">
  
  <div class="gallery-wall">
    
    <div class="frame portrait">
      <div class="matte">
        <div class="artwork avatar">AK</div>
      </div>
      <div class="plaque">
        <input type="text" bind:value={displayName} class="plaque-title" />
        <input type="text" bind:value={note} class="plaque-desc" />
      </div>
    </div>

    <div class="frame status">
      <div class="matte">
        <div class="artwork form-art">
          <select bind:value={presence} class="museum-select">
            <option value="available">Exhibit: Available</option>
            <option value="busy">Exhibit: Busy</option>
            <option value="dnd">Exhibit: Closed</option>
          </select>
          <label class="museum-check mt">
            <input type="checkbox" bind:checked={autoAfk} />
            <span class="custom-chk"></span>
            Automated Rest
          </label>
        </div>
      </div>
      <div class="plaque">
        <div class="plaque-title">Presence Protocol</div>
        <div class="plaque-desc">Controls visibility to patrons.</div>
      </div>
    </div>

    <div class="frame alerts">
      <div class="matte">
        <div class="artwork form-art">
          <label class="museum-check">
            <input type="checkbox" bind:checked={pushMentions} />
            <span class="custom-chk"></span>
            Direct Mentions
          </label>
          <label class="museum-check mt-sm">
            <input type="checkbox" bind:checked={pushDms} />
            <span class="custom-chk"></span>
            Private Messages
          </label>
        </div>
      </div>
      <div class="plaque">
        <div class="plaque-title">Notification Registry</div>
        <div class="plaque-desc">Audible & visual disruptions.</div>
      </div>
    </div>

    <div class="frame visual wide">
      <div class="matte">
        <div class="artwork form-art flex-row">
          <div class="col">
            <label class="m-label">Canvas URL</label>
            <input type="text" bind:value={wallpaperUrl} class="museum-input" />
          </div>
          <div class="col">
            <label class="m-label">Translucency ({wallpaperOpacity}%)</label>
            <input type="range" min="0" max="100" bind:value={wallpaperOpacity} class="museum-slider" />
          </div>
        </div>
      </div>
      <div class="plaque">
        <div class="plaque-title">Environmental Aesthetics</div>
        <div class="plaque-desc">Curate the backdrop of the digital space.</div>
      </div>
    </div>

    <div class="exit-door">
      <button class="museum-btn">Exit Gallery</button>
    </div>

  </div>

</div>

<style>
  .settings-pane.museum {
    width: 860px;
    height: 760px;
    background: #1a1a24;
    color: #d0d0d0;
    font-family: 'JetBrains Mono', monospace;
    padding: 60px;
    box-sizing: border-box;
    overflow-y: auto;
    --primary: #7070da;
    --frame: #0d0d14;
    --matte: #e0e0e0;
  }

  .gallery-wall {
    display: flex;
    flex-wrap: wrap;
    gap: 60px;
    justify-content: center;
  }

  .frame {
    background: var(--frame);
    padding: 15px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .portrait { width: 300px; }
  .status, .alerts { width: 300px; }
  .wide { width: 100%; }

  .matte {
    background: var(--matte);
    padding: 30px;
    width: 100%;
    box-sizing: border-box;
    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
  }

  .artwork {
    width: 100%;
    background: #12121C;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  }
  
  .avatar {
    aspect-ratio: 1/1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    color: var(--primary);
    border: 1px solid rgba(112,112,218,0.3);
  }

  .form-art {
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 150px;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .plaque {
    margin-top: 20px;
    background: #2a2a35;
    padding: 10px 20px;
    border-radius: 2px;
    text-align: center;
    width: 80%;
    border: 1px solid #444;
    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  }

  .plaque-title {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 5px;
    background: transparent;
    border: none;
    text-align: center;
    width: 100%;
    font-family: inherit;
    outline: none;
  }
  .plaque-title:focus { border-bottom: 1px solid var(--primary); }
  
  .plaque-desc {
    font-size: 11px;
    color: #aaa;
    background: transparent;
    border: none;
    text-align: center;
    width: 100%;
    font-family: inherit;
    outline: none;
  }
  .plaque-desc:focus { color: #fff; }

  .museum-select {
    width: 100%;
    background: transparent;
    color: #fff;
    border: 1px solid #444;
    padding: 10px;
    font-family: inherit;
    outline: none;
  }

  .museum-check {
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    font-size: 14px;
  }
  .mt { margin-top: 20px; }
  .mt-sm { margin-top: 10px; }
  .museum-check input { display: none; }
  .custom-chk {
    width: 16px;
    height: 16px;
    border: 1px solid #666;
    display: inline-block;
  }
  .museum-check input:checked + .custom-chk {
    background: var(--primary);
    border-color: var(--primary);
  }

  .flex-row { display: flex; flex-direction: row; gap: 40px; }
  .col { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .m-label { font-size: 12px; color: #888; }
  
  .museum-input {
    background: transparent;
    border: 1px solid #444;
    color: #fff;
    padding: 10px;
    font-family: inherit;
    outline: none;
  }
  .museum-input:focus { border-color: var(--primary); }

  .museum-slider {
    appearance: none;
    height: 2px;
    background: #444;
    margin-top: 15px;
  }
  .museum-slider::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 20px;
    background: #ccc;
    cursor: pointer;
  }

  .exit-door {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }
  .museum-btn {
    background: transparent;
    color: #ff5555;
    border: 1px solid #ff5555;
    padding: 10px 30px;
    font-family: inherit;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    cursor: pointer;
    transition: 0.3s;
  }
  .museum-btn:hover {
    background: #ff5555;
    color: #1a1a24;
  }
</style>
