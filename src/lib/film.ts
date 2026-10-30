// The soap-film swirl behind the glass, drawn once at start on a small canvas.
// Domain-warped noise mapped onto the colour order of a draining soap film:
// gold, magenta, violet, teal, silver. Bands ("Schlieren"), not round blobs.

// Square, so the layer can rotate to any angle and still cover the screen.
const W = 240
const H = 240

// shortcut: value noise from a fixed hash, good enough for a soft backdrop; swap for a baked WebP if it ever looks cheap
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x: number, y: number) {
  return 0.5 * noise(x, y) + 0.25 * noise(x * 2.03, y * 2.03) + 0.125 * noise(x * 4.01, y * 4.01)
}

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB

export interface Palette {
  base: RGB
  bands: RGB[]
  amount: number
}
export const LIGHT: Palette = { base: hex('#EEF1F7'), bands: ['#F6D79A', '#F0A7CB', '#B5AAF0', '#94D9D5', '#E3E9F3'].map(hex), amount: 0.9 }
export const DARK: Palette = { base: hex('#0C0E1C'), bands: ['#6E4A10', '#6A1A47', '#2E2780', '#0B5552', '#373556'].map(hex), amount: 0.75 }

function bandColor(t: number, bands: RGB[]): RGB {
  const x = (((t % 1) + 1) % 1) * bands.length
  const i = Math.floor(x)
  const f = x - i
  const s = f * f * (3 - 2 * f)
  const a = bands[i]
  const b = bands[(i + 1) % bands.length]
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]
}

const cache = new Map<string, Promise<string>>()

/** Blob URL of the film image for the current colour scheme. */
export function filmUrl(dark: boolean): Promise<string> {
  const key = dark ? 'dark' : 'light'
  if (!cache.has(key)) cache.set(key, draw(dark ? DARK : LIGHT))
  return cache.get(key)!
}

function draw(p: Palette): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = (x / W) * 2.2
      const sy = (y / H) * 2.6
      const qx = fbm(sx, sy)
      const qy = fbm(sx + 5.2, sy + 1.3)
      const r = fbm(sx + 3.5 * qx + 1.7, sy + 3.5 * qy + 9.2)
      const c = bandColor(r * 2.4 + qx * 0.8, p.bands)
      // Thin film: colour where it swirls, almost bare where it has drained.
      const k = p.amount * (0.55 + 0.45 * Math.sin(r * 9 + qy * 4))
      const o = (y * W + x) * 4
      img.data[o] = p.base[0] + (c[0] - p.base[0]) * k
      img.data[o + 1] = p.base[1] + (c[1] - p.base[1]) * k
      img.data[o + 2] = p.base[2] + (c[2] - p.base[2]) * k
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : canvas.toDataURL()), 'image/png'))
}

/** Stable rotation per list, so every room has its own film. */
export function angleFor(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h) % 360
}
