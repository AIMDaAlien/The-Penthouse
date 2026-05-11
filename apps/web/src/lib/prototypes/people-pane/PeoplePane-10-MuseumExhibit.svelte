<script lang="ts">
  import Avatar from '../../components/Avatar.svelte';

  const users = [
    { title: 'Portrait of an Engineer', name: 'Ada Lovelace', status: 'online', date: 'Circa 1843' },
    { title: 'Study of a Designer', name: 'Ray Eames', status: 'dnd', date: '1956' },
    { title: 'The Architect in Repose', name: 'Zaha Hadid', status: 'offline', date: '1993' },
    { title: 'Figure in Motion', name: 'Isamu Noguchi', status: 'busy', date: '1947' }
  ];
</script>

<div class="museum-pane">
  <header class="gallery-header">
    <div class="plaque">
      <h1>EXHIBITION II: THE RESIDENTS</h1>
      <p>Curated Selection · Penthouse Gallery</p>
    </div>
    <div class="search-plaque">
      <input type="text" placeholder="Locate Subject..." />
    </div>
  </header>

  <div class="gallery-wall">
    {#each users as user}
      <button class="frame">
        <div class="matting">
          <div class="canvas">
            <div class="art-avatar">
              <Avatar seed={user.name} size="lg" />
              <div class="presence-dot" data-status={user.status}></div>
            </div>
          </div>
        </div>
        <div class="artwork-label">
          <span class="title"><i>{user.title}</i></span>
          <span class="artist">{user.name}</span>
          <span class="date">{user.date}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .museum-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    background-image: linear-gradient(rgba(130,130,195,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(130,130,195,0.03) 1px, transparent 1px);
    background-size: 100px 100px;
    border-radius: 24px;
    padding: 60px;
    box-sizing: border-box;
    font-family: 'Ubuntu', sans-serif;
    color: #E2E2EC;
    display: flex;
    flex-direction: column;
    gap: 60px;
    box-shadow: inset 0 0 100px rgba(0,0,0,0.8);
  }

  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .plaque {
    background: #1E1E2D;
    border: 1px solid rgba(130,130,195,0.3);
    padding: 15px 30px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
    border-left: 4px solid #567dd4;
  }

  h1 {
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    margin: 0 0 5px 0;
    color: #E2E2EC;
  }

  .plaque p {
    margin: 0;
    font-size: 0.85rem;
    color: #8C8CC5;
    font-style: italic;
  }

  .search-plaque {
    background: #1E1E2D;
    border: 1px solid rgba(130,130,195,0.3);
    padding: 10px 20px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
  }

  input {
    background: transparent;
    border: none;
    border-bottom: 1px solid #646478;
    color: #E2E2EC;
    font-size: 0.9rem;
    outline: none;
    padding: 5px 0;
    transition: border-color 0.3s;
    font-family: 'Ubuntu', serif;
  }

  input:focus { border-color: #567dd4; }
  input::placeholder { color: #646478; font-style: italic; }

  .gallery-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 50px;
    overflow-y: auto;
    padding: 10px;
  }

  .gallery-wall::-webkit-scrollbar { display: none; }

  .frame {
    background: #0a0a0f;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: center;
    color: inherit;
    transition: transform 0.4s ease;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }

  .frame:hover {
    transform: scale(1.05) translateY(-5px);
  }

  .matting {
    background: #E2E2EC;
    padding: 25px;
    box-shadow: 
      inset 0 0 10px rgba(0,0,0,0.2),
      5px 5px 15px rgba(0,0,0,0.5);
    border-radius: 2px;
  }

  .canvas {
    background: #1E1E2D;
    padding: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
  }

  .art-avatar {
    position: relative;
    filter: sepia(0.4) contrast(1.2);
  }

  .presence-dot {
    position: absolute;
    top: -5px; right: -5px;
    width: 10px; height: 10px;
    border-radius: 50%;
    border: 2px solid #E2E2EC;
  }

  .presence-dot[data-status="online"] { background: #34d399; }
  .presence-dot[data-status="busy"] { background: #ff8ca6; }
  .presence-dot[data-status="dnd"] { background: #7070da; }
  .presence-dot[data-status="offline"] { background: #646478; }

  .artwork-label {
    background: #1E1E2D;
    border: 1px solid rgba(130,130,195,0.2);
    padding: 10px 15px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
    max-width: 180px;
  }

  .title {
    font-size: 0.95rem;
    font-weight: 500;
  }

  .artist {
    font-size: 0.8rem;
    color: #8C8CC5;
  }

  .date {
    font-size: 0.75rem;
    color: #646478;
  }
</style>