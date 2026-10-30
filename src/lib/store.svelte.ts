// The one reactive store. Components change `app.data` with the functions in model.ts, then call save().
import { tick } from 'svelte'
import { prefersReducedMotion } from 'svelte/motion'
import { emptyData, nextCombo, parse, type Data } from './model'
import { COMBO_MAX, COMBO_WINDOW_MS } from './schedule'

const KEY = 'checko:v1' // versioned, so a later schema (crypto deposit) can migrate

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    return (raw && parse(raw)) || emptyData()
  } catch {
    return emptyData() // private mode or blocked storage: run from memory
  }
}

export const app = $state({
  data: load(),
  saveFailed: false,
  /** Current chain of completions (memory only, never saved). */
  combo: { level: 0, at: -Infinity },
  toast: null as null | { text: string; action?: { label: string; run: () => void } },
})

export type View = 'overview' | 'list' | 'settings'

/** Screen state, never saved. */
export const ui = $state({
  view: 'overview' as View,
  listId: '',
  /** Backdrop: how bright the room is (0..0.35), and a counter that triggers the rinse. */
  scene: { wash: 0, rinse: 0 },
  /** Read out by screen readers (aria-live). */
  announce: '',
})

/** Change screens; morphs with a View Transition where the browser has one and motion is allowed. */
export function go(view: View, listId = '') {
  // Focus moves to the new screen's heading, so keyboard and screen-reader users land there.
  const focus = () => document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  const apply = () => {
    ui.view = view
    ui.listId = listId
    scrollTo(0, 0)
  }
  if (!document.startViewTransition || reduced()) {
    apply()
    tick().then(focus)
    return
  }
  document.startViewTransition(async () => {
    apply()
    await tick()
    focus()
  })
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(app.data)))
    app.saveFailed = false
  } catch {
    app.saveFailed = true
    toast('Speichern klappt gerade nicht: Der Browser hat keinen Platz mehr. Lösch eine alte Liste.')
  }
}

/** Ask the browser not to evict our data (Safari grants it to Home Screen apps). */
export function persist() {
  navigator.storage?.persist?.().catch(() => {})
}

export function bumpCombo(now: number) {
  app.combo = nextCombo(app.combo, now, COMBO_WINDOW_MS, COMBO_MAX)
  return app.combo.level
}

export const reduced = () => {
  const m = app.data.settings.motion
  return m === 'reduced' || (m === 'system' && prefersReducedMotion.current)
}

// Another tab or the installed app saved: take its data, so our next save doesn't overwrite it.
addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) app.data = parse(e.newValue) ?? app.data
})

let toastTimer = 0
export function toast(text: string, action?: { label: string; run: () => void }) {
  clearTimeout(toastTimer)
  app.toast = { text, action }
  // Long texts (Gemini's verdict) stay up long enough to read: about 60 ms per character.
  toastTimer = window.setTimeout(() => (app.toast = null), Math.max(action ? 5000 : 3000, text.length * 60))
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify($state.snapshot(app.data), null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `checko-sicherung-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Returns false if the file is not a Checko backup; then nothing changes. */
export async function importBackup(file: File): Promise<boolean> {
  if (file.size > 5_000_000) return false
  const d = parse(await file.text())
  if (!d) return false
  d.onboarded = true
  app.data = d
  save()
  return true
}

export function wipe() {
  app.data = { ...emptyData(), onboarded: true, settings: app.data.settings }
  save()
}
