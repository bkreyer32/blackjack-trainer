import type { GameState } from './game';

/** How much of a GameState is on the table: visible card counts per zone, and whether the hole card is still face down. */
export interface View { dealer: number; holeHidden: boolean; hands: number[] }

export type DealSpeed = 'slow' | 'normal' | 'fast' | 'casino' | 'instant';
/** Milliseconds between cards landing. */
export const DEAL_MS: Record<DealSpeed, number> = { slow: 900, normal: 600, fast: 350, casino: 200, instant: 0 };
export const DEAL_SPEED_LABEL: Record<DealSpeed, string> = { slow: 'Slow', normal: 'Normal', fast: 'Fast', casino: 'Casino', instant: 'Instant' };

export const fullView = (s: GameState): View => ({ dealer: s.dealer.length, holeHidden: s.holeHidden, hands: s.hands.map((h) => h.cards.length) });
const same = (a: View, b: View) => a.dealer === b.dealer && a.holeHidden === b.holeHidden && a.hands.join() === b.hands.join();

/**
 * Frames to show, one card (or the hole-card flip) per frame, ending on the full `next` state.
 * prev = null: a fresh deal, in casino order: player 1, dealer up, player 2, dealer hole (face down).
 * Otherwise `prev` is the state on the table before the action: new player cards land one at a time
 * (after a split each hand gets its second card in turn), then the hole card flips, then each dealer hit.
 */
export function revealFrames(prev: GameState | null, next: GameState): View[] {
  const frames: View[] = [];
  let v: View;
  const push = () => { if (!frames.length || !same(frames[frames.length - 1], v)) frames.push({ ...v, hands: [...v.hands] }); };
  if (!prev || prev.hands.length === 0) {
    v = { dealer: 0, holeHidden: true, hands: next.hands.map(() => 0) };
    v.hands[0] = 1; push();
    v.dealer = 1; push();
    v.hands[0] = Math.min(2, next.hands[0].cards.length); push();
    v.dealer = Math.min(2, next.dealer.length); push();
  } else {
    v = { dealer: prev.dealer.length, holeHidden: prev.holeHidden, hands: prev.hands.map((h) => h.cards.length) };
    if (next.hands.length > prev.hands.length) {
      // Split at prev.active: both halves start with one card each.
      const a = prev.active;
      v.hands.splice(a, 1, 1, 1);
      while (v.hands.length < next.hands.length) v.hands.push(next.hands[v.hands.length].cards.length);
    }
    push();
    // Second cards of split hands go out in turn, then any other new cards hand by hand.
    for (let i = 0; i < next.hands.length; i++) {
      while (v.hands[i] < next.hands[i].cards.length) { v.hands[i]++; push(); }
    }
  }
  if (v.holeHidden && !next.holeHidden) { v.holeHidden = false; push(); }
  while (v.dealer < next.dealer.length) { v.dealer++; push(); }
  v.holeHidden = next.holeHidden; push();
  return frames;
}

/** Apply a view to a state: the cards you'd actually see on the table. */
export function viewOf(s: GameState, v: View): GameState {
  return { ...s, holeHidden: v.holeHidden, dealer: s.dealer.slice(0, v.dealer), hands: s.hands.map((h, i) => ({ ...h, cards: h.cards.slice(0, v.hands[i] ?? h.cards.length) })) };
}
