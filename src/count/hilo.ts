import type { Card } from '../engine/types';

/** Hi-Lo tag: 2-6 = +1, 7-9 = 0, 10/J/Q/K/A = -1. */
export function hiLo(c: Card): -1 | 0 | 1 {
  switch (c.rank) {
    case '2': case '3': case '4': case '5': case '6':
      return 1;
    case '7': case '8': case '9':
      return 0;
    default:
      return -1;
  }
}

export function runningCount(cards: Card[]): number {
  return cards.reduce((s, c) => s + hiLo(c), 0);
}

/**
 * Decks-remaining estimate as a player would make it from the discard tray:
 * cards left / 52 rounded to the nearest half deck (never below 0.5).
 */
export function decksRemaining(cardsLeft: number): number {
  return Math.max(0.5, Math.round((cardsLeft / 52) * 2) / 2);
}

export type TcConvention = 'truncate' | 'round' | 'floor';

export const TC_CONVENTION_LABEL: Record<TcConvention, string> = {
  truncate: 'Truncate toward zero (+2.8 → +2, −2.8 → −2)',
  round: 'Round to nearest (+2.5 → +3, −2.5 → −3)',
  floor: 'Floor (+2.8 → +2, −2.2 → −3)',
};

export function exactTrueCount(rc: number, decksLeft: number): number {
  return rc / decksLeft;
}

export function applyConvention(tc: number, conv: TcConvention): number {
  let v: number;
  if (conv === 'truncate') v = Math.trunc(tc);
  else if (conv === 'floor') v = Math.floor(tc);
  else v = Math.sign(tc) * Math.round(Math.abs(tc)); // half away from zero
  return v === 0 ? 0 : v; // normalise -0
}

export function trueCount(rc: number, decksLeft: number, conv: TcConvention = 'truncate'): number {
  return applyConvention(exactTrueCount(rc, decksLeft), conv);
}

/**
 * Grade a true-count answer. Always accepts the value under the chosen convention.
 * With tolerance on, also accepts anything within ±0.5 of the exact true count.
 */
export function gradeTrueCount(answer: number, rc: number, decksLeft: number, conv: TcConvention, tolerance: boolean): boolean {
  const exact = exactTrueCount(rc, decksLeft);
  if (answer === applyConvention(exact, conv)) return true;
  return tolerance && Math.abs(answer - exact) <= 0.5 + 1e-9;
}

export type Spread = '1-8' | '1-12';

export const RAMPS: Record<Spread, { tc: number; units: number }[]> = {
  '1-8': [
    { tc: 1, units: 1 }, { tc: 2, units: 2 }, { tc: 3, units: 4 }, { tc: 4, units: 6 }, { tc: 5, units: 8 },
  ],
  '1-12': [
    { tc: 1, units: 1 }, { tc: 2, units: 2 }, { tc: 3, units: 4 }, { tc: 4, units: 8 }, { tc: 5, units: 12 },
  ],
};

/** Bet in units for an (integer, already-converted) true count. TC ≤ 1 → min bet; TC ≥ 5 → max. */
export function rampBet(tc: number, spread: Spread): number {
  const ramp = RAMPS[spread];
  if (tc <= ramp[0].tc) return ramp[0].units;
  for (const step of ramp) if (tc <= step.tc) return step.units;
  return ramp[ramp.length - 1].units;
}

export function betOptions(spread: Spread): number[] {
  return RAMPS[spread].map((s) => s.units);
}
