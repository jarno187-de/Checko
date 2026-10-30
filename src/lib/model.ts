// Checko's data and every change to it, as plain functions over a plain object.
// The Svelte store (store.svelte.ts) wraps this; tests use it directly.

export type ID = string
export type Kind = 'zimmer' | 'waesche' | 'hausaufgaben' | 'spuelmaschine'

export interface List {
  id: ID
  title: string
  createdAt: string
  order: number
  kind?: Kind
  /** Start of the current round; tasks done before it count as open again. */
  roundStart: string
  /** How often this list was finished. */
  rounds: number
  /** Set once the current round is finished, so a re-check doesn't count it twice. */
  finishedAt?: string
  bestMs?: number
}

export interface Task {
  id: ID
  listId: ID
  title: string
  createdAt: string
  order: number
  /** Gemini checks a photo before the bubble may pop (only with an API key). */
  photo?: boolean
}

/** Append-only. A task's state is its last event in the current round. */
export interface CompletionEvent {
  id: ID
  taskId: ID
  listId: ID
  at: string
  kind: 'done' | 'undone'
}

export interface Settings {
  sound: boolean
  vibration: boolean
  /** 'hold': hold or pump the bubble. 'tap': one tap completes. */
  mode: 'hold' | 'tap'
  glass: 'klar' | 'getoent' | 'solide'
  /** 'system' follows the OS setting; the other two override it. */
  motion: 'system' | 'reduced' | 'full'
  /** How often the "Loslassen." hint was shown (stops after 3). */
  hints: number
  /** Photo check with Gemini, for tasks marked with `photo`. Needs an API key (kept outside Data). */
  photoCheck: boolean
}

export interface Data {
  version: 1
  onboarded: boolean
  lists: List[]
  tasks: Task[]
  events: CompletionEvent[]
  settings: Settings
  /** Tasks completed ever. Unaffected by deleting lists. */
  total: number
  /** Feature flag for the planned crypto deposit (docs/KRYPTO-PLAN.md). Not built. */
  features: { cryptoStake: false }
}

export const MAX_TITLE = 120

export const defaultSettings = (): Settings => ({
  sound: true,
  vibration: true,
  mode: 'hold',
  glass: 'getoent',
  motion: 'system',
  hints: 0,
  photoCheck: true,
})

export const emptyData = (): Data => ({
  version: 1,
  onboarded: false,
  lists: [],
  tasks: [],
  events: [],
  settings: defaultSettings(),
  total: 0,
  features: { cryptoStake: false },
})

export const TEMPLATES: { kind: Kind; title: string; tasks: string[] }[] = [
  { kind: 'zimmer', title: 'Zimmer aufräumen', tasks: ['Bett machen', 'Klamotten wegräumen', 'Schreibtisch frei machen', 'Müll rausbringen', 'Staubsaugen', 'Lüften'] },
  { kind: 'waesche', title: 'Wäsche', tasks: ['Sortieren', 'Waschen', 'Aufhängen', 'Abnehmen', 'Falten', 'Wegräumen'] },
  { kind: 'hausaufgaben', title: 'Hausaufgaben', tasks: ['Mathe', 'Deutsch', 'Englisch', 'Tasche für morgen packen'] },
  { kind: 'spuelmaschine', title: 'Spülmaschine', tasks: ['Ausräumen', 'Einräumen', 'Tab rein und anschalten'] },
]

// randomUUID needs a secure context; plain http on the LAN (testing on a phone) has only getRandomValues.
function uuid(): ID {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const iso = (ms: number) => new Date(ms).toISOString()
const clean = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE)

export function addList(d: Data, title: string, now: number, kind?: Kind, tasks: string[] = []): List {
  const list: List = {
    id: uuid(),
    title: clean(title) || 'Neue Liste',
    createdAt: iso(now),
    order: d.lists.length ? Math.max(...d.lists.map((l) => l.order)) + 1 : 0,
    roundStart: iso(now),
    rounds: 0,
    ...(kind && { kind }),
  }
  d.lists.push(list)
  for (const t of tasks) addTask(d, list.id, t, now)
  return list
}

/** Tasks where a photo can show the result. Users can switch it per task. */
const VISUAL =
  /bett|klamott|wegräum|aufräum|schreibtisch|tisch|regal|schrank|boden|falt|aufhäng|einräum|ausräum|geschirr|abwasch|putz|fenster|küche|mathe|deutsch|englisch|französisch|latein|physik|chemie|geschichte|erdkunde|hausaufgabe/i
export const photoWorthy = (title: string) => VISUAL.test(title)

export function addTask(d: Data, listId: ID, title: string, now: number): Task | undefined {
  const t = clean(title)
  if (!t) return
  const mine = d.tasks.filter((x) => x.listId === listId)
  const task: Task = { id: uuid(), listId, title: t, createdAt: iso(now), order: mine.length ? Math.max(...mine.map((x) => x.order)) + 1 : 0, photo: photoWorthy(t) }
  d.tasks.push(task)
  return task
}

export function rename(d: Data, id: ID, title: string) {
  const t = clean(title)
  const item = d.tasks.find((x) => x.id === id) ?? d.lists.find((x) => x.id === id)
  if (item && t) item.title = t
}

/** Removes a task and its events. Returns what is needed to undo it. */
export function removeTask(d: Data, id: ID) {
  const task = d.tasks.find((x) => x.id === id)
  if (!task) return
  const events = d.events.filter((e) => e.taskId === id)
  d.tasks = d.tasks.filter((x) => x.id !== id)
  d.events = d.events.filter((e) => e.taskId !== id)
  return { task, events }
}

export function restoreTask(d: Data, removed: { task: Task; events: CompletionEvent[] }) {
  if (d.tasks.some((x) => x.id === removed.task.id) || !d.lists.some((l) => l.id === removed.task.listId)) return
  d.tasks.push(removed.task)
  d.events.push(...removed.events)
  d.events.sort((a, b) => a.at.localeCompare(b.at))
}

export function removeList(d: Data, id: ID) {
  d.lists = d.lists.filter((l) => l.id !== id)
  d.tasks = d.tasks.filter((t) => t.listId !== id)
  d.events = d.events.filter((e) => e.listId !== id)
}

/** Moves a task to position `to` among its list's tasks (by order). */
export function moveTask(d: Data, id: ID, to: number) {
  const task = d.tasks.find((x) => x.id === id)
  if (!task) return
  const mine = tasksOf(d, task.listId).filter((x) => x.id !== id)
  mine.splice(Math.max(0, Math.min(to, mine.length)), 0, task)
  mine.forEach((x, i) => (x.order = i))
}

export const tasksOf = (d: Data, listId: ID) => d.tasks.filter((t) => t.listId === listId).sort((a, b) => a.order - b.order)
export const listsSorted = (d: Data) => [...d.lists].sort((a, b) => a.order - b.order)

/** Done in the current round = its last event since the round started is 'done'. */
export function isDone(d: Data, task: Task): boolean {
  const list = d.lists.find((l) => l.id === task.listId)
  let done = false
  for (const e of d.events) if (e.taskId === task.id && (!list || e.at >= list.roundStart)) done = e.kind === 'done'
  return done
}

/** Ids of the list's tasks that are done this round, in one pass over the events. */
export function doneIds(d: Data, listId: ID): Set<ID> {
  const list = d.lists.find((l) => l.id === listId)
  const done = new Set<ID>()
  for (const e of d.events) {
    if (e.listId !== listId || (list && e.at < list.roundStart)) continue
    if (e.kind === 'done') done.add(e.taskId)
    else done.delete(e.taskId)
  }
  return done
}

export function progress(d: Data, listId: ID) {
  const tasks = tasksOf(d, listId)
  const ids = doneIds(d, listId)
  const done = tasks.filter((t) => ids.has(t.id)).length
  return { total: tasks.length, done, open: tasks.length - done }
}

export interface Finish {
  ms: number
  count: number
  /** How much faster than the previous best, if it was beaten. */
  beatBy?: number
  first: boolean
}

/** Marks a task done. Returns a Finish when this completed the whole list for the first time this round. */
/** Never stamp an event before its round started (the device clock may have gone backwards). */
const stamp = (d: Data, listId: ID, now: number) => {
  const start = Date.parse(d.lists.find((l) => l.id === listId)?.roundStart ?? '')
  return Number.isFinite(start) ? Math.max(now, start) : now
}

export function complete(d: Data, taskId: ID, now: number): Finish | undefined {
  const task = d.tasks.find((t) => t.id === taskId)
  if (!task || isDone(d, task)) return
  now = stamp(d, task.listId, now)
  d.events.push({ id: uuid(), taskId, listId: task.listId, at: iso(now), kind: 'done' })
  d.total++
  const list = d.lists.find((l) => l.id === task.listId)
  const p = progress(d, task.listId)
  if (!list || p.open > 0 || list.finishedAt) return
  // Round time runs from the first check to the last check. There is never a live timer.
  const firstAt = d.events.find((e) => e.listId === list.id && e.kind === 'done' && e.at >= list.roundStart)?.at ?? iso(now)
  const ms = now - Date.parse(firstAt)
  const prev = list.bestMs
  list.rounds++
  list.finishedAt = iso(now)
  if (prev === undefined || ms < prev) list.bestMs = ms
  return { ms, count: p.total, first: prev === undefined, ...(prev !== undefined && ms < prev && { beatBy: prev - ms }) }
}

export function uncomplete(d: Data, taskId: ID, now: number) {
  const task = d.tasks.find((t) => t.id === taskId)
  if (!task || !isDone(d, task)) return
  now = stamp(d, task.listId, now)
  d.events.push({ id: uuid(), taskId, listId: task.listId, at: iso(now), kind: 'undone' })
  d.total = Math.max(0, d.total - 1)
}

/** "Neue Runde starten": every task of the list is open again. */
export function newRound(d: Data, listId: ID, now: number) {
  const list = d.lists.find((l) => l.id === listId)
  if (!list) return
  list.roundStart = iso(now)
  delete list.finishedAt
}

/** Chain of completions, each within the window of the previous one. Kept in memory only. */
export function nextCombo(prev: { level: number; at: number }, now: number, windowMs: number, max: number) {
  return { level: now - prev.at <= windowMs ? Math.min(prev.level + 1, max) : 1, at: now }
}

// --- Saving, loading, backups -------------------------------------------------

const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max
const isId = (v: unknown): v is string => isStr(v, 64) && v.length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => isStr(v, 40) && Number.isFinite(Date.parse(v))

/** Validates untrusted JSON (localStorage or an imported backup). Returns null if it is not Checko data. */
export function parse(json: string): Data | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1 || !Array.isArray(o.lists) || !Array.isArray(o.tasks) || !Array.isArray(o.events)) return null
  const lists = (o.lists as Record<string, unknown>[]).filter(
    (l) => l && isId(l.id) && isStr(l.title, MAX_TITLE) && isDate(l.createdAt) && isDate(l.roundStart) && isNum(l.order) && isNum(l.rounds),
  )
  const listIds = new Set(lists.map((l) => l.id))
  const tasks = (o.tasks as Record<string, unknown>[]).filter(
    (t) => t && isId(t.id) && isId(t.listId) && listIds.has(t.listId) && isStr(t.title, MAX_TITLE) && isDate(t.createdAt) && isNum(t.order),
  )
  const taskIds = new Set(tasks.map((t) => t.id))
  const events = (o.events as Record<string, unknown>[]).filter(
    (e) => e && isId(e.id) && isId(e.taskId) && taskIds.has(e.taskId) && isId(e.listId) && isDate(e.at) && (e.kind === 'done' || e.kind === 'undone'),
  )
  const s = (o.settings ?? {}) as Record<string, unknown>
  const def = defaultSettings()
  return {
    version: 1,
    onboarded: o.onboarded === true,
    lists: lists.map((l) => ({
      id: l.id as string,
      title: l.title as string,
      createdAt: l.createdAt as string,
      order: l.order as number,
      roundStart: l.roundStart as string,
      rounds: l.rounds as number,
      ...(isStr(l.kind, 20) && TEMPLATES.some((t) => t.kind === l.kind) && { kind: l.kind as Kind }),
      ...(isDate(l.finishedAt) && { finishedAt: l.finishedAt }),
      ...(isNum(l.bestMs) && { bestMs: l.bestMs }),
    })),
    tasks: tasks.map((t) => ({ id: t.id, listId: t.listId, title: t.title, createdAt: t.createdAt, order: t.order, ...(typeof t.photo === 'boolean' && { photo: t.photo }) }) as Task),
    events: events.map((e) => ({ id: e.id, taskId: e.taskId, listId: e.listId, at: e.at, kind: e.kind }) as CompletionEvent),
    settings: {
      sound: typeof s.sound === 'boolean' ? s.sound : def.sound,
      vibration: typeof s.vibration === 'boolean' ? s.vibration : def.vibration,
      mode: s.mode === 'tap' ? 'tap' : 'hold',
      glass: s.glass === 'klar' || s.glass === 'solide' ? s.glass : 'getoent',
      motion: s.motion === 'reduced' || s.motion === 'full' ? s.motion : 'system',
      hints: isNum(s.hints) ? s.hints : 0,
      photoCheck: typeof s.photoCheck === 'boolean' ? s.photoCheck : def.photoCheck,
    },
    total: isNum(o.total) && o.total >= 0 ? Math.floor(o.total) : 0,
    features: { cryptoStake: false },
  }
}
