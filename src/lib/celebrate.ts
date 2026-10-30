// What happens around a popped bubble: sound, vibration, flying bubbles, and the finale texts.
import { buzz } from './haptics'
import { float, spray } from './particles'
import { PATTERNS, burstPattern, finalePattern, note } from './schedule'
import * as sound from './sound'
import { reduced } from './store.svelte'
import type { Finish, Kind } from './model'

const center = (el: Element) => {
  const r = el.getBoundingClientRect()
  return [r.left + r.width / 2, r.top + r.height / 2] as const
}

/** A task popped. `finaleRows` > 0 when it was the last open task of its list. */
export function popEffects(el: Element, how: 'hold' | 'tap', combo: number, finaleRows = 0) {
  const f = note(combo)
  sound.pop(f)
  if (finaleRows) {
    buzz(finalePattern(finaleRows))
    sound.finale(f, finaleRows)
  } else buzz(how === 'tap' ? PATTERNS.tapCheck : burstPattern(combo))
  if (reduced()) return
  const [x, y] = center(el)
  spray(x, y, how === 'tap' ? 6 : Math.min(18, 10 + 2 * (combo - 1)))
}

/** The slow afterglow over the finished list's header. */
export function afterglow(el: Element) {
  if (reduced()) return
  const [x, y] = center(el)
  float(x, y, 24)
}

const POOL = [
  'Alles erledigt. Der Rest des Tages gehört dir.',
  'Liste leer, Kopf frei.',
  'Fertig. Du kannst die App jetzt zumachen.',
  'Zack, alles abgehakt.',
  "Geschafft. Das war's für heute.",
  'Alles weg. Gönn dir was.',
  'Erledigt. Jetzt ist Pause dran.',
  'Sauber durchgezogen.',
]
const ROOM: Record<Kind, string> = {
  zimmer: 'Zimmer fertig. Jetzt findest du alles wieder.',
  waesche: 'Wäsche erledigt. Bis zur nächsten einzelnen Socke.',
  hausaufgaben: 'Hausaufgaben fertig. Feierabend.',
  spuelmaschine: 'Spülmaschine erledigt. Bis sie wieder voll ist.',
}
const KEYWORDS: [RegExp, Kind][] = [
  [/zimmer/i, 'zimmer'],
  [/wäsche|waesche/i, 'waesche'],
  [/hausaufgabe/i, 'hausaufgaben'],
  [/spülmaschine|spuelmaschine|geschirr/i, 'spuelmaschine'],
]
const recent: string[] = []

/** Finish message: the room's own line, otherwise one from the pool that wasn't among the last three. */
export function finishMessage(title: string, kind?: Kind): string {
  const k = kind ?? KEYWORDS.find(([re]) => re.test(title))?.[1]
  if (k) return ROOM[k]
  const options = POOL.filter((m) => !recent.includes(m))
  const pick = options[Math.floor(Math.random() * options.length)]
  recent.push(pick)
  if (recent.length > 3) recent.shift()
  return pick
}

export function duration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min >= 1) return min === 1 ? '1 Minute' : `${min} Minuten`
  const s = Math.max(1, Math.round(ms / 1000))
  return s === 1 ? '1 Sekunde' : `${s} Sekunden`
}

/** Results as plain sentences. A slower round gets no comparison at all. */
export function finishLines(f: Finish): string[] {
  const lines = [`${f.count} ${f.count === 1 ? 'Aufgabe' : 'Aufgaben'} in ${duration(f.ms)}.`]
  if (f.first) lines.push('Erste Runde. Die Zeit merkt sich Checko fürs nächste Mal.')
  else if (f.beatBy) lines.push(`Neue Bestzeit: ${duration(f.beatBy)} schneller als letztes Mal.`)
  return lines
}
