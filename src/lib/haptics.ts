// Tap haptics on three kinds of devices:
// - Android Chrome: navigator.vibrate with short pulses (after the first tap on the page).
// - iPhone (iOS 26.5+): scripts can't vibrate. Only a REAL tap on a <label> wired to a native
//   <input type=checkbox switch> gives one system tick. iosTick() puts such a label over an element.
// - iPad and desktop: nothing to vibrate; sound and visuals carry the feedback.
import { app } from './store.svelte'

// Desktop Chrome has a vibrate() that does nothing, hence the coarse-pointer check.
export const canVibrate = typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches
export const iosTicks = !canVibrate && navigator.maxTouchPoints > 0 && 'switch' in HTMLInputElement.prototype

export function buzz(pattern: number | number[]) {
  if (!canVibrate || !app.data.settings.vibration) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Blocked before the first tap ("Intervention"); nothing to do.
  }
}

export const stopBuzz = () => canVibrate && navigator.vibrate(0)

/**
 * Svelte action: lays an invisible label over `node`, wired to a hidden native switch.
 * A real tap on it toggles the switch and iOS plays its tick. To skip a tick, call
 * preventDefault() on the click (the switch then doesn't toggle).
 */
export function iosTick(node: HTMLElement) {
  if (!iosTicks) return
  const label = document.createElement('label')
  label.className = 'ios-tick'
  label.setAttribute('aria-hidden', 'true')
  const sw = document.createElement('input')
  sw.type = 'checkbox'
  sw.setAttribute('switch', '')
  sw.tabIndex = -1
  // The label re-dispatches a click on the switch. This stops it bubbling; capture listeners
  // on the host still see it and must skip clicks whose target is an <input>.
  sw.addEventListener('click', (e) => e.stopPropagation())
  label.addEventListener('click', (e) => {
    if (!app.data.settings.vibration) e.preventDefault()
    // The label covers a wrapped button, so the tap never reaches it: pass it on (still inside the gesture).
    const button = node.querySelector<HTMLElement>(':scope > button')
    if (button) {
      e.stopPropagation()
      button.click()
    }
  })
  label.append(sw)
  node.append(label)
  return { destroy: () => label.remove() }
}
