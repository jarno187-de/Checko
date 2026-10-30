import { describe, expect, it } from 'vitest'
import { Charger } from './charger'
import { LOCK_MS } from './schedule'

describe('hold', () => {
  it('lights one tooth per tick and pops after the lock', () => {
    const c = new Charger()
    c.down(0)
    expect(c.level(0)).toBe(1)
    expect(c.level(149)).toBe(1)
    expect(c.level(150)).toBe(2)
    expect(c.level(963)).toBe(12)
    expect(c.armed(LOCK_MS - 1)).toBe(false)
    expect(c.armed(LOCK_MS)).toBe(true)
    expect(c.up(5000)).toBe('pop')
    expect(c.level(5000)).toBe(0)
  })

  it('a hold released early keeps its teeth, which then go out one by one', () => {
    const c = new Charger()
    c.down(0)
    expect(c.up(500)).toBe('rest')
    expect(c.level(500)).toBe(4)
    expect(c.level(1299)).toBe(4)
    expect(c.level(1300)).toBe(3)
    expect(c.level(1550)).toBe(2)
    expect(c.level(99999)).toBe(0)
  })

  it('reaching tooth 12 just before the lock still pops', () => {
    const c = new Charger()
    c.down(0)
    expect(c.up(980)).toBe('pop')
  })
})

describe('pump', () => {
  it('six quick taps pop the bubble', () => {
    const c = new Charger()
    const results = []
    for (let i = 0; i < 6; i++) {
      c.down(i * 200)
      results.push(c.up(i * 200 + 80))
    }
    expect(results).toEqual(['pump', 'pump', 'pump', 'pump', 'pump', 'pop'])
  })

  it('holding after pumping continues the ramp from the pumped level', () => {
    const c = new Charger()
    c.down(0)
    c.up(80) // 2 teeth
    expect(c.down(300)).toBe(2)
    expect(c.level(300)).toBe(3)
    expect(c.armed(300 + LOCK_MS - 283)).toBe(true)
  })

  it('pausing too long lets pumped teeth go out', () => {
    const c = new Charger()
    c.down(0)
    c.up(80)
    c.down(200)
    c.up(280) // 4 teeth
    expect(c.down(280 + 800 + 250)).toBe(2)
  })
})

it('cancel drops every tooth', () => {
  const c = new Charger()
  c.down(0)
  c.cancel()
  expect(c.holding).toBe(false)
  expect(c.level(10)).toBe(0)
})
