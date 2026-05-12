<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'The linen texture adds a tactile feel, do not you think?', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It feels very organic. The frosted glass on top is a perfect contrast.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane frosted-linen">
  <div class="message-list">
    {#each messages as msg}
      <div class="message-group {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="bubble">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="composer-container">
    <div class="linen-composer">
      <input type="text" placeholder="Message..." />
      <button class="circle-send">➜</button>
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
    background-color: #f0f0f5;
    background-image: repeating-linear-gradient(45deg, rgba(133, 133, 241, 0.02) 0px, rgba(133, 133, 241, 0.02) 2px, transparent 2px, transparent 4px);
    background-size: 8px 8px;
  }

  .message-list {
    flex: 1;
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .message-group {
    display: flex;
    gap: 1rem;
    max-width: 75%;
  }

  .message-group.own {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #A5A5E9;
    padding: 2px;
  }

  .bubble {
    padding: 1.2rem 1.8rem;
    border-radius: 35px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(133, 133, 241, 0.1);
    box-shadow: 0 8px 32px rgba(133, 133, 241, 0.05);
    color: #333366;
    line-height: 1.5;
  }

  .message-group.own .bubble {
    background: rgba(133, 133, 241, 0.15);
    border: 1px solid rgba(133, 133, 241, 0.3);
  }

  .composer-container {
    padding: 2rem 3rem;
  }

  .linen-composer {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 40px;
    padding: 0.5rem 0.5rem 0.5rem 2rem;
    display: flex;
    align-items: center;
    border: 1px solid rgba(133, 133, 241, 0.2);
    box-shadow: 0 10px 40px rgba(0,0,0,0.05);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 1.1rem;
    color: #333366;
  }

  .circle-send {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: #8585F1;
    color: white;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .circle-send:hover {
    transform: scale(1.1) rotate(-15deg);
    background: #A5A5E9;
  }
</style>
