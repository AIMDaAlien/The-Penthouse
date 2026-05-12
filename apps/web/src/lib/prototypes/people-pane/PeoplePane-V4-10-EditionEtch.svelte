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

<div class="edition-etch-container">
  <div class="etch-pattern"></div>
  
  <header class="top-bar">
    <div class="monogram">E | E</div>
    <div class="title">THE COLLECTIVE EDITION</div>
    <div class="page-num">PG. 0{activeIndex + 1}</div>
  </header>

  <div class="main-stage">
    <div class="etch-frame">
      <div class="inner-etch">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${users[activeIndex].name}`} alt={users[activeIndex].name} />
      </div>
    </div>

    <div class="text-content">
      <span class="category">MEMBER DOSSIER</span>
      <h2 class="name">{users[activeIndex].name}</h2>
      <h3 class="role">{users[activeIndex].role}</h3>
      <div class="line"></div>
      <p class="bio">{users[activeIndex].bio}</p>
      
      <div class="navigation">
        <button 
          class="nav-btn" 
          disabled={activeIndex === 0}
          onclick={() => activeIndex--}
        >
          PREVIOUS
        </button>
        <div class="dots">
          {#each users as _, i}
            <div class="dot" class:active={activeIndex === i}></div>
          {/each}
        </div>
        <button 
          class="nav-btn" 
          disabled={activeIndex === users.length - 1}
          onclick={() => activeIndex++}
        >
          NEXT
        </button>
      </div>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="legal">© 2024 EDITION ETCH. ALL RIGHTS RESERVED.</div>
    <div class="status">SYSTEM STATUS: <span class={users[activeIndex].status}>{users[activeIndex].status.toUpperCase()}</span></div>
  </footer>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .edition-etch-container {
    width: 860px;
    height: 760px;
    background: #fff;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    padding: 60px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    color: #111;
    border: 1px solid #000;
  }

  .etch-pattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(#000 0.5px, transparent 0.5px);
    background-size: 10px 10px;
    opacity: 0.03;
    pointer-events: none;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #000;
    padding-bottom: 20px;
    margin-bottom: 60px;
  }

  .monogram {
    font-weight: 700;
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  .title {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 4px;
    color: #666;
  }

  .page-num {
    font-weight: 700;
    font-size: 0.8rem;
  }

  .main-stage {
    flex: 1;
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 60px;
    align-items: center;
  }

  .etch-frame {
    border: 1px solid #000;
    padding: 10px;
    position: relative;
  }

  .etch-frame::before {
    content: '';
    position: absolute;
    top: -5px; left: -5px; bottom: -5px; right: -5px;
    border: 1px solid #ddd;
  }

  .inner-etch {
    aspect-ratio: 1;
    overflow: hidden;
    background: #f8f8f8;
  }

  .inner-etch img {
    width: 100%;
    height: 100%;
    filter: grayscale(1) contrast(1.1);
    mix-blend-mode: multiply;
  }

  .category {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #8585F1;
    display: block;
    margin-bottom: 15px;
  }

  h2 {
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -2px;
    line-height: 0.9;
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 400;
    color: #666;
    margin: 10px 0 30px 0;
  }

  .line {
    width: 100%;
    height: 1px;
    background: #000;
    margin-bottom: 30px;
  }

  .bio {
    font-size: 1rem;
    line-height: 1.7;
    color: #444;
    margin-bottom: 60px;
  }

  .navigation {
    display: flex;
    align-items: center;
    gap: 30px;
  }

  .nav-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 2px;
    cursor: pointer;
    padding: 0;
    transition: color 0.3s;
  }

  .nav-btn:hover:not(:disabled) {
    color: #8585F1;
  }

  .nav-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  .dots {
    display: flex;
    gap: 8px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border: 1px solid #000;
    border-radius: 50%;
  }

  .dot.active {
    background: #000;
  }

  .bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #eee;
    padding-top: 20px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: #999;
  }

  .status span {
    color: #111;
  }

  .status .online { color: #4ade80; }
  .status .away { color: #fbbf24; }
  .status .offline { color: #94a3b8; }
</style>