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

  // Focus rings belong to keyboard navigation only: on with Tab, off with the next touch or click.
  $effect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Tab') root.dataset.kbd = ''
    }
    const pointer = () => delete root.dataset.kbd
    addEventListener('keydown', key, true)
    addEventListener('pointerdown', pointer, true)
    return () => {
      removeEventListener('keydown', key, true)
      removeEventListener('pointerdown', pointer, true)
    }
  })

  $effect(() => {
    root.dataset.glass = app.data.settings.glass
    if (reduced()) root.dataset.reduced = ''
    else delete root.dataset.reduced
  })

  // The keyboard covers the bottom of the layout viewport, and fixed elements stay attached to it
  // (iOS). Expose where the visible part ends, so the composer, sheets and toasts sit above the keyboard.
  $effect(() => {
    const vv = visualViewport
    if (!vv) return
    const fit = () => {
      root.style.setProperty('--vv-bottom', `${vv.offsetTop + vv.height}px`)
      root.style.setProperty('--vv-height', `${vv.height}px`)
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  })

  // iPhone WebKit scrolls the page to centre every tapped text field: the title scrolls away, and the
  // keyboard then covers the area past the page end, which WebKit paints as one flat colour.
  // Focusing the field ourselves with preventScroll keeps the page where it is.
  $effect(() => {
    let x = 0
    let y = 0
    const start = (e: TouchEvent) => ({ clientX: x, clientY: y } = e.touches[0])
    const end = (e: TouchEvent) => {
      const t = e.target
      const p = e.changedTouches[0]
      if (!(t instanceof HTMLInputElement) || !t.matches('[type=text],[type=password]') || t === document.activeElement) return
      if (Math.abs(p.clientX - x) > 10 || Math.abs(p.clientY - y) > 10) return // a scroll, not a tap
      e.preventDefault()
      t.focus({ preventScroll: true })
    }
    addEventListener('touchstart', start, { capture: true, passive: true })
    addEventListener('touchend', end, { capture: true, passive: false })
    return () => {
      removeEventListener('touchstart', start, true)
      removeEventListener('touchend', end, true)
    }
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
