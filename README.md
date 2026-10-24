# Blackjack Trainer

iPhone-first PWA for learning blackjack basic strategy. React + TypeScript + Vite, fully offline (service worker), stats in localStorage. No backend, no real money.

## Modes
- **Learn**: interactive Hard / Soft / Pairs chart for the selected rules. Tap a cell for the play and a plain-English reason. A red dot marks cells you missed last time.
- **Drill**: quiz on chart cells, weighted toward cells you miss (smoothed miss rate, doubled after a miss). Filter: All / Hard / Soft / Pairs.
- **Play**: hands dealt from a shoe (75% penetration, dealer peeks on A/10). Every decision is checked against basic strategy with the correct play and a reason. Accuracy is tracked per hand type and per cell. A configurable share of deals (default 40%) is built to land on your weak spots.
- **Stats**: overall, by hand type, Play vs Drill, and a weak-spot list.
- **Count** (Hi-Lo: 2–6 = +1, 7–9 = 0, 10–A = −1):
  - *Flash*: single cards at 0.3–3 s per card; 10/20/30 cards or 1–2 full decks. Enter the running count on a thumb keypad (with ±). Shows the answer, a card-by-card review, and history.
  - *Rounds*: full table rounds (1–5 player hands + dealer, basic-strategy draws, hole card counted when it flips) dealt from the shoe at the chosen speed. Quiz the running count, then optionally the true count, every N rounds. TC = RC ÷ decks remaining; decks remaining is cards left / 52 rounded to the nearest ½ deck and is shown on screen. Default convention: truncate toward zero; round or floor are optional. An optional tolerance accepts anything within ±0.5 of the exact TC.
  - *In Play*: turns on counting in the Play tab. The count carries across hands until the shuffle. You pick a bet in units before each hand, graded against the ramp (1–8: TC≤1→1, 2→2, 3→4, 4→6, 5+→8; 1–12: 1/2/4/8/12). You get a count quiz every N hands. Basic-strategy coaching still runs, and weak-spot deals pause while counting. Units only.
  - Count stats on the Stats tab: RC and TC accuracy, average error, fastest correct speed, bet-sizing accuracy.
- **Deviations (Hi-Lo index plays)**: Illustrious 18 + Fab 4 + insurance at TC ≥ +3, with separate H17/S17 indices (`src/engine/deviations.ts`; `correctPlay(cards, up, rules, availability, trueCount?)`).
  - Learn → *Index*: the list for the active rules, with your accuracy on each. The chart gets a true-count slider that outlines cells whose play changes at that count; tap a cell for its index.
  - Learn/Index, Drill and Play link to a step-through **How deviations work** guide (8 short swipeable pages).
  - Drill → *Index*: hand + upcard + true count, centred on each index (±2), weighted toward misses.
  - Play with *Count while you play* + *Deviations* (Count → In Play, default on) grades against the index play at the live exact true count ("Basic says X, but at TC +N the index play is Y") and offers insurance when the dealer shows an ace.
  - Convention: index play when exact TC ≥ index (same as flooring), otherwise the other play. Sources, discrepancies and 1–2 deck handling are in `reference/deviations/NOTES.md`.
- Modes come from `src/modes/registry.tsx`, so a new mode is one entry there.

## Rules (gear chip in the header)
Decks 1/2/4/6/8 · H17/S17 · DAS on/off · late surrender / none · BJ 3:2 / 6:5. Default: 6D H17 DAS LS 3:2.

## Strategy engine
`src/engine/strategy.ts` generates the chart from the rules, using the total-dependent Wizard of Odds strategy as the target. It starts from the multi-deck S17 strategy and applies the deck-count and H17 adjustments. DAS-dependent splits (Ph/Pd/Ps) and surrender codes are resolved for the chosen rules. Displayed cells keep the in-hand fallbacks:
Dh/Ds (double, else hit/stand) and Rh/Rs/Rp (surrender, else hit/stand/split). `src/engine/decide.ts` turns a code into a concrete action from what's allowed right now. For example, it hits a 3-card 11, stands on a 3-card soft 18 v 4, and splits 8,8 v A when surrender isn't offered.

## Verification
`tests/woo-reference.ts` holds all six Wizard of Odds charts (4-8D S17/H17, 2D S17/H17, 1D S17/H17), transcribed cell by cell from the chart images (copies in `reference/woo/`). `tests/strategy.test.ts` resolves each reference under DAS on/off × surrender late/none, using its own copy of the WoO legend. It then asserts the engine output matches every cell: 40 rule combinations of about 350 cells each, plus spot checks. `tests/deviations.test.ts` checks both index tables against `tests/deviation-reference.ts`. It tests every index exactly at, just below (−0.01) and above its threshold, plus the surrender/double/split fallbacks, Fab 4 gating, 1–2 deck applicability, the chart overlay and Play grading. `tests/count.test.ts` covers Hi-Lo tags (including a full shoe netting to 0), decks-remaining estimates, TC conventions and tolerance grading, both bet ramps, and RC continuity across dealt rounds. `tests/game.test.ts` covers the fallbacks, the hand flow (3,000 simulated hands), weak-spot weighting, and that every cell has an explanation.

```
npm test          # vitest
npm run build     # -> dist/
node scripts/screenshots.mjs http://localhost:4173/   # headless 390x844 screenshots + offline check
node scripts/screenshots-count.mjs http://localhost:4173/   # Count-mode screenshots
node scripts/screenshots-deviations.mjs http://localhost:4173/   # Deviations screenshots
scripts/deploy-gh-pages.sh                            # after `gh auth login`
```

## Round 9: App Store readiness (iOS wrapper)
The web app (GitHub Pages) is unchanged in behaviour: **fully unlocked, no paywall, no purchase UI**. The paywall and IAP only exist when the build flag `VITE_NATIVE=true` is set (`npm run build:native`).

- **Capacitor 8 iOS wrapper** (`ios/`, Swift Package Manager, iPhone-only, portrait). All ids and names live in `app.config.json`; run `npm run apply-app-config` after editing. `npm run cap:sync` builds the native bundle and syncs it (Node 22+ needed for the Capacitor CLI).
- **Purchases**: `src/entitlements/` — the app only asks `hasPro()`. Providers: `StoreKitProvider` (`@capgo/native-purchases`, StoreKit 2, non-consumable, restore, offer-code sheet) and `MockProvider` (web/dev). Entitlement is cached and re-verified on launch; offline keeps the cache, a definitive "not owned" revokes it. Gating rules are in `src/entitlements/gating.ts` (tested).
  - Free: Play with basic coaching, Learn charts, basic Drill, index list (view only), discard tray, deal speed, basic stats, Flash up to 20 cards.
  - Unlock: unlimited Flash, Rounds, count-while-you-play + bet sizing, deviation grading/drill/TC overlay, insurance grading, count/bet/deviation stats.
  - Dev: `VITE_NATIVE=true VITE_DEV_TOOLS=true npm run build` shows mock Grant/Revoke/Offline/Fail controls in Settings.
- **Storage**: `src/storage` (Capacitor Preferences native, localStorage fallback, one-time migration) and Export/Import backup (JSON; entitlement is never included).
- **Stats are per rule set** (`6D-H17-DAS-LS-3:2` etc.) with an All / This table / other-sets selector; old stats migrated to the default-rules bucket.
- **Play**: after-shoe summary at the reshuffle and a "Last hand" review (every decision with the correct play and why).
- **Welcome + disclaimer** on first launch (re-openable from Settings), About, haptics toggle, privacy (`/privacy/`) and support (`/support/`) pages.
- **Accessibility**: labelled cards/buttons, `aria-pressed` toggles, modal focus handling, Dynamic Type (rem, capped), reduced motion, visible focus. `node scripts/contrast.mjs` checks the palette (WCAG AA).
- **CI**: `ci/github-workflows/` (simulator build; manual TestFlight upload). See `docs/APPLE-SETUP.md`.
- Verification scripts: `scripts/verify-native.mjs <nativeUrl> <webUrl>`, `scripts/screenshots-round9.mjs`, `scripts/screenshots-review.mjs`, `scripts/screenshots-dynamictype.mjs`.
