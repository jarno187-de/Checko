import { describe, expect, it } from 'vitest'
import {
  TEMPLATES,
  addList,
  addTask,
  complete,
  emptyData,
  isDone,
  moveTask,
  newRound,
  nextCombo,
  parse,
  progress,
  removeList,
  removeTask,
  restoreTask,
  tasksOf,
  uncomplete,
} from './model'

const MIN = 60_000

function room() {
  const d = emptyData()
  const t = TEMPLATES[0]
  const list = addList(d, t.title, 0, t.kind, t.tasks.slice(0, 3))
  return { d, list, tasks: tasksOf(d, list.id) }
}

describe('lists and tasks', () => {
  it('creates a list from a template', () => {
    const { d, list, tasks } = room()
    expect(list.title).toBe('Zimmer aufräumen')
    expect(tasks.map((t) => t.title)).toEqual(['Bett machen', 'Klamotten wegräumen', 'Schreibtisch frei machen'])
    expect(progress(d, list.id)).toEqual({ total: 3, done: 0, open: 3 })
  })

  it('cleans titles and ignores empty ones', () => {
    const { d, list } = room()
    expect(addTask(d, list.id, '   ', 0)).toBeUndefined()
    expect(addTask(d, list.id, '  Fenster   putzen ', 0)?.title).toBe('Fenster putzen')
    expect(addTask(d, list.id, 'x'.repeat(500), 0)?.title).toHaveLength(120)
  })

  it('deletes a task and restores it with its history', () => {
    const { d, tasks } = room()
    complete(d, tasks[0].id, MIN)
    const removed = removeTask(d, tasks[0].id)!
    expect(d.tasks).toHaveLength(2)
    restoreTask(d, removed)
    expect(isDone(d, tasks[0])).toBe(true)
  })

  it('deleting a list keeps the lifetime count', () => {
    const { d, list, tasks } = room()
    complete(d, tasks[0].id, MIN)
    removeList(d, list.id)
    expect(d.tasks).toHaveLength(0)
    expect(d.events).toHaveLength(0)
    expect(d.total).toBe(1)
  })

  it('reorders', () => {
    const { d, list, tasks } = room()
    moveTask(d, tasks[0].id, 2)
    expect(tasksOf(d, list.id).map((t) => t.id)).toEqual([tasks[1].id, tasks[2].id, tasks[0].id])
  })
})

describe('completion, rounds and best time', () => {
  it('finishing the last task reports the round time once', () => {
    const { d, list, tasks } = room()
    expect(complete(d, tasks[0].id, 1 * MIN)).toBeUndefined()
    expect(complete(d, tasks[0].id, 1 * MIN)).toBeUndefined() // already done: no double count
    complete(d, tasks[1].id, 2 * MIN)
    expect(complete(d, tasks[2].id, 15 * MIN)).toEqual({ ms: 14 * MIN, count: 3, first: true })
    expect(d.total).toBe(3)
    expect(list.rounds).toBe(1)
    // Unchecking and checking again does not count the round twice.
    uncomplete(d, tasks[2].id, 16 * MIN)
    expect(complete(d, tasks[2].id, 17 * MIN)).toBeUndefined()
    expect(list.rounds).toBe(1)
  })

  it('a new round reopens everything and reports a beaten best time', () => {
    const { d, list, tasks } = room()
    for (const t of tasks) complete(d, t.id, MIN)
    expect(list.bestMs).toBe(0)
    newRound(d, list.id, 10 * MIN)
    expect(progress(d, list.id).open).toBe(3)

    // Slower round: no comparison.
    const d2 = room()
    complete(d2.d, d2.tasks[0].id, 0)
    complete(d2.d, d2.tasks[1].id, 0)
    complete(d2.d, d2.tasks[2].id, 5 * MIN)
    newRound(d2.d, d2.list.id, 6 * MIN)
    complete(d2.d, d2.tasks[0].id, 7 * MIN)
    complete(d2.d, d2.tasks[1].id, 7 * MIN)
    expect(complete(d2.d, d2.tasks[2].id, 20 * MIN)).toEqual({ ms: 13 * MIN, count: 3, first: false })
    newRound(d2.d, d2.list.id, 21 * MIN)
    complete(d2.d, d2.tasks[0].id, 22 * MIN)
    complete(d2.d, d2.tasks[1].id, 22 * MIN)
    expect(complete(d2.d, d2.tasks[2].id, 24 * MIN)).toEqual({ ms: 2 * MIN, count: 3, first: false, beatBy: 3 * MIN })
    expect(d2.list.bestMs).toBe(2 * MIN)
    expect(d2.list.rounds).toBe(3)
  })
})

it('chain grows within 6 s, caps at 5 and restarts silently', () => {
  let c = { level: 0, at: -Infinity }
  const levels = []
  for (const t of [0, 5000, 10000, 15000, 20000, 25000, 40000]) {
    c = nextCombo(c, t, 6000, 5)
    levels.push(c.level)
  }
  expect(levels).toEqual([1, 2, 3, 4, 5, 5, 1])
})

describe('parse (trust boundary)', () => {
  it('round-trips a backup', () => {
    const { d, tasks } = room()
    complete(d, tasks[1].id, MIN)
    d.settings.mode = 'tap'
    expect(parse(JSON.stringify(d))).toEqual(d)
  })

  it('rejects garbage instead of crashing', () => {
    for (const bad of ['', '{', 'null', '[]', '{"version":2,"lists":[],"tasks":[],"events":[]}', '{"version":1}']) expect(parse(bad)).toBeNull()
  })

  it('drops malformed and orphaned entries', () => {
    const { d } = room()
    const raw = JSON.parse(JSON.stringify(d))
    raw.tasks.push({ id: 'x', listId: 'missing', title: 'Waise', createdAt: '', order: 0 })
    raw.tasks.push({ id: 7, listId: raw.lists[0].id, title: 'kaputt', createdAt: '', order: 0 })
    raw.lists[0].title = 'y'.repeat(1000)
    raw.settings = { sound: 'ja', glass: 'gold' }
    const out = parse(JSON.stringify(raw))!
    expect(out.lists).toHaveLength(0)
    expect(out.tasks).toHaveLength(0)
    expect(out.settings.sound).toBe(true)
    expect(out.settings.glass).toBe('getoent')
  })
})

it('a clock that went backwards still completes tasks, and bad dates are rejected', () => {
  const { d, list, tasks } = room()
  newRound(d, list.id, 60 * MIN)
  complete(d, tasks[0].id, 1 * MIN) // device clock is behind the round start
  expect(isDone(d, tasks[0])).toBe(true)
  const raw = JSON.parse(JSON.stringify(d))
  raw.lists[0].roundStart = 'x'
  expect(parse(JSON.stringify(raw))!.lists).toHaveLength(0)
})
