<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'Geometric patterns give it a structured yet soft vibe.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'Agreed. The shadows help the elements feel like they are floating.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane geometric-shadow">
  <div class="message-list">
    {#each messages as msg}
      <div class="msg-container {msg.own ? 'own' : ''}">
        <div class="avatar-box">
          <img src={msg.avatar} alt={msg.user} class="avatar" />
        </div>
        <div class="bubble">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="footer">
    <div class="bloom-composer">
      <div class="plus">+</div>
      <input type="text" placeholder="Type a message..." />
      <button class="send-btn">Send</button>
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
    background-color: #ffffff;
    background-image: 
      linear-gradient(30deg, #8585F1 12%, transparent 12.5%, transparent 87%, #8585F1 87.5%, #8585F1),
      linear-gradient(150deg, #8585F1 12%, transparent 12.5%, transparent 87%, #8585F1 87.5%, #8585F1),
      linear-gradient(30deg, #8585F1 12%, transparent 12.5%, transparent 87%, #8585F1 87.5%, #8585F1),
      linear-gradient(150deg, #8585F1 12%, transparent 12.5%, transparent 87%, #8585F1 87.5%, #8585F1),
      linear-gradient(60deg, #A5A5E9 25%, transparent 25.5%, transparent 75%, #A5A5E9 75%, #A5A5E9),
      linear-gradient(60deg, #A5A5E9 25%, transparent 25.5%, transparent 75%, #A5A5E9 75%, #A5A5E9);
    background-size: 80px 140px;
    background-position: 0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px;
    background-blend-mode: soft-light;
    opacity: 0.8;
  }

  .message-list {
    flex: 1;
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .msg-container {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    max-width: 70%;
  }

  .msg-container.own {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .bubble {
    padding: 0.9rem 1.6rem;
    border-radius: 40px;
    background: white;
    box-shadow: 0 10px 25px rgba(133, 133, 241, 0.15);
    border: 1px solid rgba(133, 133, 241, 0.1);
    color: #444;
    font-size: 0.95rem;
  }

  .msg-container.own .bubble {
    background: #8585F1;
    color: white;
  }

  .footer {
    padding: 2rem 4rem;
  }

  .bloom-composer {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-radius: 100px;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    border: 1px solid rgba(133, 133, 241, 0.3);
    box-shadow: 0 15px 40px rgba(133, 133, 241, 0.2);
  }

  .plus {
    width: 32px;
    height: 32px;
    background: #f0f0ff;
    color: #8585F1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: bold;
    cursor: pointer;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    padding: 0 1rem;
    font-family: inherit;
  }

  .send-btn {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.6rem 1.4rem;
    border-radius: 50px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
