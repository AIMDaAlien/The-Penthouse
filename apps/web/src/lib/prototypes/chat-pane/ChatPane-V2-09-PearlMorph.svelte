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
    <div class="blob b1"></div>
    <div class="blob b2"></div>
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
    --bg: #fdfcff;
    --blob1: radial-gradient(circle, #ecdcf7 0%, transparent 70%);
    --blob2: radial-gradient(circle, #f2e6f7 0%, transparent 70%);
    --glass: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4));
    --border: rgba(255,255,255,0.9);
    --text: #2f2238;
    --muted: #8c7e99;
    --accent: #ba94df;
    --msg-self: linear-gradient(135deg, rgba(240,225,255,0.8), rgba(225,210,245,0.6));
    --msg-other: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6));
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #120e14;
      --blob1: radial-gradient(circle, #38224d 0%, transparent 70%);
      --blob2: radial-gradient(circle, #2d183d 0%, transparent 70%);
      --glass: linear-gradient(135deg, rgba(30,20,40,0.6), rgba(20,10,30,0.2));
      --border: rgba(255,255,255,0.05);
      --text: #efeaf5;
      --muted: #9e8fa8;
      --accent: #cf9cff;
      --msg-self: linear-gradient(135deg, rgba(200,140,255,0.2), rgba(150,90,205,0.05));
      --msg-other: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(35px); z-index: 0; }
  .blob { position: absolute; width: 120%; height: 120%; animation: pulse 12s infinite alternate; }
  .b1 { top: -20%; left: -20%; background: var(--blob1); }
  .b2 { bottom: -20%; right: -20%; background: var(--blob2); animation-direction: reverse; }
  @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(35px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: var(--glass); border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 14px 18px; border-radius: 20px; background: var(--msg-other); border: 1px solid var(--border); box-shadow: 0 4px 16px rgba(0,0,0,0.02); }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 6px; display: block; text-align: right; opacity: 0; transition: opacity 0.3s; }
  .msg-wrapper:hover .time { opacity: 1; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; background: var(--glass); border-top: 1px solid var(--border); }
  .composer input { flex: 1; padding: 14px 20px; border-radius: 24px; border: 1px solid var(--border); background: transparent; color: var(--text); outline: none; }
  
  .btn-add, .btn-send { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; color: var(--text); border: 1px solid var(--border); }
  .btn-send { background: var(--accent); color: white; }
</style>