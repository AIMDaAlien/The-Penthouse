<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'The etheric flow texture is very calming.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It feels like the conversation is just drifting along.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane etheric-flow">
  <div class="message-list">
    {#each messages as msg}
      <div class="flow-msg {msg.own ? 'own' : ''}">
        <img src={msg.avatar} alt={msg.user} class="avatar" />
        <div class="flow-capsule">
          {msg.text}
        </div>
      </div>
    {/each}
  </div>

  <div class="flow-footer">
    <div class="minimal-composer">
      <input type="text" placeholder="Drift a message..." />
      <button class="flow-send">➤</button>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&display=swap');

  .chat-pane {
    font-family: 'Ubuntu', sans-serif;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: #fdfbff;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.01' numOctaves='1'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='100'/%3E%3C/filter%3E%3Cpath d='M0 500 Q 250 400 500 500 T 1000 500' stroke='%238585F1' stroke-width='1' fill='none' opacity='.1' filter='url(%23f)'/%3E%3C/svg%3E");
    background-size: cover;
  }

  .message-list {
    flex: 1;
    padding: 4rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .flow-msg {
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
  }

  .flow-msg.own {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    opacity: 0.8;
  }

  .flow-capsule {
    padding: 1rem 2rem;
    border-radius: 100px;
    background: rgba(165, 165, 233, 0.08);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    color: #666699;
    font-weight: 300;
    letter-spacing: 0.02em;
    border: 1px solid rgba(133, 133, 241, 0.1);
  }

  .flow-msg.own .flow-capsule {
    background: rgba(133, 133, 241, 0.12);
    color: #444488;
    font-weight: 400;
  }

  .flow-footer {
    padding: 4rem;
    display: flex;
    justify-content: center;
  }

  .minimal-composer {
    width: 60%;
    border-bottom: 1px solid rgba(133, 133, 241, 0.3);
    padding: 0.5rem 0;
    display: flex;
    align-items: center;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 1.2rem;
    color: #666699;
  }

  .flow-send {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #8585F1;
    cursor: pointer;
    opacity: 0.6;
    transition: 0.3s;
  }

  .flow-send:hover {
    opacity: 1;
    transform: translateX(5px);
  }
</style>
