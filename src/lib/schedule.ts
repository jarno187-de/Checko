// Timing of the charge ramp and every vibration pattern. Pure, so it can be tested.
// Numbers come from docs/DESIGN.md ("Haptik, Ton, Bild").

export const TEETH = 12
/** Taps shorter than this count as a pump stroke, not a hold. */
export const PUMP_MS = 150
/** Lit teeth stay this long after the finger lifts, then go out one by one. */
export const DECAY_WAIT_MS = 800
export const DECAY_STEP_MS = 250
/** A completion within this window of the previous one extends the chain. */
export const COMBO_WINDOW_MS = 6000
export const COMBO_MAX = 5

/** Gap after tick k: 150 ms shrinking by 0.8846 per tick, never below 44 ms. */
export const GAPS = Array.from({ length: TEETH }, (_, k) => Math.max(44, Math.round(150 * 0.8846 ** k)))
/** Tick onsets in ms: 0, 150, 283, 400 … 963. */
export const ONSETS = GAPS.map((_, k) => GAPS.slice(0, k).reduce((a, b) => a + b, 0))
/** The lock ("klack") lands one gap after the last tick: 1007 ms. */
export const LOCK_MS = ONSETS[TEETH - 1] + GAPS[TEETH - 1]

/** Vibration length per tick: 10 ms, then 12, then 14 as the spring winds up. */
export const pulse = (k: number) => (k < 5 ? 10 : k < 9 ? 12 : 14)
const LOCK_PULSE = 24

/** Onsets relative to a press that starts with `lit` teeth already lit (from pumping). */
export function onsetsFrom(lit: number): number[] {
  return ONSETS.slice(lit).map((t) => t - ONSETS[lit])
}
export function lockFrom(lit: number): number {
  return LOCK_MS - ONSETS[Math.min(lit, TEETH - 1)]
}

/** Android: the whole ramp from `lit` as ONE vibrate pattern, ending on the lock pulse. */
export function rampPattern(lit = 0): number[] {
  const out: number[] = []
  for (let k = lit; k < TEETH; k++) out.push(pulse(k), GAPS[k] - pulse(k))
  out.push(LOCK_PULSE)
  return out
}

/** Release burst: fast, then spinning out like a freewheel. One extra tail per chain level. */
export function burstPattern(combo = 1): number[] {
  const out = [16, 30, 14, 30, 14, 32, 12, 36, 12, 42, 10, 52, 10, 66, 10]
  for (let i = 1; i < Math.min(combo, COMBO_MAX); i++) out.push(70, 10)
  return out
}

/** Last task of a list: the burst, then one tap per finished row, then a closing double. */
export function finalePattern(doneRows: number): number[] {
  const out = [...burstPattern(1), 40]
  for (let i = 1; i < Math.min(doneRows, 12); i++) out.push(10, 35)
  out.push(10, 90, 28, 70, 16)
  return out
}

export const PATTERNS = {
  pump: [12],
  cancel: [8, 40, 8],
  tapCheck: [14, 40, 10],
  uncheck: [10],
  add: [8],
  remove: [8, 30, 20],
  pickup: [12],
  slot: [8],
  drop: [10, 40, 14],
  error: [30, 60, 30],
  press: [8],
  unlock: [12],
} satisfies Record<string, number[]>

/** Release note per chain level: pentatonic C6 D6 E6 G6 A6, so it always sounds right. */
export const NOTES = [1047, 1175, 1319, 1568, 1760]
export const note = (combo: number) => NOTES[Math.min(Math.max(combo, 1), COMBO_MAX) - 1]
