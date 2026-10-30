<script lang="ts">
  import { tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { backOut, cubicOut } from 'svelte/easing'
  import { crossfade, fly } from 'svelte/transition'
  import { afterglow, finishLines, finishMessage, popEffects } from '../lib/celebrate'
  import { stir } from '../lib/flow'
  import { GeminiError, PROBLEM_TEXT, checkPhoto, gemini } from '../lib/gemini.svelte'
  import { buzz, iosTick } from '../lib/haptics'
  import {
    addTask,
    complete,
    doneIds,
    moveTask,
    newRound,
    removeList,
    removeTask,
    rename,
    restoreTask,
    tasksOf,
    uncomplete,
    type Finish,
    type Task,
  } from '../lib/model'
  import { PATTERNS, note } from '../lib/schedule'
  import * as sound from '../lib/sound'
  import { app, bumpCombo, go, reduced, save, toast, ui } from '../lib/store.svelte'
  import Sheet from './Sheet.svelte'
  import TaskRow from './TaskRow.svelte'

  let { listId }: { listId: string } = $props()

  const list = $derived(app.data.lists.find((l) => l.id === listId))
  const tasks = $derived(tasksOf(app.data, listId))
  const done = $derived(doneIds(app.data, listId))
  const total = $derived(tasks.length)
  const openCount = $derived(tasks.filter((t) => !done.has(t.id)).length)
  const finished = $derived(total > 0 && openCount === 0)
  /** Message for a list that was already finished when it was opened (chosen once, not on every render). */
  const doneMessage = $derived(list ? finishMessage(list.title, list.kind) : '')

  // Just-popped tasks stay in place until the hand rests for 2 s, so targets never move mid-chain.
  let recent = $state<Set<string>>(new Set())
  let settleTimer = 0
  const upper = $derived(tasks.filter((t) => !done.has(t.id) || recent.has(t.id)))
  const lower = $derived(tasks.filter((t) => done.has(t.id) && !recent.has(t.id)))
  let showDone = $state(true)

  // Finale state: shown as a card once the last task popped (or when a finished list is opened).
  let result = $state<null | { message: string; lines: string[] }>(null)
  let glint = $state(false)
  let header = $state<HTMLElement>()
  let timers: number[] = []

  // Chain pill: visible while the chain is alive (6 s after the last pop).
  let chainVisible = $state(false)
  let chainTimer = 0
  const chain = $derived(app.combo.level)

  let editing = $state<Task | null>(null)
  let editTitle = $state('')
  let menu = $state(false)
  let menuMode = $state<'menu' | 'rename' | 'round' | 'delete'>('menu')
  let listTitle = $state('')
  let draft = $state('')
  let input = $state<HTMLInputElement>()

  // Photo check: a task marked for it stays locked until Gemini says the photo shows it done.
  let camera = $state<HTMLInputElement>()
  let photoFor: Task | null = null
  let checkingId = $state('')
  let approved = $state<Set<string>>(new Set())
  const photoOn = $derived(Boolean(gemini.key) && app.data.settings.photoCheck)
  const locked = (t: Task) => photoOn && !!t.photo && !approved.has(t.id) && !done.has(t.id)

  /** Called inside a click, so the browser allows opening the camera. */
  function askPhoto(t: Task) {
    photoFor = t
    camera?.click()
  }

  async function photoTaken() {
    const file = camera?.files?.[0]
    const t = photoFor
    if (camera) camera.value = ''
    photoFor = null
    if (!file || !t || !list) return
    checkingId = t.id
    try {
      const v = await checkPhoto(file, t.title, list.title)
      if (v.done) {
        approved = new Set([...approved, t.id])
        sound.blub()
        buzz(PATTERNS.add)
        toast(v.reason || 'Sieht erledigt aus. Jetzt Plopp!')
      } else {
        sound.error()
        buzz(PATTERNS.error)
        toast(`Noch nicht ganz: ${v.reason || 'Auf dem Foto ist es noch nicht zu sehen.'}`, { label: 'Neues Foto', run: () => askPhoto(t) })
      }
    } catch (e) {
      sound.error()
      toast(PROBLEM_TEXT[e instanceof GeminiError ? e.problem : 'other'])
    } finally {
      checkingId = ''
    }
  }

  // Popped rows glide from the open part into "Erledigt"; new rows fly in.
  const [send, receive] = crossfade({
    duration: 420,
    easing: cubicOut,
    fallback: (node) => fly(node, { y: reduced() ? 0 : 14, duration: 380, easing: backOut }),
  })

  // The room brightens with every finished task.
  $effect(() => {
    ui.scene.wash = total ? (0.35 * (total - openCount)) / total : 0
  })
  $effect(() => {
    // Popped rows only move into "Erledigt" while no finger is down.
    const hold = () => clearTimeout(settleTimer)
    const rest = () => recent.size && settleSoon()
    addEventListener('pointerdown', hold, true)
    addEventListener('pointerup', rest, true)
    addEventListener('pointercancel', rest, true)
    return () => {
      removeEventListener('pointerdown', hold, true)
      removeEventListener('pointerup', rest, true)
      removeEventListener('pointercancel', rest, true)
      timers.forEach(clearTimeout)
      clearTimeout(settleTimer)
      clearTimeout(chainTimer)
    }
  })

  function settleSoon() {
    clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => (recent = new Set()), 2000)
  }

  function announce(text: string) {
    ui.announce = ''
    queueMicrotask(() => (ui.announce = text))
  }

  function popped(task: Task, el: HTMLElement, how: 'hold' | 'tap') {
    const now = Date.now()
    const combo = bumpCombo(now)
    const fin = complete(app.data, task.id, now)
    save()
    recent = new Set([...recent, task.id])
    settleSoon()
    const left = tasks.filter((t) => !done.has(t.id) && t.id !== task.id).length
    popEffects(el, how, combo, fin ? total : 0)
    announce(`${task.title} erledigt. ${total - left} von ${total}.`)
    if (combo > 1) {
      chainVisible = true
      clearTimeout(chainTimer)
      chainTimer = window.setTimeout(() => (chainVisible = false), 6000)
    }
    if (fin) finale(fin)
  }

  function finale(fin: Finish) {
    const message = finishMessage(list!.title, list!.kind)
    const lines = finishLines(fin)
    const show = async () => {
      result = { message, lines }
      recent = new Set()
      showDone = false
      chainVisible = false
      await tick()
    }
    if (reduced()) return void show()
    timers.push(
      window.setTimeout(() => {
        glint = true
        ui.scene.rinse++
      }, 400),
      window.setTimeout(() => {
        if (header) afterglow(header)
        if (document.startViewTransition) document.startViewTransition(show)
        else show()
      }, 1100),
    )
  }

  /** The list is no longer finished: drop the card and any finale still scheduled. */
  function stopFinale() {
    timers.forEach(clearTimeout)
    timers = []
    result = null
    glint = false
  }

  function unchecked(task: Task) {
    uncomplete(app.data, task.id, Date.now())
    save()
    sound.unpop(note(1))
    buzz(PATTERNS.uncheck)
    stopFinale()
  }

  function add(e: SubmitEvent) {
    e.preventDefault()
    if (!addTask(app.data, listId, draft, Date.now())) return
    save()
    draft = ''
    stopFinale()
    sound.unlockAudio()
    sound.blub()
    buzz(PATTERNS.add)
    stir(0.3)
    input?.focus()
  }

  function openEdit(task: Task) {
    editing = task
    editTitle = task.title
  }

  function saveEdit() {
    if (editing) rename(app.data, editing.id, editTitle)
    save()
    editing = null
  }

  function deleteTask() {
    if (!editing) return
    const removed = removeTask(app.data, editing.id)
    save()
    editing = null
    sound.thup()
    buzz(PATTERNS.remove)
    if (removed)
      toast(`„${removed.task.title}“ gelöscht.`, {
        label: 'Rückgängig',
        run: () => {
          restoreTask(app.data, removed)
          save()
        },
      })
  }

  function startRound() {
    newRound(app.data, listId, Date.now())
    save()
    stopFinale()
    showDone = true
    menu = false
  }

  function deleteList() {
    removeList(app.data, listId)
    save()
    menu = false
    go('overview')
  }

  // Drag to reorder with the grip. Only the open part of the list is reorderable.
  let drag = $state<null | { id: string; y0: number; dy: number }>(null)

  function grip(task: Task, e: PointerEvent) {
    e.preventDefault()
    const pointer = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(pointer)
    drag = { id: task.id, y0: e.clientY, dy: 0 }
    sound.unlockAudio()
    sound.lift()
    buzz(PATTERNS.pickup)
    // On window: moving the dragged row in the DOM drops its pointer capture.
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer || !drag) return
      drag.dy = ev.clientY - drag.y0
      const rows = [...document.querySelectorAll<HTMLElement>('.open [data-row]')]
      const i = rows.findIndex((r) => r.dataset.row === drag!.id)
      if (i < 0) return
      const me = rows[i].getBoundingClientRect()
      const mid = me.top + me.height / 2
      const next = rows[i + 1]
      const prev = rows[i - 1]
      const target = next && mid > next.getBoundingClientRect().top + next.getBoundingClientRect().height / 2 ? next : prev && mid < prev.getBoundingClientRect().top + prev.getBoundingClientRect().height / 2 ? prev : null
      if (!target) return
      const h = target.getBoundingClientRect().height
      moveTask(app.data, drag.id, tasks.findIndex((t) => t.id === target.dataset.row))
      // The row moved in the layout by one neighbour; keep it under the finger.
      drag.y0 += target === next ? h : -h
      drag.dy = ev.clientY - drag.y0
      sound.slot()
      buzz(PATTERNS.slot)
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      drag = null
      save()
      sound.tock()
      buzz(PATTERNS.drop)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  /** Arrow keys on the grip move a task one place up or down among the open ones. */
  function nudge(task: Task, dir: -1 | 1) {
    const i = upper.findIndex((t) => t.id === task.id)
    const neighbour = upper[i + dir]
    if (!neighbour || done.has(neighbour.id)) return
    moveTask(app.data, task.id, tasks.findIndex((t) => t.id === neighbour.id))
    save()
    sound.slot()
  }

  const flipFor = (id: string) => ({ duration: reduced() || drag?.id === id ? 0 : 220 })
  const showCard = $derived(!!result || (finished && !recent.size))
</script>

{#if list}
  <header>
    <button class="circle glass" aria-label="Zurück zu den Listen" onclick={() => go('overview')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
    </button>
    <button
      class="circle glass"
      aria-label="Mehr"
      onclick={() => {
        menuMode = 'menu'
        listTitle = list.title
        menu = true
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="dots"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
    </button>
  </header>

  <section class="head" bind:this={header}>
    <h1 class="title" tabindex="-1" style:view-transition-name="list-{list.id}">{list.title}</h1>
    {#if total}
      <div class="strip" aria-hidden="true">
        {#each tasks.slice(0, 12) as t (t.id)}
          <span class="dot" class:popped={done.has(t.id)}></span>
        {/each}
        {#if total > 12}<span class="more num">+{total - 12}</span>{/if}
        <span class="count"><b class="num">{openCount}</b> offen</span>
      </div>
    {/if}
    {#if chainVisible && chain > 1}
      <div class="chain faux" aria-hidden="true">
        {#key chain}<b class="num">{chain}</b>{/key} am Stück{chain >= 5 ? '. Läuft.' : ''}
      </div>
    {/if}
  </section>

  {#if showCard}
    <section class="finale glass" style:view-transition-name="finale">
      <p class="finish">{result?.message ?? doneMessage}</p>
      {#each result?.lines ?? [`${total} ${total === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt.`] as line (line)}
        <p>{line}</p>
      {/each}
      <button class="pill faux" onclick={() => ((menuMode = 'round'), (menu = true))}>Neue Runde starten</button>
      <button class="text-button" onclick={() => go('overview')}>Zurück zu den Listen</button>
    </section>
  {/if}

  {#if upper.length}
    <div class="open faux sheet" class:glint>
      {#each upper as t (t.id)}
        <div animate:flip={flipFor(t.id)} in:receive={{ key: t.id, duration: reduced() ? 0 : 420 }} out:send={{ key: t.id, duration: reduced() ? 0 : 420 }}>
          <TaskRow
            task={t}
            done={done.has(t.id)}
            dragging={drag?.id === t.id}
            dy={drag?.id === t.id ? drag.dy : 0}
            locked={locked(t)}
            checking={checkingId === t.id}
            onlocked={() => askPhoto(t)}
            onpop={(el, how) => popped(t, el, how)}
            onuncheck={() => unchecked(t)}
            onedit={() => openEdit(t)}
            ongrip={(e) => grip(t, e)}
            onnudge={(dir) => nudge(t, dir)}
          />
        </div>
      {/each}
    </div>
  {:else if !total}
    <p class="empty secondary">Hier steht noch nichts. Schreib unten rein, was ansteht.</p>
  {/if}

  {#if lower.length}
    <button class="done-head" aria-expanded={showDone} onclick={() => (showDone = !showDone)}>
      <span class="title-2">Erledigt</span>
      <span class="num secondary">{lower.length}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class:open={showDone}><path d="m9 6 6 6-6 6" /></svg>
    </button>
    {#if showDone}
      <div class="faux sheet" class:glint>
        {#each lower as t (t.id)}
          <div animate:flip={{ duration: reduced() ? 0 : 420 }} in:receive={{ key: t.id, duration: reduced() ? 0 : 420 }} out:send={{ key: t.id, duration: reduced() ? 0 : 420 }}>
            <TaskRow task={t} done onpop={() => {}} onuncheck={() => unchecked(t)} onedit={() => openEdit(t)} />
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  <form class="composer glass" hidden={showCard} onsubmit={add}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    <input bind:this={input} type="text" bind:value={draft} placeholder="Was steht an?" aria-label="Neue Aufgabe" maxlength="120" enterkeyhint="enter" />
    {#if draft.trim()}
      <div class="tick-wrap" use:iosTick>
        <button class="add">Hinzufügen</button>
      </div>
    {/if}
  </form>

  <Sheet bind:open={() => editing !== null, (v) => !v && (editing = null)} label="Aufgabe bearbeiten">
    <h2 class="title-2">Aufgabe</h2>
    <form
      onsubmit={(e) => {
        e.preventDefault()
        saveEdit()
      }}
    >
      <input type="text" bind:value={editTitle} aria-label="Name der Aufgabe" maxlength="120" enterkeyhint="done" />
      {#if gemini.key && editing}
        <label class="photo-switch">
          <span>
            Mit Foto prüfen
            <span class="small">Gemini schaut aufs Foto, bevor die Blase platzen darf.</span>
          </span>
          <input
            type="checkbox"
            switch
            checked={!!editing.photo}
            onchange={(e) => {
              if (editing) editing.photo = e.currentTarget.checked
              save()
            }}
          />
        </label>
      {/if}
      <div class="actions">
        <button type="button" class="text-button danger" onclick={deleteTask}>Löschen</button>
        <button class="pill faux">Fertig</button>
      </div>
    </form>
  </Sheet>

  <input bind:this={camera} type="file" accept="image/*" capture="environment" hidden onchange={photoTaken} />

  <Sheet bind:open={menu} label={list.title}>
    {#if menuMode === 'menu'}
      <h2 class="title-2">{list.title}</h2>
      <div class="menu">
        <button class="menu-item" onclick={() => (menuMode = 'rename')}>Umbenennen</button>
        {#if total}<button class="menu-item" onclick={() => (menuMode = 'round')}>Neue Runde starten</button>{/if}
        <button class="menu-item danger" onclick={() => (menuMode = 'delete')}>Liste löschen</button>
      </div>
    {:else if menuMode === 'rename'}
      <h2 class="title-2">Umbenennen</h2>
      <form
        onsubmit={(e) => {
          e.preventDefault()
          rename(app.data, listId, listTitle)
          save()
          menu = false
        }}
      >
        <input type="text" bind:value={listTitle} aria-label="Name der Liste" maxlength="120" enterkeyhint="done" />
        <button class="pill faux" disabled={!listTitle.trim()}>Umbenennen</button>
      </form>
    {:else if menuMode === 'round'}
      <h2 class="title-2">Neue Runde? {total === 1 ? 'Die Aufgabe ist' : `Alle ${total} Aufgaben sind`} dann wieder offen.</h2>
      <div class="actions">
        <button class="text-button" onclick={() => (menu = false)}>Abbrechen</button>
        <button class="pill faux" onclick={startRound}>Neue Runde starten</button>
      </div>
    {:else}
      <h2 class="title-2">„{list.title}“ löschen? Die Liste und ihre Bestzeit sind dann weg.</h2>
      <div class="actions">
        <button class="text-button" onclick={() => (menu = false)}>Behalten</button>
        <button class="pill faux danger" onclick={deleteList}>Liste löschen</button>
      </div>
    {/if}
  </Sheet>
{/if}

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    margin: 0 calc(-1 * var(--gutter));
    padding: max(8px, env(safe-area-inset-top)) var(--gutter) 8px;
    /* No bar: only the two glass buttons float, rows stay tappable between them. */
    pointer-events: none;
  }
  header button {
    pointer-events: auto;
  }
  header svg {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  header .dots {
    fill: currentColor;
    stroke: none;
  }
  .head {
    position: relative;
    display: grid;
    gap: 10px;
    padding: 4px 0 18px;
  }
  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--ink-2);
    opacity: 0.6;
    transition:
      background 0.2s,
      opacity 0.2s;
  }
  .dot.popped {
    background: var(--silber);
    border-color: var(--ink-2);
    opacity: 1;
    animation: dot-pop 0.42s var(--spring-pop);
  }
  @keyframes dot-pop {
    from {
      scale: 0;
    }
  }
  .more {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .count {
    margin-left: auto;
    font-weight: 560;
  }
  .count b {
    font-size: 1.375rem;
    font-weight: 800;
  }
  .chain {
    justify-self: end;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    animation: chain-in 0.42s var(--spring-pop);
  }
  .chain b {
    display: inline-block;
    font-stretch: 100%;
    animation: stretch 0.42s var(--spring-pop);
  }
  @keyframes chain-in {
    from {
      translate: 0 -10px;
      opacity: 0;
    }
  }
  @keyframes stretch {
    from {
      font-stretch: 125%;
      scale: 1 1.25;
    }
  }
  .finale {
    display: grid;
    gap: 10px;
    margin-bottom: 18px;
    padding: 22px 20px 14px;
    border-radius: 22px;
  }
  .finish {
    font-size: 1.75rem;
    font-weight: 720;
    font-stretch: 108%;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .finale .pill {
    margin-top: 8px;
  }
  .sheet > div + div {
    border-top: 1px solid var(--hair);
  }
  .glint :global(.disc) {
    animation: glint 0.6s ease-out;
  }
  .glint > div:nth-child(2) :global(.disc) {
    animation-delay: 45ms;
  }
  .glint > div:nth-child(3) :global(.disc) {
    animation-delay: 90ms;
  }
  .glint > div:nth-child(4) :global(.disc) {
    animation-delay: 135ms;
  }
  .glint > div:nth-child(n + 5) :global(.disc) {
    animation-delay: 180ms;
  }
  @keyframes glint {
    40% {
      box-shadow: 0 0 0 3px var(--silber);
      scale: 1.12;
    }
  }
  .empty {
    padding: 24px 4px;
  }
  .done-head {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 48px;
    margin: 18px 0 8px;
    padding: 0 4px;
  }
  .done-head svg {
    width: 20px;
    height: 20px;
    margin-left: auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    transition: rotate 0.38s var(--spring-pop);
  }
  .done-head svg.open {
    rotate: 90deg;
  }
  .composer {
    position: fixed;
    left: 50%;
    /* Bottom edge of the visible area (above the keyboard), see App.svelte. */
    top: calc(var(--vv-bottom, 100dvh) - max(16px, env(safe-area-inset-bottom)));
    translate: -50% -100%;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 6px;
    width: min(528px, 100% - 2 * var(--gutter));
    min-height: 56px;
    padding: 4px 6px 4px 18px;
    border-radius: 999px;
  }
  .composer > svg {
    width: 20px;
    height: 20px;
    flex: none;
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 2;
    stroke-linecap: round;
  }
  .composer input {
    flex: 1;
    min-width: 0;
    background: transparent;
    padding: 10px 4px;
  }
  .composer input:focus-visible {
    outline: none;
    box-shadow: none;
  }
  .tick-wrap {
    position: relative;
    border-radius: 999px;
  }
  .add {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--disc);
    color: var(--disc-ink);
    font-weight: 650;
    animation: chain-in 0.3s var(--spring-pop);
  }
  form {
    display: grid;
    gap: 10px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .menu {
    display: grid;
  }
  .photo-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-weight: 560;
  }
  .photo-switch > span {
    display: grid;
    gap: 2px;
  }
  .menu-item {
    min-height: 52px;
    padding: 0 4px;
    text-align: left;
    font-size: 1.0625rem;
    font-weight: 600;
  }
  .menu-item + .menu-item {
    border-top: 1px solid var(--hair);
  }
</style>
