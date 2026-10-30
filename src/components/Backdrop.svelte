<script lang="ts">
  // The room behind the glass: a soap film that brightens as tasks get done.
  // A sibling of the app, never an ancestor of glass (that would empty every blur).
  import { filmUrl } from '../lib/film'
  import { startFlow, stir } from '../lib/flow'
  import { reduced, ui } from '../lib/store.svelte'

  let url = $state('')
  let flash = $state<HTMLElement>()
  let canvas = $state<HTMLCanvasElement>()
  let live = $state(false)
  const dark = matchMedia('(prefers-color-scheme: dark)')

  // The still image: fallback without WebGL, and the page background under the status bar and keyboard.
  $effect(() => {
    const load = () =>
      filmUrl(dark.matches).then((u) => {
        url = u
        document.documentElement.style.backgroundImage = `url(${u})`
      })
    load()
    dark.addEventListener('change', load)
    return () => dark.removeEventListener('change', load)
  })

  let flow: ReturnType<typeof startFlow> = null
  $effect(() => {
    if (!canvas) return
    flow = startFlow(canvas, { dark: () => dark.matches, angle: () => ui.scene.angle, still: reduced })
    live = !!flow
    const redraw = () => flow?.run()
    dark.addEventListener('change', redraw)
    return () => {
      flow?.stop()
      dark.removeEventListener('change', redraw)
    }
  })
  // Weniger Bewegung switched on or off, or a new list: restart or redraw the still frame.
  $effect(() => {
    reduced()
    void ui.scene.angle
    flow?.run()
  })

  // Rinse ("Spülgang") when a list is finished: the film surges and a bright wash passes over.
  let rinsed = 0
  $effect(() => {
    if (ui.scene.rinse === rinsed) return
    rinsed = ui.scene.rinse
    if (reduced()) return
    stir(1.5)
    flash?.animate([{ opacity: 0 }, { opacity: 0.12 }, { opacity: 0 }], { duration: 1200, easing: 'ease-in-out' })
  })
</script>

<div class="backdrop" aria-hidden="true">
  <canvas class="flow" bind:this={canvas}></canvas>
  {#if !live}
    <div class="spin">
      <div class="film" style:rotate="{ui.scene.angle}deg" style:background-image={url ? `url(${url})` : undefined}></div>
    </div>
  {/if}
  <div class="wash" style:opacity={ui.scene.wash}></div>
  <div class="flash" bind:this={flash}></div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0 0 auto;
    /* Twice the screen: the film keeps going behind the (translucent) keyboard and the home bar. */
    height: 200lvh;
    z-index: -1;
    overflow: hidden;
    background: var(--bg);
  }
  .flow {
    position: absolute;
    inset: 0 0 auto;
    width: 100%;
    height: 130lvh;
  }
  .spin {
    position: absolute;
    left: 50%;
    /* Centred on the screen, not on the taller box. */
    top: 50lvh;
    width: 150vmax;
    height: 150vmax;
    translate: -50% -50%;
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
</style>
