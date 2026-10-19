import { describe, it, expect } from 'vitest';
import { handValue, upOf } from '../src/engine/hand';
import { bestAction } from '../src/engine/decide';
import { generateChart } from '../src/engine/strategy';
import { DEFAULT_RULES, type Card, type Rank } from '../src/engine/types';
import { Shoe } from '../src/game/shoe';
import { deal, act, cardsForCell, availability } from '../src/game/game';
import { allCells, cellWeight, pickWeighted } from '../src/stats/stats';

const c = (r: Rank): Card => ({ rank: r, suit: '♠' });
const chart = generateChart(DEFAULT_RULES);
const all = { canDouble: true, canSplit: true, canSurrender: true };

describe('hand values', () => {
  it('soft/hard', () => {
    expect(handValue([c('A'), c('6')])).toEqual({ total: 17, soft: true });
    expect(handValue([c('A'), c('6'), c('T')])).toEqual({ total: 17, soft: false });
    expect(handValue([c('A'), c('A'), c('9')])).toEqual({ total: 21, soft: true });
  });
});

describe('fallbacks', () => {
  it('Dh -> hit when double not allowed (3-card 11)', () => {
    expect(bestAction(chart, [c('5'), c('4'), c('2')], 6, { ...all, canDouble: false }).action).toBe('hit');
    expect(bestAction(chart, [c('5'), c('6')], 6, all).action).toBe('double');
  });
  it('Ds -> stand when double not allowed (3-card soft 18 v 4)', () => {
    expect(bestAction(chart, [c('A'), c('4'), c('3')], 4, { ...all, canDouble: false }).action).toBe('stand');
    expect(bestAction(chart, [c('A'), c('7')], 4, all).action).toBe('double');
  });
  it('Rh -> hit for 3-card 16 v 10; surrender for 2-card', () => {
    expect(bestAction(chart, [c('T'), c('6')], 10, all).action).toBe('surrender');
    expect(bestAction(chart, [c('T'), c('4'), c('2')], 10, { ...all, canSurrender: false }).action).toBe('hit');
  });
  it('Rs -> stand: 17 v A H17 without surrender', () => {
    expect(bestAction(chart, [c('T'), c('7')], 11, { ...all, canSurrender: false }).action).toBe('stand');
  });
  it('Rp -> split: 8,8 v A when surrender unavailable; hard 16 if split also unavailable', () => {
    expect(bestAction(chart, [c('8'), c('8')], 11, all).action).toBe('surrender');
    expect(bestAction(chart, [c('8'), c('8')], 11, { ...all, canSurrender: false }).action).toBe('split');
    expect(bestAction(chart, [c('8'), c('8')], 11, { canDouble: false, canSplit: false, canSurrender: false }).action).toBe('hit');
  });
  it('pair that cannot be split plays as its total', () => {
    expect(bestAction(chart, [c('5'), c('5')], 6, all).action).toBe('double');
    expect(bestAction(chart, [c('9'), c('9')], 6, { ...all, canSplit: false }).action).toBe('stand');
  });
});

describe('game flow', () => {
  it('targeted deals produce the requested cell', () => {
    const shoe = new Shoe(6);
    for (const cell of allCells()) {
      const [a, b] = cardsForCell(cell, Math.random);
      expect(a + b === cell.row * (cell.kind === 'pair' ? 2 : 1) || cell.kind === 'soft' || (cell.kind === 'pair' && cell.row === 11)).toBe(true);
      const s = deal(shoe, DEFAULT_RULES, cell);
      expect(s.dealer.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('plays many random hands to completion', () => {
    const shoe = new Shoe(6);
    for (let i = 0; i < 3000; i++) {
      let s = deal(shoe, DEFAULT_RULES, null);
      let guard = 0;
      while (s.phase === 'player' && guard++ < 20) {
        const av = availability(s, DEFAULT_RULES);
        const h = s.hands[s.active];
        const best = bestAction(chart, h.cards, upOf(s.dealer[0]), av);
        s = act(s, best.action, chart, DEFAULT_RULES, shoe);
        expect(s.feedback.at(-1)!.correct).toBe(true);
      }
      expect(s.phase).toBe('done');
      for (const h of s.hands) expect(h.result).toBeDefined();
    }
  });
});

describe('weighting', () => {
  it('missed cells are weighted above mastered ones', () => {
    expect(cellWeight({ n: 10, correct: 3, lastWrong: true })).toBeGreaterThan(cellWeight({ n: 10, correct: 10 }) * 5);
    const cells = allCells();
    const target = cells[17];
    const counts = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const p = pickWeighted(cells, (x) => (x === target ? cellWeight({ n: 5, correct: 0, lastWrong: true }) : cellWeight({ n: 20, correct: 20 })));
      counts.set(p === target ? 't' : 'o', (counts.get(p === target ? 't' : 'o') ?? 0) + 1);
    }
    // target should come up far more often than an average other cell
    expect((counts.get('t') ?? 0) / ((counts.get('o') ?? 1) / (cells.length - 1))).toBeGreaterThan(10);
  });
});

import { explain } from '../src/engine/explain';
import { UPCARDS, type DeckCount } from '../src/engine/types';
describe('explanations', () => {
  it('every cell under every rule set has a non-empty reason', () => {
    for (const decks of [1, 2, 6] as DeckCount[]) for (const h17 of [true, false]) for (const das of [true, false]) for (const surrender of ['late', 'none'] as const) {
      const r = { ...DEFAULT_RULES, decks, h17, das, surrender };
      const ch = generateChart(r);
      for (const up of UPCARDS) {
        for (let t = 5; t <= 21; t++) expect(explain('hard', t, up, ch.hard[t][up - 2], r).length).toBeGreaterThan(10);
        for (let t = 13; t <= 21; t++) expect(explain('soft', t, up, ch.soft[t][up - 2], r).length).toBeGreaterThan(10);
        for (let p = 2; p <= 11; p++) expect(explain('pair', p, up, ch.pairs[p][up - 2], r).length).toBeGreaterThan(10);
      }
    }
  });
});
