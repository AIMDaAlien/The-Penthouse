<script lang="ts">
  const messages = [
    { id: 1, type: 'system', text: 'Today' },
    { id: 2, type: 'other', sender: 'Aria', text: 'Hey, checking out the new organic iterations!' },
    { id: 3, type: 'self', text: 'Yes, no blues anymore. How does the frosted glass feel?' },
    { id: 4, type: 'other', sender: 'Aria', text: 'Much softer. I love the micro-interactions.' },
    { id: 5, type: 'self', text: 'Perfect. It should morph smoothly in the background.' }
  ];
</script>

<div class="chat-pane">
  <div class="blobs">
    <div class="blob giant"></div>
  </div>
  
  <div class="glass-layer">
    <header>
      <div class="avatar">A</div>
      <div class="info">
        <h2>Aria</h2>
        <span>Online</span>
      </div>
      <div class="actions">
        <button>…</button>
      </div>
    </header>
    
    <div class="messages">
      {#each messages as msg (msg.id)}
        {#if msg.type === 'system'}
          <div class="system-msg">{msg.text}</div>
        {:else}
          <div class="msg-wrapper {msg.type}">
            {#if msg.type === 'other'}
              <div class="msg-avatar">A</div>
            {/if}
            <div class="msg-bubble">
              <p>{msg.text}</p>
              <div class="action-bar">♡ ↩</div>
              <span class="time">10:42 AM</span>
            </div>
          </div>
        {/if}
      {/each}
    </div>
    
    <div class="composer">
      <button class="btn-add">+</button>
      <input type="text" placeholder="Type a message..." />
      <button class="btn-send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
  </div>
</div>

<style>
  .chat-pane {
    --bg: #f5f2f7;
    --blob: #dfcceb;
    --glass: rgba(255,255,255,0.7);
    --border: rgba(255,255,255,0.5);
    --text: #2c2033;
    --muted: #756680;
    --accent: #b38cd6;
    --msg-self: rgba(230,215,245,0.9);
    --msg-other: rgba(255,255,255,0.9);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #151118;
      --blob: #321c45;
      --glass: rgba(30,20,35,0.6);
      --border: rgba(255,255,255,0.06);
      --text: #ece3f2;
      --muted: #9c8ca8;
      --accent: #cf9cff;
      --msg-self: rgba(185,135,245,0.25);
      --msg-other: rgba(255,255,255,0.1);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(50px); z-index: 0; display: flex; align-items: center; justify-content: center; }
  .blob.giant { width: 150%; height: 150%; background: radial-gradient(circle, var(--blob) 0%, transparent 70%); animation: pulse 10s infinite alternate; }
  @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.2); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(50px); display: flex; flex-direction: column; z-index: 1; }
  /* Noise overlay */
  .glass-layer::before { content: ""; position: absolute; inset: 0; background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E'); pointer-events: none; z-index: -1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: rgba(0,0,0,0.02); }
  .avatar, .msg-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { position: relative; padding: 14px 18px; border-radius: 20px; background: var(--msg-other); box-shadow: 0 4px 12px rgba(0,0,0,0.02); overflow: hidden; }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 6px; display: block; text-align: right; }
  
  .action-bar { position: absolute; top: -30px; right: 10px; background: var(--glass); border: 1px solid var(--border); padding: 4px 8px; border-radius: 12px; font-size: 12px; transition: top 0.2s; color: var(--accent); cursor: pointer; backdrop-filter: blur(10px); }
  .msg-bubble:hover .action-bar { top: 10px; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; }
  .composer input { flex: 1; padding: 14px 20px; border-radius: 30px; border: 1px solid var(--border); background: var(--glass); color: var(--text); outline: none; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
  
  .btn-add, .btn-send { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--glass); color: var(--text); border: 1px solid var(--border); transition: transform 0.3s; }
  .btn-add:hover { transform: rotate(90deg); }
  .btn-send { background: var(--accent); color: white; border: none; }
</style>