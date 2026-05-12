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
    --bg: #f9f7fb;
    --blob1: #ebdcf0;
    --blob2: #f0e6eb;
    --glass: rgba(255,255,255,0.7);
    --border: rgba(255,255,255,1);
    --text: #2a2030;
    --muted: #6b5c73;
    --accent: #c4a1eb;
    --msg-self: rgba(238,225,250,0.8);
    --msg-other: rgba(255,255,255,0.9);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #17121a;
      --blob1: #342042;
      --blob2: #402640;
      --glass: rgba(45,30,50,0.5);
      --border: rgba(255,255,255,0.15);
      --text: #f5eef7;
      --muted: #a493b3;
      --accent: #d4a5ff;
      --msg-self: rgba(212,165,255,0.2);
      --msg-other: rgba(255,255,255,0.1);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(30px); z-index: 0; display: flex; align-items: center; justify-content: center; }
  .blob { position: absolute; border-radius: 40%; animation: spin 25s linear infinite; }
  .b1 { width: 70%; height: 70%; background: var(--blob1); opacity: 0.9; }
  .b2 { width: 50%; height: 80%; background: var(--blob2); animation-direction: reverse; opacity: 0.8; }

  @keyframes spin { 100% { transform: rotate(360deg); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(16px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: var(--glass); border-bottom: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }

  .avatar, .msg-avatar {
    width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: white;
    display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .msg-avatar:hover { transform: rotate(15deg) scale(1.1); }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble {
    padding: 12px 16px; border-radius: 16px;
    background: var(--msg-other); border: 2px solid var(--border);
  }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); border-bottom-right-radius: 2px; }
  .msg-wrapper.other .msg-bubble { border-bottom-left-radius: 2px; }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.4; }
  .time { font-size: 10px; color: var(--muted); margin-top: 4px; display: block; text-align: right; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; background: var(--glass); border-top: 1px solid var(--border); }
  .composer input { flex: 1; padding: 12px 20px; border-radius: 24px; border: 2px solid var(--border); background: var(--glass); color: var(--text); outline: none; }
  
  .btn-add, .btn-send { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--glass); color: var(--text); border: 2px solid var(--border); }
  .btn-send { background: var(--accent); color: white; border: none; transition: transform 0.2s; }
  .btn-send:hover { transform: scale(1.1); }
</style>