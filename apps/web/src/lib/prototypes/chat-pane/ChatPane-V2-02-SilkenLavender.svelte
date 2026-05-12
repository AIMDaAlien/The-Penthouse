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
    <div class="blob wave1"></div>
    <div class="blob wave2"></div>
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
    --bg: #f7f5fa;
    --blob1: #e2d4f0;
    --blob2: #f0e6f0;
    --glass: rgba(255,255,255,0.4);
    --border: rgba(255,255,255,0.6);
    --text: #302638;
    --muted: #7b6d85;
    --accent: #b08dd6;
    --msg-self: rgba(235,220,250,0.6);
    --msg-other: rgba(255,255,255,0.5);
    
    width: 100%;
    height: 100%;
    background: var(--bg);
    color: var(--text);
    position: relative;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    .chat-pane {
      --bg: #18131c;
      --blob1: #361f47;
      --blob2: #422647;
      --glass: rgba(30,20,40,0.3);
      --border: rgba(255,255,255,0.05);
      --text: #f0e8f5;
      --muted: #9b8aab;
      --accent: #d4a5ff;
      --msg-self: rgba(212,165,255,0.1);
      --msg-other: rgba(255,255,255,0.05);
    }
  }

  .blobs {
    position: absolute;
    inset: 0;
    filter: blur(50px);
    z-index: 0;
  }
  .blob {
    position: absolute;
    border-radius: 50%;
    animation: flow 20s linear infinite;
  }
  .wave1 { top: 20%; left: -20%; width: 140%; height: 60%; background: var(--blob1); opacity: 0.8; }
  .wave2 { bottom: 10%; right: -20%; width: 120%; height: 50%; background: var(--blob2); opacity: 0.6; animation-direction: reverse; }

  @keyframes flow {
    0% { transform: translateX(0) rotate(0deg); }
    50% { transform: translateX(5%) rotate(2deg); }
    100% { transform: translateX(0) rotate(0deg); }
  }

  .glass-layer {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  header {
    display: flex;
    align-items: center;
    padding: 20px 24px;
    background: var(--glass);
    border-bottom: 1px solid var(--border);
  }

  .avatar, .msg-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--accent); color: white;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; margin-right: 16px;
  }

  .info h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .info span { font-size: 12px; color: var(--muted); }
  .actions { margin-left: auto; }
  .actions button { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }

  .messages {
    flex: 1; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; gap: 16px;
  }

  .system-msg { text-align: center; font-size: 12px; color: var(--muted); margin: 16px 0; }

  .msg-wrapper { display: flex; align-items: flex-end; gap: 8px; max-width: 80%; }
  .msg-wrapper.self { align-self: flex-end; flex-direction: row-reverse; }

  .msg-bubble {
    padding: 12px 16px;
    border-radius: 24px;
    background: var(--msg-other);
    border: 1px solid var(--border);
    transition: background 0.3s ease;
  }
  .msg-wrapper.self .msg-bubble { background: var(--msg-self); }
  
  .msg-bubble:hover {
    background: var(--glass);
  }

  .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.4; }
  .time { font-size: 10px; color: var(--muted); margin-top: 4px; display: block; text-align: right; }

  .composer {
    padding: 20px 24px;
    display: flex; align-items: center; gap: 12px;
    background: var(--glass);
    border-top: 1px solid var(--border);
  }

  .composer input {
    flex: 1; padding: 12px 20px; border-radius: 24px;
    border: 1px solid var(--border); background: var(--glass); color: var(--text);
    outline: none; transition: flex 0.3s ease;
  }
  .composer:focus-within input {
    flex: 1.1;
  }

  .btn-add, .btn-send {
    width: 40px; height: 40px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; background: var(--glass); color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-send { background: var(--accent); color: white; border: none; }
</style>