<script lang="ts">
  import Backdrop from './components/Backdrop.svelte'
  import ListView from './components/ListView.svelte'
  import Onboarding from './components/Onboarding.svelte'
  import Overview from './components/Overview.svelte'
  import Settings from './components/Settings.svelte'
  import Toast from './components/Toast.svelte'
  import { setupLens } from './lib/lens'
  import { unlockAudio } from './lib/sound'
  import { app, persist, reduced, ui } from './lib/store.svelte'

  const root = document.documentElement
  if ('switch' in HTMLInputElement.prototype) root.dataset.switch = ''
  setupLens()
  persist()

  // Browsers start audio only from a real gesture; any tap or key anywhere unlocks it.
  $effect(() => {
    const unlock = () => unlockAudio()
    addEventListener('pointerup', unlock, true)
    addEventListener('keydown', unlock, true)
    return () => {
      removeEventListener('pointerup', unlock, true)
      removeEventListener('keydown', unlock, true)
    }
  })

  $effect(() => {
    root.dataset.glass = app.data.settings.glass
    if (reduced()) root.dataset.reduced = ''
    else delete root.dataset.reduced
  })

  // A list that no longer exists (deleted, or a backup was loaded) falls back to the overview.
  $effect(() => {
    if (ui.view === 'list' && !app.data.lists.some((l) => l.id === ui.listId)) ui.view = 'overview'
  })
  $effect(() => {
    if (ui.view !== 'list') ui.scene.wash = 0
  })
</script>

<Backdrop />
<main>
  {#if !app.data.onboarded}
    <Onboarding />
  {:else if ui.view === 'list'}
    {#key ui.listId}<ListView listId={ui.listId} />{/key}
  {:else if ui.view === 'settings'}
    <Settings />
  {:else}
    <Overview />
  {/if}
</main>
<Toast />
<p class="visually-hidden" aria-live="polite">{ui.announce}</p>

<style>
  main {
    max-width: 560px;
    margin: 0 auto;
    padding: max(8px, env(safe-area-inset-top)) max(var(--gutter), env(safe-area-inset-right)) calc(120px + env(safe-area-inset-bottom))
      max(var(--gutter), env(safe-area-inset-left));
  }
</style>
