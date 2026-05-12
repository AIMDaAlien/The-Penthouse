<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let activeTab = $state('all');
</script>

<div class="bazaar-glass-container">
  <div class="glass-orb orb-1"></div>
  <div class="glass-orb orb-2"></div>
  
  <div class="glass-shell">
    <nav class="side-nav">
      <div class="brand">BZ</div>
      <div class="nav-items">
        <button class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>Directory</button>
        <button class:active={activeTab === 'recent'} onclick={() => activeTab = 'recent'}>Recent</button>
        <button class:active={activeTab === 'favorites'} onclick={() => activeTab = 'favorites'}>Starred</button>
      </div>
    </nav>

    <div class="content-area">
      <header>
        <h2>The Bazaar</h2>
        <div class="search-bar">
          <input type="text" placeholder="Find a contributor..." />
        </div>
      </header>

      <section class="featured">
        <h3>Featured Artists</h3>
        <div class="featured-list">
          {#each users.slice(0, 3) as user}
            <div class="featured-card">
              <div class="avatar-stack">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
              </div>
              <span class="f-name">{user.name}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="full-list">
        <h3>Contributors</h3>
        <div class="grid">
          {#each users as user}
            <div class="list-item">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
              <div class="info">
                <span class="name">{user.name}</span>
                <span class="role">{user.role}</span>
              </div>
              <div class="status {user.status}"></div>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .bazaar-glass-container {
    width: 860px;
    height: 760px;
    background: #eef2f7;
    font-family: 'Ubuntu', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .glass-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    z-index: 1;
  }

  .orb-1 {
    width: 400px;
    height: 400px;
    background: rgba(133, 133, 241, 0.2);
    top: -100px;
    left: -100px;
  }

  .orb-2 {
    width: 300px;
    height: 300px;
    background: rgba(165, 165, 233, 0.2);
    bottom: -50px;
    right: -50px;
  }

  .glass-shell {
    width: 780px;
    height: 680px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 40px;
    display: flex;
    z-index: 2;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.05);
  }

  .side-nav {
    width: 100px;
    background: rgba(255, 255, 255, 0.3);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 0;
  }

  .brand {
    font-weight: 700;
    font-size: 1.5rem;
    color: #8585F1;
    margin-bottom: 60px;
  }

  .nav-items {
    display: flex;
    flex-direction: column;
    gap: 30px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .nav-items button {
    background: none;
    border: none;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #666;
    cursor: pointer;
    transition: color 0.3s;
  }

  .nav-items button.active {
    color: #8585F1;
  }

  .content-area {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 30px;
    overflow-y: auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    font-size: 1.8rem;
    margin: 0;
    font-weight: 700;
  }

  .search-bar input {
    background: rgba(255,255,255,0.4);
    border: 1px solid rgba(255,255,255,0.6);
    padding: 10px 20px;
    border-radius: 20px;
    outline: none;
    font-family: inherit;
    width: 200px;
  }

  h3 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #999;
    margin-bottom: 20px;
  }

  .featured-list {
    display: flex;
    gap: 20px;
  }

  .featured-card {
    background: rgba(255,255,255,0.4);
    padding: 20px;
    border-radius: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255,255,255,0.2);
    transition: transform 0.3s;
    cursor: pointer;
  }

  .featured-card:hover {
    transform: translateY(-5px);
    background: rgba(255,255,255,0.6);
  }

  .featured-card img {
    width: 64px;
    height: 64px;
    border-radius: 50%;
  }

  .f-name {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .list-item img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .name { font-size: 0.9rem; font-weight: 500; }
  .role { font-size: 0.75rem; color: #777; }

  .status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .online { background: #4ade80; }
  .away { background: #fbbf24; }
  .offline { background: #cbd5e1; }
</style>