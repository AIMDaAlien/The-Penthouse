<script lang="ts">
  let { users = [
    { id: 1, name: 'Amelie Laurent', role: 'Editor in Chief', status: 'online', bio: 'Curation of the fine arts and digital minimalism.' },
    { id: 2, name: 'Julian Vane', role: 'Creative Director', status: 'away', bio: 'Architecture & motion design.' },
    { id: 3, name: 'Sasha Meyer', role: 'Staff Writer', status: 'online', bio: 'Chronicles of the modern workspace.' },
    { id: 4, name: 'Marcus Thorne', role: 'Photographer', status: 'offline', bio: 'Visual narratives through grain and light.' },
    { id: 5, name: 'Elena Rossi', role: 'Stylist', status: 'online', bio: 'Composition, color, and texture.' }
  ] } = $props();

  let hoveredId = $state(null);
</script>

<div class="atelier-soft-container">
  <div class="texture"></div>
  
  <header class="header">
    <div class="atelier-logo">ATELIER</div>
    <div class="line"></div>
    <div class="issue">VOL. 12</div>
  </header>

  <div class="scroll-container">
    <div class="member-grid">
      {#each users as user}
        <div 
          class="member-box" 
          onmouseenter={() => hoveredId = user.id}
          onmouseleave={() => hoveredId = null}
        >
          <div class="image-wrapper">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} />
             {#if hoveredId === user.id}
               <div class="overlay">
                 <button>View Profile</button>
               </div>
             {/if}
          </div>
          <div class="details">
            <h4 class="name">{user.name}</h4>
            <p class="role">{user.role}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .atelier-soft-container {
    width: 860px;
    height: 760px;
    background: #fdfaf6;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    padding: 60px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    color: #444;
  }

  .texture {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.02;
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 60px;
  }

  .atelier-logo {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 4px;
    color: #8585F1;
  }

  .line {
    flex: 1;
    height: 1px;
    background: #eee;
  }

  .issue {
    font-size: 0.8rem;
    font-weight: 500;
    color: #999;
  }

  .scroll-container {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 40px;
  }

  .member-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }

  .member-box {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .image-wrapper {
    position: relative;
    aspect-ratio: 1;
    background: #fff;
    border-radius: 50%;
    padding: 10px;
    border: 1px solid #f0f0f0;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .member-box:hover .image-wrapper {
    transform: translateY(-10px);
    border-color: #A5A5E9;
    box-shadow: 0 15px 35px rgba(133, 133, 241, 0.1);
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .overlay {
    position: absolute;
    inset: 10px;
    background: rgba(133, 133, 241, 0.2);
    backdrop-filter: blur(4px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .overlay button {
    background: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #8585F1;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .details {
    text-align: center;
  }

  .name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  .role {
    margin: 5px 0 0 0;
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
</style>