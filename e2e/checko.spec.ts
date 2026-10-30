import { expect, test, type Locator, type Page } from '@playwright/test'

/** Skip onboarding with an empty, already-onboarded store. */
async function seed(page: Page, settings = {}) {
  await page.addInitScript((settings) => {
    if (localStorage.getItem('checko:v1')) return
    localStorage.setItem(
      'checko:v1',
      JSON.stringify({ version: 1, onboarded: true, lists: [], tasks: [], events: [], settings, total: 0, features: { cryptoStake: false } }),
    )
  }, settings)
}

async function openRoom(page: Page, settings = {}) {
  await seed(page, settings)
  await page.goto('/')
  await page.getByRole('button', { name: 'Zimmer aufräumen', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zimmer aufräumen' })).toBeVisible()
  await settled(page)
}

/** Waits until the screen change (View Transition) has finished.
 *  Playwright's Windows WebKit crashes on DOM changes during one; real Safari does not need this. */
async function settled(page: Page) {
  // Two frames first: the transition starts a frame after the click.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForFunction(() => !document.getAnimations().some((a) => (a.effect as KeyframeEffect | null)?.pseudoElement?.includes('view-transition')))
}

const bubble = (page: Page, task: string) => page.getByRole('checkbox', { name: task })

async function hold(page: Page, target: Locator, ms: number) {
  await target.hover()
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

test('first run: tap, hold, pick a room', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Tipp die Blase an.')).toBeVisible()
  const practice = page.getByRole('checkbox', { name: 'Übungsblase' })
  await practice.click()
  await expect(page.getByText(/Jetzt gedrückt halten/)).toBeVisible()
  await hold(page, practice, 1300)
  await expect(page.getByText('Genau so.')).toBeVisible()
  await page.getByRole('button', { name: 'Wäsche' }).click()
  await expect(page.getByRole('heading', { name: 'Wäsche' })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(6)
})

test('hold until it clicks completes, an early release does not', async ({ page }) => {
  await openRoom(page)
  await hold(page, bubble(page, 'Bett machen'), 1250)
  await expect(bubble(page, 'Bett machen')).toHaveAttribute('aria-checked', 'true')
  await hold(page, bubble(page, 'Lüften'), 400)
  await page.waitForTimeout(200)
  await expect(bubble(page, 'Lüften')).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('5 offen')).toBeVisible()
})

test('six quick taps pump the bubble until it pops', async ({ page }) => {
  await openRoom(page)
  const b = bubble(page, 'Staubsaugen')
  const box = (await b.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  // Raw mouse events: locator.click() waits for stability and can take longer than the 800 ms pump window.
  for (let i = 0; i < 6; i++) {
    if (i === 5) await expect(b).toHaveAttribute('aria-checked', 'false')
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(90)
  }
  await expect(b).toHaveAttribute('aria-checked', 'true')
})

test('keyboard: Enter completes, Enter again reopens', async ({ page }) => {
  await openRoom(page)
  const b = bubble(page, 'Lüften')
  await b.focus()
  await page.keyboard.press('Enter')
  await expect(b).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Enter')
  await expect(b).toHaveAttribute('aria-checked', 'false')
})

test('finishing every task shows the finish card, and data survives a reload', async ({ page }) => {
  await openRoom(page, { mode: 'tap' }) // tap mode makes this quick
  for (const t of ['Bett machen', 'Klamotten wegräumen', 'Schreibtisch frei machen', 'Müll rausbringen', 'Staubsaugen', 'Lüften']) await bubble(page, t).click()
  await expect(page.getByText('Zimmer fertig. Jetzt findest du alles wieder.')).toBeVisible()
  await expect(page.getByText('Erste Runde.', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Fertig')).toBeVisible()
  await expect(page.getByText('Bisher 6 Aufgaben erledigt.')).toBeVisible()
})

test('add, rename and delete with undo', async ({ page }) => {
  await openRoom(page)
  const input = page.getByRole('textbox', { name: 'Neue Aufgabe' })
  await input.fill('Fenster putzen')
  await input.press('Enter')
  await expect(bubble(page, 'Fenster putzen')).toBeVisible()
  await page.getByRole('button', { name: '„Fenster putzen“ bearbeiten' }).click()
  await page.getByRole('textbox', { name: 'Name der Aufgabe' }).fill('Fenster richtig putzen')
  await page.getByRole('button', { name: 'Fertig', exact: true }).click()
  await expect(bubble(page, 'Fenster richtig putzen')).toBeVisible()
  await page.getByRole('button', { name: '„Fenster richtig putzen“ bearbeiten' }).click()
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await expect(bubble(page, 'Fenster richtig putzen')).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(bubble(page, 'Fenster richtig putzen')).toBeVisible()
})

test('android vibrates the accelerating ramp as one pattern', async ({ page }, info) => {
  test.skip(info.project.name !== 'android', 'vibration only on Android')
  await page.addInitScript(() => {
    const calls: unknown[] = []
    ;(window as unknown as { vib: unknown[] }).vib = calls
    navigator.vibrate = (p: VibratePattern) => (calls.push(p), true)
  })
  await openRoom(page)
  await hold(page, bubble(page, 'Bett machen'), 1250)
  const calls = await page.evaluate(() => (window as unknown as { vib: unknown[] }).vib)
  expect(calls[0]).toEqual([10, 140, 10, 123, 10, 107, 10, 94, 10, 82, 12, 69, 12, 60, 12, 52, 12, 44, 14, 36, 14, 30, 14, 30, 24])
  expect(calls[1]).toEqual([16, 30, 14, 30, 14, 32, 12, 36, 12, 42, 10, 52, 10, 66, 10])
})

test('works offline after the first visit', async ({ page, context }, info) => {
  test.skip(info.project.name === 'iphone', 'service workers are flaky in Playwright WebKit on Windows')
  await openRoom(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Zimmer aufräumen')).toBeVisible()
  await context.setOffline(false)
})

// A 1×1 PNG stands in for the camera photo; Gemini is mocked, so nothing leaves the machine.
// Service workers are blocked here: in WebKit, requests through one skip Playwright's mock.
const PHOTO = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }

async function photoCheck(page: Page, verdict: { done: boolean; reason: string }) {
  const sent: string[] = []
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    sent.push(route.request().url(), route.request().headers()['x-goog-api-key'] ?? '')
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(verdict) }] } }] } })
  })
  await page.addInitScript(() => localStorage.setItem('checko:gemini-key', 'test-key-checko'))
  await openRoom(page, { mode: 'tap' })
  const b = bubble(page, 'Bett machen, erst ein Foto machen')
  const chooser = page.waitForEvent('filechooser')
  await b.click()
  await (await chooser).setFiles(PHOTO)
  return sent
}

test.describe('photo check', () => {
test.use({ serviceWorkers: 'block' })

test('photo check: Gemini says done, the bubble unlocks and pops', async ({ page }) => {
  const sent = await photoCheck(page, { done: true, reason: 'Das Bett ist gemacht.' })
  await expect(page.getByText('Das Bett ist gemacht.')).toBeVisible()
  expect(sent[0]).toContain('gemini-3.1-flash-lite:generateContent')
  expect(sent[1]).toBe('test-key-checko')
  await bubble(page, 'Bett machen').click()
  await expect(bubble(page, 'Bett machen')).toHaveAttribute('aria-checked', 'true')
})

test('photo check: Gemini says not yet, the bubble stays locked', async ({ page }) => {
  await photoCheck(page, { done: false, reason: 'Auf dem Bett liegen noch Klamotten.' })
  await expect(page.getByText('Noch nicht ganz: Auf dem Bett liegen noch Klamotten.')).toBeVisible()
  await expect(bubble(page, 'Bett machen, erst ein Foto machen')).toHaveAttribute('aria-checked', 'false')
  // Tasks you can't photograph work as before.
  await bubble(page, 'Lüften').click()
  await expect(bubble(page, 'Lüften')).toHaveAttribute('aria-checked', 'true')
})

})

test('the Gemini key never ends up in a backup', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('checko:gemini-key', 'test-key-checko'))
  await openRoom(page)
  const backup = await page.evaluate(() => localStorage.getItem('checko:v1'))
  expect(backup).not.toContain('test-key-checko')
})

// Playwright's WebKit has no <input switch>, so the iPhone tick overlay never runs there.
// This forces that code path in Chromium: a label over every tappable thing, echoing taps onto a switch.
test.describe('iPhone tick overlay', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'forced in Chromium only')
    await page.addInitScript(() => {
      Object.defineProperty(HTMLInputElement.prototype, 'switch', { value: false, writable: true, configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 })
    })
  })

  test('a quick tap pumps instead of completing, holding still completes', async ({ page }) => {
    await openRoom(page)
    await expect(page.locator('.ios-tick').first()).toBeAttached()
    const b = bubble(page, 'Bett machen')
    await b.click()
    await expect(b.locator('.tooth.lit')).toHaveCount(2)
    await expect(b).toHaveAttribute('aria-checked', 'false')
    await hold(page, bubble(page, 'Lüften'), 1250)
    await page.waitForTimeout(300)
    await expect(bubble(page, 'Lüften')).toHaveAttribute('aria-checked', 'true')
  })

  test('tap mode: one tap completes and stays done', async ({ page }) => {
    await openRoom(page, { mode: 'tap' })
    await bubble(page, 'Lüften').click()
    await page.waitForTimeout(300)
    await expect(bubble(page, 'Lüften')).toHaveAttribute('aria-checked', 'true')
  })

  test('buttons under the overlay still work', async ({ page }) => {
    await openRoom(page)
    const input = page.getByRole('textbox', { name: 'Neue Aufgabe' })
    await input.fill('Fenster putzen')
    // force: click the spot, so the overlay label on top gets the tap, as on a phone
    await page.getByRole('button', { name: 'Hinzufügen' }).click({ force: true })
    await expect(bubble(page, 'Fenster putzen')).toBeVisible()
    await page.getByRole('button', { name: 'Zurück zu den Listen' }).click()
    await expect(page.getByRole('heading', { name: 'Checko' })).toBeVisible()
    await settled(page)
    await page.getByRole('button', { name: 'Einstellungen' }).click({ force: true })
    await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible()
  })
})
