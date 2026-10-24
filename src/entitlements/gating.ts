import type { CountSettings } from '../stats/stats';

/** Everything that sits behind the one-time "Unlock Counting & Deviations" purchase (native app only). */
export type Feature =
  | 'flashUnlimited'   // Flash drill beyond 20 cards per run
  | 'rounds'           // Count → Rounds
  | 'countInPlay'      // Count while you play (counting session in Play)
  | 'betSizing'        // bet picker + ramp grading
  | 'deviationGrading' // index-play grading, insurance grading in Play
  | 'deviationDrill'   // Drill → Index
  | 'tcOverlay'        // Learn chart TC slider overlay
  | 'countStats';      // count / bet / deviation stats

export const FREE_FLASH_CARDS = 20;

export const FEATURE_COPY: Record<Feature, { title: string; blurb: string }> = {
  flashUnlimited: { title: 'Unlimited Flash drills', blurb: 'The free version stops each Flash run at 20 cards.' },
  rounds: { title: 'Dealt-round count drills', blurb: 'Watch full rounds dealt and get quizzed on the running and true count.' },
  countInPlay: { title: 'Count while you play', blurb: 'The count carries across hands in Play, with periodic quizzes.' },
  betSizing: { title: 'Bet sizing practice', blurb: 'Pick a bet each hand, graded against a true-count ramp.' },
  deviationGrading: { title: 'Index-play grading', blurb: 'Play is graded against Illustrious 18, Fab 4 and insurance at the live true count.' },
  deviationDrill: { title: 'Deviation drills', blurb: 'Drill the index plays at counts near each index, weighted toward your misses.' },
  tcOverlay: { title: 'True-count chart overlay', blurb: 'Slide the true count and watch the chart change play by play.' },
  countStats: { title: 'Counting & deviation stats', blurb: 'Accuracy for running count, true count, bets and each index play.' },
};

export const PRO_INCLUDES = [
  'Unlimited Flash drills, Rounds and Count-while-you-play',
  'Bet-sizing practice graded against a ramp',
  'Illustrious 18 / Fab 4 / insurance grading and drills',
  'True-count chart overlay',
  'Counting, bet and deviation stats',
];
export const FREE_INCLUDES = [
  'Play with basic-strategy coaching and the discard tray',
  'Learn charts, drills and the full index list (view only)',
  'Basic stats, deal speed, backup',
  'Flash count drill, up to 20 cards per run',
];

/** Everything is paid, so a feature is allowed exactly when the user has Pro. Kept as a function so the rule lives in one place. */
export const allowed = (_feature: Feature, pro: boolean): boolean => pro;

/** Flash settings clamped to the free limit: no full-deck runs, at most 20 cards. */
export function clampFlash(cards: number, decks: number, pro: boolean): { cards: number; decks: number } {
  if (pro) return { cards, decks };
  return { cards: Math.min(cards || FREE_FLASH_CARDS, FREE_FLASH_CARDS), decks: 0 };
}

/** Count settings as they actually apply: free users never get counting in Play, bets or deviation grading, whatever was saved. */
export function effectiveCountSettings(cs: CountSettings, pro: boolean): CountSettings {
  return pro ? cs : { ...cs, countInPlay: false, deviations: false, betSizing: false };
}

export type DrillFilterId = 'all' | 'hard' | 'soft' | 'pair' | 'index';
export const effectiveDrillFilter = (f: DrillFilterId, pro: boolean): DrillFilterId => (f === 'index' && !pro ? 'all' : f);
