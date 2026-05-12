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

<div class="journal-noise-container">
  <div class="noise-texture"></div>
  
  <header class="masthead">
    <div class="top-row">
      <span class="date">EST. 2024</span>
      <span class="edition">FIRST EDITION</span>
    </div>
    <h1>JOURNAL</h1>
  </header>

  <div class="main-body">
    <div class="article">
      <div class="headline">
        <h2>{users[activeIndex].name}</h2>
        <span class="sub-head">{users[activeIndex].role}</span>
      </div>
      <div class="content">
        <div class="dropcap">
          <div class="img-container">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${users[activeIndex].name}`} alt={users[activeIndex].name} />
          </div>
        </div>
        <p class="summary">{users[activeIndex].bio}</p>
        <p class="filler">The collective is a sanctuary for the curious. A place where ideas are born and nurtured. We believe in the power of connection and the beauty of shared vision. Join us as we explore the boundaries of creativity and the depths of the human experience.</p>
      </div>
    </div>

    <aside class="contributors">
      <h3>CONTRIBUTORS</h3>
      <div class="contributor-list">
        {#each users as user, i}
          <button 
            class="entry" 
            class:active={activeIndex === i}
            onclick={() => activeIndex = i}
          >
            <span class="index">{i + 1}.</span>
            <span class="c-name">{user.name}</span>
          </button>
        {/each}
      </div>
    </aside>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap');

  .journal-noise-container {
    width: 860px;
    height: 760px;
    background: #fdfaf6;
    font-family: 'Ubuntu', sans-serif;
    position: relative;
    padding: 40px;
    box-sizing: border-box;
    color: #2c2c2c;
    border: 1px solid #ddd;
    overflow: hidden;
  }

  .noise-texture {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 5;
  }

  .masthead {
    text-align: center;
    border-bottom: 4px solid #000;
    padding-bottom: 20px;
    margin-bottom: 40px;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: #666;
    margin-bottom: 10px;
  }

  h1 {
    font-size: 5rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -4px;
    line-height: 0.8;
  }

  .main-body {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 40px;
    height: calc(100% - 160px);
  }

  .article {
    border-right: 1px solid #ddd;
    padding-right: 40px;
    overflow-y: auto;
  }

  .headline h2 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 5px 0;
    letter-spacing: -1px;
  }

  .sub-head {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #8585F1;
    letter-spacing: 1px;
    display: block;
    margin-bottom: 30px;
  }

  .content {
    column-count: 2;
    column-gap: 30px;
  }

  .dropcap {
    float: left;
    margin-right: 15px;
    margin-bottom: 10px;
  }

  .img-container {
    width: 100px;
    height: 100px;
    background: #eee;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 50%;
  }

  .img-container img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .summary {
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 20px 0;
  }

  .filler {
    font-size: 0.9rem;
    line-height: 1.6;
    color: #555;
    margin: 0;
  }

  .contributors h3 {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 20px;
    border-bottom: 1px solid #000;
    padding-bottom: 5px;
  }

  .contributor-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .entry {
    background: none;
    border: none;
    text-align: left;
    display: flex;
    gap: 10px;
    cursor: pointer;
    padding: 5px 0;
    border-bottom: 1px dashed #eee;
    transition: all 0.2s;
  }

  .entry:hover, .entry.active {
    color: #8585F1;
    padding-left: 10px;
  }

  .index {
    font-weight: 700;
    font-size: 0.8rem;
  }

  .c-name {
    font-weight: 500;
    font-size: 0.95rem;
  }
</style>