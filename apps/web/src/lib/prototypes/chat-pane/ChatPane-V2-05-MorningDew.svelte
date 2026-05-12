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
    {#each Array(8) as _, i}
      <div class="blob dew" style="animation-delay: {i * -2}s; left: {10 + i*10}%; top: {20 + (i%3)*20}%;"></div>
    {/each}
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
    --bg: #faf9fb;
    --blob: #e6dcf2;
    --glass: rgba(255,255,255,0.5);
    --border: rgba(255,255,255,0.9);
    --text: #2a2030;
    --muted: #887a91;
    --accent: #ba94df;
    --msg-self: rgba(235,220,250,0.3);
    --msg-other: transparent;
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #141217;
      --blob: #362247;
      --glass: rgba(30,20,35,0.4);
      --border: rgba(255,255,255,0.04);
      --text: #ece5f0;
      --muted: #9585a1;
      --accent: #cf9cff;
      --msg-self: rgba(200,150,255,0.08);
      --msg-other: transparent;
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(20px); z-index: 0; }
  .blob.dew { position: absolute; width: 100px; height: 100px; background: var(--blob); border-radius: 50%; animation: rise 15s infinite ease-in-out alternate; opacity: 0.6; }
  @keyframes rise { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-100px) scale(1.5); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(20px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 8px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-start; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 12px; transition: background 0.2s; }
  .msg-wrapper:hover { background: rgba(186, 148, 223, 0.05); }
  .msg-wrapper.self { flex-direction: row-reverse; background: var(--msg-self); }
  .msg-wrapper.self:hover { filter: brightness(0.95); }

  .msg-bubble { flex: 1; display: flex; flex-direction: column; }
  .msg-wrapper.self .msg-bubble { align-items: flex-end; }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.4; }
  .time { font-size: 10px; color: var(--muted); margin-top: 4px; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-top: 1px solid var(--border); }
  .composer input { flex: 1; padding: 12px 0; border: none; background: transparent; color: var(--text); outline: none; border-bottom: 1px solid var(--border); transition: border-color 0.2s; }
  .composer input:focus { border-bottom-color: var(--accent); }
  
  .btn-add, .btn-send { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; color: var(--accent); }
  .btn-send { background: var(--accent); color: white; }
</style>