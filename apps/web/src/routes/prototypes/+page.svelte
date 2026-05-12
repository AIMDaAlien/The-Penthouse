<script lang="ts">
  // Chat V4 Panes
  import ChatPaneV4_01 from '$lib/prototypes/chat-pane/ChatPane-V4-01-GrainyMidnight.svelte';
  import ChatPaneV4_02 from '$lib/prototypes/chat-pane/ChatPane-V4-02-MeshPastel.svelte';
  import ChatPaneV4_03 from '$lib/prototypes/chat-pane/ChatPane-V4-03-BrushedSilk.svelte';
  import ChatPaneV4_04 from '$lib/prototypes/chat-pane/ChatPane-V4-04-FrostedLinen.svelte';
  import ChatPaneV4_05 from '$lib/prototypes/chat-pane/ChatPane-V4-05-NoiseGradient.svelte';
  import ChatPaneV4_06 from '$lib/prototypes/chat-pane/ChatPane-V4-06-GeometricShadow.svelte';
  import ChatPaneV4_07 from '$lib/prototypes/chat-pane/ChatPane-V4-07-VelvetMist.svelte';
  import ChatPaneV4_08 from '$lib/prototypes/chat-pane/ChatPane-V4-08-Crystalline.svelte';
  import ChatPaneV4_09 from '$lib/prototypes/chat-pane/ChatPane-V4-09-EthericFlow.svelte';
  import ChatPaneV4_10 from '$lib/prototypes/chat-pane/ChatPane-V4-10-Monolith.svelte';

  // People V4 Panes
  import PeoplePaneV4_01 from '$lib/prototypes/people-pane/PeoplePane-V4-01-VogueMist.svelte';
  import PeoplePaneV4_02 from '$lib/prototypes/people-pane/PeoplePane-V4-02-BazaarGlass.svelte';
  import PeoplePaneV4_03 from '$lib/prototypes/people-pane/PeoplePane-V4-03-AtelierSoft.svelte';
  import PeoplePaneV4_04 from '$lib/prototypes/people-pane/PeoplePane-V4-04-EaselGrain.svelte';
  import PeoplePaneV4_05 from '$lib/prototypes/people-pane/PeoplePane-V4-05-CuratorVelvet.svelte';
  import PeoplePaneV4_06 from '$lib/prototypes/people-pane/PeoplePane-V4-06-GalleryLinen.svelte';
  import PeoplePaneV4_07 from '$lib/prototypes/people-pane/PeoplePane-V4-07-StudioSilk.svelte';
  import PeoplePaneV4_08 from '$lib/prototypes/people-pane/PeoplePane-V4-08-JournalNoise.svelte';
  import PeoplePaneV4_09 from '$lib/prototypes/people-pane/PeoplePane-V4-09-PortfolioFroth.svelte';
  import PeoplePaneV4_10 from '$lib/prototypes/people-pane/PeoplePane-V4-10-EditionEtch.svelte';

  // Settings V4 Panes
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
    { component: ChatPaneV4_01, name: 'V4: Grainy Midnight' },
    { component: ChatPaneV4_02, name: 'V4: Mesh Pastel' },
    { component: ChatPaneV4_03, name: 'V4: Brushed Silk' },
    { component: ChatPaneV4_04, name: 'V4: Frosted Linen' },
    { component: ChatPaneV4_05, name: 'V4: Noise Gradient' },
    { component: ChatPaneV4_06, name: 'V4: Geometric Shadow' },
    { component: ChatPaneV4_07, name: 'V4: Velvet Mist' },
    { component: ChatPaneV4_08, name: 'V4: Crystalline' },
    { component: ChatPaneV4_09, name: 'V4: Etheric Flow' },
    { component: ChatPaneV4_10, name: 'V4: Monolith' },
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
    { component: PeoplePaneV4_01, name: 'V4: Vogue Mist' },
    { component: PeoplePaneV4_02, name: 'V4: Bazaar Glass' },
    { component: PeoplePaneV4_03, name: 'V4: Atelier Soft' },
    { component: PeoplePaneV4_04, name: 'V4: Easel Grain' },
    { component: PeoplePaneV4_05, name: 'V4: Curator Velvet' },
    { component: PeoplePaneV4_06, name: 'V4: Gallery Linen' },
    { component: PeoplePaneV4_07, name: 'V4: Studio Silk' },
    { component: PeoplePaneV4_08, name: 'V4: Journal Noise' },
    { component: PeoplePaneV4_09, name: 'V4: Portfolio Froth' },
    { component: PeoplePaneV4_10, name: 'V4: Edition Etch' },
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
