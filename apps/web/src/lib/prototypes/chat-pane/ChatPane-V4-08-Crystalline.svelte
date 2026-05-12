<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'Crystal clear design, with sharp glass edges.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'The high contrast makes it feel very crisp.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane crystalline">
  <div class="message-list">
    {#each messages as msg}
      <div class="crystal-row {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="crystal-bubble">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="input-area">
    <div class="crystal-composer">
      <input type="text" placeholder="Crystal clear message..." />
      <button class="shard-btn">Send</button>
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
    background: #f0f4f8;
    background-image: 
      linear-gradient(45deg, rgba(133, 133, 241, 0.05) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(133, 133, 241, 0.05) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(133, 133, 241, 0.05) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(133, 133, 241, 0.05) 75%);
    background-size: 40px 40px;
    background-position: 0 0, 0 20px, 20px -20px, -20px 0px;
  }

  .message-list {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .crystal-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .crystal-row.own {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #8585F1;
  }

  .crystal-bubble {
    padding: 0.8rem 1.8rem;
    border-radius: 40px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid white;
    box-shadow: 0 8px 20px rgba(0,0,0,0.05);
    color: #4a4a8a;
  }

  .crystal-row.own .crystal-bubble {
    background: rgba(133, 133, 241, 0.85);
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
  }

  .input-area {
    padding: 2rem;
  }

  .crystal-composer {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 50px;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    border: 1px solid rgba(133, 133, 241, 0.2);
    box-shadow: 0 10px 30px rgba(133, 133, 241, 0.1);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    padding: 0 1.5rem;
    font-family: inherit;
    font-size: 1rem;
  }

  .shard-btn {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.7rem 1.8rem;
    border-radius: 40px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
