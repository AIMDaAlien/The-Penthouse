<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'Velvet mist feels deep and immersive.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'The soft edges really sell the "mist" part.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane velvet-mist">
  <div class="message-list">
    {#each messages as msg}
      <div class="row {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="bubble">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="composer-zone">
    <div class="mist-input">
      <input type="text" placeholder="Send a message..." />
      <button class="send-glow">Send</button>
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
    background: #0d0d1a;
    background-image: 
      radial-gradient(circle at 50% 50%, rgba(133, 133, 241, 0.05), transparent 80%),
      url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-blend-mode: soft-light;
  }

  .message-list {
    flex: 1;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: 80%;
  }

  .row.own {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid rgba(133, 133, 241, 0.3);
  }

  .bubble {
    padding: 1.2rem 2rem;
    border-radius: 60px;
    font-size: 1rem;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(165, 165, 233, 0.1);
    color: #ccf;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .row.own .bubble {
    background: rgba(133, 133, 241, 0.15);
    color: white;
    border-color: rgba(133, 133, 241, 0.3);
  }

  .composer-zone {
    padding: 3rem 4rem;
  }

  .mist-input {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-radius: 50px;
    padding: 0.6rem 0.6rem 0.6rem 2.5rem;
    display: flex;
    align-items: center;
    border: 1px solid rgba(133, 133, 241, 0.2);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-family: inherit;
    font-size: 1.1rem;
  }

  .send-glow {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.8rem 2.5rem;
    border-radius: 40px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(133, 133, 241, 0.4);
    transition: 0.3s;
  }

  .send-glow:hover {
    box-shadow: 0 0 30px rgba(133, 133, 241, 0.6);
    background: #A5A5E9;
  }
</style>
