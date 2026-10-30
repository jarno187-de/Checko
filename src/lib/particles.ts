// Small glass bubbles that fly out when a task pops. One fixed canvas, pre-drawn sprites,
// and an animation frame loop that runs only while bubbles are alive.
import { particle as particleSound } from './sound'

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  age: number
  drag: number
  lift: number
}

let canvas: HTMLCanvasElement | undefined
let ctx: CanvasRenderingContext2D
let parts: P[] = []
let raf = 0
let last = 0
const sprites = new Map<number, HTMLCanvasElement>()
const SIZES = [3, 5, 7, 9]

function sprite(r: number) {
  let s = sprites.get(r)
  if (s) return s
  const dpr = Math.min(devicePixelRatio, 2)
  const size = Math.ceil((r * 2 + 4) * dpr)
  s = document.createElement('canvas')
  s.width = s.height = size
  const c = s.getContext('2d')!
  c.scale(dpr, dpr)
  const m = r + 2
  // Film rim: the same colour order as the big bubble.
  const rim = c.createConicGradient?.(0, m, m)
  if (rim) ['#F2B33D', '#DB3F8A', '#6B57DB', '#19A9A4', '#F2B33D'].forEach((col, i) => rim.addColorStop(i / 4, col))
  c.beginPath()
  c.arc(m, m, r, 0, Math.PI * 2)
  c.fillStyle = 'rgb(255 255 255 / .14)'
  c.fill()
  c.lineWidth = Math.max(1, r / 4)
  c.strokeStyle = rim ?? 'rgb(255 255 255 / .8)'
  c.globalAlpha = 0.85
  c.stroke()
  c.globalAlpha = 1
  c.beginPath()
  c.arc(m - r * 0.38, m - r * 0.38, Math.max(0.8, r / 4.5), 0, Math.PI * 2)
  c.fillStyle = '#fff'
  c.fill()
  sprites.set(r, s)
  return s
}

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.className = 'particles'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  ctx = canvas.getContext('2d')!
  const fit = () => {
    const dpr = Math.min(devicePixelRatio, 2)
    canvas!.width = innerWidth * dpr
    canvas!.height = innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  fit()
  addEventListener('resize', fit)
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Fast spray of bubbles to the right and up, away from the thumb. */
export function spray(x: number, y: number, count: number) {
  ensureCanvas()
  for (let i = 0; i < count; i++) {
    const a = (rand(-15, 75) * Math.PI) / 180
    const v = rand(380, 720)
    parts.push({ x, y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, r: SIZES[i % 4], life: rand(420, 900), age: 0, drag: 4.5, lift: -90 })
  }
  start()
}

/** Slow bubbles floating up: the calm afterglow when a list is done. */
export function float(x: number, y: number, count: number) {
  ensureCanvas()
  for (let i = 0; i < count; i++) {
    const a = (rand(40, 140) * Math.PI) / 180
    const v = rand(120, 260)
    parts.push({ x: x + rand(-60, 60), y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, r: SIZES[i % 4], life: rand(1600, 2600), age: 0, drag: 1.2, lift: -140 })
  }
  start()
}

function start() {
  if (raf) return
  last = performance.now()
  raf = requestAnimationFrame(frame)
}

function frame(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000)
  last = t
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  parts = parts.filter((p) => {
    p.age += dt * 1000
    if (p.age >= p.life) {
      particleSound()
      return false
    }
    const k = Math.exp(-p.drag * dt)
    p.vx *= k
    p.vy = p.vy * k + p.lift * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    // The last 60 ms: a mini pop (grow and fade).
    const end = Math.max(0, (p.age - (p.life - 60)) / 60)
    const s = sprite(p.r)
    const size = ((p.r * 2 + 4) * (1 + 0.25 * end))
    ctx.globalAlpha = 1 - end
    ctx.drawImage(s, p.x - size / 2, p.y - size / 2, size, size)
    return true
  })
  ctx.globalAlpha = 1
  raf = parts.length ? requestAnimationFrame(frame) : 0
}
