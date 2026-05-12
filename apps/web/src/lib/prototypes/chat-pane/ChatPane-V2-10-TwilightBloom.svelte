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
    <div class="blob center"></div>
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
    
    <div class="composer-container">
      <div class="composer-pill">
        <button class="btn-add">+</button>
        <input type="text" placeholder="Type a message..." />
        <button class="btn-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .chat-pane {
    --bg: #f5f3f7;
    --blob: radial-gradient(circle, #ebdcf5 0%, transparent 70%);
    --glass: rgba(255,255,255,0.5);
    --border: rgba(255,255,255,0.7);
    --text: #2f2238;
    --muted: #857591;
    --accent: #b991e6;
    --msg-self: rgba(230,215,245,0.4);
    --msg-other: transparent;
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #141117;
      --blob: radial-gradient(circle, #38224d 0%, transparent 70%);
      --glass: rgba(30,20,40,0.3);
      --border: rgba(255,255,255,0.05);
      --text: #efeaf5;
      --muted: #9e8fa8;
      --accent: #cf9cff;
      --msg-self: rgba(200,140,255,0.1);
      --msg-other: transparent;
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(28px); z-index: 0; display: flex; align-items: center; justify-content: center; }
  .blob.center { width: 150%; height: 150%; background: var(--blob); animation: orbit 20s linear infinite; }
  @keyframes orbit { 0% { transform: rotate(0deg) translateX(50px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(28px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; padding-bottom: 100px; display: flex; flex-direction: column; gap: 16px; }
  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-start; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 8px 12px; border-radius: 12px; background: var(--msg-other); transition: background 0.2s; }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }
  .msg-wrapper:hover .msg-bubble { background: rgba(185, 145, 230, 0.1); }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 4px; display: block; text-align: right; }

  .composer-container { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; display: flex; justify-content: center; pointer-events: none; }
  .composer-pill { pointer-events: auto; width: 100%; max-width: 600px; display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 40px; background: var(--glass); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .composer-pill:hover { transform: translateY(-4px); }

  .composer-pill input { flex: 1; padding: 12px 16px; border: none; background: transparent; color: var(--text); outline: none; }
  
  .btn-add, .btn-send { width: 40px; height: 40px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; color: var(--text); }
  .btn-send { background: var(--accent); color: white; }
</style>