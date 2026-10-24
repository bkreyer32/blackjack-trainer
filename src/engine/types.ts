export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card { rank: Rank; suit: Suit }

/** Dealer upcard value: 2..10, 11 = Ace. */
export type Up = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const UPCARDS: Up[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export type DeckCount = 1 | 2 | 4 | 6 | 8;

export interface Rules {
  decks: DeckCount;
  /** true = dealer hits soft 17 (H17), false = stands (S17) */
  h17: boolean;
  /** double after split */
  das: boolean;
  surrender: 'none' | 'late';
  blackjackPays: '3:2' | '6:5';
  /** maximum number of hands after splitting (4 = resplit to 4) */
  maxHands: number;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  h17: true,
  das: true,
  surrender: 'late',
  blackjackPays: '3:2',
  maxHands: 4,
};

/**
 * Chart cell codes (Wizard of Odds legend):
 *  H  hit            S  stand         P  split
 *  Dh double, else hit                Ds double, else stand
 *  Rh surrender, else hit             Rs surrender, else stand
 *  Rp surrender, else split
 */
export type Code = 'H' | 'S' | 'P' | 'Dh' | 'Ds' | 'Rh' | 'Rs' | 'Rp';

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export type HandKind = 'hard' | 'soft' | 'pair';

/** Pair rows are keyed by the card value of one card: 2..10, 11 = aces. */
export interface Chart {
  rules: Rules;
  hard: Record<number, Code[]>; // 4..21
  soft: Record<number, Code[]>; // 12..21 (12 = A,A that can't be split)
  pairs: Record<number, Code[]>; // 2..11
}

export function upLabel(u: Up): string {
  return u === 11 ? 'A' : u === 10 ? '10' : String(u);
}
/** Compact label for the header chip, e.g. "6D H17 DAS LS". */
export function rulesShort(r: Rules): string {
  return `${r.decks}D ${r.h17 ? 'H17' : 'S17'} ${r.das ? 'DAS' : 'noDAS'} ${r.surrender === 'late' ? 'LS' : 'noLS'}${r.blackjackPays === '6:5' ? ' 6:5' : ''}`;
}

export function rulesLabel(r: Rules): string {
  const d = r.decks === 1 ? '1 deck' : `${r.decks} decks`;
  return `${d} · ${r.h17 ? 'H17' : 'S17'} · ${r.das ? 'DAS' : 'no DAS'} · ${r.surrender === 'late' ? 'LS' : 'no surr.'} · BJ ${r.blackjackPays}`;
}
