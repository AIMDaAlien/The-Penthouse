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

<div class="studio-silk-container">
  <div class="silk-gradient"></div>
  
  <div class="content-wrapper">
    <aside class="sidebar">
      {#each users as user}
        <button 
          class="nav-card" 
          class:active={selectedId === user.id}
          onclick={() => selectedId = user.id}
        >
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
          <div class="indicator"></div>
        </button>
      {/each}
    </aside>

    <main class="main-display">
      {#if users.find(u => u.id === selectedId)}
        {@const user = users.find(u => u.id === selectedId)}
        <div class="user-showcase">
          <div class="text-block">
            <span class="prefix">MEET THE ARTIST</span>
            <h2>{user.name}</h2>
            <div class="divider"></div>
            <p class="role">{user.role}</p>
            <p class="bio">{user.bio}</p>
            <button class="action">Contact Studio</button>
          </div>
          <div class="image-block">
            <div class="silk-frame">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
            </div>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .studio-silk-container {
    width: 860px;
    height: 760px;
    background: #fff;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .silk-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 100% 0%, #A5A5E9 0%, transparent 40%),
                radial-gradient(circle at 0% 100%, #8585F1 0%, transparent 40%);
    opacity: 0.1;
    filter: blur(60px);
  }

  .content-wrapper {
    position: relative;
    z-index: 2;
    display: flex;
    height: 100%;
  }

  .sidebar {
    width: 100px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 40px 20px;
    border-right: 1px solid rgba(0,0,0,0.05);
  }

  .nav-card {
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 0;
  }

  .nav-card img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    filter: grayscale(1);
    transition: all 0.4s;
    border: 2px solid transparent;
  }

  .nav-card.active img, .nav-card:hover img {
    filter: grayscale(0);
    border-color: #8585F1;
    transform: scale(1.1);
  }

  .indicator {
    position: absolute;
    right: -22px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 0;
    background: #8585F1;
    transition: height 0.3s;
  }

  .active .indicator {
    height: 30px;
  }

  .main-display {
    flex: 1;
    padding: 60px;
    display: flex;
    align-items: center;
  }

  .user-showcase {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
    animation: fadeIn 0.8s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .prefix {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #A5A5E9;
    display: block;
    margin-bottom: 10px;
  }

  h2 {
    font-size: 3.5rem;
    font-weight: 700;
    margin: 0;
    line-height: 0.9;
    letter-spacing: -2px;
    color: #1a1a1a;
  }

  .divider {
    width: 60px;
    height: 4px;
    background: #8585F1;
    margin: 30px 0;
  }

  .role {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 15px;
  }

  .bio {
    font-size: 1rem;
    line-height: 1.6;
    color: #666;
    margin-bottom: 40px;
  }

  .action {
    background: #1a1a1a;
    color: #fff;
    border: none;
    padding: 15px 30px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s;
  }

  .action:hover {
    background: #8585F1;
  }

  .silk-frame {
    width: 320px;
    height: 320px;
    border-radius: 50%;
    overflow: hidden;
    padding: 10px;
    background: #f8f8f8;
    box-shadow: 20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff;
  }

  .silk-frame img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
</style>