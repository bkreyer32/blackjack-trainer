import type { Card, Chart, Rules } from '../engine/types';
import { handValue, isBlackjack, upOf } from '../engine/hand';
import { bestAction } from '../engine/decide';
import { Shoe } from '../game/shoe';

export type RoundEvent =
  | { kind: 'card'; seat: number; card: Card; hidden?: boolean } // seat -1 = dealer
  | { kind: 'reveal' };

/**
 * Script a full table round for count practice: N player seats + dealer.
 * Players play basic strategy (no splits, to keep the layout simple; a double takes one card).
 * Every card ends up face up, so the running count after the round includes all of them.
 */
export function scriptRound(shoe: Shoe, players: number, rules: Rules, chart: Chart): RoundEvent[] {
  const ev: RoundEvent[] = [];
  const hands: Card[][] = Array.from({ length: players }, () => []);
  const dealer: Card[] = [];
  for (let p = 0; p < players; p++) { const c = shoe.draw(); hands[p].push(c); ev.push({ kind: 'card', seat: p, card: c }); }
  { const c = shoe.draw(); dealer.push(c); ev.push({ kind: 'card', seat: -1, card: c }); }
  for (let p = 0; p < players; p++) { const c = shoe.draw(); hands[p].push(c); ev.push({ kind: 'card', seat: p, card: c }); }
  { const c = shoe.draw(); dealer.push(c); ev.push({ kind: 'card', seat: -1, card: c, hidden: true }); }
  const up = upOf(dealer[0]);
  const dealerBJ = isBlackjack(dealer) && (up === 10 || up === 11);
  if (!dealerBJ) {
    for (let p = 0; p < players; p++) {
      const h = hands[p];
      if (isBlackjack(h)) continue;
      for (let guard = 0; guard < 12; guard++) {
        if (handValue(h).total >= 21) break;
        const a = bestAction(chart, h, up, { canDouble: h.length === 2, canSplit: false, canSurrender: false }).action;
        if (a === 'stand' || a === 'surrender') break;
        const c = shoe.draw();
        h.push(c);
        ev.push({ kind: 'card', seat: p, card: c });
        if (a === 'double') break;
      }
    }
  }
  ev.push({ kind: 'reveal' });
  const live = !dealerBJ && hands.some((h) => handValue(h).total <= 21 && !isBlackjack(h));
  if (live) {
    for (;;) {
      const v = handValue(dealer);
      if (v.total < 17 || (v.total === 17 && v.soft && rules.h17)) {
        const c = shoe.draw();
        dealer.push(c);
        ev.push({ kind: 'card', seat: -1, card: c });
      } else break;
    }
  }
  return ev;
}

export function roundCards(ev: RoundEvent[]): Card[] {
  return ev.flatMap((e) => (e.kind === 'card' ? [e.card] : []));
}
