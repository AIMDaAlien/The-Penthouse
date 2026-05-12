<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let selectedId = $state(1);
  let selectedUser = $derived(users.find(u => u.id === selectedId));
</script>

<div class="vogue-mist-container">
  <div class="noise-overlay"></div>
  
  <header class="editorial-header">
    <div class="title-group">
      <h1>THE COLLECTIVE</h1>
      <p class="subtitle">Issue 04 — Members & Contributors</p>
    </div>
    <div class="stats">
      <span class="count">{users.length}</span>
      <span class="label">ACTIVE SOULS</span>
    </div>
  </header>

  <div class="main-layout">
    <aside class="member-list">
      {#each users as user}
        <button 
          class="member-card" 
          class:active={selectedId === user.id}
          onclick={() => selectedId = user.id}
        >
          <div class="avatar-container">
            <div class="avatar-ring"></div>
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
            <div class="status-dot {user.status}"></div>
          </div>
          <div class="member-info">
            <span class="name">{user.name}</span>
            <span class="role">{user.role}</span>
          </div>
        </button>
      {/each}
    </aside>

    <main class="focus-pane">
      {#if selectedUser}
        <div class="profile-hero">
          <div class="hero-image-wrap">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} alt={selectedUser.name} class="hero-avatar" />
          </div>
          <div class="hero-content">
            <span class="hero-role">{selectedUser.role}</span>
            <h2 class="hero-name">{selectedUser.name}</h2>
            <p class="hero-bio">{selectedUser.bio}</p>
            <div class="action-bar">
              <button class="primary-btn">Message</button>
              <button class="secondary-btn">View Portfolio</button>
            </div>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  :host {
    display: block;
    width: 860px;
    height: 760px;
    --primary: #8585F1;
    --secondary: #A5A5E9;
    --bg-soft: rgba(255, 255, 255, 0.05);
    --glass: rgba(255, 255, 255, 0.1);
    --text-main: #2c2c2c;
    --text-muted: #666;
  }

  .vogue-mist-container {
    width: 100%;
    height: 100%;
    background: #f8f9fa;
    color: var(--text-main);
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 40px;
    box-sizing: border-box;
  }

  .noise-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.03;
    pointer-events: none;
    z-index: 10;
  }

  .editorial-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    padding-bottom: 20px;
  }

  h1 {
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -2px;
    margin: 0;
    line-height: 0.9;
    color: var(--primary);
  }

  .subtitle {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 10px 0 0 0;
    color: var(--text-muted);
  }

  .stats {
    text-align: right;
  }

  .count {
    display: block;
    font-size: 2.5rem;
    font-weight: 300;
    line-height: 1;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--secondary);
  }

  .main-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 40px;
    flex: 1;
    overflow: hidden;
  }

  .member-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding-right: 10px;
  }

  .member-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px;
    background: transparent;
    border: none;
    border-radius: 40px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
  }

  .member-card:hover {
    background: rgba(133, 133, 241, 0.05);
  }

  .member-card.active {
    background: var(--primary);
    color: white;
  }

  .avatar-container {
    position: relative;
    width: 48px;
    height: 48px;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #eee;
    object-fit: cover;
  }

  .status-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #f8f9fa;
  }

  .active .status-dot {
    border-color: var(--primary);
  }

  .online { background: #4ade80; }
  .away { background: #fbbf24; }
  .offline { background: #94a3b8; }

  .member-info {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 500;
    font-size: 0.95rem;
  }

  .role {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .focus-pane {
    background: white;
    border-radius: 30px;
    padding: 40px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
    position: relative;
    overflow: hidden;
  }

  .profile-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hero-image-wrap {
    width: 180px;
    height: 180px;
    padding: 10px;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 50%;
    margin-bottom: 30px;
  }

  .hero-avatar {
    width: 100%;
    height: 100%;
  }

  .hero-role {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--secondary);
    letter-spacing: 3px;
    margin-bottom: 10px;
    display: block;
  }

  .hero-name {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 20px 0;
    letter-spacing: -1px;
  }

  .hero-bio {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--text-muted);
    max-width: 400px;
    margin-bottom: 40px;
  }

  .action-bar {
    display: flex;
    gap: 15px;
  }

  button {
    font-family: 'Ubuntu', sans-serif;
  }

  .primary-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 30px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .secondary-btn {
    background: transparent;
    color: var(--text-main);
    border: 1px solid rgba(0,0,0,0.1);
    padding: 12px 30px;
    border-radius: 30px;
    font-weight: 500;
    cursor: pointer;
  }

  .primary-btn:hover { transform: scale(1.05); }
</style>