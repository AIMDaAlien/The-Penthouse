<script lang="ts">
  // V5 Chat Panes
  import ChatPaneV5_01 from '$lib/prototypes/chat-pane/ChatPane-V5-01-Periwinkle.svelte';
  import ChatPaneV5_02 from '$lib/prototypes/chat-pane/ChatPane-V5-02-SageMoss.svelte';
  import ChatPaneV5_03 from '$lib/prototypes/chat-pane/ChatPane-V5-03-SlateBlue.svelte';
  import ChatPaneV5_04 from '$lib/prototypes/chat-pane/ChatPane-V5-04-PlumMauve.svelte';
  import ChatPaneV5_05 from '$lib/prototypes/chat-pane/ChatPane-V5-05-CharcoalRust.svelte';
  import ChatPaneV5_06 from '$lib/prototypes/chat-pane/ChatPane-V5-06-SageCream.svelte';
  import ChatPaneV5_07 from '$lib/prototypes/chat-pane/ChatPane-V5-07-SkyPastel.svelte';
  import ChatPaneV5_08 from '$lib/prototypes/chat-pane/ChatPane-V5-08-BlushPastel.svelte';
  import ChatPaneV5_09 from '$lib/prototypes/chat-pane/ChatPane-V5-09-LavenderPastel.svelte';
  import ChatPaneV5_10 from '$lib/prototypes/chat-pane/ChatPane-V5-10-OatStone.svelte';

  // V5 Settings Panes
  import SettingsPaneV5_01 from '$lib/prototypes/settings-pane/SettingsPane-V5-01-GlassQuiet.svelte';
  import SettingsPaneV5_02 from '$lib/prototypes/settings-pane/SettingsPane-V5-02-FloatingPreviewLed.svelte';
  import SettingsPaneV5_03 from '$lib/prototypes/settings-pane/SettingsPane-V5-03-BorderlessTypo.svelte';
  import SettingsPaneV5_04 from '$lib/prototypes/settings-pane/SettingsPane-V5-04-OutlinedDataLed.svelte';
  import SettingsPaneV5_05 from '$lib/prototypes/settings-pane/SettingsPane-V5-05-Magazine.svelte';

  // V5 People Panes
  import PeoplePaneV5_01 from '$lib/prototypes/people-pane/PeoplePane-V5-01-Editorial.svelte';
  import PeoplePaneV5_02 from '$lib/prototypes/people-pane/PeoplePane-V5-02-Vogue.svelte';
  import PeoplePaneV5_03 from '$lib/prototypes/people-pane/PeoplePane-V5-03-Wallpaper.svelte';

  const chatPanes = [
    { component: ChatPaneV5_01, name: 'V5-01: Periwinkle (T-D1 dark)' },
    { component: ChatPaneV5_02, name: 'V5-02: Sage Moss (T-D2 dark)' },
    { component: ChatPaneV5_03, name: 'V5-03: Slate Blue (T-D3 dark)' },
    { component: ChatPaneV5_04, name: 'V5-04: Plum Mauve (T-D4 dark)' },
    { component: ChatPaneV5_05, name: 'V5-05: Charcoal Rust (T-D7 dark)' },
    { component: ChatPaneV5_06, name: 'V5-06: Sage Cream (T-L2 light)' },
    { component: ChatPaneV5_07, name: 'V5-07: Sky Pastel (T-L3 light)' },
    { component: ChatPaneV5_08, name: 'V5-08: Blush Pastel (T-L4 light)' },
    { component: ChatPaneV5_09, name: 'V5-09: Lavender Pastel (T-L5 light)' },
    { component: ChatPaneV5_10, name: 'V5-10: Oat Stone (T-L7 light)' },
  ];

  const settingsPanes = [
    { component: SettingsPaneV5_01, name: 'V5-01: Glass Quiet (S1.4 + S2.1)' },
    { component: SettingsPaneV5_02, name: 'V5-02: Floating Preview-Led (S1.5 + S2.3)' },
    { component: SettingsPaneV5_03, name: 'V5-03: Borderless Typography (S1.6 + S2.1)' },
    { component: SettingsPaneV5_04, name: 'V5-04: Outlined Data-Led (S1.2 + S2.4)' },
    { component: SettingsPaneV5_05, name: 'V5-05: Magazine (editorial typography)' },
  ];

  const peoplePanes = [
    { component: PeoplePaneV5_01, name: 'V5-01: Editorial (canonical)' },
    { component: PeoplePaneV5_02, name: 'V5-02: Vogue (P1.1 — display name hero)' },
    { component: PeoplePaneV5_03, name: 'V5-03: Wallpaper (P1.2 — banner-led)' },
  ];

  let currentCategory = $state<'chat' | 'settings' | 'people'>('chat');
</script>

<svelte:head>
  <title>V5 Prototypes · The Penthouse</title>
</svelte:head>

<div class="prototype-viewer">
  <header>
    <span class="eyebrow">N° 04 / PROTOTYPES</span>
    <h1>The Penthouse — V5 Design System</h1>
    <nav>
      <button class:active={currentCategory === 'chat'} onclick={() => currentCategory = 'chat'}>Chat Panes</button>
      <button class:active={currentCategory === 'settings'} onclick={() => currentCategory = 'settings'}>Settings Panes</button>
      <button class:active={currentCategory === 'people'} onclick={() => currentCategory = 'people'}>People Panes</button>
      <a class="flow-link" href="/prototypes/flow">App Flow →</a>
      <a class="flow-link" href="/prototypes/logo">Logo →</a>
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
    min-height: 100dvh;
    background: var(--p-bg, oklch(0.16 0.020 280));
    color: var(--p-text, oklch(0.93 0.012 280));
    font-family: 'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 2rem;
  }

  header {
    margin-bottom: 3rem;
    text-align: center;
  }

  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--p-secondary, oklch(0.78 0.090 280));
    display: block;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -1.5px;
    margin-bottom: 1.5rem;
    color: var(--p-text, oklch(0.93 0.012 280));
  }

  h2 {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    color: var(--p-text-2, oklch(0.80 0.025 280));
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  nav button {
    background: transparent;
    color: var(--p-muted, oklch(0.65 0.050 280));
    border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
    padding: 0.75rem 1.5rem;
    border-radius: var(--r-pill, 999px);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: all 0.2s ease;
  }

  nav button:hover {
    background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
    color: var(--p-text, oklch(0.93 0.012 280));
  }

  nav button.active {
    background: var(--p-accent-soft, oklch(0.69 0.140 285 / 0.16));
    color: var(--p-accent, oklch(0.69 0.140 285));
    border-color: var(--p-accent-edge, oklch(0.69 0.140 285 / 0.36));
  }

  .flow-link {
    background: var(--p-accent, oklch(0.69 0.140 285));
    color: var(--p-bg, oklch(0.16 0.020 280));
    border: 1px solid var(--p-accent, oklch(0.69 0.140 285));
    padding: 0.75rem 1.5rem;
    border-radius: var(--r-pill, 999px);
    font-size: 0.85rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-decoration: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    display: inline-flex;
    align-items: center;
  }
  .flow-link:hover { opacity: 0.88; transform: translateY(-1px); }

  .prototype-grid {
    display: flex;
    flex-direction: column;
    gap: 5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .prototype-wrapper {
    background: var(--p-surface, oklch(0.21 0.025 280));
    border-radius: var(--r-lg, 22px);
    padding: 2rem;
    border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
  }

  .prototype-container {
    width: 860px;
    height: 760px;
    margin: 0 auto;
    background: var(--p-bg, oklch(0.16 0.020 280));
    border-radius: var(--r-md, 14px);
    overflow: hidden;
    box-shadow: var(--shadow-card, 0 14px 36px oklch(0 0 0 / 0.45));
    position: relative;
    border: 1px solid var(--p-line, oklch(0.78 0.090 280 / 0.12));
  }

  @media (max-width: 1000px) {
    .prototype-container {
      width: 100%;
      height: auto;
      aspect-ratio: 860 / 760;
    }
  }
</style>
