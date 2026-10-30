<script lang="ts">
  // The signature moment: hold to blow the bubble up (12 teeth tick faster and faster),
  // or pump it with quick taps. Letting go when it is silver makes it pop.
  import { Charger } from '../lib/charger'
  import { buzz, iosTick, stopBuzz } from '../lib/haptics'
  import { PATTERNS, TEETH, rampPattern } from '../lib/schedule'
  import * as sound from '../lib/sound'
  import { app, reduced, save } from '../lib/store.svelte'

  interface Props {
    done: boolean
    title: string
    size?: 'row' | 'stage'
    /** 0..1 while charging; the row squeezes its text with it. */
    progress?: number
    /** A photo must pass the Gemini check first; a tap opens the camera instead. */
    locked?: boolean
    /** Gemini is looking at the photo. */
    checking?: boolean
    onpop: (el: HTMLElement, how: 'hold' | 'tap') => void
    onuncheck?: () => void
    onpump?: () => void
    onlocked?: () => void
  }
  let { done, title, size = 'row', progress = $bindable(0), locked = false, checking = false, onpop, onuncheck, onpump, onlocked }: Props = $props()

  const charger = new Charger()
  let host = $state<HTMLElement>()
  let core = $state<HTMLElement>()
  let level = $state(0)
  let holding = $state(false)
  let armed = $state(false)
  let popping = $state(false)
  let unwinding = $state(false)
  let hint = $state(false)

  let raf = 0
  let pid = -1
  let sx = 0
  let sy = 0
  let rampBus: GainNode | undefined
  /** Decided at pointerdown: a charge (the click after it only carries the iPhone tick) or a plain click. */
  let gesture: 'none' | 'charge' | 'click' = 'none'
  let skipClick = false

  const tapMode = () => app.data.settings.mode === 'tap'
  const color = (i: number) => ['var(--gold)', 'var(--magenta)', 'var(--violett)', 'var(--tuerkis)'][Math.floor(i / 3)]
  const scale = $derived(holding || level > 0 ? 0.94 + (0.28 * level) / TEETH : 1)

  // Twelve teeth of 26° with 4° gaps, starting at the top.
  const R = 20.5
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)}`
  }
  const teeth = Array.from({ length: TEETH }, (_, i) => `M${pt(i * 30 + 2)}A${R} ${R} 0 0 1 ${pt(i * 30 + 28)}`)

  function sync(t: number) {
    const l = charger.level(t)
    if (l > level) bump()
    unwinding = l < level
    level = l
    progress = level / TEETH
    if (charger.holding && !armed && charger.armed(t)) arm()
  }

  function loop() {
    raf = 0
    sync(performance.now())
    if (charger.holding || level > 0) raf = requestAnimationFrame(loop)
  }
  const run = () => (raf ||= requestAnimationFrame(loop))

  function bump() {
    if (reduced()) return
    core?.animate([{ transform: 'scale(1.025)' }, { transform: 'scale(1)' }], { duration: 110, easing: 'ease-out' })
  }

  function arm() {
    armed = true
    if (app.data.settings.hints < 3) {
      hint = true
      app.data.settings.hints++
      save()
    }
  }

  function press() {
    sound.unlockAudio()
    const t = performance.now() // after the audio start: creating it can take a while on the first press
    const lit = charger.down(t)
    holding = true
    armed = false
    hint = false
    rampBus = sound.ramp(lit)
    buzz(rampPattern(lit))
    sync(t)
    run()
  }

  function release(t: number) {
    if (!charger.holding) return
    const r = charger.up(t)
    holding = false
    hint = false
    sound.hush(rampBus) // ticks and the klack still scheduled must not play after the pop
    if (r === 'pop') return pop('hold')
    if (r === 'pump') {
      sound.pump(charger.level(t) - 1)
      buzz(PATTERNS.pump)
      onpump?.()
    } else {
      stopBuzz()
      skipClick = true // nothing happened, so no iPhone tick either
    }
    sync(t)
    run()
  }

  function cancel() {
    if (!charger.holding) return
    charger.cancel()
    holding = armed = hint = false
    sound.hush(rampBus)
    sound.unwind()
    buzz(PATTERNS.cancel)
    skipClick = true
    sync(performance.now())
  }

  function pop(how: 'hold' | 'tap') {
    cancelAnimationFrame(raf)
    raf = 0
    armed = holding = false
    level = TEETH // stays blown up while it bursts
    progress = 0
    popping = true
    onpop(host!, how)
    setTimeout(() => {
      popping = false
      level = 0
    }, 90)
  }

  /** Tap mode, a tap on a done disc, Enter, or a screen reader: act at once. */
  function activate() {
    sound.unlockAudio()
    if (checking) return
    if (done) onuncheck?.()
    else if (locked) onlocked?.() // inside the click, so the browser lets it open the camera
    else pop('tap')
  }

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0 || charger.holding) return
    skipClick = false
    gesture = done || locked || checking || tapMode() ? 'click' : 'charge'
    if (gesture === 'click') return // the click does it
    pid = e.pointerId
    sx = e.clientX
    sy = e.clientY
    // Touch is captured implicitly; capturing it on iOS may move the click off the tick label.
    if (e.pointerType === 'mouse') host!.setPointerCapture(pid)
    press()
  }

  function onpointermove(e: PointerEvent) {
    if (e.pointerId === pid && charger.holding && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) cancel()
  }

  function onpointerup(e: PointerEvent) {
    if (e.pointerId !== pid) return
    pid = -1
    release(performance.now())
  }

  function onpointercancel(e: PointerEvent) {
    if (e.pointerId !== pid) return
    pid = -1
    cancel()
  }

  function onclickcapture(e: MouseEvent) {
    if (e.target instanceof HTMLInputElement) return // iosTick's label echoing the tap onto its switch
    const g = gesture
    gesture = 'none'
    if (g === 'charge') {
      // The hold already did its work (the task may be done by now). The click only carries the
      // iPhone's tick; drop it if nothing happened.
      if (skipClick) e.preventDefault()
      skipClick = false
      return
    }
    activate()
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) activate()
    } else if (e.key === ' ') {
      e.preventDefault()
      if (e.repeat) return
      if (done || locked || checking || tapMode()) activate()
      else press()
    }
  }

  function onkeyup(e: KeyboardEvent) {
    if (e.key !== ' ') return
    e.preventDefault()
    release(performance.now())
  }

  $effect(() => {
    const hidden = () => document.hidden && cancel()
    document.addEventListener('visibilitychange', hidden)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      cancelAnimationFrame(raf)
    }
  })
</script>

<div
  bind:this={host}
  class="bubble {size}"
  class:holding
  class:armed
  class:done
  class:unwinding
  class:locked
  class:checking
  role="checkbox"
  aria-checked={done}
  aria-label={locked ? `${title}, erst ein Foto machen` : title}
  aria-busy={checking}
  tabindex="0"
  style:--s={scale}
  use:iosTick
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  {onpointercancel}
  {onclickcapture}
  {onkeydown}
  {onkeyup}
  onblur={cancel}
  oncontextmenu={(e) => e.preventDefault()}
>
  <svg class="ring" viewBox="-24 -24 48 48" aria-hidden="true">
    {#each teeth as d, i (i)}
      <path {d} class="tooth" class:lit={i < level} style:--c={color(i)} style:--i={i} />
    {/each}
  </svg>
  {#if done && !popping}
    <span class="disc" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M6.5 12.5l3.8 3.8 7.4-8.3" pathLength="1" /></svg>
    </span>
  {:else}
    <span class="core" class:popping bind:this={core} style:--hue="{level * 30}deg" aria-hidden="true">
      {#if locked || checking}
        <svg class="camera" viewBox="0 0 24 24"
          ><path d="M4 8.5h3l1.6-2.2h6.8L17 8.5h3v10H4z" /><circle cx="12" cy="13.2" r="3.3" /></svg
        >
      {/if}
    </span>
  {/if}
  {#if popping}<span class="shock" aria-hidden="true"></span>{/if}
  {#if hint}<span class="hint" aria-hidden="true">Loslassen.</span>{/if}
</div>

<style>
  .bubble {
    --size: 30px;
    --box: 48px;
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
    width: var(--box);
    height: var(--box);
    border-radius: 50%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    cursor: pointer;
  }
  .bubble.stage {
    --size: 100px;
    --box: 160px;
  }
  .bubble.done {
    touch-action: manipulation;
  }

  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .tooth {
    fill: none;
    stroke: var(--tooth-off);
    stroke-width: 3;
    transition: stroke 0.08s;
  }
  .stage .tooth {
    stroke-width: 2.2;
  }
  .tooth.lit {
    stroke: var(--c);
  }
  .unwinding .tooth {
    transition: stroke 0.06s var(--unwind) calc((11 - var(--i)) * 12ms);
  }
  .armed .tooth {
    stroke: var(--silber);
    animation: flash 0.06s linear;
  }
  .done .tooth {
    stroke: transparent;
  }
  @keyframes flash {
    from {
      stroke: #fff;
    }
  }

  /* A soap bubble: almost clear inside, a faint swirl, the film's colours only at the rim. */
  .core {
    --rim-w: 1.5px;
    --film: #f2b33d, #db3f8a, #6b57db, #19a9a4, #f2b33d;
    position: relative;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 26%, #fff 0 7%, transparent 9%),
      radial-gradient(circle at 68% 74%, #ffffff59 0 4%, transparent 7%),
      radial-gradient(circle at 50% 50%, transparent 58%, #ffffff2e 82%, #ffffff66),
      conic-gradient(from var(--hue), #f2b33d1f, #db3f8a1f, #6b57db1f, #19a9a41f, #f2b33d1f);
    box-shadow: 0 2px 10px -4px #15172640;
    scale: var(--s);
    transition: scale 0.12s ease-out;
  }
  .core::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from var(--hue), var(--film));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--rim-w) - 0.5px), #000 calc(100% - var(--rim-w)));
    mask: radial-gradient(farthest-side, transparent calc(100% - var(--rim-w) - 0.5px), #000 calc(100% - var(--rim-w)));
    opacity: 0.85;
  }
  .stage .core {
    --rim-w: 3px;
  }
  .armed .core {
    --film: #dde4ef, #ffffff, #b9c3d6, #ffffff, #dde4ef;
    animation:
      wobble 0.3s ease-out,
      breathe 0.5s ease-in-out 0.3s infinite alternate;
  }
  @keyframes wobble {
    25% {
      transform: scale(1.02, 0.98);
    }
    50% {
      transform: scale(0.985, 1.015);
    }
    75% {
      transform: scale(1.008, 0.992);
    }
  }
  @keyframes breathe {
    to {
      transform: scale(1.01);
    }
  }
  .core.popping {
    animation: burst 0.07s var(--pop-out) forwards;
  }
  @keyframes burst {
    to {
      scale: 1.4;
      opacity: 0;
    }
  }

  .shock {
    position: absolute;
    width: calc(var(--size) * 1.22);
    height: calc(var(--size) * 1.22);
    border-radius: 50%;
    border: 1.5px solid var(--silber);
    animation: shock 0.22s ease-out forwards;
    pointer-events: none;
  }
  @keyframes shock {
    from {
      opacity: 0.8;
    }
    to {
      transform: scale(2.6);
      opacity: 0;
    }
  }

  .disc {
    display: grid;
    place-items: center;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--disc);
    animation: disc-in 0.42s var(--spring-pop);
  }
  .disc svg {
    width: 70%;
    height: 70%;
    fill: none;
    stroke: var(--disc-ink);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .disc path {
    stroke-dasharray: 1;
    animation: draw 0.22s var(--draw) 0.04s backwards;
  }
  @keyframes disc-in {
    from {
      scale: 0.7;
    }
  }
  @keyframes draw {
    from {
      stroke-dashoffset: 1;
    }
  }

  .hint {
    position: absolute;
    left: calc(100% + 4px);
    top: -14px;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--disc);
    color: var(--disc-ink);
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    animation: hint-in 0.12s ease-out;
  }
  .stage .hint {
    left: 50%;
    top: -28px;
    translate: -50% 0;
  }
  @keyframes hint-in {
    from {
      opacity: 0;
    }
  }

  :global(:root[data-reduced]) .core {
    scale: 1;
  }

  /* Photo check */
  .core {
    display: grid;
    place-items: center;
  }
  .camera {
    width: 62%;
    height: 62%;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.7;
    stroke-linejoin: round;
  }
  .locked .tooth {
    stroke-dasharray: 2 3;
  }
  .checking .ring {
    animation: look 1.2s linear infinite;
  }
  .checking .tooth:nth-child(3n + 1) {
    stroke: var(--c);
  }
  @keyframes look {
    to {
      rotate: 360deg;
    }
  }
</style>
