/** Short help text for every control on the Play tab, the rules sheet it opens (⚙︎ chip) and Count → In Play settings. */
export interface HelpEntry { title: string; body: string; when?: string }

export const HELP = {
  // Rules sheet (⚙︎ chip in the header)
  rulesChip: { title: 'Table rules chip', body: 'Shows the rules you are practising (decks, H17/S17, DAS, surrender, payout). Tap it to change them. Charts, coaching and index plays all follow these rules.', when: 'Set it to match the table you actually play.' },
  decks: { title: 'Decks', body: 'How many decks are in the shoe. 4, 6 and 8 decks share one basic-strategy chart; 1 and 2 decks have their own. With counting on, more decks means the true count moves more slowly.', when: '6 or 8 for most casino shoes; 1–2 for pitch games.' },
  h17: { title: 'Dealer soft 17', body: 'Whether the dealer hits or stands on soft 17 (e.g. A-6). H17 is slightly worse for you and changes a few plays (like 11 vs A, A-7 vs 2) and four index numbers.', when: 'Check the felt: it says "Dealer must hit soft 17" or "stand on all 17s".' },
  das: { title: 'Double after split', body: 'Whether you may double down on a hand after splitting a pair. When allowed, you split some small pairs (2s, 3s, 4s, 6s) more often.', when: 'Most shoe games allow it.' },
  surrender: { title: 'Surrender', body: 'Late surrender lets you give up half your bet on your first two cards after the dealer checks for blackjack. Turns on Surrender plays (16 vs 9/10/A, 15 vs 10…) and the Fab 4 index plays.', when: 'Only pick Late if your table offers it.' },
  blackjackPays: { title: 'Blackjack pays', body: '3:2 pays $15 on a $10 blackjack; 6:5 pays $12. It doesn’t change any play, but 6:5 costs you about 1.4% — far more than any rule above.', when: 'Practice with what you’ll see; avoid 6:5 tables for real.' },
  focus: { title: 'Weak-spot deals in Play', body: 'This share of Play hands is dealt on purpose to the chart cells you miss most. The rest are dealt normally from the shoe. Paused automatically while counting so the shoe stays natural.', when: 'Raise it to drill mistakes; Off for realistic play.' },
  restoreDefaults: { title: 'Restore defaults', body: 'Resets the table rules to 6 decks, H17, double after split, late surrender, 3:2. Your stats are kept.' },

  // Play tab controls
  scoreline: { title: 'Accuracy · Shoe · Net', body: 'Accuracy = share of your Play decisions that matched the correct play. Shoe = how much of the shoe is left (it reshuffles at 25%); with counting on, ≈D is the decks-remaining estimate used for the true count. Net = your result in betting units (practice only, no money).' },
  actions: { title: 'Action buttons', body: 'Hit, Stand, Double, Split and (with late surrender) Surrender. Buttons grey out when a move isn’t allowed. After each move you get instant feedback; tap it to see why. With counting + deviations on, you’re graded against the index play at the current true count.', when: 'Double/Split/Surrender are only allowed on your first two cards.' },
  deal: { title: 'Deal / Next hand', body: 'Starts a new hand. When counting, every few hands it first asks for a count check, and with Bet sizing on it asks for your bet. With Bet sizing off, hands are a flat 1 unit. The shoe reshuffles automatically at 75% penetration, which resets the count to 0.' },
  bet: { title: 'Your bet (units)', body: 'Shown only when Bet sizing is on (Count → In Play). Pick a bet from your spread. It’s graded against the ramp: TC ≤1 → 1u, 2 → 2u, 3 → 4u, 4 → 6u (8u on 1–12), 5+ → 8u (12u on 1–12), using your true-count convention.', when: 'Bet small at low counts, raise as the true count climbs.' },
  insurance: { title: 'Insurance', body: 'Offered when the dealer shows an ace (with counting and deviations on). It costs half your bet and pays 2:1 if the dealer has blackjack. Correct answer: insure at true count +3 or higher, otherwise decline.' },
  countQuiz: { title: 'Count check', body: 'Type the running count of every card seen since the shuffle (use ± for negatives), then the true count if that quiz is on. Cards from the hand about to be dealt aren’t included.' },

  // Count → In Play settings
  countInPlay: { title: 'Count while you play', body: 'Turns Play into a counting session: the Hi-Lo count carries across hands until the shuffle and you’re quizzed on the count every few hands. With Bet sizing on you also pick a bet before each hand.', when: 'Turn on once basic strategy is solid.' },
  deviations: { title: 'Deviations (index plays)', body: 'When on (and counting), decisions are graded against the Illustrious 18 / Fab 4 index play at the live true count, and insurance is offered on dealer aces. When off, you’re graded on basic strategy only.', when: 'Off while you learn to count; on once counting is easy.' },
  betSizing: { title: 'Bet sizing', body: 'On: before each counted hand you pick a bet in units, graded against the true-count ramp and tracked in Stats. Off: no bet picker, every hand is a flat 1 unit and bets aren’t graded or recorded. Count quizzes and deviations work either way.', when: 'Turn off to focus on counting and index plays; on to practise your bet ramp.' },
  spread: { title: 'Bet spread', body: 'Your smallest to largest bet in units (only shown with Bet sizing on). 1–8 tops out at 8 units at TC +5; 1–12 ramps to 12. The bet picker offers only these sizes.', when: '1–8 is a common shoe spread; 1–12 is more aggressive.' },
  playQuizEvery: { title: 'Count quiz every', body: 'How often Play stops before a hand to ask for the running (and true) count.', when: '1 hand while learning; 10 to simulate real play.' },
  tcConvention: { title: 'True count convention', body: 'How your typed true count is graded: Truncate drops the fraction toward zero (+2.7 → +2, −2.7 → −2), Round goes to the nearest whole number, Floor always goes down (−2.3 → −3). Index plays always compare the exact TC.', when: 'Truncate is the most common; match what you use at the table.' },
  tcTolerance: { title: 'Tolerance', body: 'Exact requires the whole-number answer under your convention. ±0.5 accepts anything within half a point of the exact RC ÷ decks (decimals allowed).', when: 'Use ±0.5 while learning deck estimation.' },
  showDecksLeft: { title: 'Show decks-remaining estimate', body: 'Shows the app’s decks-remaining estimate (cards left ÷ 52, nearest ½ deck) when you’re asked for a true count or a bet.', when: 'Hide it to practise estimating the discard tray yourself.' },
} satisfies Record<string, HelpEntry>;

export type HelpId = keyof typeof HELP;

/** Every setting reachable from the Play tab (rules sheet + Count → In Play), for the coverage test. */
export const PLAY_SETTING_HELP: HelpId[] = ['decks', 'h17', 'das', 'surrender', 'blackjackPays', 'focus', 'restoreDefaults',
  'countInPlay', 'betSizing', 'deviations', 'spread', 'playQuizEvery', 'tcConvention', 'tcTolerance', 'showDecksLeft'];
/** Controls on the Play screen itself. */
export const PLAY_CONTROL_HELP: HelpId[] = ['rulesChip', 'scoreline', 'actions', 'deal', 'bet', 'insurance', 'countQuiz'];
