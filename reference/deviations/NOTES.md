# Hi-Lo index plays: sources and verification notes (retrieved 2026-10-19)

Saved page text in this folder: `woo-high-low.txt`, `bjtrainerfyi.txt`, `blackjackinfo.txt`, `count21.txt`, `bja-deviations.txt`.

## Primary source: S17, 4-8 decks
Wizard of Odds, "High-Low" page (https://wizardofodds.com/games/blackjack/card-counting/high-low/). It republishes the Illustrious 18 and Fab 4 from Don Schlesinger's *Blackjack Attack* "with permission", for six decks, S17, DAS, late surrender:

I18: Insurance +3, 16v10 0, 15v10 +4, 10,10v5 +5, 10,10v6 +4, 10v10 +4, 12v3 +2, 12v2 +3, 11vA +1, 9v2 +1, 10vA +4, 9v7 +3, 16v9 +5, 13v2 −1, 12v4 0, 12v5 −2, 12v6 −1, 13v3 −2.
Fab 4: 14v10 +3, 15v10 0, 15v9 +2, 15vA +1.
Convention, quoted: "The player should stand/double/split if the True Count equals or exceeds the Index Number, otherwise hit ... should surrender if the True Count equals or exceeds the Index Number."

Agrees exactly: blackjackinfo.com ("verified against Blackjack Attack · six decks, S17") and the blackjacktrainer.fyi S17 column.

## H17, 4-8 decks
blackjacktrainer.fyi (H17 column) and Blackjack Insider newsletter #194 (second value where two are shown = H17) agree that H17 changes exactly four values:
11vA −1 (S17 +1), 10vA +3 (S17 +4), 12v6 −3 (S17 −1), Fab 4 15vA −1 (S17 +1). Everything else is the same as S17.
Count21's H17 view also shows 10vA +3.

## Discrepancies and how they were resolved
1. **Blackjack Insider #194** (older article, its S17 values) lists 12v2 +4, 12v5 −1, 9v7 +4, 10,10v6 +5 and Fab 4 15vA +2 (S17). Three current sources, including WoO's authorized reprint, give +3, −2, +3, +4 and +1. **Resolved: used WoO/Blackjack Attack** (these are the later, revised book values). Blackjack Insider's H17 deltas (11vA −1, 10vA +3, 12v6 −3, 15vA −1) match the other H17 source, so those are used.
2. **Count21** shows 10vA +3 (H17) next to 12v6 −1 (S17) in one list, mixing the rule sets. Not used for values.
3. **Negative-index wording.** Count21 phrases negatives as "hit when TC is −1 or lower". The book (WoO reprint) and blackjackinfo use "stand if TC ≥ index, otherwise hit", so 13v2 at exactly −1 stands. **Resolved: the book convention**, one rule for all indices: `TC ≥ index → index-side play; TC < index → other play`.
4. **blackjackinfo** says 11vA "disappears" under H17 because doubling is already basic. That's consistent: the H17 index of −1 only tells you to stop doubling (hit) when TC < −1.
5. **16v8 surrender (+4)** appears as a "companion" on blackjacktrainer.fyi. It is not part of the Fab 4 and is not included.

## Single / double deck
Blackjack Insider points to *Blackjack Attack* Table 10.1 for 1D/2D indices; that table isn't freely published. blackjackinfo: "used essentially unchanged for double deck; single-deck play tweaks a few". **Decision:** 1-2 deck games use the multi-deck (same H17/S17) set, with a note in the app. Any entry whose 1-2 deck basic play differs from the multi-deck basic play is switched off, so a multi-deck index never contradicts the neutral-count play:
- 9v2 (1D and 2D basic already doubles)
- 11vA under S17 (1D/2D basic already doubles)
- Fab 4 15v10 in 1D (1D basic doesn't surrender it)
- 16v9 stand index stays (non-surrender play is hit in both)

## True count used for indices
Exact TC = running count ÷ decks remaining, where decks remaining = cards left ÷ 52 rounded to the nearest ½ deck (the same estimate as the Count drills). It is compared exactly with the index, which for integer indices is equivalent to **flooring** the TC. The user's TC-answer convention (truncate/round/floor) only affects grading of typed TC answers, not index decisions. Example: TC −0.4 → 16v10 hits (−0.4 < 0); truncating would wrongly give 0 → stand.

## Interactions
- Surrender is decided first. Fab 4 entries decide surrender vs not. 16 v 9/10/A keep their basic surrender at every count (16v10's stand index applies only when surrender isn't available, e.g. 3+ cards).
- Doubles fall back to hit when doubling isn't allowed (3+ cards, or after a split without DAS).
- 10,10 splits: split when splitting is available (hand limit not reached); otherwise stand. The index doesn't depend on DAS in the sources.
- Fab 4 is off unless late surrender is on.
- Insurance: basic never; Hi-Lo takes it at TC ≥ +3 (also covers even money).
