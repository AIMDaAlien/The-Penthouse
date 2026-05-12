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
    <div class="blob top"></div>
    <div class="blob bottom"></div>
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
              <div class="dots"><span></span><span></span><span></span></div>
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
    --bg: #f4f2f7;
    --blob1: #dbcaed;
    --blob2: #e8dbf2;
    --glass: rgba(255,255,255,0.4);
    --border: rgba(255,255,255,0.7);
    --text: #2b1f33;
    --muted: #7d6b8a;
    --accent: #ac82d6;
    --msg-self: rgba(230,210,250,0.6);
    --msg-other: rgba(255,255,255,0.5);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #141117;
      --blob1: #38204d;
      --blob2: #281638;
      --glass: rgba(30,20,40,0.3);
      --border: rgba(255,255,255,0.08);
      --text: #efe9f5;
      --muted: #9988a8;
      --accent: #cf9cff;
      --msg-self: rgba(185,130,245,0.15);
      --msg-other: rgba(255,255,255,0.05);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(30px); z-index: 0; }
  .blob { position: absolute; border-radius: 50%; }
  .top { top: -10%; left: 10%; width: 80%; height: 40%; background: var(--blob1); animation: sway 10s infinite alternate; }
  .bottom { bottom: -10%; right: 10%; width: 80%; height: 40%; background: var(--blob2); animation: sway 12s infinite alternate-reverse; }
  @keyframes sway { 0% { transform: translateX(-5%); } 100% { transform: translateX(5%); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(30px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 14px 18px; border-radius: 16px; background: var(--msg-other); box-shadow: inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 5px rgba(0,0,0,0.05); border: 1px solid var(--border); position: relative; cursor: pointer; }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.4; }
  .time { font-size: 10px; color: var(--muted); margin-top: 4px; display: block; text-align: right; transition: opacity 0.2s; }
  
  .dots { position: absolute; bottom: 8px; right: 18px; display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s; }
  .dots span { width: 4px; height: 4px; background: var(--accent); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
  .dots span:nth-child(1) { animation-delay: -0.32s; }
  .dots span:nth-child(2) { animation-delay: -0.16s; }
  @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
  
  .msg-bubble:hover .time { opacity: 0; }
  .msg-bubble:hover .dots { opacity: 1; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-top: 1px solid var(--border); }
  .composer input { flex: 1; padding: 14px 20px; border-radius: 24px; border: none; background: rgba(0,0,0,0.03); color: var(--text); outline: none; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
  
  .btn-add, .btn-send { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--glass); color: var(--text); box-shadow: inset 0 1px 3px rgba(255,255,255,0.5); }
  .btn-send { background: var(--accent); color: white; }
</style>