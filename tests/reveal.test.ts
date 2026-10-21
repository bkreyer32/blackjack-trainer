import { describe, it, expect } from 'vitest';
import { DEFAULT_RULES, type Card, type Rank } from '../src/engine/types';
import { generateChart } from '../src/engine/strategy';
import { Shoe } from '../src/game/shoe';
import { deal, act, type GameState } from '../src/game/game';
import { revealFrames, viewOf, fullView, DEAL_MS, type View } from '../src/game/reveal';
import { runningCount } from '../src/count/hilo';
import { DEFAULT_COUNT_SETTINGS, loadStore } from '../src/stats/stats';

const c = (r: Rank): Card => ({ rank: r, suit: '♠' });
const chart = generateChart(DEFAULT_RULES);
/** Shoe that deals `order` first (draw() pops from the end), padded with 7s so it never needs a shuffle. */
function stacked(order: Rank[]): Shoe {
  const s = new Shoe(6, () => 0.5);
  s.cards = [...Array(250).fill(0).map(() => c('7')), ...order.map(c).reverse()];
  return s;
}
const desc = (prev: GameState | null, next: GameState) => revealFrames(prev, next).map((v: View) => `${v.hands.join('/')}|${v.dealer}${v.holeHidden ? 'h' : 'u'}`);
const shown = (s: GameState, v: View) => { const t = viewOf(s, v); return [...t.hands.flatMap((h) => h.cards), t.dealer[0], ...(t.holeHidden ? [] : t.dealer.slice(1))].filter(Boolean); };

describe('card-by-card reveal', () => {
  it('speed values and default', () => {
    expect(DEAL_MS).toEqual({ slow: 900, normal: 600, fast: 350, casino: 200, instant: 0 });
    expect(loadStore().settings.dealSpeed).toBe('normal'); // no localStorage in node → fresh store
    expect(DEFAULT_COUNT_SETTINGS).toBeTruthy();
  });

  it('initial deal in casino order: player 1, dealer up, player 2, hole face down', () => {
    // draw order in deal(): p1, up, p2, hole
    const s = deal(stacked(['T', '6', '6', '9']), DEFAULT_RULES, null);
    expect(s.hands[0].cards.map((x) => x.rank)).toEqual(['T', '6']);
    expect(s.dealer.map((x) => x.rank)).toEqual(['6', '9']);
    const f = revealFrames(null, s);
    expect(desc(null, s)).toEqual(['1|0h', '1|1h', '2|1h', '2|2h']);
    // what's visible after each frame, in the real draw order
    expect(f.map((v) => viewOf(s, v)).map((t) => [...t.hands[0].cards, ...t.dealer].map((x) => x.rank).join(''))).toEqual(['T', 'T6', 'T66', 'T669']);
    expect(f[f.length - 1]).toEqual(fullView(s));
  });

  it('a hit lands one card; a stand flips the hole card then each dealer hit, one per frame', () => {
    const shoe = stacked(['T', '6', '2', '9', '3', '2', '4', '5']); // you T,2 = 12 vs 6; hole 9 → 15
    const s0 = deal(shoe, DEFAULT_RULES, null);
    const s1 = act(s0, 'hit', chart, DEFAULT_RULES, shoe); // +3 → 15
    expect(desc(s0, s1)).toEqual(['2|2h', '3|2h']);
    const s2 = act(s1, 'stand', chart, DEFAULT_RULES, shoe); // dealer 15 +2 = 17... (6,9,2)=17 stands
    expect(s2.dealer.length).toBe(3);
    expect(desc(s1, s2)).toEqual(['3|2h', '3|2u', '3|3u']);
  });

  it('dealer draws several cards: each is its own frame, after the flip', () => {
    const shoe = stacked(['T', '2', '8', '3', '2', '2', '3']); // you 18 vs 2; hole 3 → 5, +2 +2 +3 = 12 … then 7s from padding
    const s0 = deal(shoe, DEFAULT_RULES, null);
    const s1 = act(s0, 'stand', chart, DEFAULT_RULES, shoe);
    const n = s1.dealer.length;
    expect(n).toBeGreaterThanOrEqual(5);
    const d = desc(s0, s1);
    expect(d[1]).toBe('2|2u');
    expect(d.slice(2)).toEqual(Array.from({ length: n - 2 }, (_, k) => `2|${k + 3}u`));
  });

  it('split: both halves keep one card, then each gets its second card in turn', () => {
    const shoe = stacked(['8', 'T', '8', '7', '3', '2']);
    const s0 = deal(shoe, DEFAULT_RULES, null);
    const s1 = act(s0, 'split', chart, DEFAULT_RULES, shoe);
    expect(s1.hands.length).toBe(2);
    expect(desc(s0, s1)).toEqual(['1/1|2h', '2/1|2h', '2/2|2h']);
  });

  it('double lands one card, then the dealer reveal', () => {
    const shoe = stacked(['6', '6', '5', 'T', '9', '7']); // 11 vs 6, hole T → 16, dealer hits 7 → 23
    const s0 = deal(shoe, DEFAULT_RULES, null);
    const s1 = act(s0, 'double', chart, DEFAULT_RULES, shoe);
    expect(desc(s0, s1)).toEqual(['2|2h', '3|2h', '3|2u', '3|3u']);
  });

  it('hole card is never visible (so never countable) until its flip frame', () => {
    const shoe = stacked(['T', '6', '2', 'A', '3']);
    const s0 = deal(shoe, DEFAULT_RULES, null);
    for (const v of revealFrames(null, s0)) expect(shown(s0, v).some((x) => x === s0.dealer[1])).toBe(false);
    const s1 = act(s0, 'stand', chart, DEFAULT_RULES, shoe);
    const f = revealFrames(s0, s1);
    const counts = f.map((v) => runningCount(shown(s1, v)));
    expect(f[0].holeHidden).toBe(true);
    expect(counts[counts.length - 1]).toBe(runningCount([...s1.hands[0].cards, ...s1.dealer]));
  });
});
