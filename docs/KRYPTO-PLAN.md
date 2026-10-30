# Krypto-Einzahlung — Plan (noch nicht gebaut)

Idee: Man zahlt Krypto ein und bekommt es erst zurück, wenn bestimmte Aufgaben erledigt sind. Das soll ein Anreiz sein, keine Wette.

Dieses Dokument ist nur der Plan. In Checko steckt noch kein Krypto-Code. Vorbereitet ist nur das Datenmodell (siehe unten). Alles hier ist **keine Rechtsberatung**.

## Entscheidungen

- **Wer bestätigt?** Normalerweise ein Freund („Buddy“). Wenn der nicht kann, darf man nach einer Wartezeit selbst abheben.
- **Wohin geht das Geld?** Immer nur zurück an die Person, die eingezahlt hat. Nie an den Buddy, nie in einen Topf, nie an den Entwickler.
  Sonst wird es ein Glücksspiel (§ 3 GlüStV, § 284 StGB) oder ein Finanzprodukt.
- **Wer hält das Geld?** Niemand außer einem Smart Contract. Checko hält nie Schlüssel oder Geld.
  Ein Server, der Krypto für andere verwahrt, bräuchte eine BaFin-Lizenz (MiCA, KMAG § 2 Abs. 11). Das ist für ein Hobbyprojekt ausgeschlossen.

## Wie es funktioniert

1. Du wählst eine Liste als Ziel, eine Frist und einen Buddy (seine Wallet-Adresse). Dann zahlst du USDC in den Vertrag ein.
2. Du erledigst die Liste in Checko.
3. Dein Buddy bestätigt mit seiner Wallet (`confirm`). Danach kannst du dein Geld sofort abheben (`withdraw`).
4. Bestätigt der Buddy nicht, kannst du nach **Frist + 7 Tagen** trotzdem selbst abheben. Das Geld ist also nie verloren, nur gesperrt.
5. Ehrenmodus: Du trägst dich selbst als Buddy ein. Das ist dann ein Spar-Schloss auf Ehrenwort.

Ein Foto als Beweis schickst du deinem Buddy selbst (Teilen-Menü). Es landet nie on-chain und nie auf einem Checko-Server.

## Variante: Gemini statt Buddy

Der Foto-Check mit Gemini ist schon gebaut (siehe README). Er kann den Buddy später ersetzen oder ergänzen. Ein Haken bleibt:

- Das Urteil entsteht im Browser, mit dem eigenen Schlüssel der Person. Der Vertrag kann ihm nicht trauen: Wer einzahlt, könnte `confirm` auch ohne Foto aufrufen.
- **Ohne Server** bleibt das ein Ehrensystem. Gemini macht es nur bequemer: Der Buddy bekommt Foto und Urteil und bestätigt mit einem Tipp.
- **Mit kleinem Prüf-Dienst** wird es echt: Ein Cloudflare Worker schickt das Foto an Gemini und unterschreibt bei „erledigt“ eine EIP-712-Bestätigung. Der Vertrag akzeptiert diese Unterschrift statt des Buddys.
  Der Worker verwahrt kein Geld, nur einen Signier-Schlüssel, und kostet Gemini-Gebühren auf Rechnung des Entwicklers.
- Die Rückfallregel (Frist + 7 Tage, dann selbst abheben) bleibt in jeder Variante, damit nie Geld festhängt.

## Technik

- **Chain und Token:** native USDC auf Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, vor Benutzung bei Circle prüfen). Nicht das alte USDbC.
  Gebühren auf Base liegen bei etwa 0,001–0,05 $.
- **Erst testen:** Base Sepolia, Test-USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` vom Circle-Faucet (faucet.circle.com).
- **Wallet im Browser:** wagmi + viem.
  - `baseAccount()` für Passkey-Wallets ohne App-Installation. Das passt für Leute ohne Krypto-Erfahrung.
  - Reown AppKit / WalletConnect für MetaMask und andere. Braucht eine kostenlose projectId.
- **Nur bei Bedarf laden:** per dynamischem `import()`, hinter dem Flag `features.cryptoStake` (heute fest `false`). Die normale Checkliste bleibt so klein wie jetzt.
- **Gas:** Nutzer brauchen ein wenig ETH auf Base. Ein Paymaster könnte das übernehmen, kostet den Entwickler aber Geld. Darum vorerst nicht.

## Vertrag (Skizze)

Kein Owner, kein Admin, kein Upgrade, keine Gebühr. OpenZeppelin v5.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Funds only ever go back to the depositor.
contract CheckoVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable token;       // native USDC
    uint128 public immutable cap;        // small limit per pledge, e.g. 100e6
    uint64 public constant GRACE = 7 days; // after the deadline the owner may withdraw alone

    struct Pledge { address owner; address buddy; uint128 amount; uint64 deadline; bool confirmed; bytes32 goal; }
    Pledge[] public pledges;

    event Created(uint256 indexed id, address indexed owner, address indexed buddy, uint128 amount, uint64 deadline, bytes32 goal);
    event Confirmed(uint256 indexed id);
    event Withdrawn(uint256 indexed id, uint128 amount);

    constructor(IERC20 t, uint128 c) { token = t; cap = c; }

    function create(uint128 amount, address buddy, uint64 deadline, bytes32 goal) external returns (uint256 id) {
        require(amount > 0 && amount <= cap && buddy != address(0) && deadline > block.timestamp, "args");
        id = pledges.length;
        pledges.push(Pledge(msg.sender, buddy, amount, deadline, false, goal));
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Created(id, msg.sender, buddy, amount, deadline, goal);
    }

    /// The buddy confirms the goal is done. buddy == owner is honor mode.
    function confirm(uint256 id) external {
        Pledge storage p = pledges[id];
        require(msg.sender == p.buddy && p.amount > 0, "buddy");
        p.confirmed = true;
        emit Confirmed(id);
    }

    /// Back to the owner: right away once confirmed, otherwise after deadline + GRACE.
    function withdraw(uint256 id) external nonReentrant {
        Pledge storage p = pledges[id];
        uint128 amt = p.amount;
        require(msg.sender == p.owner && amt > 0, "owner");
        require(p.confirmed || block.timestamp >= p.deadline + GRACE, "locked");
        p.amount = 0; // effects before the transfer
        token.safeTransfer(p.owner, amt);
        emit Withdrawn(id, amt);
    }
}
```

`goal` ist ein Hash der Liste (`keccak256` über `{listId, taskIds, deadline}`). Listentitel kommen nie on-chain.

## Was das Datenmodell heute schon vorbereitet

- Jede Liste und Aufgabe hat eine feste UUID.
- Erledigt-Ereignisse werden nur angehängt (`events`), nie überschrieben. Daraus lässt sich später belegen, wann was erledigt wurde.
- Runden (`roundStart`, `finishedAt`): Eine Einzahlung hängt später an genau eine Runde einer Liste.
- Gespeichert wird unter `checko:v1` mit `version: 1`. Ein späteres Schema kann sauber migrieren.
- `features.cryptoStake` ist fest `false`.

## Reihenfolge, wenn es gebaut wird

1. Vertrag schreiben und mit Foundry testen. Dazu Fuzz-Tests und eine Invariante: Token-Bestand ≥ Summe offener Einzahlungen.
2. Auf Base Sepolia deployen und den Quelltext auf Basescan verifizieren.
3. UI hinter dem Flag bauen: 18+-Abfrage, Wallet verbinden, Einzahlen, Buddy-Link teilen, Abheben.
4. Slither oder Aderyn laufen lassen. Wenn möglich, schaut jemand Externes auf den Vertrag.
5. **Einmal Rechtsberatung** (Krypto/Fintech, Deutschland): MiCA Erwägungsgrund 83 (nicht-verwahrende Software), GlüStV, Minderjährige.
6. Erst danach Base Mainnet, mit kleinem festen Höchstbetrag.

## Risiken

- **Minderjährige:** Eine Einzahlung ist nicht „lediglich rechtlich vorteilhaft“ (§§ 106 ff. BGB). Wallet-Anbieter verlangen meist 18+. Darum: Feature nur ab 18 und standardmäßig aus.
- **Vertrag lässt sich nicht reparieren:** Absichtlich ohne Admin. Ein Fehler wäre dauerhaft. Darum Tests, Review, Testnetz zuerst und ein kleiner Höchstbetrag.
- **Circle kann Adressen sperren:** Wird der Vertrag gesperrt, ist alles darin eingefroren. Darum ein kleiner Höchstbetrag.
- **iPhone-Homescreen-App:** Wallet-Weiterleitungen sind dort als wackelig bekannt. Auf echten Geräten testen.
- **Datenschutz:** On-chain ist öffentlich und für immer. Nur Hashes on-chain. Eine Wallet-Adresse, die zu einer Person gehört, ist personenbezogen.
- **Steuern:** EUR → USDC → EUR innerhalb eines Jahres kann unter § 23 EStG fallen. Einzahlen und Zurückholen des eigenen Tokens ist vermutlich keine Veräußerung (nicht geprüft).
