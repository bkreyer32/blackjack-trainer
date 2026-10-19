import type { Action, Card, Chart, Rules, Up } from '../engine/types';
import { handValue, isBlackjack, isPair, cardValue, upOf } from '../engine/hand';
import { bestAction, type Availability, type CellRef } from '../engine/decide';
import { Shoe } from './shoe';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'surrender' | 'bust';
  net?: number;
}

export interface Feedback {
  correct: boolean;
  chosen: Action;
  best: Action;
  cell: CellRef;
  cards: Card[];
  up: Up;
}

export interface GameState {
  phase: 'idle' | 'player' | 'done';
  dealer: Card[];
  holeHidden: boolean;
  hands: PlayerHand[];
  active: number;
  feedback: Feedback[]; // decisions made this round
  roundNet: number;
  message?: string;
}

export const initialGame: GameState = {
  phase: 'idle',
  dealer: [],
  holeHidden: true,
  hands: [],
  active: 0,
  feedback: [],
  roundNet: 0,
};

export function availability(s: GameState, rules: Rules): Availability & { canHit: boolean } {
  const h = s.hands[s.active];
  if (!h || s.phase !== 'player') return { canHit: false, canDouble: false, canSplit: false, canSurrender: false };
  const two = h.cards.length === 2;
  return {
    canHit: !h.splitAces && handValue(h.cards).total < 21,
    canDouble: two && !h.splitAces && (!h.fromSplit || rules.das),
    canSplit: two && isPair(h.cards) && s.hands.length < rules.maxHands && !h.splitAces,
    canSurrender: rules.surrender === 'late' && two && s.hands.length === 1 && !h.fromSplit,
  };
}

/** Target used to deal a specific starting situation (for weak-spot practice). */
export type DealTarget = CellRef | null;

function takeValue(shoe: Shoe, v: number): Card {
  const c = shoe.take((c) => cardValue(c) === v);
  if (c) return c;
  // shoe ran out of that value: fabricate from a fresh shuffle
  shoe.shuffle();
  return shoe.take((c) => cardValue(c) === v)!;
}

/** Choose two player cards that form the target cell. */
export function cardsForCell(cell: CellRef, rng: () => number): [number, number] {
  if (cell.kind === 'pair') return [cell.row, cell.row];
  if (cell.kind === 'soft') return rng() < 0.5 ? [11, cell.row - 11] : [cell.row - 11, 11];
  // hard, non-pair, no aces
  const opts: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = cell.row - a;
    if (b >= 2 && b <= 10 && b !== a) opts.push([a, b]);
  }
  if (opts.length === 0) throw new Error(`cannot build hard ${cell.row}`);
  return opts[Math.floor(rng() * opts.length)];
}

export function deal(shoe: Shoe, rules: Rules, target: DealTarget, rng: () => number = Math.random, bet = 1): GameState {
  if (shoe.needsShuffle) shoe.shuffle();
  let p1: Card, p2: Card, up: Card;
  if (target) {
    const [a, b] = cardsForCell(target, rng);
    p1 = takeValue(shoe, a);
    p2 = takeValue(shoe, b);
    up = takeValue(shoe, target.up);
  } else {
    p1 = shoe.draw();
    up = shoe.draw();
    p2 = shoe.draw();
  }
  const hole = shoe.draw();
  const s: GameState = {
    ...initialGame,
    phase: 'player',
    dealer: [up, hole],
    hands: [{ cards: [p1, p2], bet, doubled: false, surrendered: false, fromSplit: false, splitAces: false, done: false }],
    feedback: [],
  };
  const dealerBJ = isBlackjack(s.dealer);
  const playerBJ = isBlackjack(s.hands[0].cards);
  const upV = upOf(up);
  // Dealer peeks for blackjack with an ace or ten up (US rules).
  if (dealerBJ && (upV === 11 || upV === 10)) {
    s.hands[0].done = true;
    return settle(s, rules, shoe, playerBJ ? 'Both blackjack — push.' : 'Dealer has blackjack.');
  }
  if (playerBJ) {
    s.hands[0].done = true;
    return settle(s, rules, shoe, 'Blackjack!');
  }
  return s;
}

export function act(prev: GameState, action: Action, chart: Chart, rules: Rules, shoe: Shoe): GameState {
  const s: GameState = structuredClone(prev);
  const h = s.hands[s.active];
  const up = upOf(s.dealer[0]);
  const av = availability(s, rules);
  const best = bestAction(chart, h.cards, up, av);
  s.feedback.push({ correct: best.action === action, chosen: action, best: best.action, cell: best.cell, cards: [...h.cards], up });

  switch (action) {
    case 'hit':
      h.cards.push(shoe.draw());
      if (handValue(h.cards).total >= 21) h.done = true;
      break;
    case 'stand':
      h.done = true;
      break;
    case 'double':
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(shoe.draw());
      h.done = true;
      break;
    case 'surrender':
      h.surrendered = true;
      h.done = true;
      break;
    case 'split': {
      const aces = cardValue(h.cards[0]) === 11;
      const second = h.cards.pop()!;
      const nh: PlayerHand = { cards: [second], bet: h.bet, doubled: false, surrendered: false, fromSplit: true, splitAces: aces, done: false };
      h.fromSplit = true;
      h.splitAces = aces;
      h.cards.push(shoe.draw());
      nh.cards.push(shoe.draw());
      if (aces) {
        h.done = true;
        nh.done = true;
      }
      s.hands.splice(s.active + 1, 0, nh);
      break;
    }
  }
  return advance(s, rules, shoe);
}

function advance(s: GameState, rules: Rules, shoe: Shoe): GameState {
  while (s.active < s.hands.length) {
    const h = s.hands[s.active];
    if (!h.done && handValue(h.cards).total >= 21) h.done = true;
    if (!h.done) return s;
    s.active++;
  }
  s.active = s.hands.length - 1;
  return settle(s, rules, shoe);
}

function dealerPlays(s: GameState, rules: Rules, shoe: Shoe) {
  for (;;) {
    const v = handValue(s.dealer);
    if (v.total < 17 || (v.total === 17 && v.soft && rules.h17)) s.dealer.push(shoe.draw());
    else break;
  }
}

function settle(s: GameState, rules: Rules, shoe: Shoe, message?: string): GameState {
  s.holeHidden = false;
  const live = s.hands.some((h) => !h.surrendered && handValue(h.cards).total <= 21);
  const dealerBJ = isBlackjack(s.dealer);
  const anyNatural = s.hands.length === 1 && isBlackjack(s.hands[0].cards) && !s.hands[0].fromSplit;
  if (live && !dealerBJ && !anyNatural) dealerPlays(s, rules, shoe);
  const d = handValue(s.dealer).total;
  const bjPay = rules.blackjackPays === '3:2' ? 1.5 : 1.2;
  let net = 0;
  for (const h of s.hands) {
    const p = handValue(h.cards).total;
    const natural = !h.fromSplit && isBlackjack(h.cards);
    if (h.surrendered) { h.result = 'surrender'; h.net = -h.bet / 2; }
    else if (natural && dealerBJ) { h.result = 'push'; h.net = 0; }
    else if (natural) { h.result = 'blackjack'; h.net = h.bet * bjPay; }
    else if (dealerBJ) { h.result = 'lose'; h.net = -h.bet; }
    else if (p > 21) { h.result = 'bust'; h.net = -h.bet; }
    else if (d > 21 || p > d) { h.result = 'win'; h.net = h.bet; }
    else if (p === d) { h.result = 'push'; h.net = 0; }
    else { h.result = 'lose'; h.net = -h.bet; }
    net += h.net;
    h.done = true;
  }
  s.roundNet = net;
  s.phase = 'done';
  s.message = message;
  return s;
}
