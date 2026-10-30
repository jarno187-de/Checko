// Every Checko sound, synthesized with Web Audio (no files).
// Sound always means progress on a chore, so navigation makes none.
import { app } from './store.svelte'
import { NOTES, TEETH, lockFrom, onsetsFrom } from './schedule'

let ctx: AudioContext | undefined
let master: GainNode
let noise: AudioBuffer

/** Call inside a real tap. Browsers only start audio from a user gesture. */
export function unlockAudio() {
  if (!ctx) {
    // Without Web Audio the app just stays silent; haptics and visuals still work.
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    // 'ambient' follows the iPhone silent switch and keeps the user's music playing.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'ambient'
    ctx = new Ctx()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.8
    master.connect(comp).connect(ctx.destination)
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
}

const on = () => app.data.settings.sound && ctx?.state === 'running'
const now = () => ctx!.currentTime + 0.005

/** Gain node shared by one gesture, so a cancel can silence ticks already scheduled. */
export function bus(): GainNode | undefined {
  if (!on()) return
  const g = ctx!.createGain()
  g.connect(master)
  return g
}
export function hush(g?: GainNode) {
  if (!g || !ctx) return
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.002)
  setTimeout(() => g.disconnect(), 200)
}

/** Envelope: up to `peak` in half a millisecond, then exponential decay with time constant `tau` (s). */
function env(at: number, peak: number, tau: number, out: AudioNode) {
  const g = ctx!.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(peak, at + 0.0005)
  g.gain.setTargetAtTime(0, at + 0.0005, tau)
  g.connect(out)
  return g
}

function hiss(at: number, type: BiquadFilterType, f: number, q: number, peak: number, tau: number, out: AudioNode = master) {
  const src = ctx!.createBufferSource()
  src.buffer = noise
  const filter = ctx!.createBiquadFilter()
  filter.type = type
  filter.frequency.value = f
  filter.Q.value = q
  src.connect(filter).connect(env(at, peak, tau, out))
  src.start(at, Math.random() * 0.04, Math.min(0.05, tau * 8))
}

function tone(at: number, f: number, peak: number, tau: number, out: AudioNode = master, to?: number, glide = 0.045, type: OscillatorType = 'sine') {
  const o = ctx!.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + glide)
  o.connect(env(at, peak, tau, out))
  o.start(at)
  o.stop(at + tau * 8 + glide)
}

/** Tick k of the ramp: pitch climbs from 2.6 to 5 kHz as the spring winds up. */
function tick(k: number, at: number, out: AudioNode = master) {
  hiss(at, 'bandpass', 2600 + 220 * k, 5, 0.1 + 0.01 * k, 0.006, out)
  tone(at, 1200 + 100 * k, 0.05, 0.008, out)
}

function klack(at: number, out: AudioNode) {
  hiss(at, 'bandpass', 1700, 2.5, 0.3, 0.009, out)
  tone(at + 0.016, 620, 0.18, 0.018, out)
}

/** The whole ramp from `lit` teeth, scheduled at once on the audio clock. Returns the bus to cancel it. */
export function ramp(lit: number): GainNode | undefined {
  const out = bus()
  if (!out) return
  const t = now()
  onsetsFrom(lit).forEach((ms, i) => tick(lit + i, t + ms / 1000, out))
  klack(t + lockFrom(lit) / 1000, out)
  return out
}

/** Second tick of a pump stroke (the first one came with the press). */
export function pump(tooth: number) {
  if (on()) tick(Math.min(tooth, TEETH - 1), now())
}

/** The bubble bursts: a click, a rising chirp, a glass ting and the freewheel spin-down. */
export function pop(f: number) {
  if (!on()) return
  const t = now()
  hiss(t, 'highpass', 5000, 0.7, 0.15, 0.001)
  tone(t, f / 3, 0.26, 0.025, master, f)
  ting(t, f, 0.07, 0.12)
  ;[0, 46, 90, 136, 184, 238, 300, 376].forEach((ms, i) => hiss(t + ms / 1000, 'bandpass', 5000 - 371 * i, 5, 0.18 - 0.017 * i, 0.005))
}

function ting(at: number, f: number, peak: number, tau: number) {
  tone(at, f, peak, tau)
  tone(at, f * 2.76, peak * 0.3, tau) // inharmonic partial: sounds like glass
}

/** Released or slid off before the lock: the teeth unwind. */
export function unwind() {
  if (!on()) return
  const t = now() + 0.01
  ;[3000, 2400, 1800].forEach((f, i) => hiss(t + i * 0.035, 'bandpass', f, 5, 0.06, 0.004))
}

/** Tap a done task: the pop in reverse. */
export const unpop = (f: number) => on() && tone(now(), f, 0.14, 0.03, master, f / 3, 0.04)
/** New task: a bubble blows in. */
export const blub = () => on() && tone(now(), 300, 0.1, 0.03, master, 600, 0.06)
export function thup() {
  if (!on()) return
  tone(now(), 160, 0.2, 0.04)
  hiss(now(), 'lowpass', 800, 0.7, 0.1, 0.01)
}
export const lift = () => on() && hiss(now(), 'bandpass', 1200, 2, 0.08, 0.004)
export const slot = () => on() && hiss(now(), 'bandpass', 3000, 4, 0.04, 0.003)
export const tock = () => on() && tone(now(), 700, 0.12, 0.015)
export function error() {
  if (!on()) return
  tone(now(), 330, 0.08, 0.04, master, undefined, 0, 'triangle')
  tone(now() + 0.08, 247, 0.08, 0.04, master, undefined, 0, 'triangle')
}

let lastParticle = 0
/** A tiny pop for each small bubble, at most one every 25 ms. */
export function particle() {
  if (!on() || ctx!.currentTime - lastParticle < 0.025) return
  lastParticle = ctx!.currentTime
  hiss(now(), 'highpass', 6500, 0.7, 0.025 + Math.random() * 0.025, 0.001)
}

const SCALE = [...NOTES, 2093, 2349, 2637, 3136, 3520, 4186, 4699, 5274]

/** Last task of a list: one ting per finished row climbing the scale, then a big pop and a soft chord. */
export function finale(f: number, rows: number) {
  if (!on()) return
  const t = now()
  const start = Math.max(0, SCALE.indexOf(f))
  for (let i = 0; i < Math.min(rows, 12); i++) ting(t + 0.4 + i * 0.045, SCALE[Math.min(start + i, SCALE.length - 1)], 0.05, 0.12)
  tone(t + 1.1, 260, 0.22, 0.06, master, 780, 0.06)
  for (const n of [1047, 1319, 1568, 1760]) ting(t + 1.1, n, 0.05, 0.6)
  for (let i = 0; i < 8; i++) hiss(t + 1.3 + Math.random() * 2.2, 'highpass', 6500, 0.7, 0.03, 0.001)
}
