<script lang="ts">
  import Avatar from '../../components/Avatar.svelte';

  const users = [
    { name: 'Jett', handle: 'velocity', status: 'online' },
    { name: 'Dash', handle: 'momentum', status: 'busy' },
    { name: 'Chase', handle: 'kinetic', status: 'dnd' },
    { name: 'Skye', handle: 'air', status: 'online' }
  ];
</script>

<div class="kinetic-pane">
  <div class="search-kin">
    <div class="search-text">FIND</div>
    <input type="text" placeholder="WHO?" />
  </div>

  <div class="list">
    {#each users as user, i}
      <button class="kin-card" style="animation-delay: {i * 100}ms">
        <div class="bg-pulse"></div>
        <div class="kin-content">
          <div class="avatar-wrap">
            <Avatar seed={user.handle} size="md" />
            <div class="orb" data-status={user.status}></div>
          </div>
          <div class="text-group">
            <span class="kin-name">{user.name.toUpperCase()}</span>
            <span class="kin-handle">@{user.handle.toUpperCase()}</span>
          </div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .kinetic-pane {
    width: 860px;
    height: 760px;
    background: #12121C;
    border-radius: 24px;
    padding: 40px;
    box-sizing: border-box;
    font-family: 'Ubuntu', sans-serif;
    color: #E2E2EC;
    display: flex;
    flex-direction: column;
    gap: 40px;
    overflow: hidden;
  }

  .search-kin {
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 4px solid #1E1E2D;
    padding-bottom: 10px;
    transition: border-color 0.3s;
  }

  .search-kin:focus-within {
    border-bottom-color: #7070da;
  }

  .search-text {
    font-size: 2rem;
    font-weight: 800;
    color: #567dd4;
    transform: skewX(-10deg);
  }

  input {
    background: transparent;
    border: none;
    color: #E2E2EC;
    font-size: 2rem;
    font-weight: 800;
    outline: none;
    text-transform: uppercase;
    flex: 1;
    transform: skewX(-10deg);
  }

  input::placeholder { color: #1E1E2D; }

  .list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }
  
  .list::-webkit-scrollbar { display: none; }

  .kin-card {
    background: transparent;
    border: none;
    padding: 20px;
    cursor: pointer;
    position: relative;
    text-align: left;
    color: inherit;
    animation: slideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
    transform-origin: left center;
    transition: transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1);
  }

  .kin-card:hover {
    transform: scale(1.02) translateX(10px);
  }

  .bg-pulse {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #1E1E2D;
    border-radius: 12px;
    z-index: 0;
    transform: skewX(-5deg);
    transition: background 0.3s, transform 0.3s;
  }

  .kin-card:hover .bg-pulse {
    background: #252538;
    transform: skewX(-5deg) scaleY(1.1);
  }

  .kin-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 30px;
  }

  .avatar-wrap {
    position: relative;
  }

  .orb {
    position: absolute;
    bottom: -5px; right: -5px;
    width: 16px; height: 16px;
    border-radius: 50%;
    animation: breathe 2s infinite ease-in-out;
  }

  .orb[data-status="online"] { background: #34d399; box-shadow: 0 0 15px #34d399; }
  .orb[data-status="busy"] { background: #ff8ca6; box-shadow: 0 0 15px #ff8ca6; }
  .orb[data-status="dnd"] { background: #7070da; box-shadow: 0 0 15px #7070da; }

  .text-group {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .kin-name {
    font-size: 3rem;
    font-weight: 800;
    letter-spacing: -0.05em;
    color: #E2E2EC;
    transition: color 0.3s, transform 0.3s;
    transform-origin: left;
  }

  .kin-card:hover .kin-name {
    color: #567dd4;
    transform: scale(1.05);
  }

  .kin-handle {
    font-size: 1.2rem;
    font-weight: 700;
    color: #8282c3;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s;
  }

  .kin-card:hover .kin-handle {
    opacity: 1;
    transform: translateY(0);
  }

  @keyframes slideIn {
    0% { transform: translateX(-50px) scaleX(0.8); opacity: 0; }
    100% { transform: translateX(0) scaleX(1); opacity: 1; }
  }

  @keyframes breathe {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
</style>