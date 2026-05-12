<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let selectedUser = $state(users[0]);
</script>

<div class="easel-grain-container">
  <div class="grain-texture"></div>
  
  <header>
    <h1>EASEL</h1>
    <span class="sub">CURATED CONNECTIONS</span>
  </header>

  <div class="easel-layout">
    <div class="canvas">
      <div class="frame">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} alt={selectedUser.name} />
        <div class="status-indicator {selectedUser.status}"></div>
      </div>
      <div class="caption">
        <h2>{selectedUser.name}</h2>
        <span class="role">{selectedUser.role}</span>
        <p class="bio">{selectedUser.bio}</p>
      </div>
    </div>

    <div class="palette">
      {#each users as user}
        <button 
          class="swatch" 
          class:active={selectedUser.id === user.id}
          onclick={() => selectedUser = user}
        >
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
          <div class="swatch-label">{user.name.split(' ')[0]}</div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .easel-grain-container {
    width: 860px;
    height: 760px;
    background: #e5e5e5;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    padding: 50px;
    box-sizing: border-box;
    color: #1a1a1a;
    overflow: hidden;
  }

  .grain-texture {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.08;
    pointer-events: none;
    z-index: 10;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 50px;
    border-bottom: 2px solid #333;
    padding-bottom: 15px;
  }

  h1 {
    font-size: 4rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -3px;
    line-height: 0.8;
  }

  .sub {
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 2px;
    color: #8585F1;
  }

  .easel-layout {
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 60px;
    height: calc(100% - 150px);
  }

  .canvas {
    background: #fff;
    padding: 40px;
    box-shadow: 20px 20px 0px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
  }

  .frame {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    border: 8px solid #f0f0f0;
    position: relative;
    margin-bottom: 30px;
  }

  .frame img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .status-indicator {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 4px solid #fff;
  }

  .online { background: #4ade80; }
  .away { background: #fbbf24; }
  .offline { background: #94a3b8; }

  .caption h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -1px;
  }

  .caption .role {
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #A5A5E9;
    letter-spacing: 2px;
    display: block;
    margin-bottom: 20px;
  }

  .caption .bio {
    font-size: 1.1rem;
    color: #666;
    max-width: 400px;
    line-height: 1.5;
  }

  .palette {
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
  }

  .swatch {
    background: #fff;
    border: none;
    padding: 10px;
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    border-radius: 10px;
  }

  .swatch img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #eee;
  }

  .swatch-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #888;
  }

  .swatch:hover {
    transform: translateX(-5px);
    background: #f9f9f9;
  }

  .swatch.active {
    background: #8585F1;
  }

  .swatch.active .swatch-label {
    color: #fff;
  }
</style>