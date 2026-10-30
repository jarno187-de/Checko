// Photo check: for tasks you can see (a made bed, a cleared desk) Gemini looks at a photo
// before the bubble may pop. The API key stays in this browser's localStorage and goes
// only to Google, in a request header. Photos go only to Google, only when one is taken.

/** Cheapest current Gemini model that reads images (Oct 2026: $0.25 / 1M input tokens). */
export const MODEL = 'gemini-3.1-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const STORE = 'checko:gemini-key' // kept apart from the list data, so backups never contain it

function read() {
  try {
    return localStorage.getItem(STORE) ?? ''
  } catch {
    return ''
  }
}

export const gemini = $state({ key: read() })

export function saveKey(key: string) {
  gemini.key = key.trim()
  try {
    if (gemini.key) localStorage.setItem(STORE, gemini.key)
    else localStorage.removeItem(STORE)
  } catch {
    // Storage blocked: the key works until the page closes.
  }
}

export interface Verdict {
  done: boolean
  reason: string
}

export type GeminiProblem = 'key' | 'quota' | 'offline' | 'other'
export class GeminiError extends Error {
  constructor(public problem: GeminiProblem) {
    super(problem)
  }
}

/** Validates the model's answer (untrusted text) into a Verdict. */
export function readVerdict(text: string): Verdict | null {
  try {
    const v = JSON.parse(text) as Record<string, unknown>
    if (typeof v?.done !== 'boolean') return null
    const reason = typeof v.reason === 'string' ? v.reason.trim().replace(/\s+/g, ' ').slice(0, 160) : ''
    return { done: v.done, reason }
  } catch {
    return null
  }
}

/** Shrinks the photo to at most 768 px (fewer image tokens, faster upload) and returns base64 JPEG. */
async function shrink(file: Blob): Promise<string> {
  let img: CanvasImageSource & { width: number; height: number }
  try {
    img = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const el = new Image()
    el.src = URL.createObjectURL(file)
    await el.decode().finally(() => URL.revokeObjectURL(el.src))
    img = el
  }
  const k = Math.min(1, 768 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * k)
  canvas.height = Math.round(img.height * k)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.72))
  if (!blob) throw new GeminiError('other')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

const SYSTEM = `Du prüfst Beweisfotos für die Aufgaben-App Checko. Jemand sagt, eine Aufgabe ist erledigt, und schickt ein Foto.
Entscheide fair, ob das Foto plausibel zeigt, dass genau diese Aufgabe erledigt ist. Unordnung, die nicht zur Aufgabe gehört, ist egal.
Ist auf dem Foto nichts Passendes zu sehen, ist die Aufgabe nicht erledigt.
reason: ein kurzer Satz auf Deutsch, freundlich und direkt an die Person (du), ohne Entschuldigung. Bei nicht erledigt: was noch fehlt.`

function body(image: string, task: string, list: string, thinking: boolean) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Aufgabe: „${task}“ (Liste: „${list}“). Ist sie erledigt?` }, { inlineData: { mimeType: 'image/jpeg', data: image } }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { done: { type: 'BOOLEAN' }, reason: { type: 'STRING' } }, required: ['done', 'reason'] },
      maxOutputTokens: 256,
      ...(thinking && { thinkingConfig: { thinkingLevel: 'minimal' } }),
    },
    store: false,
  })
}

export async function checkPhoto(file: Blob, task: string, list: string): Promise<Verdict> {
  if (!gemini.key) throw new GeminiError('key')
  if (!navigator.onLine) throw new GeminiError('offline')
  const image = await shrink(file)
  const send = (thinking: boolean) =>
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemini.key },
      body: body(image, task, list, thinking),
    })
  let res: Response
  try {
    res = await send(true)
    // Not every model takes the thinking setting; ask once more without it.
    if (res.status === 400 && /thinking/i.test(await res.clone().text())) res = await send(false)
  } catch {
    throw new GeminiError(navigator.onLine ? 'other' : 'offline')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID|API key not valid/i.test(text)) throw new GeminiError('key')
    if (res.status === 429) throw new GeminiError('quota')
    throw new GeminiError('other')
  }
  const data = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  const verdict = readVerdict(text)
  if (!verdict) throw new GeminiError('other')
  return verdict
}

export const PROBLEM_TEXT: Record<GeminiProblem, string> = {
  key: 'Der Gemini-Schlüssel stimmt nicht. Prüf ihn in den Einstellungen.',
  quota: 'Gemini hat gerade zu viele Anfragen. Versuch es in einer Minute nochmal.',
  offline: 'Du bist offline. Ohne Netz kann Gemini nicht aufs Foto schauen.',
  other: 'Gemini hat gerade nicht geantwortet. Versuch es nochmal.',
}
