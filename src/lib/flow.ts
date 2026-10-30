// The soap film, alive: the same domain-warped bands as film.ts, drawn by the GPU every frame
// with time in the warp, so the Schlieren slowly drift and reshape instead of rotating.
// stir() gives the flow a push that swells and fades smoothly, never as a hard cut.
import { LIGHT, DARK, type Palette } from './film'

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

const FRAG = `precision mediump float;
uniform vec2 size;uniform float t;uniform float warp;
uniform vec3 base;uniform vec3 bands[5];uniform float amount;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  float a=mix(mix(hash(i),hash(i+vec3(1,0,0)),u.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y);
  float b=mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y);
  return mix(a,b,u.z);}
float fbm(vec2 p,float z){return .5*noise(vec3(p,z))+.25*noise(vec3(p*2.03,z*1.3))+.125*noise(vec3(p*4.01,z*1.7));}
vec3 band(float x){x=fract(x)*5.;float i=floor(x);float f=x-i;f=f*f*(3.-2.*f);
  vec3 a=bands[4],b=bands[0];
  if(i<.5){a=bands[0];b=bands[1];}else if(i<1.5){a=bands[1];b=bands[2];}
  else if(i<2.5){a=bands[2];b=bands[3];}else if(i<3.5){a=bands[3];b=bands[4];}
  return mix(a,b,f);}
void main(){
  // Time is a third noise dimension: the puddles reshape where they are, nothing slides or turns.
  vec2 p=(gl_FragCoord.xy-.5*size)/max(size.x,size.y)*1.5+vec2(1.1,1.3);
  vec2 q=vec2(fbm(p,t),fbm(p+vec2(5.2,1.3),t+3.1));
  float r=fbm(p+warp*q+vec2(1.7,9.2),t*.7+7.4);
  vec3 col=band(r*2.4+q.x*.8);
  float k=amount*(.55+.45*sin(r*9.+q.y*4.));
  gl_FragColor=vec4(mix(base,col,k),1.);
}`

const rgb = (c: number[]) => c.map((v) => v / 255)

let energy = 0

/** A push for the flow: 0.3 for a small action, 1.5 for the finale. */
export function stir(amount: number) {
  energy = Math.min(1.5, energy + amount)
}

/** Starts drawing into the canvas. Returns a cleanup, or null when WebGL is missing. */
export function startFlow(canvas: HTMLCanvasElement, opts: { dark: () => boolean; still: () => boolean }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
  if (!gl) return null
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (name: string) => gl.getUniformLocation(prog, name)

  const palette = (p: Palette) => {
    gl.uniform3fv(u('base'), rgb(p.base))
    gl.uniform3fv(u('bands'), p.bands.flatMap(rgb))
    gl.uniform1f(u('amount'), p.amount)
  }

  // The film is soft, so a quarter of the pixels is plenty and saves battery.
  const fit = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth / 3))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight / 3))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(u('size'), canvas.width, canvas.height)
  }

  let t = 40 // start mid-flow, not at the noise origin
  let speed = 1
  let breath = 0
  let last = performance.now()
  let raf = 0
  let wasDark: boolean | undefined

  const draw = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const dark = opts.dark()
    if (dark !== wasDark) palette(dark ? DARK : LIGHT), (wasDark = dark)
    // Energy fades over ~1.5 s; speed follows it with its own lag, so a push swells in and out.
    energy *= Math.exp(-dt / 1.5)
    speed += (1 + 3 * energy - speed) * (1 - Math.exp(-dt / 0.5))
    t += dt * speed * 0.05
    // Breathing: the warp swells and settles slowly, and a push makes it breathe much deeper.
    breath += dt * (0.5 + 0.4 * (speed - 1))
    gl.uniform1f(u('t'), t)
    gl.uniform1f(u('warp'), 3.5 + 0.35 * Math.sin(breath) + 0.9 * (speed - 1) ** 0.8)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // shortcut: 30 frames a second is smooth for something this slow; raise to 60 if it ever looks steppy
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (now - last < 32) return
    draw(now)
  }
  const resize = () => {
    fit()
    draw(performance.now())
  }

  fit()
  draw(last)
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  // Weniger Bewegung: one still frame, redrawn only when something changes.
  const run = () => {
    cancelAnimationFrame(raf)
    if (opts.still()) draw(performance.now())
    else raf = requestAnimationFrame(loop)
  }
  run()
  return { run, stop: () => (cancelAnimationFrame(raf), observer.disconnect()) }
}
