import { describe, expect, it } from 'vitest'
import { GAPS, LOCK_MS, ONSETS, burstPattern, finalePattern, lockFrom, note, onsetsFrom, pulse, rampPattern } from './schedule'

describe('charge ramp', () => {
  it('matches the design spec', () => {
    expect(ONSETS).toEqual([0, 150, 283, 400, 504, 596, 677, 749, 813, 869, 919, 963])
    expect(LOCK_MS).toBe(1007)
  })

  it('gets faster and never ticks closer than 44 ms', () => {
    for (let k = 1; k < GAPS.length; k++) expect(GAPS[k]).toBeLessThanOrEqual(GAPS[k - 1])
    expect(Math.min(...GAPS)).toBe(44)
  })

  it('continues from pumped teeth', () => {
    expect(onsetsFrom(0)).toEqual(ONSETS)
    expect(onsetsFrom(10)).toEqual([0, 44])
    expect(lockFrom(10)).toBe(88)
    expect(lockFrom(0)).toBe(LOCK_MS)
  })
})

describe('android patterns', () => {
  it('ramp is the spec pattern and lasts as long as the visual ramp', () => {
    const p = rampPattern()
    expect(p).toEqual([10, 140, 10, 123, 10, 107, 10, 94, 10, 82, 12, 69, 12, 60, 12, 52, 12, 44, 14, 36, 14, 30, 14, 30, 24])
    expect(p.slice(0, -1).reduce((a, b) => a + b, 0)).toBe(LOCK_MS)
  })

  it('keeps every pause at 30 ms or more, so ticks never blur into a buzz', () => {
    for (const p of [rampPattern(), rampPattern(7), burstPattern(5), finalePattern(12)]) {
      const offs = p.filter((_, i) => i % 2 === 1)
      expect(Math.min(...offs)).toBeGreaterThanOrEqual(30)
      expect(p.length).toBeLessThanOrEqual(99)
    }
  })

  it('ramp from a pumped level starts with that tooth', () => {
    expect(rampPattern(11)).toEqual([pulse(11), GAPS[11] - pulse(11), 24])
  })

  it('burst gets one tail per chain level, capped at 5', () => {
    expect(burstPattern(1)).toHaveLength(15)
    expect(burstPattern(3)).toHaveLength(19)
    expect(burstPattern(9)).toEqual(burstPattern(5))
  })
})

it('release note climbs the pentatonic scale and stops at A6', () => {
  expect([1, 2, 3, 4, 5, 6].map(note)).toEqual([1047, 1175, 1319, 1568, 1760, 1760])
})
