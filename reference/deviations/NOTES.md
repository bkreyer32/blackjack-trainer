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

## "What are the Illustrious 18 & Fab 4?" guide page: claims and sources
Each statement on the guide page (Guide.tsx, page 4) and the Index-tab header comes from the saved text:
- **Picked by Schlesinger, published in *Blackjack Attack*:** woo-high-low.txt l.352 ("They appear in Blackjack Attack by Don Schlesinger, and are republished here with permission"). Also blackjackinfo.txt l.135 ("Don Schlesinger's ranked list of the eighteen highest-value index plays, published in Blackjack Attack").
- **Listed in order of value; if you can't memorize them all, start at the top:** woo-high-low.txt l.352 ("The lists are given in order of value. If you can't memorize all of them, start at the top, and work your way down."). Also blackjackinfo.txt l.135 and bjtrainerfyi.txt l.406.
- **Insurance is #1 and the single most valuable; 16 vs 10 is #2:** blackjackinfo.txt l.135 ("insurance at the top of the list is the single most valuable of them all") and bjtrainerfyi.txt l.406 ("Insurance at true count +3 is #1; the famous 16 vs 10 stand is #2").
- **Fab 4 = the four most valuable late-surrender deviations, only where surrender is offered:** blackjackinfo.txt l.139 ("Schlesinger's four most valuable late-surrender deviations, and they only apply at a table that offers surrender"). Also bjtrainerfyi.txt l.427.
- **About 80–85% of the value of all index numbers in a six-deck game; the gap is bigger in 1–2 deck games:** woo-high-low.txt l.352 ("Knowing only these will give the counter 80% to 85% of the value of knowing every index number, based on a six-deck game. The difference is more in single and double-deck games.") and blackjackinfo.txt l.135 ("in a six-deck game, knowing just these eighteen captures roughly 80 to 85 percent of the entire gain available from index play").
- **Simulations with just these 22 come out close to the full set:** woo-high-low.txt l.540 ("Simulations were run using both the Illustrious 18 and Fab 4 (I18+F4) above, and with the full table. The difference is not much, which shows that knowing the top 22 gets you most of the benefit of knowing all of them.").
- **Not used:** count21.txt l.115's "90% of the value comes from the first few deviations" (no source or method given; it conflicts with the 80–85% figure for the whole list). bja-deviations.txt's "deviations account for 20–40% of a counter's edge" (a different claim; left out to keep the page short).
