<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, Sasha: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let selectedId = $state(1);
</script>

<div class="portfolio-froth-container">
  <div class="froth-circles">
    <div class="froth f1"></div>
    <div class="froth f2"></div>
    <div class="froth f3"></div>
  </div>

  <div class="frosted-pane">
    <aside class="list-pane">
      <div class="header">DIRECTORY</div>
      <div class="scroll-area">
        {#each users as user}
          <button 
            class="user-bubble" 
            class:active={selectedId === user.id}
            onclick={() => selectedId = user.id}
          >
            <div class="avatar-wrap">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
            </div>
            <span class="name-label">{user.name.split(' ')[0]}</span>
          </button>
        {/each}
      </div>
    </aside>

    <main class="detail-pane">
      {#if users.find(u => u.id === selectedId)}
        {@const user = users.find(u => u.id === selectedId)}
        <div class="content">
          <div class="top-info">
            <span class="role-badge">{user.role}</span>
            <div class="status-indicator {user.status}"></div>
          </div>
          <h1>{user.name}</h1>
          <p class="bio">{user.bio}</p>
          
          <div class="portfolio-grid">
            <div class="p-item p1"></div>
            <div class="p-item p2"></div>
            <div class="p-item p3"></div>
          </div>
          
          <button class="msg-btn">Open Dialogue</button>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .portfolio-froth-container {
    width: 860px;
    height: 760px;
    background: #f0f0ff;
    font-family: 'Ubuntu', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .froth-circles {
    position: absolute;
    inset: 0;
    filter: blur(40px);
    z-index: 1;
  }

  .froth {
    position: absolute;
    border-radius: 50%;
    background: #8585F1;
    opacity: 0.15;
  }

  .f1 { width: 300px; height: 300px; top: -50px; left: -50px; }
  .f2 { width: 400px; height: 400px; bottom: -100px; right: -50px; background: #A5A5E9; }
  .f3 { width: 200px; height: 200px; top: 40%; left: 40%; }

  .frosted-pane {
    width: 760px;
    height: 660px;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-radius: 40px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    z-index: 2;
    display: grid;
    grid-template-columns: 140px 1fr;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
  }

  .list-pane {
    background: rgba(255,255,255,0.2);
    border-right: 1px solid rgba(255,255,255,0.3);
    padding: 30px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .header {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #8585F1;
    margin-bottom: 40px;
  }

  .scroll-area {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .user-bubble {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
  }

  .avatar-wrap {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    padding: 4px;
    background: #fff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  }

  .avatar-wrap img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .name-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
  }

  .active .avatar-wrap {
    transform: scale(1.15);
    background: #8585F1;
  }

  .active .name-label {
    color: #8585F1;
  }

  .detail-pane {
    padding: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .top-info {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
  }

  .role-badge {
    background: #fff;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    color: #8585F1;
    box-shadow: 0 4px 10px rgba(0,0,0,0.03);
  }

  .status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .online { background: #4ade80; }
  .away { background: #fbbf24; }
  .offline { background: #94a3b8; }

  h1 {
    font-size: 3.5rem;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: -2px;
    color: #1a1a1a;
  }

  .bio {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #555;
    margin-bottom: 40px;
    max-width: 440px;
  }

  .portfolio-grid {
    display: flex;
    gap: 15px;
    margin-bottom: 40px;
  }

  .p-item {
    flex: 1;
    aspect-ratio: 4/3;
    background: rgba(255,255,255,0.4);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.6);
  }

  .msg-btn {
    align-self: flex-start;
    background: #1a1a1a;
    color: #fff;
    border: none;
    padding: 16px 32px;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .msg-btn:hover {
    background: #8585F1;
    transform: translateY(-3px);
  }
</style>