<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'Have you seen the mesh pattern? It adds such a nice depth.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'Yes, it is very subtle but effective. The primary color pops well.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' },
    { id: 3, user: 'Kimi', text: 'The capsule shapes make it feel very modern and friendly.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' }
  ];
</script>

<div class="chat-pane mesh-pastel">
  <div class="message-list">
    {#each messages as msg}
      <div class="message-row {msg.own ? 'own' : ''}">
        {#if !msg.own}
          <img src={msg.avatar} alt={msg.user} class="avatar" />
        {/if}
        <div class="bubble">
          {msg.text}
        </div>
        {#if msg.own}
          <img src={msg.avatar} alt={msg.user} class="avatar" />
        {/if}
      </div>
    {/each}
  </div>

  <div class="composer-area">
    <div class="composer-floating">
      <input type="text" placeholder="Share your thoughts..." />
      <div class="actions">
        <button class="icon-btn">📎</button>
        <button class="send-btn">Send</button>
      </div>
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
    background: #fdfdff;
    background-image: 
      radial-gradient(#8585F1 0.5px, transparent 0.5px),
      radial-gradient(#8585F1 0.5px, #fdfdff 0.5px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-blend-mode: multiply;
    opacity: 0.95;
  }

  .message-list {
    flex: 1;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .message-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .message-row.own {
    justify-content: flex-end;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #8585F1;
  }

  .bubble {
    padding: 0.8rem 1.5rem;
    border-radius: 50px;
    max-width: 60%;
    font-size: 0.9rem;
    box-shadow: 0 4px 15px rgba(133, 133, 241, 0.1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .message-row:not(.own) .bubble {
    background: rgba(165, 165, 233, 0.2);
    color: #4a4a8a;
    border: 1px solid rgba(165, 165, 233, 0.3);
  }

  .message-row.own .bubble {
    background: rgba(133, 133, 241, 0.9);
    color: white;
  }

  .composer-area {
    padding: 2rem;
    display: flex;
    justify-content: center;
  }

  .composer-floating {
    width: 80%;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-radius: 100px;
    padding: 0.6rem 1rem 0.6rem 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid rgba(133, 133, 241, 0.2);
    box-shadow: 0 10px 40px rgba(133, 133, 241, 0.15);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-family: inherit;
    font-size: 1rem;
    color: #4a4a8a;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .send-btn {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.6rem 1.5rem;
    border-radius: 50px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .send-btn:hover {
    background: #7070e0;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(133, 133, 241, 0.4);
  }
</style>
