<script lang="ts">
  import { TEMPLATES, addList, listsSorted, progress } from '../lib/model'
  import { iosTick } from '../lib/haptics'
  import { app, go, save } from '../lib/store.svelte'
  import Ring from './Ring.svelte'
  import Sheet from './Sheet.svelte'

  const lists = $derived(listsSorted(app.data))
  let creating = $state(false)
  let name = $state('')

  function create(title: string, template?: (typeof TEMPLATES)[number]) {
    const list = addList(app.data, title, Date.now(), template?.kind, template?.tasks)
    save()
    creating = false
    name = ''
    go('list', list.id)
  }

  function status(id: string) {
    const p = progress(app.data, id)
    if (!p.total) return 'Noch leer'
    if (!p.open) return 'Fertig'
    return `${p.open} offen`
  }
</script>

<header>
  <h1 class="wordmark">Checko</h1>
  <div class="tick-wrap" use:iosTick>
    <button class="circle glass lens-circle" aria-label="Einstellungen" onclick={() => go('settings')}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" /></svg>
    </button>
  </div>
</header>

{#if lists.length}
  <ul class="rooms faux sheet">
    {#each lists as l (l.id)}
      {@const p = progress(app.data, l.id)}
      <!-- The whole row opens the list; the button inside carries focus and the name for screen readers. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <li use:iosTick onclick={() => go('list', l.id)}>
        <button class="room">
          <Ring done={p.done} total={p.total} />
          <span class="text">
            <span class="name" style:view-transition-name="list-{l.id}">{l.title}</span>
            <span class="secondary">{status(l.id)}</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <section class="empty">
    <p class="title-2">Noch keine Listen. Nimm dir ein Zimmer vor.</p>
    <div class="chips">
      {#each TEMPLATES as t (t.kind)}
        <button class="chip faux" onclick={() => create(t.title, t)}>{t.title}</button>
      {/each}
      <button class="chip faux" onclick={() => (creating = true)}>Leere Liste anlegen</button>
    </div>
  </section>
{/if}

{#if app.data.total > 0}
  <p class="small lifetime num">Bisher {app.data.total} {app.data.total === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt.</p>
{/if}

<div class="dock">
  <div class="tick-wrap" use:iosTick>
    <button class="pill glass lens-pill new" onclick={() => (creating = true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      Neue Liste
    </button>
  </div>
</div>

<Sheet bind:open={creating} label="Neue Liste">
  <h2 class="title-2">Neue Liste</h2>
  <form
    onsubmit={(e) => {
      e.preventDefault()
      if (name.trim()) create(name)
    }}
  >
    <!-- svelte-ignore a11y_autofocus -->
    <input type="text" bind:value={name} placeholder="Wie heißt die Liste?" aria-label="Name der Liste" maxlength="120" enterkeyhint="done" autofocus />
    <button class="pill glass" disabled={!name.trim()}>Liste anlegen</button>
  </form>
  <p class="secondary">Oder nimm eine Vorlage:</p>
  <div class="chips">
    {#each TEMPLATES as t (t.kind)}
      <button class="chip faux" onclick={() => create(t.title, t)}>{t.title}</button>
    {/each}
  </div>
</Sheet>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0 20px;
  }
  .tick-wrap {
    position: relative;
    display: inline-grid;
    border-radius: 999px;
  }
  .circle svg,
  .new svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .rooms {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    position: relative;
  }
  li + li {
    border-top: 1px solid var(--hair);
  }
  .room {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 72px;
    padding: 12px 16px;
    text-align: left;
  }
  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .name {
    font-size: 1.5rem;
    font-weight: 720;
    font-stretch: 108%;
    letter-spacing: -0.015em;
    line-height: 1.15;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  .empty {
    display: grid;
    gap: 18px;
    padding: 24px 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .lifetime {
    padding: 18px 4px;
  }
  .dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: max(16px, env(safe-area-inset-bottom));
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .dock .tick-wrap {
    pointer-events: auto;
  }
  .new {
    width: 184px;
    padding: 0;
  }
  form {
    display: grid;
    gap: 10px;
  }
</style>
