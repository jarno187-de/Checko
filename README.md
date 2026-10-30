# Checko

Jede erledigte Aufgabe macht Plopp.

Checko ist eine Checkliste für Aufgaben, auf die man keinen Bock hat: Zimmer aufräumen, Wäsche, Hausaufgaben. Jede Aufgabe ist eine Glas-Seifenblase.

- **Halten:** Zwölf Zähne ticken immer schneller. Bei „Klack“ ist die Blase silbern. Loslassen lässt sie platzen.
- **Pumpen:** Sechs schnelle Tipps gehen auch. Jeder Tipp ist ein Klopfer.

Checko ist kostenlos. Es gibt kein Konto, keine Werbung und keine Benachrichtigungen. Alles bleibt auf dem Gerät.

Es läuft als Web-App auf iPhone, Android, iPad und PC und lässt sich auf den Home-Bildschirm legen. Danach funktioniert es auch offline.

## Haptik je nach Gerät

| Gerät | Beim Halten | Beim Platzen |
|---|---|---|
| Android (Chrome, Samsung Internet) | Echte Klopf-Vibration, wird immer schneller | Schneller Vibrations-Burst |
| iPhone | Klick-Töne und Animation (Web-Apps dürfen beim Halten nicht vibrieren) | Ein echter Taptic-Tick |
| iPhone beim Pumpen | Jeder Tipp ein echter Taptic-Tick | Ein echter Taptic-Tick |
| iPad, PC | Klick-Töne und Animation | Ton und Animation |

Seit iOS 26.5 darf eine Web-App nur bei einem echten Fingertipp einen Tick auslösen. Darum gibt es den Pump-Modus. Die Töne folgen auf dem iPhone dem Stummschalter.

## Foto-Check mit Gemini

Bei Aufgaben, die man sehen kann (Bett machen, Schreibtisch frei machen, Hausaufgaben), kann Gemini prüfen, ob sie wirklich erledigt sind.

- In den Einstellungen unter „Foto-Check“ den eigenen Gemini-API-Schlüssel eintragen. Einen gibt es kostenlos bei [Google AI Studio](https://aistudio.google.com/apikey).
- Aufgaben mit Kamera-Symbol sind dann gesperrt. Ein Tipp öffnet die Kamera, Gemini schaut aufs Foto, und erst danach darf die Blase platzen.
- Ob eine Aufgabe ein Foto braucht, schätzt Checko am Namen. Im Bearbeiten-Sheet lässt es sich pro Aufgabe ein- und ausschalten.
- Modell: `gemini-3.1-flash-lite`, das günstigste aktuelle Gemini-Modell mit Bilderkennung. Ein Foto kostet unter 0,1 Cent; es gibt auch einen kostenlosen Tarif mit Nutzungsgrenzen.

Datenschutz:

- Der Schlüssel liegt nur im Browser (`localStorage`, eigener Eintrag) und ist in keiner Sicherung enthalten.
- Fotos werden vor dem Senden auf 768 px verkleinert und gehen direkt an Google, an keinen anderen Server.
- Im kostenlosen Gemini-Tarif darf Google Anfragen zur Verbesserung seiner Produkte nutzen. Wer das nicht will, nimmt den bezahlten Tarif.

## Entwickeln

Node 24 wird gebraucht.

```bash
npm install
```

```bash
npm run dev
```

Zum Testen auf dem Handy im selben WLAN:

```bash
npm run dev -- --host
```

Prüfen:

```bash
npm run check
```

```bash
npm test
```

```bash
npx playwright install chromium webkit
```

```bash
npm run e2e
```

## Veröffentlichen (Cloudflare Pages)

Das Repo bleibt privat. Einmal einrichten:

1. Auf cloudflare.com ein kostenloses Konto anlegen.
2. Workers & Pages → Erstellen → Pages → Mit Git verbinden → GitHub erlauben → Repo `Checko` wählen.
3. Build-Befehl `npm run build`, Ausgabeordner `dist`.
4. Unter Umgebungsvariablen `NODE_VERSION` = `24` setzen.
5. Speichern. Jeder Push auf `main` geht danach automatisch online, z. B. unter `checko.pages.dev`.

## Auf echten Geräten prüfen

Diese Punkte kann kein Test am PC prüfen:

- [ ] iPhone: Tickt ein Tipp auf die Blase?
- [ ] iPhone: Tickt das Loslassen nach 1–2 s Halten?
- [ ] iPhone: Gibt sechsmal schnelles Pumpen sechs Ticks?
- [ ] iPhone: Kommt bei abgebrochenem Halten (Finger weggezogen) kein Tick?
- [ ] Android: Fühlt sich die Rampe nach Klopfen an, nicht nach Brummen? Sonst die Pulslängen in `src/lib/schedule.ts` anpassen (8, 12 oder 20 ms).
- [ ] Beide: Auf den Home-Bildschirm legen, öffnen, offline öffnen.
- [ ] Beide: Glas-Look hell und dunkel, Text gut lesbar.

## Aufbau

- `src/lib/schedule.ts`: alle Zeiten und Vibrationsmuster
- `src/lib/charger.ts`: Halten, Pumpen und Auslaufen als Zustandsmaschine
- `src/lib/model.ts`: Daten, Runden, Bestzeit, Prüfung von Sicherungen
- `src/lib/sound.ts`: alle Töne, live erzeugt mit Web Audio
- `src/lib/haptics.ts`: Vibration (Android) und Taptic-Trick (iPhone)
- `src/components/Bubble.svelte`: die Blase
- `docs/DESIGN.md`: Design-Spec (Richtung „Seifenfilm“)
- `docs/KRYPTO-PLAN.md`: Plan für die Krypto-Einzahlung (noch nicht gebaut)
