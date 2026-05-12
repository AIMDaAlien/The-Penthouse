<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let selectedId = $state(1);
</script>

<div class="gallery-linen-container">
  <div class="linen-bg"></div>
  
  <div class="content">
    <header>
      <div class="breadcrumb">COLLECTION / CONTRIBUTORS</div>
      <h1>The Gallery</h1>
    </header>

    <div class="gallery-grid">
      {#each users as user}
        <div 
          class="gallery-item" 
          class:selected={selectedId === user.id}
          onclick={() => selectedId = user.id}
        >
          <div class="frame">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
          </div>
          <div class="meta">
            <span class="name">{user.name}</span>
            <span class="role">{user.role}</span>
          </div>
        </div>
      {/each}
    </div>

    {#if users.find(u => u.id === selectedId)}
      {@const user = users.find(u => u.id === selectedId)}
      <div class="expanded-view">
        <div class="bio-panel">
          <p>{user.bio}</p>
          <div class="status-wrap">
            <span class="dot {user.status}"></span>
            <span class="status-text">{user.status}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .gallery-linen-container {
    width: 860px;
    height: 760px;
    background: #f4f1ea;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    padding: 60px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .linen-bg {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='linen'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23linen)' opacity='0.05'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    margin-bottom: 40px;
  }

  .breadcrumb {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #8585F1;
    margin-bottom: 10px;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
    font-weight: 300;
    letter-spacing: -1px;
    color: #333;
  }

  .gallery-grid {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding: 20px 0;
    scrollbar-width: none;
  }

  .gallery-grid::-webkit-scrollbar { display: none; }

  .gallery-item {
    min-width: 180px;
    cursor: pointer;
    transition: transform 0.4s;
  }

  .gallery-item:hover {
    transform: translateY(-10px);
  }

  .frame {
    aspect-ratio: 1;
    background: #fff;
    padding: 10px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    margin-bottom: 15px;
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.03);
  }

  .selected .frame {
    border-color: #8585F1;
    box-shadow: 0 0 0 4px rgba(133, 133, 241, 0.1);
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .meta {
    text-align: center;
  }

  .name {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .role {
    font-size: 0.75rem;
    color: #888;
  }

  .expanded-view {
    margin-top: 40px;
    background: #fff;
    padding: 30px;
    border-radius: 20px;
    border: 1px solid rgba(0,0,0,0.05);
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .bio-panel p {
    font-size: 1.2rem;
    line-height: 1.6;
    color: #555;
    font-style: italic;
    margin: 0 0 20px 0;
  }

  .status-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .online { background: #4ade80; }
  .away { background: #fbbf24; }
  .offline { background: #94a3b8; }

  .status-text {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #999;
    letter-spacing: 1px;
  }
</style>