// Real glass refraction for two small fixed-size surfaces, Chromium only.
// Safari and Firefox accept `backdrop-filter: url(#…)` but draw nothing (so @supports lies);
// there the frosted glass from app.css stays. Every iOS browser is WebKit, so iPhones get frost.

const SURFACES = [
  { id: 'lens-pill', w: 184, h: 52, r: 26 },
  { id: 'lens-circle', w: 44, h: 44, r: 22 },
]

/** Displacement map: rim pixels sample from further inside (a convex lens edge), the centre stays clear. */
function map(w: number, h: number, r: number): string {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const bezel = Math.min(14, h / 2)
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - w / 2) - (w / 2 - r)
    const qy = Math.abs(y - h / 2) - (h / 2 - r)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const inside = -sdf(px, py)
      let dx = 0
      let dy = 0
      if (inside > 0 && inside < bezel) {
        const nx = sdf(px + 1, py) - sdf(px - 1, py)
        const ny = sdf(px, py + 1) - sdf(px, py - 1)
        const len = Math.hypot(nx, ny) || 1
        const m = (1 - inside / bezel) ** 2
        dx = (-nx / len) * m
        dy = (-ny / len) * m
      }
      const o = (y * w + x) * 4
      img.data[o] = 128 + dx * 127
      img.data[o + 1] = 128 + dy * 127
      img.data[o + 2] = 128
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

export function setupLens() {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands
  if (!brands?.some((b) => b.brand === 'Chromium')) return
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  for (const s of SURFACES) {
    const filter = document.createElementNS(ns, 'filter')
    filter.id = s.id
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const img = document.createElementNS(ns, 'feImage')
    img.setAttribute('href', map(s.w, s.h, s.r))
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: s.w, height: s.h, result: 'map', preserveAspectRatio: 'none' })) img.setAttribute(k, String(v))
    const disp = document.createElementNS(ns, 'feDisplacementMap')
    for (const [k, v] of Object.entries({ in: 'SourceGraphic', in2: 'map', scale: 24, xChannelSelector: 'R', yChannelSelector: 'G' })) disp.setAttribute(k, String(v))
    filter.append(img, disp)
    svg.append(filter)
  }
  document.body.prepend(svg)
  // Only now: referencing the filter before it exists flashes the surface transparent in Chromium.
  document.documentElement.dataset.lens = ''
}
