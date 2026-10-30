import { describe, expect, it } from 'vitest'
import { readVerdict } from './gemini.svelte'
import { TEMPLATES, photoWorthy } from './model'

describe('readVerdict (model output is untrusted)', () => {
  it('accepts a well-formed answer and tidies the reason', () => {
    expect(readVerdict(JSON.stringify({ done: true, reason: '  Bett ist\n gemacht. ' }))).toEqual({ done: true, reason: 'Bett ist gemacht.' })
  })

  it('caps long reasons', () => {
    expect(readVerdict(JSON.stringify({ done: false, reason: 'x'.repeat(500) }))?.reason).toHaveLength(160)
  })

  it('rejects anything without a boolean verdict', () => {
    for (const bad of ['', 'ja', '{"done":"yes"}', '[]', 'null', '{"reason":"ok"}']) expect(readVerdict(bad)).toBeNull()
  })
})

it('marks tasks you can photograph, not the rest', () => {
  const marked = TEMPLATES.flatMap((t) => t.tasks.filter(photoWorthy))
  expect(marked).toEqual([
    'Bett machen',
    'Klamotten wegräumen',
    'Schreibtisch frei machen',
    'Aufhängen',
    'Falten',
    'Wegräumen',
    'Mathe',
    'Deutsch',
    'Englisch',
    'Ausräumen',
    'Einräumen',
  ])
})
