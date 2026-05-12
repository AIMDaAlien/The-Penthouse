<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let activeIndex = $state(0);
</script>

<div class="curator-velvet-container">
  <div class="noise"></div>
  
  <div class="sidebar">
    <div class="logo">CURATOR</div>
    <div class="user-strip">
      {#each users as user, i}
        <button 
          class="user-dot" 
          class:active={activeIndex === i}
          onclick={() => activeIndex = i}
        >
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
        </button>
      {/each}
    </div>
  </div>

  <main class="viewer">
    {#key activeIndex}
      <div class="profile-card">
        <div class="image-area">
          <div class="circle-main">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${users[activeIndex].name}`} alt={users[activeIndex].name} />
          </div>
          <div class="accent-circle"></div>
        </div>
        <div class="content-area">
          <span class="status-tag {users[activeIndex].status}">{users[activeIndex].status}</span>
          <h2 class="name">{users[activeIndex].name}</h2>
          <h3 class="role">{users[activeIndex].role}</h3>
          <p class="bio">{users[activeIndex].bio}</p>
          <div class="controls">
            <button class="msg-btn">Send Message</button>
          </div>
        </div>
      </div>
    {/key}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .curator-velvet-container {
    width: 860px;
    height: 760px;
    background: #1a1a2e;
    font-family: 'Ubuntu', sans-serif;
    display: flex;
    color: #fff;
    position: relative;
    overflow: hidden;
  }

  .noise {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.05;
    pointer-events: none;
  }

  .sidebar {
    width: 120px;
    background: rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    border-right: 1px solid rgba(255,255,255,0.05);
  }

  .logo {
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 4px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    margin-bottom: 40px;
    color: #8585F1;
  }

  .user-strip {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .user-dot {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    padding: 2px;
    border: 2px solid transparent;
    background: none;
    cursor: pointer;
    transition: all 0.3s;
    opacity: 0.5;
  }

  .user-dot img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .user-dot.active {
    opacity: 1;
    border-color: #8585F1;
    transform: scale(1.1);
  }

  .viewer {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
  }

  .profile-card {
    display: flex;
    gap: 60px;
    align-items: center;
    animation: slideIn 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .image-area {
    position: relative;
    width: 300px;
    height: 300px;
  }

  .circle-main {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    z-index: 2;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .circle-main img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .accent-circle {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 100px;
    height: 100px;
    background: #8585F1;
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.4;
  }

  .content-area {
    max-width: 400px;
  }

  .status-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 4px 12px;
    border-radius: 20px;
    background: rgba(255,255,255,0.05);
    margin-bottom: 20px;
    display: inline-block;
  }

  .online { color: #4ade80; }
  .away { color: #fbbf24; }
  .offline { color: #94a3b8; }

  .name {
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
    line-height: 1;
    letter-spacing: -2px;
  }

  .role {
    font-size: 1rem;
    font-weight: 400;
    color: #A5A5E9;
    margin: 10px 0 30px 0;
  }

  .bio {
    font-size: 1.1rem;
    line-height: 1.6;
    color: rgba(255,255,255,0.6);
    margin-bottom: 40px;
  }

  .msg-btn {
    background: #8585F1;
    color: white;
    border: none;
    padding: 14px 30px;
    border-radius: 40px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s;
  }

  .msg-btn:hover {
    background: #6e6ee0;
  }
</style>