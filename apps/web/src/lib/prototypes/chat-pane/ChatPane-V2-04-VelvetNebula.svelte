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
          <div class="system-msg"><span class="dot"></span>{msg.text}<span class="dot"></span></div>
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
    --bg: #f8f6f9;
    --blob1: #e1d3ed;
    --blob2: #eee6f5;
    --glass: rgba(255,255,255,0.4);
    --border: rgba(255,255,255,0.5);
    --text: #2f2536;
    --muted: #80728a;
    --accent: #a581cc;
    --msg-self: rgba(228,213,245,0.7);
    --msg-other: rgba(255,255,255,0.6);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #141017;
      --blob1: #2a1836;
      --blob2: #351f40;
      --glass: rgba(25,15,30,0.3);
      --border: rgba(255,255,255,0.03);
      --text: #ece3f2;
      --muted: #9585a1;
      --accent: #cf9cff;
      --msg-self: rgba(195,145,245,0.15);
      --msg-other: rgba(255,255,255,0.04);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(60px); z-index: 0; }
  .blob { position: absolute; border-radius: 50%; }
  .b1 { top: 0; left: 0; width: 100%; height: 80%; background: var(--blob1); transform: rotate(-15deg); }
  .b2 { bottom: -20%; right: -10%; width: 90%; height: 70%; background: var(--blob2); transform: rotate(15deg); }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(40px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: linear-gradient(var(--glass), transparent); }

  .avatar, .msg-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .dot { width: 4px; height: 4px; background: var(--muted); border-radius: 50%; animation: float 3s infinite ease-in-out; }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 14px 18px; border-radius: 24px 24px 24px 8px; background: var(--msg-other); border: 1px solid var(--border); }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); border-radius: 24px 24px 8px 24px; }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 6px; display: block; text-align: right; opacity: 0.7; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; }
  .composer input { flex: 1; padding: 14px 20px; border-radius: 20px; border: 1px solid var(--border); background: var(--glass); color: var(--text); outline: none; }
  
  .btn-add, .btn-send { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--glass); color: var(--text); border: 1px solid var(--border); }
  .btn-send { background: var(--accent); color: white; border: none; }
</style>