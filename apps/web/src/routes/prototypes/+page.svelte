<script lang="ts">
  import ChatPaneV3_01 from '$lib/prototypes/chat-pane/ChatPane-V3-01-AuroraGlass.svelte';
  import PeoplePaneV3_01 from '$lib/prototypes/people-pane/PeoplePane-V3-01-AuroraGlass.svelte';
  import ChatPaneV3_02 from '$lib/prototypes/chat-pane/ChatPane-V3-02-NebulaDrift.svelte';
  import PeoplePaneV3_02 from '$lib/prototypes/people-pane/PeoplePane-V3-02-NebulaDrift.svelte';
  import ChatPaneV3_03 from '$lib/prototypes/chat-pane/ChatPane-V3-03-PrismaticCore.svelte';
  import PeoplePaneV3_03 from '$lib/prototypes/people-pane/PeoplePane-V3-03-PrismaticCore.svelte';
  import ChatPaneV3_04 from '$lib/prototypes/chat-pane/ChatPane-V3-04-ZenithGlow.svelte';
  import PeoplePaneV3_04 from '$lib/prototypes/people-pane/PeoplePane-V3-04-ZenithGlow.svelte';
  import ChatPaneV3_05 from '$lib/prototypes/chat-pane/ChatPane-V3-05-EtherealWave.svelte';
  import PeoplePaneV3_05 from '$lib/prototypes/people-pane/PeoplePane-V3-05-EtherealWave.svelte';
  import ChatPaneV3_06 from '$lib/prototypes/chat-pane/ChatPane-V3-06-LunarMist.svelte';
  import PeoplePaneV3_06 from '$lib/prototypes/people-pane/PeoplePane-V3-06-LunarMist.svelte';
  import ChatPaneV3_07 from '$lib/prototypes/chat-pane/ChatPane-V3-07-CelestiaForm.svelte';
  import PeoplePaneV3_07 from '$lib/prototypes/people-pane/PeoplePane-V3-07-CelestiaForm.svelte';
  import ChatPaneV3_08 from '$lib/prototypes/chat-pane/ChatPane-V3-08-AstralMorph.svelte';
  import PeoplePaneV3_08 from '$lib/prototypes/people-pane/PeoplePane-V3-08-AstralMorph.svelte';
  import ChatPaneV3_09 from '$lib/prototypes/chat-pane/ChatPane-V3-09-NovaPulse.svelte';
  import PeoplePaneV3_09 from '$lib/prototypes/people-pane/PeoplePane-V3-09-NovaPulse.svelte';
  import ChatPaneV3_10 from '$lib/prototypes/chat-pane/ChatPane-V3-10-CosmicFroth.svelte';
  import PeoplePaneV3_10 from '$lib/prototypes/people-pane/PeoplePane-V3-10-CosmicFroth.svelte';

  // V4 Settings Panes
  import SettingsPaneV4_01 from '$lib/prototypes/settings-pane/SettingsPane-V4-01-LunarMist-Editorial.svelte';
  import SettingsPaneV4_02 from '$lib/prototypes/settings-pane/SettingsPane-V4-02-LunarMist-Split.svelte';
  import SettingsPaneV4_03 from '$lib/prototypes/settings-pane/SettingsPane-V4-03-LunarMist-Bento.svelte';
  import SettingsPaneV4_04 from '$lib/prototypes/settings-pane/SettingsPane-V4-04-LunarMist-GlassList.svelte';
  import SettingsPaneV4_05 from '$lib/prototypes/settings-pane/SettingsPane-V4-05-LunarMist-FloatingPanels.svelte';
  import SettingsPaneV4_06 from '$lib/prototypes/settings-pane/SettingsPane-V4-06-LunarMist-Minimalist.svelte';
  import SettingsPaneV4_07 from '$lib/prototypes/settings-pane/SettingsPane-V4-07-LunarMist-Asymmetric.svelte';
  import SettingsPaneV4_08 from '$lib/prototypes/settings-pane/SettingsPane-V4-08-LunarMist-StackedCards.svelte';
  import SettingsPaneV4_09 from '$lib/prototypes/settings-pane/SettingsPane-V4-09-LunarMist-Sidebar.svelte';
  import SettingsPaneV4_10 from '$lib/prototypes/settings-pane/SettingsPane-V4-10-LunarMist-Mosaic.svelte';

  const chatPanes = [
    { component: ChatPaneV3_01, name: 'V3: Aurora Glass' },
    { component: ChatPaneV3_02, name: 'V3: Nebula Drift' },
    { component: ChatPaneV3_03, name: 'V3: Prismatic Core' },
    { component: ChatPaneV3_04, name: 'V3: Zenith Glow' },
    { component: ChatPaneV3_05, name: 'V3: Ethereal Wave' },
    { component: ChatPaneV3_06, name: 'V3: Lunar Mist' },
    { component: ChatPaneV3_07, name: 'V3: Celestia Form' },
    { component: ChatPaneV3_08, name: 'V3: Astral Morph' },
    { component: ChatPaneV3_09, name: 'V3: Nova Pulse' },
    { component: ChatPaneV3_10, name: 'V3: Cosmic Froth' },
  ];

  const settingsPanes = [
    { component: SettingsPaneV4_01, name: 'V4: Editorial' },
    { component: SettingsPaneV4_02, name: 'V4: Split Pane' },
    { component: SettingsPaneV4_03, name: 'V4: Bento Grid' },
    { component: SettingsPaneV4_04, name: 'V4: Glass List' },
    { component: SettingsPaneV4_05, name: 'V4: Floating Panels' },
    { component: SettingsPaneV4_06, name: 'V4: Minimalist' },
    { component: SettingsPaneV4_07, name: 'V4: Asymmetric Grid' },
    { component: SettingsPaneV4_08, name: 'V4: Stacked Cards' },
    { component: SettingsPaneV4_09, name: 'V4: Sidebar Focus' },
    { component: SettingsPaneV4_10, name: 'V4: Mosaic Tiles' },
  ];

  const peoplePanes = [
    { component: PeoplePaneV3_01, name: 'V3: Aurora Glass' },
    { component: PeoplePaneV3_02, name: 'V3: Nebula Drift' },
    { component: PeoplePaneV3_03, name: 'V3: Prismatic Core' },
    { component: PeoplePaneV3_04, name: 'V3: Zenith Glow' },
    { component: PeoplePaneV3_05, name: 'V3: Ethereal Wave' },
    { component: PeoplePaneV3_06, name: 'V3: Lunar Mist' },
    { component: PeoplePaneV3_07, name: 'V3: Celestia Form' },
    { component: PeoplePaneV3_08, name: 'V3: Astral Morph' },
    { component: PeoplePaneV3_09, name: 'V3: Nova Pulse' },
    { component: PeoplePaneV3_10, name: 'V3: Cosmic Froth' },
  ];

  let currentCategory = $state<'chat' | 'settings' | 'people'>('chat');
</script>

<svelte:head>
  <title>Prototypes Viewer</title>
</svelte:head>

<div class="prototype-viewer">
  <header>
    <h1>The Penthouse - Right Pane Prototypes</h1>
    <nav>
      <button class:active={currentCategory === 'chat'} onclick={() => currentCategory = 'chat'}>Chat Panes</button>
      <button class:active={currentCategory === 'settings'} onclick={() => currentCategory = 'settings'}>Settings Panes</button>
      <button class:active={currentCategory === 'people'} onclick={() => currentCategory = 'people'}>People Panes</button>
    </nav>
  </header>

  <main>
    <div class="prototype-grid">
      {#if currentCategory === 'chat'}
        {#each chatPanes as pane (pane.name)}
          <div class="prototype-wrapper">
            <h2>{pane.name}</h2>
            <div class="prototype-container">
              <pane.component />
            </div>
          </div>
        {/each}
      {:else if currentCategory === 'settings'}
        {#each settingsPanes as pane (pane.name)}
          <div class="prototype-wrapper">
            <h2>{pane.name}</h2>
            <div class="prototype-container">
              <pane.component />
            </div>
          </div>
        {/each}
      {:else if currentCategory === 'people'}
        {#each peoplePanes as pane (pane.name)}
          <div class="prototype-wrapper">
            <h2>{pane.name}</h2>
            <div class="prototype-container">
              <pane.component />
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </main>
</div>

<style>
  .prototype-viewer {
    min-height: 100vh;
    background-color: var(--color-bg, #0a0a0f);
    color: var(--color-text, #e2e2ec);
    font-family: var(--font-sans, 'Ubuntu', sans-serif);
    padding: 2rem;
  }

  header {
    margin-bottom: 3rem;
    text-align: center;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: var(--color-primary, #7070da);
  }

  nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  nav button {
    background: var(--color-surface, #1e1e2d);
    color: var(--color-text-secondary, #8c8cc5);
    border: 1px solid var(--color-border, rgba(130, 130, 195, 0.2));
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-full, 9999px);
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  nav button:hover {
    background: var(--color-surface-elevated, #252538);
    color: var(--color-text, #e2e2ec);
  }

  nav button.active {
    background: var(--color-primary, #7070da);
    color: white;
    border-color: var(--color-primary, #7070da);
  }

  .prototype-grid {
    display: flex;
    flex-direction: column;
    gap: 5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .prototype-wrapper {
    background: var(--color-surface, #1e1e2d);
    border-radius: var(--radius-lg, 20px);
    padding: 2rem;
    border: 1px solid var(--color-border, rgba(130, 130, 195, 0.2));
  }

  .prototype-wrapper h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: var(--color-text, #e2e2ec);
    text-align: center;
  }

  .prototype-container {
    width: 860px; /* Target desktop width */
    height: 760px; /* Target desktop height */
    margin: 0 auto;
    background: var(--color-bg, #12121c);
    border-radius: var(--radius-md, 12px);
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    position: relative;
    border: 1px solid var(--color-border, rgba(130, 130, 195, 0.2));
  }

  /* Scale down for smaller screens while maintaining aspect ratio */
  @media (max-width: 1000px) {
    .prototype-container {
      width: 100%;
      height: auto;
      aspect-ratio: 860 / 760;
    }
  }
</style>
