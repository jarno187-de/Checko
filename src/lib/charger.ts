// The bubble's state machine: hold to charge, tap to pump, lit teeth decay when left alone.
// Pure (time is passed in), so tests can drive it without a DOM.
import { DECAY_STEP_MS, DECAY_WAIT_MS, PUMP_MS, TEETH, lockFrom, onsetsFrom } from './schedule'

/** What a lifted finger means. */
export type Release = 'pop' | 'pump' | 'rest'

export class Charger {
  /** Teeth lit before the current press (or after the last release). */
  private base = 0
  private t0 = 0
  private upAt = 0
  holding = false

  /** Teeth lit at time `now`, 0..12. */
  level(now: number): number {
    if (this.holding) {
      const passed = now - this.t0
      return Math.min(TEETH, this.base + onsetsFrom(this.base).filter((t) => t <= passed).length)
    }
    const idle = now - this.upAt - DECAY_WAIT_MS
    return idle < 0 ? this.base : Math.max(0, this.base - Math.floor(idle / DECAY_STEP_MS) - 1)
  }

  /** True once the lock has clicked in: letting go now pops the bubble. */
  armed(now: number): boolean {
    return this.holding && now - this.t0 >= lockFrom(this.base)
  }

  /** Teeth already lit when the finger goes down; the ramp continues from there. */
  down(now: number): number {
    this.base = this.level(now)
    this.t0 = now
    this.holding = true
    return this.base
  }

  up(now: number): Release {
    const armed = this.armed(now)
    const quick = now - this.t0 < PUMP_MS
    const lit = this.level(now)
    this.holding = false
    this.upAt = now
    if (armed) return this.reset('pop')
    // A pump stroke lights two teeth: one on the press, one on the release.
    this.base = quick ? Math.min(TEETH, this.base + 2) : lit
    if (this.base >= TEETH) return this.reset('pop')
    return quick ? 'pump' : 'rest'
  }

  /** Finger slid away, the browser took the touch, or the page was hidden. */
  cancel() {
    this.holding = false
    this.base = 0
  }

  private reset(r: Release): Release {
    this.base = 0
    return r
  }
}

