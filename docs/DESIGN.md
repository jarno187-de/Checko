# Checko — Design

Richtung: **Seifenfilm**. Jede Aufgabe ist eine Glas-Seifenblase. Halten pustet sie auf, zwölf Zähne ticken immer schneller, loslassen lässt sie platzen.

Diese Datei hält die Design-Spec fest, nach der Checko gebaut ist. Die Spec-Abschnitte unten stammen aus dem Design-Panel (englisch, unverändert). Wo der Code bewusst abweicht, steht es in „Änderungen gegenüber der Spec“.

## Änderungen gegenüber der Spec

- **Pump-Modus (Wunsch für iPhone):** Ein kurzer Tipp (unter 150 ms) auf die Blase ist ein Pumpstoß. Zwei Zähne leuchten, die Blase wächst, es klickt. Auf dem iPhone gibt jeder echte Tipp einen echten Taptic-Tick, auf Android `vibrate(12)`. Sechs Tipps lassen die Blase platzen. Nach 800 ms Pause läuft alle 250 ms ein Zahn wieder aus. Halten lädt ab dem aktuellen Stand weiter. Darum gibt es keinen Hinweis „Länger halten“: ein kurzer Tipp ist kein Fehler, sondern Pumpen.
- **Raum wird heller (aus Richtung „Lichtwechsel“):** Über dem Seifenfilm liegt eine Waschschicht. Ihre Deckkraft ist `0.35 × erledigt / gesamt` (600 ms, nur opacity). Das Finale spült auf „blitzblank“.
- **Text wird schmal (aus Richtung „Federglas“):** Beim Laden schrumpft die Breitenachse des Aufgabentexts von `wdth` 100 auf 90. Beim Platzen federt sie 90 → 106 → 100.
- **Seifenfilm-Bild:** Kein vorgerendertes WebP. `src/lib/film.ts` erzeugt die Schlieren beim Start auf einem kleinen Canvas (Domain-Warp-Noise) und skaliert per CSS hoch.
- **Löschen:** Kein Wischen. Tipp auf den Aufgabentext öffnet ein Sheet mit Umbenennen und Löschen, danach ein Toast mit „Rückgängig“.
- **Foto-Check (Wunsch):** Aufgaben, die man sehen kann, sind mit einem Gemini-Schlüssel gesperrt. Die Blase zeigt eine Kamera und gestrichelte Zähne. Ein Tipp öffnet die Kamera; während Gemini schaut, dreht sich der Zahnkranz. Bei „erledigt“ ist die Blase frei und platzt wie immer. Bei „noch nicht“ erklärt ein Toast, was fehlt, mit „Neues Foto“.
- **Abhaken-Einstellung:** „Halten oder Pumpen“ (Standard) oder „Antippen“.

## Bewertung der drei Richtungen

| Richtung | Brief | Eigen | Baubar | Fair | Zugänglich | Summe |
|---|---|---|---|---|---|---|
| Seifenfilm | 9 | 9 | 7 | 9 | 8 | 42 |
| Federglas | 8 | 8 | 8 | 9 | 8 | 41 |
| Lichtwechsel | 7 | 6 | 9 | 8 | 8 | 38 |

Seifenfilm gewinnt: Putzen ist Seife, und Liquid Glass ist hier das Material selbst. Die zwölf Ticks treffen das gewünschte Tick-Tick am besten.

## Konzept

In Checko every chore is a small glass soap bubble. Holding a bubble blows it up. A ring of 12 teeth ticks faster and faster, and the film runs through the colour order of a draining soap film: gold, magenta, violet, teal. Then it turns silver, which is what a real bubble does just before it bursts. When you let go it pops into a spray of tiny bubbles and leaves a check. Liquid Glass is not decoration here; it is the material of the subject itself (soap, water, glass, clean). The iridescent film is the only colour in the app. All the game feel (anticipation, squash and stretch, recoil, a combo pitch ladder) goes into this one charge-and-pop moment. Everything else stays as quiet as Apple Reminders. Lists are rooms you can replay in rounds and try to finish faster. There are no streaks you can lose.

## Palette

- **Kalkweiß** `#EEF1F7` — Light base under the film image (a cool limescale white, not cream). Also the 'blitzblank' wash after a list is finished.
- **Nachtlauge** `#0C0E1C` — Dark base, a deep ink blue rather than neutral near-black. Also the dark 'blitzblank' wash.
- **Tinte** `#151726` — Primary text in light mode, the done-disc fill in light mode, and the inner 2px of the focus ring (outer 2px is white, so it shows on any backdrop).
- **Tinte leise** `#4E5266` — Secondary text and done-task text in light mode. Calculated at about 5.3:1 over a faux-glass row on the worst (magenta) film band.
- **Schaum** `#F5F7FC` — Primary text in dark mode and the done-disc fill in dark mode.
- **Schaum leise** `#B9BED0` — Secondary text in dark mode. Calculated at about 6:1 over a dark row on the deep-gold band.
- **Film Gold** `#F2B33D` — Charge teeth 1-3, a backdrop band and a particle rim tint. Decorative only, never used for text.
- **Film Magenta** `#DB3F8A` — Charge teeth 4-6 and a backdrop band. Decorative only.
- **Film Violett** `#6B57DB` — Charge teeth 7-9 and a backdrop band. Decorative only.
- **Film Türkis** `#19A9A4` — Charge teeth 10-12 and a backdrop band. Decorative only.
- **Schwarzfilm-Silber** `#DDE4EF` — The armed ring (the film just before it bursts), the shock ring, done dots in the header bubble strip, and the ring of a finished ('blitzblank') list.
- **Glas hell** `#FFFFFF8F` — Fill of real glass surfaces in light mode with the Klar setting, plus blur(18px) saturate(180%). Getönt uses #FFFFFFC7.
- **Glas dunkel** `#181A2C8C` — Fill of real glass surfaces in dark mode with the Klar setting. Getönt uses #181A2CC7. Solide uses #1A1C2E with no backdrop-filter.
- **Zeile** `#FFFFFFB8` — Fill of the faux-glass row sheets in light mode (no backdrop-filter). Dark mode uses #181A2CB3.
- **Rand-Licht** `#FFFFFFB3` — Inset top rim highlight on all glass, with a lower rim of #FFFFFF26 and a 0.5px edge of #FFFFFF59.
- **Kirsche** `#C4314B` — Error rim and icon, and the background behind the swipe 'Löschen' action (white text on it is about 5.4:1). Never used for large areas.

## Hintergrund

SEIFENFILM LAYER (shared by light and dark mode)
- What it is: a position:fixed layer with inset -30% and z-index below the app. It is a SIBLING of the app root, never an ancestor of any glass, so it does not create a Backdrop Root.
- Content: one pre-rendered soap-film swirl image per theme. Make it once offline: domain-warped noise mapped onto the draining-film order (gold, magenta, violet, blue-teal, silver), blurred about 24px, 1080x1920 WebP of roughly 40-60KB. A real film has swirl bands ('Schlieren'), not round blobs. That is what stops it reading as a stock mesh gradient.
- Every room gets its own film from the same asset: rotate and offset the image by a hash of the list id. No extra files are needed. The overview uses a neutral crop.
- Idle motion: rotate 360deg per 15 minutes, transform only, barely noticeable. Pause it when the tab is hidden. Keep it static under reduced motion.
- Fallback until the asset exists: 4 radial-gradients in the film colours plus 1 faint conic-gradient sweep.

LIGHT MODE
- Kalkweiß #EEF1F7 base with the swirl at 90% opacity.
- Pastel bands with the film colours at about L 72-88.
- A silver band runs diagonally from the top left, so the header glass catches a highlight.

DARK MODE
- Nachtlauge #0C0E1C base.
- The same swirl at about L 18-32: deep gold #6E4A10, plum #6A1A47, indigo #2E2780, deep teal #0B5552.
- One lighter lavender streak (#8C83C9 at 25%), so glass rims have something to catch.

STATE CHANGES
- 'Spülgang' rinse when a list is finished (see signature moment): the film layer rotates +40deg and scales 1.6 to 1.7 over 1200ms. A white wash goes from 0 to 0.12 and back to 0 opacity. Only transform and opacity change.
- After that, a 'blitzblank' wash of Kalkweiß (dark: Nachtlauge) at 35% fades in over 1200ms and stays until 'Neue Runde starten'. A finished room looks calmer.

GLASS RECIPE
- Real glass, at most 3 visible at once: the header bar (it frosts in on scroll), the docked input pill, the combo pill, and sheets. Hide the combo pill while a sheet is open.
  - Style: fill, backdrop-filter: blur(18px) saturate(180%), box-shadow: inset 0 1px 0 #FFFFFFB3, inset 0 -1px 0 #FFFFFF26, inset 0 0 0 .5px #FFFFFF59, 0 10px 28px -14px #15172640.
  - Specular sheen: an ::after linear-gradient(115deg, transparent, #FFFFFF40, transparent) that moves only during moments, never in an idle loop.
- Chromium only, behind @supports: SVG refraction (backdrop-filter: url(#lens)) on the 'Neue Liste' pill and the input pill only. Safari keeps the frost.
- Faux glass (row sheets, overview sheet): Zeile fill plus the same inset rims. No backdrop-filter.
- Radius by object, not one radius for everything: pills 999px, sheets and cards 22px, bubbles round, the settings gear a 44px circle.
- Glas setting: Klar as above, Getönt (fill alpha .78, blur 24px), Solide (opaque, rims kept).
- Never put opacity, filter or will-change on a glass ancestor. Page changes use View Transitions, so #app is never faded.

## Typografie

FAMILY: Mona Sans (variable: wght 200-900, wdth 75-125). Licence: SIL OFL 1.1, from GitHub or Google Fonts.
- Self-host one subset WOFF2: Latin, Latin-1 Supplement, plus „“–… and ß (estimated 60-80KB).
- font-display: swap and preload.
- Fallback stack: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif. Add an @font-face fallback with size-adjust and ascent-override so the swap does not shift the layout.

WHY ONE FAMILY: the personality comes from the width axis. Wide and heavy for the brand and room names, normal width for reading. Width is animated as squash and stretch when a number changes. It also fits long German compounds by narrowing them instead of truncating them.

SCALE (rem at a 16px root; steps 13/15/16/17/19/22/28/34)
- Wordmark 'Checko' (overview title): 2.125rem (34px), wght 850, wdth 125, tracking -0.03em, line-height 1.0.
- Large title (list name): 2.125rem, wght 760, wdth 112, tracking -0.025em, line-height 1.05.
  - Long compounds such as 'Spülmaschine ausräumen': measure once on render and step wdth down to 82 before wrapping.
  - After that, hyphens:auto with lang="de".
- Finish message: 1.75rem (28px), wght 720, wdth 108, tracking -0.02em, line-height 1.15.
- Title 2 (the 'Erledigt' header, sheet titles, settings sections): 1.375rem (22px), wght 700, wdth 100, tracking -0.01em, line-height 1.2.
- Overview room name: 1.5rem (24px), wght 720, wdth 108, tracking -0.015em.
- Task row: 1.1875rem (19px), wght 560, wdth 100, tracking -0.005em, line-height 1.3.
  - Done row: wght 440, Tinte leise colour, 1.5px strike.
  - The weight drop is animated: the text 'deflates'.
- Counter '4 offen': the digit is 1.375rem, wght 800, font-variant-numeric: tabular-nums, in a min-width 2ch box. Its wdth animates 125 to 100 on change. The word is 1.0625rem, wght 560.
- Buttons: 1.0625rem (17px), wght 650, wdth 104.
- Body and hints: 1rem (16px), wght 450, line-height 1.45, max 60ch.
- Secondary: 0.9375rem (15px), wght 500.
- Small: 0.8125rem (13px), wght 560, tracking +0.01em. Nothing smaller.

RULES
- Sentence case everywhere. No all-caps, no monospace, no eyebrow labels.
- Text is left-aligned, except the onboarding bubble stage.
- iOS Dynamic Type: set html { font: -apple-system-body } and then override font-family. rem then follows the user's iOS text size. Test the layout at 200%.

## Screens

```text
General: left-aligned, 16px side gutters plus safe-area insets, every touch target at least 44px.

ONBOARDING 1: tap (this is the activation unlock)
One bubble, one instruction. The first tap's pointerup resumes the AudioContext, makes the first Android vibrate possible, and gives the first real iPhone tick.
┌──────────────────────────────────┐
│ Checko                           │ wordmark 34px, wdth 125
│ Jede erledigte Aufgabe           │ 19px
│ macht Plopp.                     │
│                                  │
│            .-''''-.              │
│           (   ()   )             │ 120px glass bubble, ring of
│            '-....-'              │ 12 teeth, film rim
│                                  │
│ Tipp die Blase an.               │ 19px
└──────────────────────────────────┘
On the tap, the bubble wobbles, 1 tooth lights and unwinds, and the copy changes.

ONBOARDING 2: hold
The same stage. Copy: 'Jetzt gedrückt halten, bis es klackt.'
When armed it shows 'Loslassen.' After the pop:
┌──────────────────────────────────┐
│ Genau so.                        │ 34px
│ Womit fängst du an?              │ 19px
│ [Zimmer aufräumen] [Wäsche]      │ glass chips, each creates a
│ [Hausaufgaben] [Spülmaschine]    │ list prefilled with tasks
│ [Leere Liste]                    │
│                                  │
│ Leg Checko auf den Home-         │ iOS Safari only, when not
│ Bildschirm. Dann bleiben deine   │ installed
│ Listen sicher gespeichert.       │
│ [So geht's]                      │
└──────────────────────────────────┘

LISTEN-ÜBERSICHT
The wordmark, one faux-glass sheet of rooms, and one glass pill to add a list.
┌──────────────────────────────────┐
│                          ( ⚙ )   │ 44px glass circle: Einstellungen
│ Checko                           │ wordmark
│ ╭──────────────────────────────╮ │ faux-glass sheet, radius 22
│ │ ✺  Zimmer aufräumen          │ │ ✺ = 12-tooth mini ring, 5/12 lit
│ │    4 offen                   │ │ 15px Tinte leise
│ ├──────────────────────────────┤ │ hairline #15172614
│ │ ✺  Wäsche                    │ │
│ │    1 offen                   │ │
│ ├──────────────────────────────┤ │
│ │ ◎  Spülmaschine              │ │ silver ring = blitzblank
│ │    Fertig                    │ │
│ ├──────────────────────────────┤ │
│ │ ○  Hausaufgaben              │ │
│ │    6 offen                   │ │
│ ╰──────────────────────────────╯ │
│ Bisher 412 Aufgaben erledigt.    │ 13px, quiet
│         ╭────────────────╮       │ real glass pill (lens on Chromium)
│         │ +  Neue Liste  │       │
│         ╰────────────────╯       │
└──────────────────────────────────┘
- Tapping a row gives an iPhone tick and a View Transition: the room name morphs into the large title.
- Swipe a row left for Löschen.
- Long names wrap; they are never truncated.

LISTE (AUFGABEN)
Large title, the bubble strip, one sheet of open tasks, Erledigt below, and the input pill docked at the bottom.
┌──────────────────────────────────┐
│ ( ‹ )                    ( ••• ) │ glass circles; bar frosts on scroll
│ Zimmer aufräumen                 │ 34px, narrows to fit
│ • • • • • ◯ ◯ ◯ ◯      4 offen   │ bubble strip: dot = done, ◯ = open
│                   ╭───────────╮  │
│                   │3 am Stück │  │ combo pill, only during a chain
│                   ╰───────────╯  │
│ ╭──────────────────────────────╮ │
│ │ ( ) Bett machen            ≡ │ │ 30px bubble in a 48px hit area;
│ ├──────────────────────────────┤ │ grip ≡ in a 44px hit area
│ │ ( ) Klamotten in den         │ │ text wraps
│ │     Schrank räumen         ≡ │ │
│ ├──────────────────────────────┤ │
│ │ ( ) Schreibtisch frei      ≡ │ │
│ ├──────────────────────────────┤ │
│ │ ( ) Staubsaugen            ≡ │ │
│ ╰──────────────────────────────╯ │
│ Erledigt                   5  ▾  │ 22px, collapsible
│ ╭──────────────────────────────╮ │
│ │ (✓) ~~Lüften~~               │ │ done disc, struck text
│ │ (✓) ~~Müll rausbringen~~     │ │
│ ╰──────────────────────────────╯ │
│  ╭────────────────────────────╮  │ real glass pill, docked above
│  │ +  Was steht an?           │  │ the home indicator
│  ╰────────────────────────────╯  │
└──────────────────────────────────┘
- The ••• menu has: Umbenennen, Neue Runde starten, Liste löschen.
- The strip shows at most 12 symbols, then '+5'.
- The bubble is the only hold zone. The row text is tappable for editing, and the grip is for dragging, so scrolling never fights the charge.

AUFGABE HINZUFÜGEN
The docked pill expands in place above the keyboard. There is no separate page, so you can type, press Enter and type again.
┌──────────────────────────────────┐
│ Zimmer aufräumen                 │ list behind dims via a sibling
│ ( ) Bett machen                  │ scrim (no opacity on ancestors)
│ ( ) Staubsaugen                  │
│ ( ) Fenster putzen         (neu) │ its bubble just blew in
│ ╭──────────────────────────────╮ │ real glass sheet, radius 22
│ │ Neue Aufgabe                 │ │ 22px
│ │ ┌──────────────────────────┐ │ │
│ │ │ Fenster putzen|          │ │ │ 19px (no iOS zoom), autofocus,
│ │ └──────────────────────────┘ │ │ enterkeyhint=enter
│ │ [Fertig]        [Hinzufügen] │ │ Hinzufügen disabled while empty
│ ╰──────────────────────────────╯ │
│ ▒▒▒▒▒▒▒▒▒▒ keyboard ▒▒▒▒▒▒▒▒▒▒▒▒ │
└──────────────────────────────────┘
Enter adds the task and keeps focus. Fertig closes the sheet.

HOLD-TO-COMPLETE STATES (one row, bubble enlarged)
IDLE              CHARGING (k=6/12)     ARMED                 RELEASED
 . . . . . .       ━ ━ ━ ━ ━ ━ . .        ═ ═ ═ ═ ═ ═ ═ ═        °   ∘    ○
 .   ( )   .       ━  (( ))    .          ═  ((( )))   ═       ∘   (✓) ~~Bett~~ ○
 . . . . . .       . . . . . .            ═ ═ ═ ═ ═ ═ ═ ═           ○  °   ∘
- Idle: teeth at 18% ink, bubble Ø30, static.
- Charging: 6 teeth lit gold then magenta. The bubble grows with each tick (×1.10 here) and bumps on every tick.
- Armed: all teeth silver and the film drained to silver. The bubble is at ×1.22 and wobbles. The 'Loslassen.' hint shows the first 3 times.
- Released: the bubble pops into 10-18 small bubbles flying right and up. A done disc with a check appears, the strike draws across, and the row recoils.
- Cancelled before the lock: the teeth unwind backwards and the bubble springs back. Nothing is completed.

LISTE FERTIG
The header becomes one glass card. Results are written as sentences, not stat tiles. There is one primary action.
┌──────────────────────────────────┐
│ ( ‹ )                            │
│ ╭──────────────────────────────╮ │ real glass card
│ │ Zimmer aufräumen             │ │ 22px
│ │ Zimmer fertig. Jetzt findest │ │ 28px, wdth 108
│ │ du alles wieder.             │ │
│ │                              │ │
│ │ 9 Aufgaben in 14 Minuten.    │ │ 16px
│ │ Neue Bestzeit: 2 Minuten     │ │ only when it is beaten
│ │ schneller als letztes Mal.   │ │
│ ╰──────────────────────────────╯ │
│ Erledigt                   9  ▸  │ collapsed
│  ╭────────────────────────────╮  │
│  │    Neue Runde starten      │  │ glass pill
│  ╰────────────────────────────╯  │
│      Zurück zu den Listen        │ text button
└──────────────────────────────────┘
The backdrop shows the blitzblank wash. There is no auto-advance and no 'come back tomorrow'.

EINSTELLUNGEN
Three plain groups. Native controls where possible, since native switches give the iPhone a real tick.
┌──────────────────────────────────┐
│ ( ‹ )  Einstellungen             │ 22px
│ Gefühl                           │ 22px, sentence case
│ ╭──────────────────────────────╮ │
│ │ Klänge                 [ ●]  │ │ <input type=checkbox switch>
│ │ Folgt dem Stummschalter.     │ │ 13px hint (per platform)
│ │ Vibration              [ ●]  │ │ Android only
│ │ Abhaken                      │ │
│ │ [Gedrückt halten|Antippen]   │ │ segmented control
│ │ Antippen geht schneller.     │ │
│ │ Halten macht mehr Plopp.     │ │
│ ╰──────────────────────────────╯ │
│ Aussehen                         │
│ ╭──────────────────────────────╮ │
│ │ Glas   [Klar|Getönt|Solide]  │ │
│ │ Farben [Hell|Dunkel|Wie System]│
│ │ Weniger Bewegung       [● ]  │ │ defaults to the system setting
│ ╰──────────────────────────────╯ │
│ Deine Daten                      │
│ ╭──────────────────────────────╮ │
│ │ Sicherung speichern          │ │ downloads a .json file
│ │ Sicherung laden              │ │
│ │ Alles löschen                │ │ Kirsche text, confirm dialog
│ ╰──────────────────────────────╯ │
│ Alles bleibt auf diesem Gerät.   │ 13px
│ Kein Konto, keine Werbung,       │
│ keine Benachrichtigungen.        │
└──────────────────────────────────┘
```

## Signatur-Moment

GEOMETRY
- Hit area: a 48x48 <label>. It doubles as the iPhone haptic switch overlay.
- Bubble: Ø30. Fill 6% white, a 1px conic film rim at 70%, and a highlight dot at 10 o'clock.
- Tooth ring: radius 19-22px, 3px thick, 12 teeth of 26deg each with 4deg gaps (a repeating-conic-gradient mask).
- Lit fraction: @property --p <number>. JS steps it in twelfths on each tick. A CSS transition on --p runs only for the unwind.
- Pointer: setPointerCapture. Cancel on a move over 12px, on pointercancel, or when the page is hidden.
- CSS on the bubble: touch-action:none, user-select:none, -webkit-touch-callout:none.

ONE CLOCK: at pointerdown, the whole tick schedule goes to all three outputs at once: Android as one vibrate pattern, Web Audio scheduled on ctx.currentTime, and visuals read in rAF from performance.now() minus t0. They cannot drift apart.

EASING TOKENS
- --spring-pop (zeta 0.65, omega 20, about 7% overshoot), 420ms: linear(0, 0.073 5%, 0.24 10%, 0.438 15%, 0.628 20%, 0.788 25%, 0.909 30%, 0.991 35%, 1.04 40%, 1.063 45%, 1.068 50%, 1.062 55%, 1.05 60%, 1.024 70%, 1.005 80%, 0.997 90%, 1)
- --spring-soft (near critical damping, omega 18), 380ms: linear(0, 0.15 10%, 0.397 20%, 0.608 30%, 0.758 40%, 0.855 50%, 0.916 60%, 0.952 70%, 0.973 80%, 0.985 90%, 1). The Svelte equivalent is new Spring(v, {stiffness: 0.15, damping: 0.8}).
- --pop-out: cubic-bezier(.55,0,1,.45). --draw: cubic-bezier(.2,.8,.2,1). --unwind: cubic-bezier(.3,0,.2,1).

IDLE: completely static. No shimmer loops on the rows.

CHARGE, t = 0 to 1007ms (tick onsets: 0, 150, 283, 400, 504, 596, 677, 749, 813, 869, 919, 963)
- t=0 (press): bubble scale 1 to 0.94 in 60ms ease-out (squash under the thumb). The row gets a +4% white pressed tint over 80ms. Tooth 1 lights gold.
- On every tick k:
  - Tooth k lights in its film colour: gold for 1-3, magenta 4-6, violet 7-9, teal 10-12.
  - The bubble base scale follows the schedule from 0.94 to 1.22. At 1.22 it almost touches the inner edge of the ring, which reads as tension.
  - A micro-bump adds +0.025 scale, decaying with tau 22ms.
  - The rim highlight flashes from 0.4 to 0.9 and back to 0.4 in 50ms.
  - The bubble rim hue follows the teeth, and the highlight dot drifts from 10 to 12 o'clock.
  - On a silent iPhone, these per-tick bumps and flashes carry the rhythm without sound.
- Anticipation from tick 7 (t=749): the header counter digit squashes to scaleY 0.94 and the matching header bubble starts to shimmer. The UI leans in.

ARMED, t = 1007ms (the lock)
- All 12 teeth flash white for 60ms, then settle to Schwarzfilm-Silber.
- The bubble film drains to silver: the moment a real bubble is about to burst.
- Jelly wobble: scaleX and scaleY swap ±2% at 7Hz, decaying over 300ms. Then the bubble breathes ±1% at 2Hz for as long as you hold. There is no timeout.
- A specular sweep orbits the ring once per 900ms.
- The first 3 times, the hint 'Loslassen.' fades in above the row over 120ms.

RELEASE (T = pointerup while armed)
- T+0-70: bubble scale 1.22 to 1.40 and opacity to 0 with --pop-out. A real film vanishes almost instantly.
- T+0-220: a shock ring (1.5px silver) scales 1 to 2.6 while opacity goes .8 to 0, ease-out.
- T+0, particles: 10 + 2×(combo−1) small bubbles, capped at 18.
  - They spawn on the rim at angles −75 to +45deg (right and up). That is away from the thumb and over the task text, where you can see them.
  - Motion: speed 380-720 px/s, drag v·e^(−4.5t), buoyancy −90 px/s².
  - Size and life: radius 3-9px, life 420-900ms. Each one ends in a 60ms mini-pop (scale 1.25 and fade) with a tiny sound.
  - Drawing: one fixed canvas, sprites pre-rendered at 4 sizes (film-gradient rim plus highlight dot), DPR capped at 2, rAF only while particles are alive.
- T+0-160, row recoil: the row content moves 0, +3, −1.5, +0.5, 0 px on x. This is the only 'screen shake', and it stays inside the row.
- T+40: the done disc (Tinte in light mode, Schaum in dark) scales 0.7 to 1 with --spring-pop. The check path draws (dashoffset 1 to 0) in 220ms.
- T+60-300: the strike draws left to right in 240ms with --draw. The text weight goes 560 to 440 and its colour to Tinte leise: the text deflates.
- Counter digit:
  - T+0-110, out: scaleY .6, translateY +6px, fade, ease-in.
  - T+110-530, in: font-variation wdth 125 to 100 and scaleY 1.25 to 1 with --spring-pop. The type itself stretches.
- T+120, echo: the matching bubble in the header strip pops with its own mini shock ring and becomes a silver dot (scale 0 to 1, --spring-pop).
- T+80, combo of 2 or more: the glass pill drops in under the header with --spring-pop and its number swaps with the same wdth stretch. The pill fades over 300ms after 6s idle.
- T+2000 after the last interaction, and never while a finger is down: done rows slide into Erledigt with animate:flip 420ms --spring-soft. Targets never move in the middle of a combo.

CANCEL (released before the lock)
- --p unwinds to 0 in 180ms with --unwind, so the teeth go out backwards.
- The bubble springs back to 1.0 with --spring-pop.
- On a quick tap under 150ms in hold mode, the hint 'Länger halten' shows. After 3 such taps, a one-time tip shows: 'Lieber antippen? Stell's in den Einstellungen um.'

FINALE (when the last open task pops). Tapping anywhere skips to the end state.
- T+0: the normal release.
- T+400, Spülgang wave: the done discs glint from top to bottom. A specular band sweeps each disc in 140ms, staggered 45ms apart, for up to 12 rows; the rest glint together.
- T+400-1600: the backdrop rinse (film rotation +40deg and a white wash, transform and opacity only).
- T+700: the header strip's silver dots slide together (flip, --spring-soft) into one 40px glass bubble.
- T+1100, big pop: the shock ring scales to 4×. Then 24 slow bubbles float upward (speed 120-260, buoyancy −140, life 1.6-2.6s): a calm afterglow, not an explosion.
- T+1150: a View Transition morphs the header into the 'Fertig' card. The message comes in with opacity and translateY 8px to 0, 320ms, --spring-soft.
- T+1500: the blitzblank wash fades in over 1200ms.
- The list sheet does one 2px vertical settle (180ms) at T+1100. Header and glass never shake.

REDUCED MOTION (system setting or 'Weniger Bewegung')
- No scale, translate, particles, wobble or backdrop motion.
- The charge still lights the teeth in film colours, in sync with sound and vibration.
- Armed shows silver teeth. Release is a 120ms crossfade to the done disc, and the strike fades in.
- The finale is the card fading in over 200ms.
- Sound and vibration stay, because they are not motion and have their own toggles.

KEYBOARD
- Space keydown starts the charge (key repeat is ignored) and keyup releases.
- Enter completes immediately.
- Screen-reader activation of role=checkbox completes immediately.

## Haptik, Ton, Bild

LEGEND
- Android: the navigator.vibrate pattern [on, off, on, ...] in ms.
- iPhone: whether a real Taptic tick fires. It can only come from a REAL tap on a hidden <label> wired to <input type=checkbox switch>.
- Audio: Web Audio. One AudioContext. navigator.audioSession.type='ambient', so it mixes with the user's music and respects the silent switch. Master gain 0.8, then a compressor (−18dB, 4:1). Each gesture gets its own GainNode, so a cancel can silence ticks already queued.
- iPad and desktop: the Audio and Visual columns apply; there is no vibration.

CHARGE RAMP: hold on a bubble. Everything is issued once at pointerdown.
- Schedule: ticks k = 0..11, interval_k = round(150 × 0.8846^k) ms, which runs 150 down to 44. The lock follows tick 11.
- Tick onsets in ms: 0, 150, 283, 400, 504, 596, 677, 749, 813, 869, 919, 963. Lock at 1007.
- Gaps: 150, 133, 117, 104, 92, 81, 72, 64, 56, 50, 44, 44. The smallest gap is 30ms of silence, above the 28ms blur limit.
- Android, one call: [10,140,10,123,10,107,10,94,10,82,12,69,12,60,12,52,12,44,14,36,14,30,14,30,24]
  - Pulses are 10ms for ticks 0-4, 12ms for ticks 5-8 and 14ms for ticks 9-11. The lock pulse is 24ms.
- iPhone: no tick, because the finger is still down. Sound and visuals carry the ramp.
- Audio per tick:
  - Noise burst through a bandpass at 2600 + 220k Hz (2.6 to 5.0 kHz), Q5. Attack 0.5ms, exponential decay tau 6ms. Gain 0.10 + 0.01k.
  - Plus a sine 'body' at 1200 + 100k Hz, tau 8ms, gain 0.05.
  - The rising pitch is the winding-up sound.
- Visual per tick: the tooth lights, the bubble micro-bumps and the rim flashes (see signature moment).

LOCK / ARMED (t=1007, still holding)
- Android: the final 24ms pulse. Then nothing while you keep holding, so the hand does not buzz.
- iPhone: none.
- Audio: 'klack-klack'. Noise bandpass 1700Hz Q2.5, gain 0.30, tau 9ms. Then +16ms later a sine at 620Hz, gain 0.18, tau 18ms.
- Visual: silver flash, wobble, then breathing.

CANCEL (release before the lock, a move over 12px, or pointercancel)
- Android: vibrate([8,40,8]). This also replaces the rest of the charge pattern.
- iPhone: preventDefault on the label click, so no toggle and no tick.
- Audio: the gesture GainNode ramps to 0 in 5ms. Then 3 soft clicks at 3000, 2400 and 1800Hz, gain 0.06, 35ms apart.
- Visual: the teeth unwind backwards in 180ms and the bubble springs back.

RELEASE BURST (release while armed)
- Android: [16,30,14,30,14,32,12,36,12,42,10,52,10,66,10]
  - 8 pulses with onsets at 0, 46, 90, 136, 184, 238, 300 and 376ms; 386ms in total.
  - It slows down like a freewheel spinning out.
  - Combo tail: append [70,10] once for each level above 1.
- iPhone: YES. The release is the click, so one real tick lands at T0.
- Audio:
  - T0: a 3ms highpass noise click at 5kHz, gain 0.15.
  - Plus a pop chirp: a sine rising exponentially from f/3 to f over 45ms, gain 0.26, tau 25ms.
  - Plus a glass 'ting': a sine at f plus a sine at 2.76f × 0.3, tau 120ms, gain 0.07.
  - f by combo level: C6 1047, D6 1175, E6 1319, G6 1568, A6 1760 Hz (capped at level 5, pentatonic so it always sounds good).
  - Spin-down ticks at the Android onsets, bandpass 5000 down to 2400Hz, gain 0.18 down to 0.06.
  - Each particle pop: 2ms of highpass noise at 6.5kHz, gain 0.025-0.05, at most one every 25ms.
- Visual: the pop, shock ring, particles, check, strike, recoil and counter stretch.

TAP-MODE CHECK ('Abhaken: Antippen', Enter, or screen-reader activation)
- Android: [14,40,10].
- iPhone: YES.
- Audio: pop chirp plus ting, no ramp.
- Visual: a short pop (1 to 1.25 and fade in 70ms), 6 particles, the check draws.

UNCHECK (tap a done disc)
- Android: [10].
- iPhone: YES.
- Audio: a reverse chirp from f down to f/3 over 40ms, gain 0.14.
- Visual: the check undraws in 160ms, the bubble re-forms (0 to 1, spring-pop), the strike retracts right to left in 200ms. The row returns to the open tasks after 2s idle.

ADD TASK ('Hinzufügen' or Enter)
- Android: [8].
- iPhone: YES on the button. None on the keyboard Enter.
- Audio: a 'blub', a sine from 300 to 600Hz over 60ms, gain 0.10.
- Visual: the row opens in with spring-soft over 380ms, its bubble blows in (0 to 1, spring-pop), and a new bubble joins the header strip.

DELETE (swipe left)
- Android: [12] when the swipe crosses the 40% threshold. [8,30,20] on commit.
- iPhone: YES when you tap the revealed 'Löschen'. None on a full-swipe commit, because that is a drag.
- Audio: a 'thup', a sine at 160Hz with tau 40ms and gain 0.2, plus 20ms of noise lowpassed at 800Hz.
- Visual: the row slides out left in 200ms ease-in, its height collapses in 220ms with spring-soft, and an undo toast shows for 5s.

REORDER PICKUP (drag the grip ≡; there is no long-press, so it never fights the hold)
- Android: [12].
- iPhone: none, because a drag produces no click.
- Audio: a lift sound, noise bandpassed at 1.2kHz for 10ms, gain 0.08.
- Visual: scale 1.03, a brighter rim, and shadow 0 14px 28px −10px #15172640.

REORDER SLOT PASS
- Android: [8].
- iPhone: none.
- Audio: a tick bandpassed at 3kHz, gain 0.04.
- Visual: the neighbours move with animate:flip, 200ms, spring-soft.

REORDER DROP
- Android: [10,40,14].
- iPhone: none.
- Audio: a 'tock', a sine at 700Hz with tau 15ms and gain 0.12.
- Visual: the row settles from 1.03 to 1 with spring-pop and the shadow fades out over 200ms.

LIST COMPLETE (release of the last open task)
- Android, one call at release: burst + [14] + [10,35] × (n−1) + [10,90,28,70,16]. n is the number of done rows, capped at 12. There is no combo tail here.
- iPhone: only the release tick.
- Audio:
  - The normal burst.
  - From T+400: one glass ting per row, climbing the pentatonic scale from the current f, 45ms apart.
  - T+1100: a big pop chirp from 260 to 780Hz, gain 0.22.
  - A soft chord of tings at C6, E6, G6 and A6, tau 600ms, gain 0.05 each.
  - Scattered slow pops over 2.5s.
- Visual: the finale.

COMBO STEP: not a separate event. Each level adds a tail pulse, raises f by one pentatonic step and adds 2 particles. It is capped at level 5.

ERROR (import failed, storage full)
- Android: [30,60,30], two dull pulses.
- iPhone: none.
- Audio: two soft triangle notes, 330 then 247Hz, 80ms each, gain 0.08.
- Visual: a shake of ±6px on x, 3 damped cycles in 320ms. Under reduced motion the rim turns Kirsche for 1s instead.

NAVIGATION AND BUTTONS (open a list, back, segmented controls, menu items)
- Android: [8] on primary actions only.
- iPhone: YES. A label/switch overlay sits on room rows, Hinzufügen, Löschen and the segmented controls. The settings switches are native switches, so they tick natively.
- Audio: none. Sound always means progress on a chore.
- Visual: press scale 0.97 in 60ms, release with spring-pop.

ONBOARDING UNLOCK TAP (on pointerup)
- AudioContext.resume().
- Android: [12].
- iPhone: YES.
- Audio: one tick sound.
- Visual: the bubble wobbles.
- Note: on touch screens pointerdown is not an activation event, so this tap is what makes the first hold sound and vibrate.

## Motivation

1. The moment itself is the reward, and it is deterministic. The size of the reward depends only on whether you held (and on the combo level). It is never random. There is no variable-ratio schedule, which is the slot-machine mechanic. Only particle positions are random; their count is fixed by the rules. The sensory payoff is the same every time, so it is satisfying without being addictive.

2. 'Kette' (combo): 2 or more completions, each within 6s of the last.
- What changes: a glass pill shows '3 am Stück'. The release note climbs C6, D6, E6, G6, A6, each level adds 2 bubbles, and Android vibration gets a longer tail.
- It is capped at 5: after that the pill says '5 am Stück. Läuft.' and nothing escalates further.
- A chain ends silently. There is no 'Kette verloren' message and no penalty.
- Why it is fair: it rewards being in flow right now and never punishes stopping.

3. Bubble strip: open tasks are visible bubbles in the header, and each pop echoes there. This is an honest goal gradient: you see exactly what is left. It never shows a percentage of 'you are behind'.

4. Rounds and best time:
- Lists are rooms you can replay ('Neue Runde starten' reopens every task).
- Time is measured from the first check to the last check, and the finish screen says so honestly.
- It is shown only on the finish screen. There is never a live timer or countdown.
- A best time is mentioned only when you beat it. A slower round only shows the plain time.

5. Blitzblank rooms: a finished list keeps its silver ring and calm washed film in the overview until you choose to start a new round. Nothing decays and no 'dirty again' timer exists.

6. Lifetime counter: 'Bisher 412 Aufgaben erledigt.' It only ever grows. It sits quietly in the overview footer and the settings.

WHY THESE ARE NOT DARK PATTERNS
- No push notifications, badges, streak calendar, daily goal, loss framing, social comparison, currencies, unlocks, loot or random rewards.
- No sounds when the app opens, and no pressure to start.
- The finish copy actively releases you ('Du kannst die App jetzt zumachen.').
- Every stat stays on the device.
- Sound, vibration and motion each have a plain off switch. 'Antippen' removes the hold entirely.
- The combo cap and the deterministic rewards stop escalation. 'Längste Kette' is the only record that could tempt gaming, and it is low stakes.

## Texte

TAGLINE: „Jede erledigte Aufgabe macht Plopp.“

ONBOARDING
- „Tipp die Blase an.“
- „Jetzt gedrückt halten, bis es klackt.“
- (armed) „Loslassen.“
- „Genau so. Womit fängst du an?“

TEMPLATES (chips that create prefilled lists)
- „Zimmer aufräumen“: Bett machen, Klamotten wegräumen, Schreibtisch frei machen, Müll rausbringen, Staubsaugen, Lüften
- „Wäsche“: Sortieren, Waschen, Aufhängen, Abnehmen, Falten, Wegräumen
- „Hausaufgaben“: Mathe, Deutsch, Englisch, Tasche für morgen packen
- „Spülmaschine“: Ausräumen, Einräumen, Tab rein und anschalten
- „Leere Liste“

EMPTY STATES
- Overview: „Noch keine Listen. Nimm dir ein Zimmer vor.“ followed by the template chips and „Leere Liste anlegen“.
- Empty list: „Hier steht noch nichts. Schreib unten rein, was ansteht.“
- Input placeholder: „Was steht an?“

BUTTONS (each action keeps the same name throughout)
- „Neue Liste“ → sheet button „Liste anlegen“
- „Hinzufügen“, „Fertig“ (closes the input)
- „Neue Runde starten“, „Zurück zu den Listen“
- „Umbenennen“, „Liste löschen“, „Behalten“, „Rückgängig“
- „Sicherung speichern“, „Sicherung laden“, „Alles löschen“, „So geht's“

HINTS
- First 3 holds: „Gedrückt halten, bis es klackt.“ When armed: „Loslassen.“
- Quick tap in hold mode: „Länger halten.“
- After 3 quick taps (shown once): „Lieber antippen? Stell's in den Einstellungen um.“

COMBO PILL
„2 am Stück“, „3 am Stück“, „4 am Stück“, „5 am Stück. Läuft.“

TOASTS
- „„Lüften“ gelöscht.“ with [Rückgängig]
- „Sicherung geladen: 4 Listen.“

LISTE FERTIG: general pool (never repeat any of the last 3)
- „Alles erledigt. Der Rest des Tages gehört dir.“
- „Liste leer, Kopf frei.“
- „Fertig. Du kannst die App jetzt zumachen.“
- „Zack, alles abgehakt.“
- „Geschafft. Das war's für heute.“
- „Alles weg. Gönn dir was.“
- „Erledigt. Jetzt ist Pause dran.“
- „Sauber durchgezogen.“

ROOM VARIANTS (chosen by template or a keyword in the list name)
- Zimmer: „Zimmer fertig. Jetzt findest du alles wieder.“
- Wäsche: „Wäsche erledigt. Bis zur nächsten einzelnen Socke.“
- Hausaufgaben: „Hausaufgaben fertig. Feierabend.“
- Spülmaschine: „Spülmaschine erledigt. Bis sie wieder voll ist.“

RESULT SENTENCES
- „9 Aufgaben in 14 Minuten.“
- „Neue Bestzeit: 2 Minuten schneller als letztes Mal.“
- First round: „Erste Runde. Die Zeit merkt sich Checko fürs nächste Mal.“
- „Längste Kette heute: 5 am Stück.“
- When the round was slower: no comparison at all.

CONFIRM DIALOGS
- „Neue Runde? Alle 9 Aufgaben sind dann wieder offen.“ [Neue Runde starten] [Abbrechen]
- „„Wäsche“ löschen? Die Liste und ihre Bestzeit sind dann weg.“ [Liste löschen] [Behalten]
- „Alle Listen und Zahlen löschen? Das lässt sich nicht rückgängig machen.“ [Alles löschen] [Abbrechen]

ERRORS (no apologies; they say what happened and what to do)
- „Speichern klappt gerade nicht: Der Browser hat keinen Platz mehr. Lösch eine alte Liste.“
- „Das ist keine Checko-Sicherung. Wähl die .json-Datei, die Checko gespeichert hat.“

INSTALL HINT (iOS Safari only)
„Leg Checko auf den Home-Bildschirm. Dann bleiben deine Listen sicher gespeichert.“ [So geht's]

SETTINGS
- Section 'Gefühl':
  - „Klänge“, hint „Folgt dem Stummschalter.“ (iPhone) or „Folgt der Medienlautstärke.“ (Android)
  - „Vibration“ (Android only)
  - „Abhaken: Gedrückt halten | Antippen“, hint „Antippen geht schneller. Halten macht mehr Plopp.“
- Section 'Aussehen':
  - „Glas: Klar | Getönt | Solide“, hint „Getönt und Solide sind leichter zu lesen.“
  - „Farben: Hell | Dunkel | Wie System“
  - „Weniger Bewegung“, hint „Keine Blasen, kein Wackeln. Klang und Vibration bleiben.“
- Section 'Deine Daten':
  - „Sicherung speichern“, hint „Lädt eine .json-Datei mit allen Listen herunter.“
  - „Sicherung laden“
  - „Alles löschen“
- Footer: „Alles bleibt auf diesem Gerät. Kein Konto, keine Werbung, keine Benachrichtigungen.“ and „Bisher 412 Aufgaben erledigt.“

## Risiken

- The iPhone release tick is not verified for long holds. A press of more than 1s on a <label> may not fire a click in iOS Safari or a standalone PWA (long-press recognisers, the callout menu). Mitigation: touch-action:none, -webkit-touch-callout:none, user-select:none and no contextmenu on the bubble. Test on a real iOS 26.5/27 device. Also check that preventDefault on the click really suppresses the tick on cancel. If it does not work, the release falls back to sound and visuals only.
- User activation: on touch screens pointerdown is not an activation-triggering event (only pointerup and touchend are). After a cold start, the first hold therefore has no Android vibration and no iOS audio. Mitigation: the app opens on the overview (opening a list is a tap, which unlocks it), the AudioContext resumes on the first pointerup, and onboarding step 1 is deliberately a tap.
- Accessibility: hold-to-complete is a barrier for motor impairments. The fixes are the 'Antippen' setting, Enter, and instant completion from a screen reader. The hidden haptic switch must be aria-hidden with tabindex=-1, so VoiceOver announces only the visible role=checkbox control. Test with VoiceOver and TalkBack.
- Vibration needs calibration on real hardware. 10ms pulses can be imperceptible on weak motors in budget Android phones. Test on 2-3 phones and raise the base pulse to 14ms if it is not felt. Some OEMs drop vibrate() when system haptics are off; the app accepts that silently.
- Bluetooth headphones add 150-250ms of audio latency, so ticks lag behind the visuals and vibration. This is accepted, not compensated.
- Sound fatigue: 13 ticks plus a pop per task, over 20 tasks, is noticeable. Gains are low, sound only ever means chore progress, it has one toggle, and on iOS 'ambient' respects the silent switch and keeps the user's music playing.
- Performance:
  - Backdrop-filter surfaces (header, input pill, combo pill, sheet) can reach 4, so the combo pill hides while a sheet is open.
  - Particles on low-end Android: cap at 18, blit pre-rendered sprites, and halve the count after any frame over 32ms.
  - Animating wdth/wght forces layout, so it is limited to the counter digit (fixed 2ch box) and the one row being completed.
- Backdrop Root trap: any opacity, filter or will-change on an ancestor of glass kills the blur silently. Page transitions must use View Transitions or animate siblings. Add a lint or code-review rule for it.
- Local-first data loss: Safari can evict storage of a non-installed site after 7 days without use. Mitigation: call navigator.storage.persist(), show the install hint in iOS Safari, and offer 'Sicherung speichern'.
- Contrast was calculated only. Worst cases: about 5.3:1 for secondary light text on a faux-glass row over the magenta band, about 6:1 in dark mode. saturate(180%) on the real-glass header can shift its backdrop, so the header holds only large or bold primary text. Verify on a device in both themes and with Klar.
- Mona Sans: check that the subset includes tabular figures and the full German glyph set (ß, umlauts, „“). Measure the real WOFF2 size after subsetting.
- The soap-film swirl asset has to be made once offline (a small generator script). Until then the CSS radial-gradient fallback reads more generic.
- Self-critique against the AI-default list (revisions already in this direction):
  (a) Confetti became glass soap bubbles. Confetti is the default celebration and close to party/casino.
  (b) The generic purple-blue mesh became one soap-film swirl in the real draining-film colour order, rotated per room.
  (c) A big 'Noch 4' number with a progress bar (the default stat treatment) became the header bubble strip with echo pops.
  (d) Stat tiles on the finish screen became plain sentences.
  (e) A card per task became one faux-glass sheet with hairlines, and border radius now depends on the object.
  (f) The 'Deine Listen' title became the wordmark.
  (g) Streak-like pressure became replayable rounds, with the best time shown only on the finish screen.
  Checked and absent: all-caps or eyebrow labels, middle-dot meta strings, arrows on buttons, monospace labels, 01/02/03 markers (onboarding has no step numbers), single-word colour accents, cream/serif/terracotta, and near-black with one acid accent. Remaining trend risk: wide, heavy grotesque titles are fashionable in 2025-26. They stay because the width axis does real squash, stretch and fit work.
- Not done here: no prototype was built and nothing was tested on real devices. The haptic timings, gains and the spring curves were calculated, not felt, and need a pass on hardware.
