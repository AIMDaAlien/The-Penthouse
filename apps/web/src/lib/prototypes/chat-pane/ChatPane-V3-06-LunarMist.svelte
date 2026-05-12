<script lang="ts">
  const messages = [
    { id: 1, type: 'system', text: 'Today' },
    { id: 2, type: 'other', sender: 'Aria', text: 'Hey, checking out the new V3 iterations!' },
    { id: 3, type: 'self', text: 'Yes, no blues anymore. How does the frosted glass feel?' },
    { id: 4, type: 'other', sender: 'Aria', text: 'Much softer. I love the micro-interactions.' },
    { id: 5, type: 'self', text: 'Perfect. It should morph smoothly in the background.' }
  ];
</script>

<div class="chat-pane v3-variant-6">
  <div class="blobs">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>
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
    --bg: #f2f2fa;
    --blob1: #8585F1;
    --blob2: #A5A5E9;
    --blob3: #c2c2f0;
    --glass: rgba(255, 255, 255, 0.4);
    --composer-glass: rgba(255, 255, 255, 0.65);
    --border: rgba(133, 133, 241, 0.2);
    --text: #2f2536;
    --muted: #80728a;
    --accent: #8585F1;
    --accent-light: #A5A5E9;
    --msg-self: rgba(165, 165, 233, 0.25);
    --msg-other: rgba(255, 255, 255, 0.7);
    
    width: 100%; height: 100%; background: var(--bg); color: var(--text);
    position: relative; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #12121C;
      --blob1: #8585F1;
      --blob2: #A5A5E9;
      --blob3: #6b6be6;
      --glass: rgba(18, 18, 28, 0.4);
      --composer-glass: rgba(30, 30, 45, 0.75);
      --border: rgba(133, 133, 241, 0.15);
      --text: #ece3f2;
      --muted: #9585a1;
      --accent: #8585F1;
      --accent-light: #A5A5E9;
      --msg-self: rgba(133, 133, 241, 0.2);
      --msg-other: rgba(255, 255, 255, 0.05);
    }
  }

  .blobs { position: absolute; inset: 0; filter: blur(60px); z-index: 0; opacity: 0.6; }
  .blob { position: absolute; border-radius: 50%; }
  .b1 { top: 40%; left: 60%; width: 80%; height: 80%; background: var(--blob1); transform: rotate(-15deg); animation: float6 15s infinite alternate ease-in-out; }
  .b2 { bottom: -20%; right: -10%; width: 90%; height: 70%; background: var(--blob2); transform: rotate(15deg); animation: float6 20s infinite alternate-reverse ease-in-out; opacity: 0.8; }
  .b3 { top: 40%; left: 30%; width: 60%; height: 60%; background: var(--blob3); mix-blend-mode: multiply; animation: float6 18s infinite alternate ease-in-out; }

  @keyframes float6 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(50px, -18px) scale(1.1); }
  }

  .glass-layer { position: absolute; inset: 0; backdrop-filter: blur(40px); display: flex; flex-direction: column; z-index: 1; }

  header { display: flex; align-items: center; padding: 20px 24px; background: linear-gradient(var(--glass), transparent); border-bottom: 1px solid var(--border); }
  .avatar, .msg-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; box-shadow: 0 4px 15px rgba(133, 133, 241, 0.3); }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages { flex: 1; overflow-y: auto; padding: 24px; padding-bottom: 100px; display: flex; flex-direction: column; gap: 20px; }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .dot { width: 4px; height: 4px; background: var(--muted); border-radius: 50%; animation: pulse 3s infinite ease-in-out; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble { padding: 14px 18px; border-radius: 24px 24px 24px 8px; background: var(--msg-other); border: 1px solid var(--border); backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); border-radius: 24px 24px 8px 24px; border-color: transparent; }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; }
  .time { font-size: 10px; color: var(--muted); margin-top: 6px; display: block; text-align: right; opacity: 0.7; }

  .composer-container { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; display: flex; justify-content: center; pointer-events: none; background: linear-gradient(transparent, var(--bg) 80%); }
  .composer-pill { pointer-events: auto; width: 100%; max-width: 650px; display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 40px; background: var(--composer-glass); border: 1px solid var(--border); box-shadow: 0 15px 35px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.1); backdrop-filter: blur(25px) saturate(150%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s; }
  .composer-pill:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2); }

  .composer-pill input { flex: 1; padding: 12px 16px; border: none; background: transparent; color: var(--text); outline: none; font-size: 15px; }
  .composer-pill input::placeholder { color: var(--muted); }
  
  .btn-add { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(133, 133, 241, 0.1); color: var(--accent); border: none; transition: background 0.2s; font-size: 20px; }
  .btn-add:hover { background: rgba(133, 133, 241, 0.2); }
  
  .btn-send { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--accent); color: white; border: none; transition: transform 0.2s, background 0.2s; box-shadow: 0 4px 12px rgba(133, 133, 241, 0.4); }
  .btn-send:hover { transform: scale(1.05); background: var(--accent-light); }
</style>