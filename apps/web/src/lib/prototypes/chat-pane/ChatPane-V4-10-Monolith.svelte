<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'The monolith style is bold and solid.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It feels very dependable. The thick borders add a lot of character.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane monolith">
  <div class="message-list">
    {#each messages as msg}
      <div class="mono-row {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="mono-bubble">
          {msg.text}
        </div>
      </div>
    {#/each}
  </div>

  <div class="mono-footer">
    <div class="mono-composer">
      <input type="text" placeholder="Command the conversation..." />
      <button class="mono-send">SEND</button>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@700&family=Ubuntu:wght@400;500&display=swap');

  .chat-pane {
    font-family: 'Ubuntu', sans-serif;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: #111;
    background-image: 
      linear-gradient(rgba(133, 133, 241, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(133, 133, 241, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
  }

  .message-list {
    flex: 1;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .mono-row {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
  }

  .mono-row.own {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 3px solid #8585F1;
  }

  .mono-bubble {
    padding: 1.5rem 2.5rem;
    border-radius: 40px;
    background: #1a1a1a;
    border: 4px solid #333;
    color: #eee;
    font-size: 1.1rem;
    box-shadow: 10px 10px 0px rgba(133, 133, 241, 0.2);
  }

  .mono-row.own .mono-bubble {
    background: #8585F1;
    border-color: #A5A5E9;
    color: white;
    box-shadow: -10px 10px 0px rgba(0, 0, 0, 0.3);
  }

  .mono-footer {
    padding: 3rem;
  }

  .mono-composer {
    background: #1a1a1a;
    border: 4px solid #333;
    border-radius: 50px;
    padding: 0.8rem 1rem 0.8rem 2.5rem;
    display: flex;
    align-items: center;
    box-shadow: 0 20px 0 rgba(0,0,0,0.2);
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: white;
    font-family: inherit;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .mono-send {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.8rem 2.5rem;
    border-radius: 40px;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
  }
</style>
