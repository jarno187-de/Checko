<script lang="ts">
  import { canVibrate, iosTicks } from '../lib/haptics'
  import { app, exportBackup, go, importBackup, reduced, save, toast, wipe } from '../lib/store.svelte'
  import * as sound from '../lib/sound'
  import { MODEL, gemini, saveKey } from '../lib/gemini.svelte'
  import Sheet from './Sheet.svelte'

  const s = $derived(app.data.settings)
  let confirmWipe = $state(false)
  let keyDraft = $state('')
  let file = $state<HTMLInputElement>()

  function set<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    app.data.settings[key] = value
    save()
  }

  async function load(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!f) return
    if (await importBackup(f)) toast(`Sicherung geladen: ${app.data.lists.length} ${app.data.lists.length === 1 ? 'Liste' : 'Listen'}.`)
    else {
      sound.error()
      toast('Das ist keine Checko-Sicherung. Wähl die .json-Datei, die Checko gespeichert hat.')
    }
    if (file) file.value = ''
  }
</script>

<header>
  <button class="circle glass" aria-label="Zurück zu den Listen" onclick={() => go('overview')}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
  </button>
  <h1 class="title-2">Einstellungen</h1>
</header>

<h2 class="title-2 group">Gefühl</h2>
<div class="faux sheet">
  <label class="item">
    <span class="what">
      Klänge
      <span class="small">{iosTicks ? 'Folgt dem Stummschalter.' : 'Folgt der Medienlautstärke.'}</span>
    </span>
    <input type="checkbox" switch checked={s.sound} onchange={(e) => set('sound', e.currentTarget.checked)} />
  </label>
  {#if canVibrate || iosTicks}
    <label class="item">
      <span class="what">
        Vibration
        {#if iosTicks}<span class="small">Auf dem iPhone nur bei echten Tipps. Pump die Blase, dann klopft jeder Tipp.</span>{/if}
      </span>
      <input type="checkbox" switch checked={s.vibration} onchange={(e) => set('vibration', e.currentTarget.checked)} />
    </label>
  {/if}
  <fieldset class="item column">
    <legend class="what">Abhaken</legend>
    <div class="segmented">
      <label><input type="radio" name="mode" checked={s.mode === 'hold'} onchange={() => set('mode', 'hold')} />Halten oder Pumpen</label>
      <label><input type="radio" name="mode" checked={s.mode === 'tap'} onchange={() => set('mode', 'tap')} />Antippen</label>
    </div>
    <span class="small">Antippen geht schneller. Halten macht mehr Plopp.</span>
  </fieldset>
</div>

<h2 class="title-2 group">Aussehen</h2>
<div class="faux sheet">
  <fieldset class="item column">
    <legend class="what">Glas</legend>
    <div class="segmented">
      <label><input type="radio" name="glass" checked={s.glass === 'klar'} onchange={() => set('glass', 'klar')} />Klar</label>
      <label><input type="radio" name="glass" checked={s.glass === 'getoent'} onchange={() => set('glass', 'getoent')} />Getönt</label>
      <label><input type="radio" name="glass" checked={s.glass === 'solide'} onchange={() => set('glass', 'solide')} />Solide</label>
    </div>
    <span class="small">Getönt und Solide sind leichter zu lesen.</span>
  </fieldset>
  <label class="item">
    <span class="what">
      Weniger Bewegung
      <span class="small">Keine Blasen, kein Wackeln. Klang und Vibration bleiben.</span>
    </span>
    <input type="checkbox" switch checked={reduced()} onchange={(e) => set('motion', e.currentTarget.checked ? 'reduced' : 'system')} />
  </label>
</div>

<h2 class="title-2 group">Foto-Check</h2>
<div class="faux sheet">
  <p class="item small">Bei passenden Aufgaben machst du ein Foto, und Gemini schaut, ob sie wirklich erledigt ist. Modell: {MODEL}, unter 0,1 Cent pro Foto.</p>
  {#if gemini.key}
    <label class="item">
      <span class="what">Foto-Check<span class="small">Schlüssel gespeichert, endet auf …{gemini.key.slice(-4)}</span></span>
      <input type="checkbox" switch checked={s.photoCheck} onchange={(e) => set('photoCheck', e.currentTarget.checked)} />
    </label>
    <button class="item danger" onclick={() => saveKey('')}><span class="what">Schlüssel entfernen</span></button>
  {:else}
    <form class="item column" onsubmit={(e) => { e.preventDefault(); saveKey(keyDraft); keyDraft = '' }}>
      <input type="password" bind:value={keyDraft} placeholder="Gemini-API-Schlüssel" aria-label="Gemini-API-Schlüssel" autocomplete="off" spellcheck="false" />
      <button class="pill glass" disabled={!keyDraft.trim()}>Schlüssel speichern</button>
      <a class="small" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Schlüssel bei Google AI Studio holen</a>
    </form>
  {/if}
  <p class="item small">Der Schlüssel bleibt nur auf diesem Gerät und steckt in keiner Sicherung. Fotos gehen direkt an Google, sonst nirgendwohin. Im kostenlosen Gemini-Tarif darf Google sie zur Verbesserung nutzen.</p>
</div>

<h2 class="title-2 group">Deine Daten</h2>
<div class="faux sheet">
  <button class="item" onclick={exportBackup}>
    <span class="what">
      Sicherung speichern
      <span class="small">Lädt eine .json-Datei mit allen Listen herunter.</span>
    </span>
  </button>
  <button class="item" onclick={() => file?.click()}><span class="what">Sicherung laden</span></button>
  <input bind:this={file} type="file" accept="application/json,.json" hidden onchange={load} />
  <button class="item danger" onclick={() => (confirmWipe = true)}><span class="what">Alles löschen</span></button>
</div>

<p class="small footer">
  Alles bleibt auf diesem Gerät. Kein Konto, keine Werbung, keine Benachrichtigungen.
  {#if app.data.total}<br />Bisher <span class="num">{app.data.total}</span> {app.data.total === 1 ? 'Aufgabe' : 'Aufgaben'} erledigt.{/if}
</p>

<Sheet bind:open={confirmWipe} label="Alles löschen">
  <h2 class="title-2">Alle Listen und Zahlen löschen? Das lässt sich nicht rückgängig machen.</h2>
  <div class="actions">
    <button class="text-button" onclick={() => (confirmWipe = false)}>Abbrechen</button>
    <button
      class="pill glass danger"
      onclick={() => {
        wipe()
        confirmWipe = false
        go('overview')
      }}>Alles löschen</button
    >
  </div>
</Sheet>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0 8px;
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
  .group {
    padding: 22px 4px 8px;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: 100%;
    min-height: 56px;
    margin: 0;
    padding: 12px 16px;
    border: 0;
    text-align: left;
    font-weight: 560;
  }
  .item + .item,
  .item + input + .item {
    border-top: 1px solid var(--hair);
  }
  .column {
    flex-direction: column;
    align-items: stretch;
  }
  legend {
    float: left;
    padding: 0;
  }
  .what {
    display: grid;
    gap: 2px;
  }
  .segmented {
    display: flex;
    padding: 3px;
    border-radius: 12px;
    background: var(--hair);
  }
  .segmented label {
    flex: 1;
    display: grid;
    place-items: center;
    min-height: 40px;
    padding: 0 8px;
    border-radius: 9px;
    text-align: center;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .segmented label:has(:checked) {
    background: var(--row);
    box-shadow: var(--rim), 0 2px 6px -2px #15172633;
  }
  .segmented label:has(:focus-visible) {
    outline: 2px solid var(--ink);
  }
  .segmented input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .footer {
    padding: 20px 4px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
</style>
