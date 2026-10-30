<script lang="ts">
  // The room behind the glass: a soap film that brightens as tasks get done.
  // A sibling of the app, never an ancestor of glass (that would empty every blur).
  import { filmUrl } from '../lib/film'
  import { reduced, ui } from '../lib/store.svelte'

  let url = $state('')
  let flash = $state<HTMLElement>()
  const dark = matchMedia('(prefers-color-scheme: dark)')

  $effect(() => {
    const load = () => filmUrl(dark.matches).then((u) => (url = u))
    load()
    dark.addEventListener('change', load)
    return () => dark.removeEventListener('change', load)
  })

  // Rinse ("Spülgang") when a list is finished: the film swirls on and a bright wash passes over.
  let rinsed = 0
  $effect(() => {
    if (ui.scene.rinse === rinsed) return
    rinsed = ui.scene.rinse
    if (reduced()) return
    ui.scene.angle += 40
    flash?.animate([{ opacity: 0 }, { opacity: 0.12 }, { opacity: 0 }], { duration: 1200, easing: 'ease-in-out' })
  })
</script>

<div class="backdrop" aria-hidden="true">
  <div class="spin">
    <div class="film" style:rotate="{ui.scene.angle}deg" style:background-image={url ? `url(${url})` : undefined}></div>
  </div>
  <div class="wash" style:opacity={ui.scene.wash}></div>
  <div class="flash" bind:this={flash}></div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0 0 auto;
    /* Reach down to the keyboard even when the visible area extends below the layout viewport. */
    height: max(100%, var(--vv-bottom, 0px));
    z-index: -1;
    overflow: hidden;
    background: var(--bg);
  }
  .spin {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 150vmax;
    height: 150vmax;
    translate: -50% -50%;
    animation: spin 900s linear infinite;
  }
  .film {
    position: absolute;
    inset: 0;
    /* Fallback until the canvas film is drawn. */
    background:
      radial-gradient(40% 30% at 30% 35%, #f2b33d55, transparent),
      radial-gradient(35% 30% at 70% 45%, #db3f8a40, transparent),
      radial-gradient(40% 35% at 40% 70%, #6b57db40, transparent),
      radial-gradient(35% 30% at 65% 75%, #19a9a440, transparent),
      var(--bg);
    background-size: cover;
    transition: rotate 1.2s ease-in-out;
  }
  .wash,
  .flash {
    position: absolute;
    inset: 0;
    background: var(--wash);
    transition: opacity 0.6s ease-out;
  }
  .flash {
    background: #fff;
    opacity: 0;
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  :global(:root[data-reduced]) .spin {
    animation: none;
  }
</style>
