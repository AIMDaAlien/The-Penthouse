<script lang="ts">
  import ChatPane01 from '$lib/prototypes/chat-pane/ChatPane-01-LiquidGlass.svelte';
  import ChatPane02 from '$lib/prototypes/chat-pane/ChatPane-02-BrutalistSoft.svelte';
  import ChatPane03 from '$lib/prototypes/chat-pane/ChatPane-03-ArtDecoNocturne.svelte';
  import ChatPane04 from '$lib/prototypes/chat-pane/ChatPane-04-ZenGardenGrid.svelte';
  import ChatPane05 from '$lib/prototypes/chat-pane/ChatPane-05-TerminalCouture.svelte';
  import ChatPane06 from '$lib/prototypes/chat-pane/ChatPane-06-SwissEditorial.svelte';
  import ChatPane07 from '$lib/prototypes/chat-pane/ChatPane-07-OrganicBlobs.svelte';
  import ChatPane08 from '$lib/prototypes/chat-pane/ChatPane-08-VaporwaveCathedral.svelte';
  import ChatPane09 from '$lib/prototypes/chat-pane/ChatPane-09-KineticTypography.svelte';
  import ChatPane10 from '$lib/prototypes/chat-pane/ChatPane-10-MuseumExhibit.svelte';
  import ChatPaneV2_01 from '$lib/prototypes/chat-pane/ChatPane-V2-01-FrostedBlossom.svelte';
  import ChatPaneV2_02 from '$lib/prototypes/chat-pane/ChatPane-V2-02-SilkenLavender.svelte';
  import ChatPaneV2_03 from '$lib/prototypes/chat-pane/ChatPane-V2-03-CrystalPetals.svelte';
  import ChatPaneV2_04 from '$lib/prototypes/chat-pane/ChatPane-V2-04-VelvetNebula.svelte';
  import ChatPaneV2_05 from '$lib/prototypes/chat-pane/ChatPane-V2-05-MorningDew.svelte';
  import ChatPaneV2_06 from '$lib/prototypes/chat-pane/ChatPane-V2-06-AmethystWhisper.svelte';
  import ChatPaneV2_07 from '$lib/prototypes/chat-pane/ChatPane-V2-07-LunarFroth.svelte';
  import ChatPaneV2_08 from '$lib/prototypes/chat-pane/ChatPane-V2-08-OrchidGlass.svelte';
  import ChatPaneV2_09 from '$lib/prototypes/chat-pane/ChatPane-V2-09-PearlMorph.svelte';
  import ChatPaneV2_10 from '$lib/prototypes/chat-pane/ChatPane-V2-10-TwilightBloom.svelte';

  import SettingsPane01 from '$lib/prototypes/settings-pane/SettingsPane-01-LiquidGlass.svelte';
  import SettingsPane02 from '$lib/prototypes/settings-pane/SettingsPane-02-BrutalistSoft.svelte';
  import SettingsPane03 from '$lib/prototypes/settings-pane/SettingsPane-03-ArtDecoNocturne.svelte';
  import SettingsPane04 from '$lib/prototypes/settings-pane/SettingsPane-04-ZenGardenGrid.svelte';
  import SettingsPane05 from '$lib/prototypes/settings-pane/SettingsPane-05-TerminalCouture.svelte';
  import SettingsPane06 from '$lib/prototypes/settings-pane/SettingsPane-06-SwissEditorial.svelte';
  import SettingsPane07 from '$lib/prototypes/settings-pane/SettingsPane-07-OrganicBlobs.svelte';
  import SettingsPane08 from '$lib/prototypes/settings-pane/SettingsPane-08-VaporwaveCathedral.svelte';
  import SettingsPane09 from '$lib/prototypes/settings-pane/SettingsPane-09-KineticTypography.svelte';
  import SettingsPane10 from '$lib/prototypes/settings-pane/SettingsPane-10-MuseumExhibit.svelte';
  import SettingsPaneV2_01 from '$lib/prototypes/settings-pane/SettingsPane-V2-01-LavenderCloud.svelte';
  import SettingsPaneV2_02 from '$lib/prototypes/settings-pane/SettingsPane-V2-02-LilacBreeze.svelte';
  import SettingsPaneV2_03 from '$lib/prototypes/settings-pane/SettingsPane-V2-03-AmethystJelly.svelte';
  import SettingsPaneV2_04 from '$lib/prototypes/settings-pane/SettingsPane-V2-04-PlumPlush.svelte';
  import SettingsPaneV2_05 from '$lib/prototypes/settings-pane/SettingsPane-V2-05-GrapeGum.svelte';
  import SettingsPaneV2_06 from '$lib/prototypes/settings-pane/SettingsPane-V2-06-ThistlePuff.svelte';
  import SettingsPaneV2_07 from '$lib/prototypes/settings-pane/SettingsPane-V2-07-OrchidBounce.svelte';
  import SettingsPaneV2_08 from '$lib/prototypes/settings-pane/SettingsPane-V2-08-WisteriaSpring.svelte';
  import SettingsPaneV2_09 from '$lib/prototypes/settings-pane/SettingsPane-V2-09-VioletMochi.svelte';
  import SettingsPaneV2_10 from '$lib/prototypes/settings-pane/SettingsPane-V2-10-MauveMarshmallow.svelte';

  import PeoplePane01 from '$lib/prototypes/people-pane/PeoplePane-01-LiquidGlass.svelte';
  import PeoplePane02 from '$lib/prototypes/people-pane/PeoplePane-02-BrutalistSoft.svelte';
  import PeoplePane03 from '$lib/prototypes/people-pane/PeoplePane-03-ArtDecoNocturne.svelte';
  import PeoplePane04 from '$lib/prototypes/people-pane/PeoplePane-04-ZenGardenGrid.svelte';
  import PeoplePane05 from '$lib/prototypes/people-pane/PeoplePane-05-TerminalCouture.svelte';
  import PeoplePane06 from '$lib/prototypes/people-pane/PeoplePane-06-SwissEditorial.svelte';
  import PeoplePane07 from '$lib/prototypes/people-pane/PeoplePane-07-OrganicBlobs.svelte';
  import PeoplePane08 from '$lib/prototypes/people-pane/PeoplePane-08-VaporwaveCathedral.svelte';
  import PeoplePane09 from '$lib/prototypes/people-pane/PeoplePane-09-KineticTypography.svelte';
  import PeoplePane10 from '$lib/prototypes/people-pane/PeoplePane-10-MuseumExhibit.svelte';

  import PeoplePaneV2_01 from '$lib/prototypes/people-pane/PeoplePane-V2-01-FrostedBlossom.svelte';
  import PeoplePaneV2_02 from '$lib/prototypes/people-pane/PeoplePane-V2-02-SilkenLavender.svelte';
  import PeoplePaneV2_03 from '$lib/prototypes/people-pane/PeoplePane-V2-03-CrystalPetals.svelte';
  import PeoplePaneV2_04 from '$lib/prototypes/people-pane/PeoplePane-V2-04-VelvetNebula.svelte';
  import PeoplePaneV2_05 from '$lib/prototypes/people-pane/PeoplePane-V2-05-MorningDew.svelte';
  import PeoplePaneV2_06 from '$lib/prototypes/people-pane/PeoplePane-V2-06-AmethystWhisper.svelte';
  import PeoplePaneV2_07 from '$lib/prototypes/people-pane/PeoplePane-V2-07-LunarFroth.svelte';
  import PeoplePaneV2_08 from '$lib/prototypes/people-pane/PeoplePane-V2-08-OrchidGlass.svelte';
  import PeoplePaneV2_09 from '$lib/prototypes/people-pane/PeoplePane-V2-09-PearlMorph.svelte';
  import PeoplePaneV2_10 from '$lib/prototypes/people-pane/PeoplePane-V2-10-TwilightBloom.svelte';

  const chatPanes = [
    { component: ChatPane01, name: 'Liquid Glass' },
    { component: ChatPane02, name: 'Brutalist Soft' },
    { component: ChatPane03, name: 'Art Deco Nocturne' },
    { component: ChatPane04, name: 'Zen Garden Grid' },
    { component: ChatPane05, name: 'Terminal Couture' },
    { component: ChatPane06, name: 'Swiss Editorial' },
    { component: ChatPane07, name: 'Organic Blobs' },
    { component: ChatPane08, name: 'Vaporwave Cathedral' },
    { component: ChatPane09, name: 'Kinetic Typography' },
    { component: ChatPane10, name: 'Museum Exhibit' },
    { component: ChatPaneV2_01, name: 'V2: Frosted Blossom' },
    { component: ChatPaneV2_02, name: 'V2: Silken Lavender' },
    { component: ChatPaneV2_03, name: 'V2: Crystal Petals' },
    { component: ChatPaneV2_04, name: 'V2: Velvet Nebula' },
    { component: ChatPaneV2_05, name: 'V2: Morning Dew' },
    { component: ChatPaneV2_06, name: 'V2: Amethyst Whisper' },
    { component: ChatPaneV2_07, name: 'V2: Lunar Froth' },
    { component: ChatPaneV2_08, name: 'V2: Orchid Glass' },
    { component: ChatPaneV2_09, name: 'V2: Pearl Morph' },
    { component: ChatPaneV2_10, name: 'V2: Twilight Bloom' }
  ];

  const settingsPanes = [
    { component: SettingsPane01, name: 'Liquid Glass' },
    { component: SettingsPane02, name: 'Brutalist Soft' },
    { component: SettingsPane03, name: 'Art Deco Nocturne' },
    { component: SettingsPane04, name: 'Zen Garden Grid' },
    { component: SettingsPane05, name: 'Terminal Couture' },
    { component: SettingsPane06, name: 'Swiss Editorial' },
    { component: SettingsPane07, name: 'Organic Blobs' },
    { component: SettingsPane08, name: 'Vaporwave Cathedral' },
    { component: SettingsPane09, name: 'Kinetic Typography' },
    { component: SettingsPane10, name: 'Museum Exhibit' },
    { component: SettingsPaneV2_01, name: 'V2: Lavender Cloud' },
    { component: SettingsPaneV2_02, name: 'V2: Lilac Breeze' },
    { component: SettingsPaneV2_03, name: 'V2: Amethyst Jelly' },
    { component: SettingsPaneV2_04, name: 'V2: Plum Plush' },
    { component: SettingsPaneV2_05, name: 'V2: Grape Gum' },
    { component: SettingsPaneV2_06, name: 'V2: Thistle Puff' },
    { component: SettingsPaneV2_07, name: 'V2: Orchid Bounce' },
    { component: SettingsPaneV2_08, name: 'V2: Wisteria Spring' },
    { component: SettingsPaneV2_09, name: 'V2: Violet Mochi' },
    { component: SettingsPaneV2_10, name: 'V2: Mauve Marshmallow' }
  ];

  const peoplePanes = [
    { component: PeoplePane01, name: 'Liquid Glass' },
    { component: PeoplePane02, name: 'Brutalist Soft' },
    { component: PeoplePane03, name: 'Art Deco Nocturne' },
    { component: PeoplePane04, name: 'Zen Garden Grid' },
    { component: PeoplePane05, name: 'Terminal Couture' },
    { component: PeoplePane06, name: 'Swiss Editorial' },
    { component: PeoplePane07, name: 'Organic Blobs' },
    { component: PeoplePane08, name: 'Vaporwave Cathedral' },
    { component: PeoplePane09, name: 'Kinetic Typography' },
    { component: PeoplePane10, name: 'Museum Exhibit' },
    { component: PeoplePaneV2_01, name: 'V2: Frosted Blossom' },
    { component: PeoplePaneV2_02, name: 'V2: Silken Lavender' },
    { component: PeoplePaneV2_03, name: 'V2: Crystal Petals' },
    { component: PeoplePaneV2_04, name: 'V2: Velvet Nebula' },
    { component: PeoplePaneV2_05, name: 'V2: Morning Dew' },
    { component: PeoplePaneV2_06, name: 'V2: Amethyst Whisper' },
    { component: PeoplePaneV2_07, name: 'V2: Lunar Froth' },
    { component: PeoplePaneV2_08, name: 'V2: Orchid Glass' },
    { component: PeoplePaneV2_09, name: 'V2: Pearl Morph' },
    { component: PeoplePaneV2_10, name: 'V2: Twilight Bloom' }
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