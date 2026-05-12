<script>
  let messages = [
    { id: 1, user: 'Kimi', text: 'This silk texture is so elegant.', own: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimi' },
    { id: 2, user: 'Me', text: 'It definitely feels premium. The vertical lines add height.', own: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }
  ];
</script>

<div class="chat-pane brushed-silk">
  <div class="message-list">
    {#each messages as msg}
      <div class="message-wrapper {msg.own ? 'own' : ''}">
        <div class="avatar-col">
          {#if !msg.own}
            <img src={msg.avatar} alt={msg.user} class="avatar" />
          {/if}
        </div>
        <div class="content-col">
          <div class="bubble">
            {msg.text}
          </div>
        </div>
        <div class="avatar-col">
          {#if msg.own}
            <img src={msg.avatar} alt={msg.user} class="avatar" />
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="bottom-bar">
    <div class="composer-silk">
      <button class="add-tool">+</button>
      <input type="text" placeholder="Whisper something..." />
      <button class="send-pill">Send</button>
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
    background: linear-gradient(90deg, #8585F105 1px, transparent 1px);
    background-size: 4px 100%;
    background-color: #f8f8ff;
    position: relative;
  }

  .chat-pane::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.03;
    pointer-events: none;
  }

  .message-list {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .message-wrapper {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }

  .message-wrapper.own {
    justify-content: flex-end;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    box-shadow: 0 4px 10px rgba(133, 133, 241, 0.2);
  }

  .bubble {
    padding: 1rem 1.75rem;
    border-radius: 30px;
    font-size: 0.95rem;
    max-width: 450px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .message-wrapper:not(.own) .bubble {
    background: rgba(165, 165, 233, 0.15);
    color: #5555a0;
    border: 1px solid rgba(165, 165, 233, 0.2);
    border-bottom-left-radius: 5px;
  }

  .message-wrapper.own .bubble {
    background: #8585F1;
    color: white;
    box-shadow: 0 8px 20px rgba(133, 133, 241, 0.3);
    border-bottom-right-radius: 5px;
  }

  .bottom-bar {
    padding: 2rem;
    background: linear-gradient(to top, rgba(248, 248, 255, 1), rgba(248, 248, 255, 0));
  }

  .composer-silk {
    display: flex;
    align-items: center;
    background: white;
    padding: 0.5rem;
    border-radius: 40px;
    border: 1px solid rgba(133, 133, 241, 0.1);
    box-shadow: 0 15px 35px rgba(133, 133, 241, 0.1);
  }

  .add-tool {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #f0f0ff;
    color: #8585F1;
    font-size: 1.5rem;
    cursor: pointer;
    margin-right: 0.5rem;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    padding: 0 1rem;
    font-family: inherit;
    font-size: 1rem;
  }

  .send-pill {
    background: #8585F1;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
