# Blackjack Trainer (v1)

iPhone-first PWA for learning blackjack basic strategy. React + TypeScript + Vite, fully offline (service worker), stats in localStorage. No backend, no real money.

## Modes
- **Learn**: interactive Hard / Soft / Pairs chart for the selected rules. Tap a cell for the play and a plain-English reason. A red dot marks cells you missed last time.
- **Drill**: quiz on chart cells, weighted toward cells you miss (smoothed miss rate, doubled after a miss). Filter: All / Hard / Soft / Pairs.
- **Play**: hands dealt from a shoe (75% penetration, dealer peeks on A/10). Every decision is checked against basic strategy with the correct play and a reason. Accuracy is tracked per hand type and per cell. A configurable share of deals (default 40%) is built to land on your weak spots.
- **Stats**: overall, by hand type, Play vs Drill, and a weak-spot list.
- **Count**: placeholder. Modes come from `src/modes/registry.tsx`, so a new mode is one entry there.

## Rules (gear chip in the header)
Decks 1/2/4/6/8 · H17/S17 · DAS on/off · late surrender / none · BJ 3:2 / 6:5. Default: 6D H17 DAS LS 3:2.

## Strategy engine
`src/engine/strategy.ts` generates the chart from the rules, using the total-dependent Wizard of Odds strategy as the target. It starts from the multi-deck S17 strategy and applies the deck-count and H17 adjustments. DAS-dependent splits (Ph/Pd/Ps) and surrender codes are resolved for the chosen rules. Displayed cells keep the in-hand fallbacks:
Dh/Ds (double, else hit/stand) and Rh/Rs/Rp (surrender, else hit/stand/split). `src/engine/decide.ts` turns a code into a concrete action from what's allowed right now. For example, it hits a 3-card 11, stands on a 3-card soft 18 v 4, and splits 8,8 v A when surrender isn't offered.

## Verification
`tests/woo-reference.ts` holds all six Wizard of Odds charts (4-8D S17/H17, 2D S17/H17, 1D S17/H17), transcribed cell by cell from the chart images (copies in `reference/woo/`). `tests/strategy.test.ts` resolves each reference under DAS on/off × surrender late/none, using its own copy of the WoO legend. It then asserts the engine output matches every cell: 40 rule combinations of about 350 cells each, plus spot checks. `tests/game.test.ts` covers the fallbacks, the hand flow (3,000 simulated hands), weak-spot weighting, and that every cell has an explanation.

```
npm test          # vitest
npm run build     # -> dist/
node scripts/screenshots.mjs http://localhost:4173/   # headless 390x844 screenshots + offline check
scripts/deploy-gh-pages.sh                            # after `gh auth login`
```
