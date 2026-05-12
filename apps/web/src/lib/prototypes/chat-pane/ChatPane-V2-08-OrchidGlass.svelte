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
    <div class="blob stripe1"></div>
    <div class="blob stripe2"></div>
    <div class="blob stripe3"></div>
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
    --bg: #f8f5fa;
    --blob1: #ebdff5;
    --blob2: #e3d1f0;
    --glass: rgba(255,255,255,0.6);
    --border: rgba(255,255,255,0.8);
    --text: #2f2238;
    --muted: #857591;
    --accent: #b991e6;
    --msg-self: rgba(240,225,255,0.7);
    --msg-other: rgba(255,255,255,0.8);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #15111a;
      --blob1: #38224d;
      --blob2: #2d183d;
      --glass: rgba(30,20,40,0.4);
      --border: rgba(255,255,255,0.05);
      --text: #efeaf5;
      --muted: #9e8fa8;
      --accent: #cf9cff;
      --msg-self: rgba(200,140,255,0.15);
      --msg-other: rgba(255,255,255,0.08);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(25px); z-index: 0; }
  .blob { position: absolute; background: var(--blob1); transform: rotate(-30deg); animation: slide 15s infinite alternate; }
  .stripe1 { top: -20%; left: -20%; width: 150%; height: 20%; background: var(--blob2); }
  .stripe2 { top: 30%; left: -20%; width: 150%; height: 15%; }
  .stripe3 { top: 70%; left: -20%; width: 150%; height: 25%; background: var(--blob2); }
  @keyframes slide { 0% { transform: rotate(-30deg) translateY(0); } 100% { transform: rotate(-30deg) translateY(50px); } }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(25px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); background: linear-gradient(var(--glass), transparent); }
  .avatar, .msg-avatar { width: 44px; height: 44px; border-radius: 12px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
  .avatar { margin-right: 16px; }
  .msg-avatar { z-index: 2; margin-right: -12px; border: 2px solid var(--border); }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; max-width: 80%; position: relative; }
  .msg-wrapper.self { align-self: flex-end; }

  .msg-bubble { padding: 16px 20px; border-radius: 20px; background: var(--msg-other); border: 1px solid var(--border); box-shadow: 0 8px 32px rgba(0,0,0,0.05); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 1; }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }
  .msg-wrapper:hover .msg-bubble { transform: translateX(4px); }
  .msg-wrapper.self:hover .msg-bubble { transform: translateX(-4px); }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 8px; display: block; text-align: right; }

  .composer { padding: 20px 24px; display: flex; align-items: center; gap: 12px; border-top: 1px solid var(--border); }
  .composer input { flex: 1; padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border); background: var(--glass); color: var(--text); outline: none; }
  
  .btn-add, .btn-send { width: 44px; height: 44px; border-radius: 12px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--glass); color: var(--text); border: 1px solid var(--border); }
  .btn-send { background: var(--accent); color: white; }
</style>