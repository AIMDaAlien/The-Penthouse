<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'Hey there! How is the new prototype looking?', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It is coming along nicely. Just working on the textures now.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' },
    { id: 3, user: 'Kimi', text: 'The "Twilight Bloom" aesthetic feels really fresh. Love the soft floating composer.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 4, user: 'Me', text: 'Exactly! The frosted glass and capsule bubbles really tie it together.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane grainy-midnight">
  <div class="message-list">
    {#each messages as msg}
      <div class="message-row {msg.own ? 'own' : ''}">
        {#if !msg.own}
          <img src={msg.avatar} alt={msg.user} class="avatar" />
        {/if}
        <div class="bubble-container">
          <div class="bubble">
            {msg.text}
          </div>
        </div>
        {#if msg.own}
          <img src={msg.avatar} alt={msg.user} class="avatar" />
        {/if}
      </div>
    {/each}
  </div>

  <div class="composer-container">
    <div class="composer">
      <input type="text" placeholder="Type a message..." />
      <button class="send-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap');

  .chat-pane {
    font-family: 'Ubuntu', sans-serif;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    background-color: #121212;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    background-blend-mode: soft-light;
  }

  .message-list {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
  }

  .message-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    max-width: 80%;
  }

  .message-row.own {
    align-self: flex-end;
    flex-direction: row;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(133, 133, 241, 0.2);
    border: 1px solid rgba(133, 133, 241, 0.3);
  }

  .bubble-container {
    display: flex;
    flex-direction: column;
  }

  .bubble {
    padding: 0.75rem 1.25rem;
    border-radius: 24px;
    font-size: 0.95rem;
    line-height: 1.4;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .message-row:not(.own) .bubble {
    background: rgba(165, 165, 233, 0.15);
    color: #e0e0ff;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(165, 165, 233, 0.1);
  }

  .message-row.own .bubble {
    background: rgba(133, 133, 241, 0.25);
    color: white;
    border-bottom-right-radius: 4px;
    border: 1px solid rgba(133, 133, 241, 0.2);
  }

  .composer-container {
    padding: 1.5rem 2rem 2.5rem;
    display: flex;
    justify-content: center;
  }

  .composer {
    width: 100%;
    max-width: 700px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(133, 133, 241, 0.2);
    border-radius: 30px;
    padding: 0.5rem 0.5rem 0.5rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-family: inherit;
    font-size: 1rem;
    outline: none;
  }

  input::placeholder {
    color: rgba(165, 165, 233, 0.4);
  }

  .send-btn {
    background: #8585F1;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }

  .send-btn:hover {
    transform: scale(1.05);
    background: #A5A5E9;
  }
</style>
