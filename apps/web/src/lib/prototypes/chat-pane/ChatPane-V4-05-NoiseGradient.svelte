<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'This gradient combined with the noise texture is stunning.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It creates such a unique atmospheric effect. Very Twilight Bloom.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane noise-gradient">
  <div class="message-list">
    {#each messages as msg}
      <div class="msg-row {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="capsule">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="composer-wrap">
    <div class="floating-input">
      <input type="text" placeholder="Type a message..." />
      <div class="send-icon">✦</div>
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
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    position: relative;
    overflow: hidden;
  }

  .chat-pane::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.15;
    pointer-events: none;
    mix-blend-mode: overlay;
  }

  .message-list {
    flex: 1;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .msg-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .msg-row.own {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid rgba(133, 133, 241, 0.4);
  }

  .capsule {
    padding: 0.9rem 1.6rem;
    border-radius: 100px;
    font-size: 0.95rem;
    color: #e0e0ff;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .msg-row:not(.own) .capsule {
    background: rgba(165, 165, 233, 0.1);
  }

  .msg-row.own .capsule {
    background: rgba(133, 133, 241, 0.3);
    color: white;
    border-color: rgba(133, 133, 241, 0.4);
  }

  .composer-wrap {
    padding: 3rem;
  }

  .floating-input {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 50px;
    padding: 0.8rem 2rem;
    display: flex;
    align-items: center;
    border: 1px solid rgba(133, 133, 241, 0.2);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-family: inherit;
    font-size: 1rem;
  }

  .send-icon {
    font-size: 1.5rem;
    color: #8585F1;
    cursor: pointer;
    margin-left: 1rem;
    text-shadow: 0 0 10px rgba(133, 133, 241, 0.8);
  }
</style>
